package com.strategium.news;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "news_items")
public class NewsItem {

  @Id
  @UuidGenerator
  private UUID id;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, columnDefinition = "text")
  private String text;

  @Column(nullable = false, length = 64)
  private String tag;

  @Column(nullable = false, length = 160)
  private String sourceName;

  @Column(nullable = false, length = 600)
  private String sourceUrl;

  @Column(nullable = false)
  private LocalDate publishedAt;

  protected NewsItem() {
  }

  public NewsItem(String title, String text, String tag, String sourceName, String sourceUrl, LocalDate publishedAt) {
    this.title = title;
    this.text = text;
    this.tag = tag;
    this.sourceName = sourceName;
    this.sourceUrl = sourceUrl;
    this.publishedAt = publishedAt;
  }

  public UUID getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public String getText() {
    return text;
  }

  public String getTag() {
    return tag;
  }

  public String getSourceName() {
    return sourceName;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public LocalDate getPublishedAt() {
    return publishedAt;
  }

  public void update(String title, String text, String tag, String sourceName, String sourceUrl, LocalDate publishedAt) {
    this.title = title;
    this.text = text;
    this.tag = tag;
    this.sourceName = sourceName;
    this.sourceUrl = sourceUrl;
    this.publishedAt = publishedAt;
  }
}
