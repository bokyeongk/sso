package com.hubilon.sso.infrastructure.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INTERNAL_SERVER_ERROR("E001"),
    INVALID_INPUT("E002"),
    UNAUTHORIZED("E003"),
    FORBIDDEN("E004"),
    NOT_FOUND("E005"),
    AUTH_TOKEN_EXCHANGE_FAILED("E006"),
    DECRYPTION_FAILED("E007"),
    SERVICE_NOT_FOUND("E008"),
    DUPLICATE_USERNAME("E009"),
    DUPLICATE_EMAIL("E010");

    private final String code;
}
