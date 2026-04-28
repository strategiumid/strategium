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
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VkOAuthService {

  private static final String VK_AUTHORIZE_URL = "https://oauth.vk.com/authorize";
  private static final String VK_ACCESS_TOKEN_URL = "https://oauth.vk.com/access_token";
  private static final String VK_API_BASE = "https://api.vk.com/method";
  private static final String API_VERSION = "5.199";

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();
  private final ObjectMapper objectMapper;
  private final String clientId;
  private final String clientSecret;
  private final String configuredRedirectUri;
  private final String scope;

  public VkOAuthService(
      ObjectMapper objectMapper,
      @Value("${strategium.vk.client-id:}") String clientId,
      @Value("${strategium.vk.client-secret:}") String clientSecret,
      @Value("${strategium.vk.redirect-uri:}") String configuredRedirectUri,
      @Value("${strategium.vk.oauth-scope:wall,offline}") String scope
  ) {
    this.objectMapper = objectMapper;
    this.clientId = clientId == null ? "" : clientId.trim();
    this.clientSecret = clientSecret == null ? "" : clientSecret.trim();
    this.configuredRedirectUri = configuredRedirectUri == null ? "" : configuredRedirectUri.trim();
    this.scope = scope == null || scope.isBlank() ? "wall,offline" : scope.trim();
  }

  public String authorizationUrl(String requestBaseUrl, String state) {
    ensureConfigured();
    String redirectUri = redirectUri(requestBaseUrl);
    return VK_AUTHORIZE_URL
        + "?client_id=" + enc(clientId)
        + "&redirect_uri=" + enc(redirectUri)
        + "&display=page"
        + "&scope=" + enc(scope)
        + "&response_type=code"
        + "&state=" + enc(state)
        + "&v=" + enc(API_VERSION);
  }

  public VkOAuthAccount exchangeCode(String code, String requestBaseUrl) {
    ensureConfigured();
    if (code == null || code.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VK authorization code is missing");
    }

    try {
      JsonNode tokenResponse = fetchJson(VK_ACCESS_TOKEN_URL
          + "?client_id=" + enc(clientId)
          + "&client_secret=" + enc(clientSecret)
          + "&redirect_uri=" + enc(redirectUri(requestBaseUrl))
          + "&code=" + enc(code));
      if (tokenResponse.has("error")) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, tokenResponse.path("error_description").asText("VK OAuth error"));
      }

      String accessToken = tokenResponse.path("access_token").asText("");
      String vkId = tokenResponse.path("user_id").asText("");
      long expiresIn = tokenResponse.path("expires_in").asLong(0);
      if (accessToken.isBlank() || vkId.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "VK did not return user token");
      }

      String displayName = loadDisplayName(vkId, accessToken);
      Instant expiresAt = expiresIn <= 0 ? null : Instant.now().plusSeconds(expiresIn);
      return new VkOAuthAccount(vkId, displayName, accessToken, expiresAt);
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception ignored) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "VK OAuth request failed");
    }
  }

  private String loadDisplayName(String vkId, String accessToken) throws Exception {
    JsonNode root = fetchJson(VK_API_BASE + "/users.get?user_ids=" + enc(vkId)
        + "&fields=screen_name"
        + "&access_token=" + enc(accessToken)
        + "&v=" + enc(API_VERSION));
    if (root.has("error")) {
      return "VK " + vkId;
    }

    JsonNode users = root.path("response");
    if (!users.isArray() || users.isEmpty()) {
      return "VK " + vkId;
    }
    JsonNode user = users.get(0);
    String firstName = user.path("first_name").asText("");
    String lastName = user.path("last_name").asText("");
    String fullName = (firstName + " " + lastName).trim();
    return fullName.isBlank() ? "VK " + vkId : fullName;
  }

  private JsonNode fetchJson(String url) throws Exception {
    HttpRequest request = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(12))
        .header("User-Agent", "StrategiumID/1.0")
        .GET()
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    if (response.statusCode() >= 400) {
      throw new IllegalStateException("VK returned " + response.statusCode());
    }
    return objectMapper.readTree(response.body());
  }

  private void ensureConfigured() {
    if (clientId.isBlank() || clientSecret.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "VK OAuth is not configured");
    }
  }

  private String redirectUri(String requestBaseUrl) {
    if (!configuredRedirectUri.isBlank()) {
      return configuredRedirectUri;
    }
    String baseUrl = requestBaseUrl == null || requestBaseUrl.isBlank() ? "http://localhost:8080" : requestBaseUrl;
    return trimTrailingSlash(baseUrl) + "/api/auth/vk/callback";
  }

  private static String trimTrailingSlash(String value) {
    return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  public record VkOAuthAccount(
      String vkId,
      String displayName,
      String accessToken,
      Instant expiresAt
  ) {
  }
}
