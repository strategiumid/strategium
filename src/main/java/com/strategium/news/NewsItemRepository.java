package com.strategium.news;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsItemRepository extends JpaRepository<NewsItem, UUID> {

  List<NewsItem> findAllByOrderByPublishedAtDesc();
}
