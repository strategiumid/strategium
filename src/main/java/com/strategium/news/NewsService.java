package com.strategium.news;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NewsService {

  private final NewsItemRepository newsItemRepository;

  public NewsService(NewsItemRepository newsItemRepository) {
    this.newsItemRepository = newsItemRepository;
  }

  @Transactional(readOnly = true)
  public List<NewsItemResponse> findAll(String query) {
    List<NewsItem> items = query == null || query.isBlank()
        ? newsItemRepository.findAllByOrderByPublishedAtDesc()
        : newsItemRepository.search(query.trim());
    return items
        .stream()
        .map(NewsItemResponse::from)
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
