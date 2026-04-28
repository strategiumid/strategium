package com.strategium.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SteamProfileService {

  private static final String STEAM_API_BASE = "https://api.steampowered.com";

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();
  private final ObjectMapper objectMapper;
  private final String apiKey;

  public SteamProfileService(
      ObjectMapper objectMapper,
      @Value("${strategium.steam.web-api-key:}") String apiKey
  ) {
    this.objectMapper = objectMapper;
    this.apiKey = apiKey == null ? "" : apiKey.trim();
  }

  public Optional<String> personName(String steamId) {
    if (apiKey.isBlank() || steamId == null || steamId.isBlank()) {
      return Optional.empty();
    }

    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(profileUrl(steamId)))
          .timeout(Duration.ofSeconds(10))
          .header("User-Agent", "StrategiumID/1.0")
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        return Optional.empty();
      }

      JsonNode players = objectMapper.readTree(response.body()).path("response").path("players");
      if (!players.isArray() || players.isEmpty()) {
        return Optional.empty();
      }

      String personName = players.get(0).path("personaname").asText("");
      return personName == null || personName.isBlank() ? Optional.empty() : Optional.of(personName.trim());
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  private String profileUrl(String steamId) {
    return STEAM_API_BASE + "/ISteamUser/GetPlayerSummaries/v2/?key=" + enc(apiKey)
        + "&steamids=" + enc(steamId);
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
