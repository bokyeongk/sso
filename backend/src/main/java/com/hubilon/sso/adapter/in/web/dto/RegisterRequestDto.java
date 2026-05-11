package com.hubilon.sso.adapter.in.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record RegisterRequestDto(
    @NotBlank String username,
    @NotBlank String password,
    @NotBlank String lastName,
    @NotBlank String firstName,
    @Email @NotBlank String email,
    Map<String, Object> attributes
) {}
