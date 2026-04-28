package com.strategium.news;

import java.util.List;
import java.util.UUID;
import java.util.Comparator;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NewsService {

  private final NewsItemRepository newsItemRepository;
  private final ParadoxNewsClient paradoxNewsClient;

  public NewsService(NewsItemRepository newsItemRepository, ParadoxNewsClient paradoxNewsClient) {
    this.newsItemRepository = newsItemRepository;
    this.paradoxNewsClient = paradoxNewsClient;
  }

  @Transactional(readOnly = true)
  public List<NewsItemResponse> findAll(String query) {
    List<NewsItemResponse> localItems = localNews(query);
    List<NewsItemResponse> paradoxItems = filterExternal(paradoxNewsClient.latestNews(), query);

    List<NewsItemResponse> combined = Stream.concat(paradoxItems.stream(), localItems.stream())
        .sorted(Comparator.comparing(NewsItemResponse::date).reversed())
        .limit(30)
        .toList();

    return combined.isEmpty() && (query == null || query.isBlank()) ? localItems : combined;
  }

  private List<NewsItemResponse> localNews(String query) {
    List<NewsItem> items = query == null || query.isBlank()
        ? newsItemRepository.findAllByOrderByPublishedAtDesc()
        : newsItemRepository.search(query.trim());
    return items
        .stream()
        .map(NewsItemResponse::from)
        .toList();
  }

  private static List<NewsItemResponse> filterExternal(List<NewsItemResponse> items, String query) {
    if (query == null || query.isBlank()) {
      return items;
    }
    String normalized = query.trim().toLowerCase();
    return items.stream()
        .filter(item -> (item.title() + " " + item.text() + " " + item.tag() + " " + item.sourceName())
            .toLowerCase()
            .contains(normalized))
        .toList();
  }

  @Transactional(readOnly = true)
  public NewsItemResponse findById(UUID id) {
    return newsItemRepository.findById(id)
        .map(NewsItemResponse::from)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found"));
  }

  @Transactional
  public NewsItemResponse create(NewsItemRequest request) {
    NewsItem item = new NewsItem(
        request.title().trim(),
        request.text().trim(),
        request.tag().trim(),
        request.sourceName().trim(),
        request.sourceUrl().trim(),
        request.publishedAt()
    );
    return NewsItemResponse.from(newsItemRepository.save(item));
  }

  @Transactional
  public NewsItemResponse update(UUID id, NewsItemRequest request) {
    NewsItem item = newsItemRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found"));
    item.update(
        request.title().trim(),
        request.text().trim(),
        request.tag().trim(),
        request.sourceName().trim(),
        request.sourceUrl().trim(),
        request.publishedAt()
    );
    return NewsItemResponse.from(item);
  }

  @Transactional
  public void delete(UUID id) {
    if (!newsItemRepository.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "News item not found");
    }
    newsItemRepository.deleteById(id);
  }
}
