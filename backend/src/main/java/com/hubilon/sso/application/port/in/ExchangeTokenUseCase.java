package com.hubilon.sso.application.port.in;

import com.hubilon.sso.domain.model.TokenResult;

public interface ExchangeTokenUseCase {
    TokenResult exchange(String code, String codeVerifier);
    TokenResult refresh(String refreshToken);
    void logout(String refreshToken);
}
