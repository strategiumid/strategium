package com.strategium.division;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record DivisionTemplateRequest(
    @NotBlank @Size(max = 120) String name,
    @NotNull @Size(min = 25, max = 25) List<String> lineSlots,
    @NotNull @Size(min = 5, max = 5) List<String> supportSlots
) {
}
