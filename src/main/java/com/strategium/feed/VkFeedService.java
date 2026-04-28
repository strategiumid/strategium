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
import java.util.Comparator;
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
  private final String domain;
  private final int count;
  private final String sourceName;
  private final String sourceAvatarUrl;

  public VkFeedService(
      ObjectMapper objectMapper,
      @Value("${strategium.vk.access-token:}") String accessToken,
      @Value("${strategium.vk.domain:strategium}") String domain,
      @Value("${strategium.vk.count:8}") int count,
      @Value("${strategium.vk.source-name:Strategium}") String sourceName,
      @Value("${strategium.vk.source-avatar-url:}") String sourceAvatarUrl
  ) {
    this.httpClient = HttpClient.newHttpClient();
    this.objectMapper = objectMapper;
    this.accessToken = accessToken == null ? "" : accessToken.trim();
    this.domain = domain == null || domain.isBlank() ? "strategium" : domain.trim();
    this.count = Math.max(1, Math.min(count, 25));
    this.sourceName = sourceName == null || sourceName.isBlank() ? "Strategium" : sourceName.trim();
    this.sourceAvatarUrl = sourceAvatarUrl == null ? "" : sourceAvatarUrl.trim();
  }

  public List<VkPostResponse> loadStrategiumPosts() {
    try {
      HttpRequest request = HttpRequest.newBuilder(URI.create(buildVkUrl()))
          .GET()
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        return fallback("VK API вернул HTTP " + response.statusCode() + ".");
      }

      JsonNode root = objectMapper.readTree(response.body());
      if (root.has("error")) {
        String message = root.path("error").path("error_msg").asText("VK API error");
        return fallback("Не удалось загрузить ленту VK: " + message + ".");
      }

      JsonNode responseNode = root.path("response");
      SourceInfo sourceInfo = sourceInfo(responseNode.path("groups"));
      JsonNode items = responseNode.path("items");
      if (!items.isArray()) {
        return fallback("VK API не вернул список постов.");
      }

      List<VkPostResponse> posts = new ArrayList<>();
      for (JsonNode item : items) {
        String text = item.path("text").asText("").trim();
        List<VkAttachmentResponse> attachments = parseAttachments(item.path("attachments"));
        if (text.isEmpty() && attachments.isEmpty()) {
          continue;
        }
        long ownerId = item.path("owner_id").asLong();
        long id = item.path("id").asLong();
        long date = item.path("date").asLong();
        posts.add(new VkPostResponse(
            ownerId + "_" + id,
            firstLine(text),
            text,
            FORMATTER.format(Instant.ofEpochSecond(date)),
            "https://vk.com/wall" + ownerId + "_" + id,
            sourceInfo.name(),
            sourceInfo.avatarUrl(),
            item.path("likes").path("count").asInt(0),
            item.path("comments").path("count").asInt(0),
            item.path("reposts").path("count").asInt(0),
            item.path("views").path("count").asInt(0),
            attachments,
            false
        ));
      }
      return posts.isEmpty() ? fallback("В группе нет доступных постов для отображения.") : posts;
    } catch (Exception ignored) {
      return fallback("Не удалось загрузить ленту автоматически в этом окружении.");
    }
  }

  private String buildVkUrl() {
    StringBuilder url = new StringBuilder("https://api.vk.com/method/wall.get?domain=")
        .append(URLEncoder.encode(domain, StandardCharsets.UTF_8))
        .append("&count=")
        .append(count)
        .append("&filter=owner&extended=1&v=5.199");
    if (!accessToken.isBlank()) {
      url.append("&access_token=").append(URLEncoder.encode(accessToken, StandardCharsets.UTF_8));
    }
    return url.toString();
  }

  private List<VkAttachmentResponse> parseAttachments(JsonNode attachmentsNode) {
    if (!attachmentsNode.isArray()) {
      return List.of();
    }

    List<VkAttachmentResponse> attachments = new ArrayList<>();
    for (JsonNode attachment : attachmentsNode) {
      String type = attachment.path("type").asText("");
      if ("photo".equals(type)) {
        JsonNode photo = attachment.path("photo");
        largestPhotoUrl(photo).ifPresent(imageUrl ->
            attachments.add(new VkAttachmentResponse("photo", "", "", "", imageUrl))
        );
      } else if ("link".equals(type)) {
        JsonNode link = attachment.path("link");
        attachments.add(new VkAttachmentResponse(
            "link",
            link.path("title").asText("Ссылка"),
            link.path("caption").asText(link.path("description").asText("")),
            link.path("url").asText(""),
            largestPhotoUrl(link.path("photo")).orElse("")
        ));
      } else if ("video".equals(type)) {
        JsonNode video = attachment.path("video");
        attachments.add(new VkAttachmentResponse(
            "video",
            video.path("title").asText("Видео"),
            "Видео VK",
            video.path("player").asText(""),
            largestImageUrl(video.path("image")).orElse("")
        ));
      } else if ("doc".equals(type)) {
        JsonNode doc = attachment.path("doc");
        attachments.add(new VkAttachmentResponse(
            "doc",
            doc.path("title").asText("Документ"),
            doc.path("ext").asText("").toUpperCase(),
            doc.path("url").asText(""),
            doc.path("preview").path("photo").path("sizes").isArray()
                ? largestImageUrl(doc.path("preview").path("photo").path("sizes")).orElse("")
                : ""
        ));
      }
    }
    return attachments;
  }

  private SourceInfo sourceInfo(JsonNode groupsNode) {
    if (groupsNode.isArray() && !groupsNode.isEmpty()) {
      JsonNode group = groupsNode.get(0);
      String name = group.path("name").asText(sourceName);
      String avatarUrl = group.path("photo_100").asText(sourceAvatarUrl);
      return new SourceInfo(name.isBlank() ? sourceName : name, avatarUrl.isBlank() ? sourceAvatarUrl : avatarUrl);
    }
    return new SourceInfo(sourceName, sourceAvatarUrl);
  }

  private static java.util.Optional<String> largestPhotoUrl(JsonNode photoNode) {
    return largestImageUrl(photoNode.path("sizes"));
  }

  private static java.util.Optional<String> largestImageUrl(JsonNode sizesNode) {
    if (!sizesNode.isArray()) {
      return java.util.Optional.empty();
    }
    List<JsonNode> sizes = new ArrayList<>();
    sizesNode.forEach(sizes::add);
    return sizes.stream()
        .max(Comparator.comparingInt(size -> size.path("width").asInt(0) * size.path("height").asInt(0)))
        .map(size -> size.path("url").asText(""))
        .filter(url -> !url.isBlank());
  }

  private static String firstLine(String text) {
    String first = text.split("\\R", 2)[0];
    return limit(first.isBlank() ? "Пост Strategium" : first, 110);
  }

  private static String limit(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength);
  }

  private List<VkPostResponse> fallback(String reason) {
    return List.of(new VkPostResponse(
        "fallback",
        "Strategium — новости",
        reason + " Для полноценной ленты укажите VK_ACCESS_TOKEN в переменных окружения Amvera.",
        "Сейчас",
        "https://vk.com/" + domain,
        sourceName,
        sourceAvatarUrl,
        0,
        0,
        0,
        0,
        List.of(),
        true
    ));
  }

  private record SourceInfo(String name, String avatarUrl) {
  }
}
