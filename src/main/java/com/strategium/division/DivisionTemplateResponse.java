package com.strategium.division;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DivisionTemplateResponse(
    UUID id,
    String name,
    List<String> lineSlots,
    List<String> supportSlots,
    DivisionStats stats,
    Instant createdAt,
    Instant updatedAt
) {
}
