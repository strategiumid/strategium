package com.strategium.feed;

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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VkPostActionService {

  private static final String VK_API_BASE = "https://api.vk.com/method";
  private static final String API_VERSION = "5.199";

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();
  private final ObjectMapper objectMapper;

  public VkPostActionService(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public VkPostActionResponse like(UserAccount user, String postId) {
    VkPostRef post = parsePostRef(postId);
    JsonNode root = callVk(user, VK_API_BASE + "/likes.add?type=post"
        + "&owner_id=" + post.ownerId()
        + "&item_id=" + post.itemId()
        + "&access_token=" + enc(requiredToken(user))
        + "&v=" + enc(API_VERSION));
    return new VkPostActionResponse(true, "Лайк отправлен в VK. Всего лайков: " + root.path("response").path("likes").asInt(0));
  }

  public VkPostActionResponse comment(UserAccount user, String postId, String message) {
    VkPostRef post = parsePostRef(postId);
    String cleanMessage = message == null ? "" : message.trim();
    if (cleanMessage.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment message is empty");
    }

    callVk(user, VK_API_BASE + "/wall.createComment?owner_id=" + post.ownerId()
        + "&post_id=" + post.itemId()
        + "&message=" + enc(cleanMessage)
        + "&access_token=" + enc(requiredToken(user))
        + "&v=" + enc(API_VERSION));
    return new VkPostActionResponse(true, "Комментарий отправлен в VK.");
  }

  private JsonNode callVk(UserAccount user, String url) {
    ensureVkLinked(user);
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(url))
          .timeout(Duration.ofSeconds(12))
          .header("User-Agent", "StrategiumID/1.0")
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "VK API returned HTTP " + response.statusCode());
      }

      JsonNode root = objectMapper.readTree(response.body());
      if (root.has("error")) {
        String errorMessage = root.path("error").path("error_msg").asText("VK API error");
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, errorMessage);
      }
      return root;
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (Exception ignored) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "VK API request failed");
    }
  }

  private static void ensureVkLinked(UserAccount user) {
    if (user.getVkAccessToken() == null || user.getVkAccessToken().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VK account is not linked");
    }
    Instant expiresAt = user.getVkTokenExpiresAt();
    if (expiresAt != null && expiresAt.isBefore(Instant.now())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "VK token is expired");
    }
  }

  private static String requiredToken(UserAccount user) {
    ensureVkLinked(user);
    return user.getVkAccessToken();
  }

  private static VkPostRef parsePostRef(String postId) {
    if (postId == null || !postId.matches("-?\\d+_\\d+")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid VK post id");
    }
    String[] parts = postId.split("_", 2);
    return new VkPostRef(Long.parseLong(parts[0]), Long.parseLong(parts[1]));
  }

  private static String enc(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private record VkPostRef(long ownerId, long itemId) {
  }
}
