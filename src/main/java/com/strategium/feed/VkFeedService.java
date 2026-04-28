package com.strategium.feed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class VkFeedService {

  private static final DateTimeFormatter FORMATTER = DateTimeFormatter
      .ofPattern("dd.MM.yyyy, HH:mm")
      .withZone(ZoneId.of("Europe/Moscow"));

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final String accessToken;

  public VkFeedService(ObjectMapper objectMapper, @Value("${strategium.vk.access-token:}") String accessToken) {
    this.httpClient = HttpClient.newHttpClient();
    this.objectMapper = objectMapper;
    this.accessToken = accessToken == null ? "" : accessToken.trim();
  }

  public List<VkPostResponse> loadStrategiumPosts() {
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(buildVkUrl()))
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        return fallback();
      }

      JsonNode items = objectMapper.readTree(response.body()).path("response").path("items");
      if (!items.isArray()) {
        return fallback();
      }

      List<VkPostResponse> posts = new ArrayList<>();
      for (JsonNode item : items) {
        String text = item.path("text").asText("").trim();
        if (text.isEmpty()) {
          continue;
        }
        long ownerId = item.path("owner_id").asLong();
        long id = item.path("id").asLong();
        long date = item.path("date").asLong();
        posts.add(new VkPostResponse(
            firstLine(text),
            limit(text, 700),
            FORMATTER.format(Instant.ofEpochSecond(date)),
            "https://vk.com/wall" + ownerId + "_" + id,
            false
        ));
      }
      return posts.isEmpty() ? fallback() : posts;
    } catch (Exception ignored) {
      return fallback();
    }
  }

  private String buildVkUrl() {
    StringBuilder url = new StringBuilder("https://api.vk.com/method/wall.get?domain=strategium&count=8&filter=owner&v=5.199");
    if (!accessToken.isBlank()) {
      url.append("&access_token=").append(URLEncoder.encode(accessToken, StandardCharsets.UTF_8));
    }
    return url.toString();
  }

  private static String firstLine(String text) {
    String first = text.split("\\R", 2)[0];
    return limit(first.isBlank() ? "Пост Strategium" : first, 110);
  }

  private static String limit(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength);
  }

  private static List<VkPostResponse> fallback() {
    return List.of(new VkPostResponse(
        "Strategium — новости",
        "Не удалось загрузить ленту автоматически в этом окружении. Откройте группу напрямую.",
        "Сейчас",
        "https://vk.com/strategium",
        true
    ));
  }
}
