package com.strategium.steam;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.strategium.user.UserAccount;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SteamAchievementService {

  private static final String STEAM_API_BASE = "https://api.steampowered.com";

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();
  private final ObjectMapper objectMapper;
  private final SteamUserGameStatsRepository statsRepository;
  private final String apiKey;
  private final String language;
  private final Map<Integer, Map<String, AchievementSchema>> schemaCache = new HashMap<>();

  public SteamAchievementService(
      ObjectMapper objectMapper,
      SteamUserGameStatsRepository statsRepository,
      @Value("${strategium.steam.web-api-key:}") String apiKey,
      @Value("${strategium.steam.language:russian}") String language
  ) {
    this.objectMapper = objectMapper;
    this.statsRepository = statsRepository;
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    this.language = language == null || language.isBlank() ? "russian" : language.trim();
  }

  public List<SteamGameResponse> supportedGames() {
    return SupportedSteamGame.SUPPORTED_GAMES.stream()
        .map(SteamGameResponse::from)
        .toList();
  }

  public SteamAchievementsSummaryResponse achievements(String steamId, String gameSlug) {
    List<SupportedSteamGame> games = gameSlug == null || gameSlug.isBlank()
        ? SupportedSteamGame.SUPPORTED_GAMES
        : SupportedSteamGame.findBySlug(gameSlug).map(List::of).orElse(List.of());
    Map<Integer, Integer> playtimeByAppId = playtimeByAppId(steamId);

    List<SteamGameAchievementsResponse> results = games.stream()
        .map(game -> achievementsForGame(steamId, game, playtimeByAppId.getOrDefault(game.appId(), 0)))
        .sorted(Comparator
            .comparing(SteamGameAchievementsResponse::available).reversed()
            .thenComparing(SteamGameAchievementsResponse::progressPercent, Comparator.reverseOrder())
            .thenComparing(SteamGameAchievementsResponse::title))
        .toList();

    return new SteamAchievementsSummaryResponse(steamId, results);
  }

  @Transactional
  public SteamStatsRefreshResponse refreshStats(UserAccount user) {
    String steamId = user.getSteamId();
    SteamAchievementsSummaryResponse summary = achievements(steamId, null);
    Instant updatedAt = Instant.now();
    for (SteamGameAchievementsResponse game : summary.games()) {
      SteamUserGameStats stats = statsRepository.findByUserAndAppId(user, game.appId())
          .orElseGet(() -> new SteamUserGameStats(user, steamId, game.appId()));
      stats.updateFrom(game, game.playtimeMinutes(), updatedAt);
      statsRepository.save(stats);
    }
    return new SteamStatsRefreshResponse(steamId, summary.games().size(), updatedAt);
  }

  @Transactional(readOnly = true)
  public SteamLeaderboardResponse leaderboard(String scope, String sort) {
    String normalizedScope = "pdx".equalsIgnoreCase(scope) ? "pdx" : "all";
    String normalizedSort = "hours".equalsIgnoreCase(sort) ? "hours" : "achievements";
    Set<Integer> appIds = new HashSet<>(SupportedSteamGame.SUPPORTED_GAMES.stream()
        .filter(game -> "all".equals(normalizedScope) || game.pdx())
        .map(SupportedSteamGame::appId)
        .toList());

    Map<java.util.UUID, LeaderboardAccumulator> byUser = new LinkedHashMap<>();
    for (SteamUserGameStats stats : statsRepository.findAll()) {
      if (!appIds.contains(stats.getAppId())) {
        continue;
      }
      byUser.computeIfAbsent(stats.getUser().getId(), ignored -> new LeaderboardAccumulator(stats.getUser(), stats.getSteamId()))
          .add(stats);
    }

    Comparator<LeaderboardAccumulator> comparator = "hours".equals(normalizedSort)
        ? Comparator.comparingInt(LeaderboardAccumulator::totalPlaytimeMinutes).reversed()
        : Comparator.comparingInt(LeaderboardAccumulator::totalUnlocked).reversed();
    List<LeaderboardAccumulator> sorted = byUser.values().stream()
        .filter(accumulator -> accumulator.gamesCount() > 0)
        .sorted(comparator
            .thenComparing(LeaderboardAccumulator::progressPercent, Comparator.reverseOrder())
            .thenComparing(accumulator -> accumulator.user().getDisplayName()))
        .toList();

    List<SteamLeaderboardEntryResponse> entries = new ArrayList<>();
    for (int index = 0; index < sorted.size(); index++) {
      LeaderboardAccumulator accumulator = sorted.get(index);
      entries.add(new SteamLeaderboardEntryResponse(
          index + 1,
          accumulator.user().getId(),
          accumulator.user().getDisplayName(),
          accumulator.steamId(),
          accumulator.totalUnlocked(),
          accumulator.totalAchievements(),
          accumulator.progressPercent(),
          accumulator.totalPlaytimeMinutes(),
          hours(accumulator.totalPlaytimeMinutes()),
          accumulator.gamesCount(),
          accumulator.updatedAt()
      ));
    }
    return new SteamLeaderboardResponse(normalizedScope, normalizedSort, entries);
  }

  private SteamGameAchievementsResponse achievementsForGame(String steamId, SupportedSteamGame game, int playtimeMinutes) {
    if (apiKey.isBlank()) {
      return unavailable(game, "Не задан STEAM_WEB_API_KEY.", playtimeMinutes);
    }

    try {
      Map<String, AchievementSchema> schema = achievementSchema(game.appId());
      JsonNode stats = fetchJson(playerAchievementsUrl(steamId, game.appId())).path("playerstats");
      if (stats.path("success").isBoolean() && !stats.path("success").asBoolean()) {
        return unavailable(game, "Steam не вернул достижения. Проверьте приватность профиля и наличие игры.", playtimeMinutes);
      }

      JsonNode achievementsNode = stats.path("achievements");
      if (!achievementsNode.isArray()) {
        return unavailable(game, "Для этой игры достижения недоступны или скрыты настройками приватности.", playtimeMinutes);
      }

      List<SteamAchievementResponse> achievements = new ArrayList<>();
      for (JsonNode achievementNode : achievementsNode) {
        String apiName = achievementNode.path("apiname").asText("");
        AchievementSchema details = schema.getOrDefault(apiName, AchievementSchema.empty(apiName));
        boolean achieved = achievementNode.path("achieved").asInt(0) == 1;
        long unlockSeconds = achievementNode.path("unlocktime").asLong(0);
        achievements.add(new SteamAchievementResponse(
            apiName,
            firstNotBlank(achievementNode.path("name").asText(""), details.name(), apiName),
            firstNotBlank(achievementNode.path("description").asText(""), details.description(), ""),
            achieved,
            achieved && unlockSeconds > 0 ? Instant.ofEpochSecond(unlockSeconds) : null,
            details.iconUrl(),
            details.iconGrayUrl()
        ));
      }

      achievements = achievements.stream()
          .sorted(Comparator
              .comparing(SteamAchievementResponse::achieved).reversed()
              .thenComparing(achievement -> achievement.unlockTime() == null ? Instant.EPOCH : achievement.unlockTime(), Comparator.reverseOrder())
              .thenComparing(SteamAchievementResponse::name))
          .toList();

      int total = achievements.size();
      int unlocked = (int) achievements.stream().filter(SteamAchievementResponse::achieved).count();
      int progress = total == 0 ? 0 : Math.round((unlocked * 100f) / total);
      return new SteamGameAchievementsResponse(
          game.appId(),
          game.slug(),
          game.title(),
          game.series(),
          game.pdx(),
          playtimeMinutes,
          hours(playtimeMinutes),
          unlocked,
          total,
          progress,
          true,
          "",
          achievements
      );
    } catch (Exception ignored) {
      return unavailable(game, "Не удалось загрузить достижения из Steam.", playtimeMinutes);
    }
  }

  private Map<String, AchievementSchema> achievementSchema(int appId) throws Exception {
    if (schemaCache.containsKey(appId)) {
      return schemaCache.get(appId);
    }

    JsonNode achievements = fetchJson(schemaUrl(appId))
        .path("game")
        .path("availableGameStats")
        .path("achievements");
    Map<String, AchievementSchema> schema = new HashMap<>();
    if (achievements.isArray()) {
      for (JsonNode item : achievements) {
        String apiName = item.path("name").asText("");
        if (apiName.isBlank()) {
          continue;
        }
        schema.put(apiName, new AchievementSchema(
            apiName,
            item.path("displayName").asText(apiName),
            item.path("description").asText(""),
            item.path("icon").asText(""),
            item.path("icongray").asText("")
        ));
      }
    }
    schemaCache.put(appId, schema);
    return schema;
  }

  private JsonNode fetchJson(String url) throws Exception {
    HttpRequest request = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(12))
        .header("User-Agent", "StrategiumID/1.0")
        .GET()
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    if (response.statusCode() >= 400) {
      throw new IllegalStateException("Steam API returned " + response.statusCode());
    }
    return objectMapper.readTree(response.body());
  }

  private String playerAchievementsUrl(String steamId, int appId) {
    return STEAM_API_BASE + "/ISteamUserStats/GetPlayerAchievements/v1/?key=" + enc(apiKey)
        + "&steamid=" + enc(steamId)
        + "&appid=" + appId
        + "&l=" + enc(language);
  }

  private String schemaUrl(int appId) {
    return STEAM_API_BASE + "/ISteamUserStats/GetSchemaForGame/v2/?key=" + enc(apiKey)
        + "&appid=" + appId
        + "&l=" + enc(language);
  }

  private Map<Integer, Integer> playtimeByAppId(String steamId) {
    if (apiKey.isBlank()) {
      return Map.of();
    }

    try {
      JsonNode games = fetchJson(ownedGamesUrl(steamId)).path("response").path("games");
      if (!games.isArray()) {
        return Map.of();
      }
      Map<Integer, Integer> result = new HashMap<>();
      for (JsonNode game : games) {
        result.put(game.path("appid").asInt(), game.path("playtime_forever").asInt(0));
      }
      return result;
    } catch (Exception ignored) {
      return Map.of();
    }
  }

  private String ownedGamesUrl(String steamId) {
    return STEAM_API_BASE + "/IPlayerService/GetOwnedGames/v0001/?key=" + enc(apiKey)
        + "&steamid=" + enc(steamId)
        + "&include_appinfo=0"
        + "&include_played_free_games=1"
        + "&format=json";
  }

  private static SteamGameAchievementsResponse unavailable(SupportedSteamGame game, String message, int playtimeMinutes) {
    return new SteamGameAchievementsResponse(
        game.appId(),
        game.slug(),
        game.title(),
        game.series(),
        game.pdx(),
        playtimeMinutes,
        hours(playtimeMinutes),
        0,
        0,
        0,
        false,
        message,
        List.of()
    );
  }

  private static double hours(int playtimeMinutes) {
    return Math.round((playtimeMinutes / 60.0) * 10.0) / 10.0;
  }

  private static final class LeaderboardAccumulator {

    private final UserAccount user;
    private final String steamId;
    private int totalUnlocked;
    private int totalAchievements;
    private int totalPlaytimeMinutes;
    private int gamesCount;
    private Instant updatedAt = Instant.EPOCH;

    private LeaderboardAccumulator(UserAccount user, String steamId) {
      this.user = user;
      this.steamId = steamId;
    }

    private void add(SteamUserGameStats stats) {
      totalUnlocked += stats.getUnlockedCount();
      totalAchievements += stats.getTotalCount();
      totalPlaytimeMinutes += stats.getPlaytimeMinutes();
      gamesCount++;
      if (stats.getUpdatedAt() != null && stats.getUpdatedAt().isAfter(updatedAt)) {
        updatedAt = stats.getUpdatedAt();
      }
    }

    private UserAccount user() {
      return user;
    }

    private String steamId() {
      return steamId;
    }

    private int totalUnlocked() {
      return totalUnlocked;
    }

    private int totalAchievements() {
      return totalAchievements;
    }

    private int totalPlaytimeMinutes() {
      return totalPlaytimeMinutes;
    }

    private int gamesCount() {
      return gamesCount;
    }

    private int progressPercent() {
      return totalAchievements == 0 ? 0 : Math.round((totalUnlocked * 100f) / totalAchievements);
    }

    private Instant updatedAt() {
      return updatedAt;
    }
  }

  private static String firstNotBlank(String first, String second, String fallback) {
    if (first != null && !first.isBlank()) {
      return first;
    }
    if (second != null && !second.isBlank()) {
      return second;
    }
    return fallback;
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private record AchievementSchema(
      String apiName,
      String name,
      String description,
      String iconUrl,
      String iconGrayUrl
  ) {

    private static AchievementSchema empty(String apiName) {
      return new AchievementSchema(apiName, apiName, "", "", "");
    }
  }
}
