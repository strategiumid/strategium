package com.strategium.news;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NewsItemRepository extends JpaRepository<NewsItem, UUID> {

  List<NewsItem> findAllByOrderByPublishedAtDesc();

  @Query("""
      select item from NewsItem item
      where lower(item.title) like lower(concat('%', :query, '%'))
         or lower(item.text) like lower(concat('%', :query, '%'))
         or lower(item.tag) like lower(concat('%', :query, '%'))
         or lower(item.sourceName) like lower(concat('%', :query, '%'))
      order by item.publishedAt desc
      """)
  List<NewsItem> search(@Param("query") String query);
}
