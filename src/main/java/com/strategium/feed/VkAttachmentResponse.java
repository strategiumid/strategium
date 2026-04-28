package com.strategium.feed;

public record VkAttachmentResponse(
    String type,
    String title,
    String description,
    String url,
    String imageUrl
) {
}
