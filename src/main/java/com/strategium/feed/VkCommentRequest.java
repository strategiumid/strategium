package com.strategium.feed;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VkCommentRequest(
    @NotBlank
    @Size(max = 2048)
    String message
) {
}
