package com.strategium.feed;

public record VkPostResponse(
    String title,
    String text,
    String date,
    String url,
    boolean fallback
) {
}
