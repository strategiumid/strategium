package com.strategium.news;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record NewsItemRequest(
    @NotBlank @Size(max = 255) String title,
    @NotBlank String text,
    @NotBlank @Size(max = 64) String tag,
    @NotBlank @Size(max = 160) String sourceName,
    @NotBlank @Size(max = 600) String sourceUrl,
    @NotNull LocalDate publishedAt
) {
}
