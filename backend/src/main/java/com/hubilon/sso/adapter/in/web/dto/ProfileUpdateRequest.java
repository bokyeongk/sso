package com.hubilon.sso.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank String lastName,
        @NotBlank String firstName,
        @Pattern(regexp = "^[0-9\\-]{0,20}$") String telNo,
        @Size(max = 50) String teamId,
        @Size(max = 50) String rank
) {}
