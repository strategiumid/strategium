package com.strategium.feed;

import java.util.List;

public record VkPostResponse(
    String id,
    String title,
    String text,
    String date,
    String url,
    String authorName,
    String authorAvatarUrl,
    int likesCount,
    int commentsCount,
    int repostsCount,
    int viewsCount,
    List<VkAttachmentResponse> attachments,
    boolean fallback
) {
}
