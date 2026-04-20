package com.hubilon.sso.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record TokenRequest(
    @NotBlank String code,
    @NotBlank String codeVerifier
) {}
