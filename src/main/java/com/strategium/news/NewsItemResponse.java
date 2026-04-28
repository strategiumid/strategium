package com.strategium.news;

import java.time.LocalDate;
import java.util.UUID;

public record NewsItemResponse(
    UUID id,
    LocalDate date,
    String title,
    String text,
    String tag,
    String sourceName,
    String sourceUrl
) {

  public static NewsItemResponse from(NewsItem item) {
    return new NewsItemResponse(
        item.getId(),
        item.getPublishedAt(),
        item.getTitle(),
        item.getText(),
        item.getTag(),
        item.getSourceName(),
        item.getSourceUrl()
    );
  }

  public static NewsItemResponse external(
      LocalDate date,
      String title,
      String text,
      String tag,
      String sourceName,
      String sourceUrl
  ) {
    return new NewsItemResponse(null, date, title, text, tag, sourceName, sourceUrl);
  }
}
