package com.strategium.steam;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SteamAchievementService {

  private static final String STEAM_API_BASE = "https://api.steampowered.com";

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();
  private final ObjectMapper objectMapper;
  private final String apiKey;
  private final String language;
  private final Map<Integer, Map<String, AchievementSchema>> schemaCache = new HashMap<>();

  public SteamAchievementService(
      ObjectMapper objectMapper,
      @Value("${strategium.steam.web-api-key:}") String apiKey,
      @Value("${strategium.steam.language:russian}") String language
  ) {
    this.objectMapper = objectMapper;
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    this.language = language == null || language.isBlank() ? "russian" : language.trim();
  }

  public List<SteamGameResponse> supportedGames() {
    return ParadoxSteamGame.SUPPORTED_GAMES.stream()
        .map(SteamGameResponse::from)
        .toList();
  }

  public SteamAchievementsSummaryResponse achievements(String steamId, String gameSlug) {
    List<ParadoxSteamGame> games = gameSlug == null || gameSlug.isBlank()
        ? ParadoxSteamGame.SUPPORTED_GAMES
        : ParadoxSteamGame.findBySlug(gameSlug).map(List::of).orElse(List.of());

    List<SteamGameAchievementsResponse> results = games.stream()
        .map(game -> achievementsForGame(steamId, game))
        .sorted(Comparator
            .comparing(SteamGameAchievementsResponse::available).reversed()
            .thenComparing(SteamGameAchievementsResponse::progressPercent, Comparator.reverseOrder())
            .thenComparing(SteamGameAchievementsResponse::title))
        .toList();

    return new SteamAchievementsSummaryResponse(steamId, results);
  }

  private SteamGameAchievementsResponse achievementsForGame(String steamId, ParadoxSteamGame game) {
    if (apiKey.isBlank()) {
      return unavailable(game, "Не задан STEAM_WEB_API_KEY.");
    }

    try {
      Map<String, AchievementSchema> schema = achievementSchema(game.appId());
      JsonNode stats = fetchJson(playerAchievementsUrl(steamId, game.appId())).path("playerstats");
      if (stats.path("success").isBoolean() && !stats.path("success").asBoolean()) {
        return unavailable(game, "Steam не вернул достижения. Проверьте приватность профиля и наличие игры.");
      }

      JsonNode achievementsNode = stats.path("achievements");
      if (!achievementsNode.isArray()) {
        return unavailable(game, "Для этой игры достижения недоступны или скрыты настройками приватности.");
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
          unlocked,
          total,
          progress,
          true,
          "",
          achievements
      );
    } catch (Exception ignored) {
      return unavailable(game, "Не удалось загрузить достижения из Steam.");
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

  private static SteamGameAchievementsResponse unavailable(ParadoxSteamGame game, String message) {
    return new SteamGameAchievementsResponse(
        game.appId(),
        game.slug(),
        game.title(),
        game.series(),
        0,
        0,
        0,
        false,
        message,
        List.of()
    );
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
