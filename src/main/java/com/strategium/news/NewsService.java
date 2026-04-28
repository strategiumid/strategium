package com.strategium.news;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NewsService {

  private final NewsItemRepository newsItemRepository;

  public NewsService(NewsItemRepository newsItemRepository) {
    this.newsItemRepository = newsItemRepository;
  }

  @Transactional(readOnly = true)
  public List<NewsItemResponse> findAll() {
    return newsItemRepository.findAllByOrderByPublishedAtDesc()
        .stream()
        .map(NewsItemResponse::from)
        .toList();
  }
}
