package com.strategium.faction;

import com.strategium.steam.SteamUserGameStats;
import com.strategium.steam.SteamUserGameStatsRepository;
import com.strategium.steam.SupportedSteamGame;
import com.strategium.user.UserAccount;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FactionService {

  private final FactionRepository factionRepository;
  private final FactionMemberRepository factionMemberRepository;
  private final SteamUserGameStatsRepository steamUserGameStatsRepository;

  public FactionService(
      FactionRepository factionRepository,
      FactionMemberRepository factionMemberRepository,
      SteamUserGameStatsRepository steamUserGameStatsRepository
  ) {
    this.factionRepository = factionRepository;
    this.factionMemberRepository = factionMemberRepository;
    this.steamUserGameStatsRepository = steamUserGameStatsRepository;
  }

  @Transactional(readOnly = true)
  public UserFactionBrief briefFor(UserAccount user) {
    return factionMemberRepository.findByUserId(user.getId())
        .map(m -> new UserFactionBrief(
            m.getFaction().getId(),
            m.getFaction().getTag(),
            m.getFaction().getName(),
            m.getRole().name()
        ))
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public FactionLeaderboardResponse listLeaderboard(String scopeRaw, String sortRaw) {
    boolean pdxOnly = normalizeScope(scopeRaw);
    SortKey sort = normalizeSort(sortRaw);
    List<Faction> factions = factionRepository.findAll();
    if (factions.isEmpty()) {
      return new FactionLeaderboardResponse(scopeString(pdxOnly), sort.raw, List.of());
    }
    List<UUID> factionIds = factions.stream().map(Faction::getId).toList();
    List<FactionMember> members = factionMemberRepository.findAllByFaction_IdIn(factionIds);
    Map<UUID, List<UUID>> userIdsByFaction = new HashMap<>();
    Map<UUID, Long> memberCountByFaction = new HashMap<>();
    for (FactionMember m : members) {
      UUID fid = m.getFaction().getId();
      userIdsByFaction.computeIfAbsent(fid, k -> new ArrayList<>()).add(m.getUser().getId());
      memberCountByFaction.merge(fid, 1L, Long::sum);
    }

    List<UUID> allUserIds = members.stream().map(x -> x.getUser().getId()).distinct().toList();
    List<SteamUserGameStats> statsRows =
        allUserIds.isEmpty() ? List.of() : steamUserGameStatsRepository.findAllByUser_IdIn(allUserIds);
    Map<UUID, RawAgg> aggByFaction = new HashMap<>();
    for (Faction f : factions) {
      List<UUID> ids = userIdsByFaction.getOrDefault(f.getId(), List.of());
      aggByFaction.put(f.getId(), aggregateSteamForUsers(ids, statsRows, pdxOnly));
    }

    record Row(Faction faction, RawAgg agg, long members) {}

    Comparator<Row> cmp = switch (sort) {
      case ACHIEVEMENTS ->
          Comparator.comparing((Row r) -> r.agg.totalAchievements).reversed()
              .thenComparing(r -> r.members, Comparator.reverseOrder())
              .thenComparing(r -> r.faction().getTag());
      case HOURS ->
          Comparator.comparing((Row r) -> r.agg.totalPlaytimeMinutes).reversed()
              .thenComparing(r -> r.agg.totalAchievements, Comparator.reverseOrder())
              .thenComparing(r -> r.faction().getTag());
    };

    List<Row> rows = factions.stream()
        .map(f -> new Row(
            f,
            aggByFaction.getOrDefault(f.getId(), RawAgg.EMPTY),
            memberCountByFaction.getOrDefault(f.getId(), 0L)))
        .sorted(cmp)
        .toList();

    List<FactionLeaderboardEntryResponse> entries = new ArrayList<>();
    int rank = 1;
    for (Row row : rows) {
      Faction f = row.faction();
      RawAgg a = row.agg();
      entries.add(new FactionLeaderboardEntryResponse(
          f.getId(),
          rank++,
          f.getTag(),
          f.getName(),
          f.getTheme(),
          a.totalAchievements(),
          a.avgCompletion(),
          a.uniqueGames(),
          (int) row.members(),
          a.totalPlaytimeMinutes()
      ));
    }
    return new FactionLeaderboardResponse(scopeString(pdxOnly), sort.raw, entries);
  }

  @Transactional
  public FactionResponse create(UserAccount leader, CreateFactionRequest request) {
    if (factionMemberRepository.findByUserId(leader.getId()).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже состоите во фракции");
    }
    String normalizedTag = normalizeTag(request.tag());
    if (factionRepository.existsByTag(normalizedTag)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Тег фракции уже занят");
    }
    FactionTheme theme = request.theme() != null ? request.theme() : FactionTheme.hoi4;
    Faction faction =
        factionRepository.save(new Faction(request.name().strip(), normalizedTag, theme));
    factionMemberRepository.save(new FactionMember(faction, leader, FactionMemberRole.LEADER));
    return new FactionResponse(faction.getId(), faction.getName(), faction.getTag(), faction.getTheme());
  }

  @Transactional
  public void join(UUID factionId, UserAccount user) {
    Faction faction = factionRepository.findById(factionId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Фракция не найдена"));
    if (factionMemberRepository.findByUserId(user.getId()).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Вы уже состоите во фракции");
    }
    factionMemberRepository.save(new FactionMember(faction, user, FactionMemberRole.MEMBER));
  }

  @Transactional
  public void leave(UUID factionId, UserAccount user) {
    FactionMember member = factionMemberRepository.findByUserId(user.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Вы ни во одной фракции не состоите"));
    if (!member.getFaction().getId().equals(factionId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Это не ваша текущая фракция");
    }
    Faction faction = member.getFaction();
    if (member.getRole() == FactionMemberRole.LEADER) {
      List<FactionMember> remainder = factionMemberRepository.findAllByFactionIdOrderByJoinedAtAsc(faction.getId())
          .stream()
          .filter(m -> !m.getId().equals(member.getId()))
          .toList();
      factionMemberRepository.delete(member);
      if (remainder.isEmpty()) {
        factionRepository.delete(faction);
      } else {
        FactionMember promoted = remainder.get(0);
        promoted.setRole(FactionMemberRole.LEADER);
        factionMemberRepository.save(promoted);
      }
    } else {
      factionMemberRepository.delete(member);
    }
  }

  private static RawAgg aggregateSteamForUsers(List<UUID> userIds, List<SteamUserGameStats> statsRows, boolean pdxOnly) {
    if (userIds.isEmpty()) {
      return RawAgg.EMPTY;
    }
    Set<UUID> idSet = new HashSet<>(userIds);
    Map<UUID, List<SteamUserGameStats>> byUser = new HashMap<>();
    int totalAchievements = 0;
    int totalPlaytime = 0;
    Set<Integer> uniqueGames = new HashSet<>();

    for (SteamUserGameStats row : statsRows) {
      UUID uid = row.getUser().getId();
      if (!idSet.contains(uid)) {
        continue;
      }
      var gameOpt = SupportedSteamGame.findByAppId(row.getAppId());
      if (gameOpt.isEmpty()) {
        continue;
      }
      if (pdxOnly && !gameOpt.get().pdx()) {
        continue;
      }
      byUser.computeIfAbsent(uid, k -> new ArrayList<>()).add(row);
      totalAchievements += row.getUnlockedCount();
      totalPlaytime += row.getPlaytimeMinutes();
      if (row.getTotalCount() > 0) {
        uniqueGames.add(row.getAppId());
      }
    }

    List<Double> userAvgs = new ArrayList<>();
    for (UUID uid : userIds) {
      List<SteamUserGameStats> list = byUser.getOrDefault(uid, List.of());
      var avg = list.stream()
          .filter(r -> r.getTotalCount() > 0 && r.isAvailable())
          .mapToInt(SteamUserGameStats::getProgressPercent)
          .average();
      if (avg.isPresent()) {
        userAvgs.add(avg.getAsDouble());
      }
    }
    int avgCompletion = userAvgs.isEmpty() ? 0 : (int) Math.round(
        userAvgs.stream().mapToDouble(d -> d).average().getAsDouble());
    return new RawAgg(totalAchievements, totalPlaytime, uniqueGames.size(), avgCompletion);
  }

  private static String normalizeTag(String tag) {
    return tag.strip().toUpperCase(Locale.ROOT);
  }

  private static boolean normalizeScope(String scope) {
    if (scope == null || scope.isBlank()) {
      return false;
    }
    return "pdx".equalsIgnoreCase(scope.strip());
  }

  private static String scopeString(boolean pdxOnly) {
    return pdxOnly ? "pdx" : "all";
  }

  private enum SortKey {
    ACHIEVEMENTS("achievements"),
    HOURS("hours");

    private final String raw;

    SortKey(String raw) {
      this.raw = raw;
    }
  }

  private static SortKey normalizeSort(String sortRaw) {
    if (sortRaw != null && "hours".equalsIgnoreCase(sortRaw.strip())) {
      return SortKey.HOURS;
    }
    return SortKey.ACHIEVEMENTS;
  }

  private record RawAgg(int totalAchievements, int totalPlaytimeMinutes, int uniqueGames, int avgCompletion) {
    static final RawAgg EMPTY = new RawAgg(0, 0, 0, 0);
  }
}
