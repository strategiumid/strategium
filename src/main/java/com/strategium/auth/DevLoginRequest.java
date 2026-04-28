package com.strategium.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DevLoginRequest(
    @NotBlank @Size(max = 120) String displayName
) {
}
