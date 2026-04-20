package com.hubilon.sso.infrastructure.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INTERNAL_SERVER_ERROR("E001", "내부 서버 오류"),
    INVALID_INPUT("E002", "잘못된 입력값"),
    UNAUTHORIZED("E003", "인증이 필요합니다"),
    FORBIDDEN("E004", "접근 권한이 없습니다"),
    NOT_FOUND("E005", "리소스를 찾을 수 없습니다");

    private final String code;
    private final String message;
}
