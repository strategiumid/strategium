package com.strategium.faction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateFactionRequest(
    @NotBlank
    @Size(max = 120)
    String name,
    @NotBlank
    @Size(min = 2, max = 12)
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Тег: только латиница и цифры")
    String tag,
    FactionTheme theme
) {
}
