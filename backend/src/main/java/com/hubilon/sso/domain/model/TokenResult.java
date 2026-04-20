package com.hubilon.sso.domain.model;

public record TokenResult(String accessToken, String refreshToken, int expiresIn) {}
