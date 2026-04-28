package com.strategium.news;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ParadoxNewsClient {

  private static final String PARADOX_HOST = "https://www.paradoxinteractive.com";
  private static final Pattern NEWS_LINK_PATTERN = Pattern.compile(
      "<a[^>]+href=[\"'](?<href>(?:https://www\\.paradoxinteractive\\.com)?/games/[^\"']+/news/[^\"']+)[\"'][^>]*>(?<body>.*?)</a>",
      Pattern.CASE_INSENSITIVE | Pattern.DOTALL
  );
  private static final Pattern DATE_PATTERN = Pattern.compile("(20\\d{2}-\\d{2}-\\d{2})");

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();
  private final boolean enabled;
  private final List<String> sourceUrls;
  private final Duration cacheTtl;

  private Instant cacheExpiresAt = Instant.EPOCH;
  private List<NewsItemResponse> cachedNews = List.of();

  public ParadoxNewsClient(
      @Value("${strategium.paradox.enabled:true}") boolean enabled,
      @Value("${strategium.paradox.sources:}") String sourceUrls,
      @Value("${strategium.paradox.cache-ttl-minutes:30}") long cacheTtlMinutes
  ) {
    this.enabled = enabled;
    this.sourceUrls = splitSources(sourceUrls);
    this.cacheTtl = Duration.ofMinutes(cacheTtlMinutes);
  }

  public synchronized List<NewsItemResponse> latestNews() {
    if (!enabled || sourceUrls.isEmpty()) {
      return List.of();
    }
    Instant now = Instant.now();
    if (now.isBefore(cacheExpiresAt)) {
      return cachedNews;
    }

    List<NewsItemResponse> loaded = loadNews();
    if (!loaded.isEmpty()) {
      cachedNews = loaded;
      cacheExpiresAt = now.plus(cacheTtl);
    }
    return cachedNews;
  }

  private List<NewsItemResponse> loadNews() {
    Map<String, NewsItemResponse> byUrl = new LinkedHashMap<>();
    for (String sourceUrl : sourceUrls) {
      try {
        String html = fetch(sourceUrl);
        parseSource(sourceUrl, html).forEach(item -> byUrl.putIfAbsent(item.sourceUrl(), item));
      } catch (Exception ignored) {
        // One broken source must not prevent other Paradox games from loading.
      }
    }

    return byUrl.values().stream()
        .sorted(Comparator.comparing(NewsItemResponse::date).reversed())
        .limit(24)
        .toList();
  }

  private String fetch(String sourceUrl) throws Exception {
    HttpRequest request = HttpRequest.newBuilder(URI.create(sourceUrl))
        .timeout(Duration.ofSeconds(12))
        .header("User-Agent", "StrategiumID/1.0")
        .GET()
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    if (response.statusCode() >= 400) {
      throw new IllegalStateException("Paradox news source returned " + response.statusCode());
    }
    return response.body();
  }

  private List<NewsItemResponse> parseSource(String sourceUrl, String html) {
    List<NewsItemResponse> items = new ArrayList<>();
    Matcher matcher = NEWS_LINK_PATTERN.matcher(html);
    while (matcher.find()) {
      String href = absoluteUrl(matcher.group("href"));
      String text = cleanText(matcher.group("body"));
      Matcher dateMatcher = DATE_PATTERN.matcher(text);
      if (!dateMatcher.find()) {
        continue;
      }

      LocalDate date = LocalDate.parse(dateMatcher.group(1));
      String title = text.substring(dateMatcher.end()).trim();
      if (title.isBlank()) {
        continue;
      }

      String gameName = gameName(sourceUrl);
      items.add(NewsItemResponse.external(
          date,
          title,
          "Официальная новость Paradox Interactive по игре " + gameName + ".",
          gameTag(sourceUrl),
          "Paradox Interactive",
          href
      ));
    }
    return items;
  }

  private static List<String> splitSources(String sourceUrls) {
    if (sourceUrls == null || sourceUrls.isBlank()) {
      return List.of();
    }
    return List.of(sourceUrls.split(",")).stream()
        .map(String::trim)
        .filter(source -> !source.isBlank())
        .toList();
  }

  private static String cleanText(String html) {
    return decodeEntities(html.replaceAll("<[^>]+>", " "))
        .replaceAll("\\s+", " ")
        .trim();
  }

  private static String decodeEntities(String value) {
    return value
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&rsquo;", "’")
        .replace("&lsquo;", "‘")
        .replace("&ldquo;", "“")
        .replace("&rdquo;", "”")
        .replace("&nbsp;", " ");
  }

  private static String absoluteUrl(String href) {
    return href.startsWith("http") ? href : PARADOX_HOST + href;
  }

  private static String gameTag(String sourceUrl) {
    String slug = gameSlug(sourceUrl);
    return slug.isBlank() ? "paradox" : slug;
  }

  private static String gameName(String sourceUrl) {
    String slug = gameSlug(sourceUrl);
    if (slug.isBlank()) {
      return "Paradox";
    }
    String[] words = slug.split("-");
    List<String> capitalized = new ArrayList<>();
    for (String word : words) {
      if (word.isBlank()) {
        continue;
      }
      capitalized.add(word.substring(0, 1).toUpperCase(Locale.ROOT) + word.substring(1));
    }
    return String.join(" ", capitalized);
  }

  private static String gameSlug(String sourceUrl) {
    Matcher matcher = Pattern.compile("/games/([^/]+)/news").matcher(sourceUrl);
    return matcher.find() ? matcher.group(1) : "";
  }
}
