package com.hubilon.sso.adapter.in.web.dto;

import com.hubilon.sso.domain.model.ServiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ServiceRequest(
    @NotBlank String name,
    String description,
    @NotBlank
    @Pattern(regexp = "^https?://.*$", message = "올바른 URL 형식을 입력해 주세요")
    String url,
    @NotNull ServiceStatus status
) {}
