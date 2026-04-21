package com.hubilon.sso.application.service;

import com.hubilon.sso.application.port.in.ExchangeTokenUseCase;
import com.hubilon.sso.domain.model.TokenResult;
import com.hubilon.sso.infrastructure.config.KeycloakProperties;
import com.hubilon.sso.infrastructure.exception.ErrorCode;
import com.hubilon.sso.infrastructure.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthApplicationService implements ExchangeTokenUseCase {

    private final KeycloakProperties keycloakProperties;
    private final RestTemplate restTemplate;

    @Override
    public TokenResult exchange(String code, String codeVerifier) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", keycloakProperties.clientId());
        params.add("code", code);
        params.add("code_verifier", codeVerifier);
        params.add("redirect_uri", keycloakProperties.redirectUri());

        return requestToken(params);
    }

    @Override
    public TokenResult refresh(String refreshToken) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "refresh_token");
        params.add("client_id", keycloakProperties.clientId());
        params.add("refresh_token", refreshToken);

        return requestToken(params);
    }

    @Override
    public void logout(String refreshToken) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", keycloakProperties.clientId());
        params.add("refresh_token", refreshToken);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        try {
            restTemplate.postForEntity(
                keycloakProperties.logoutEndpoint(),
                new HttpEntity<>(params, headers),
                Void.class
            );
        } catch (Exception ignored) {
            // Keycloak 로그아웃 실패해도 쿠키 삭제는 보장해야 하므로 예외 무시
        }
    }

    private TokenResult requestToken(MultiValueMap<String, String> params) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.postForObject(
                keycloakProperties.tokenEndpoint(),
                new HttpEntity<>(params, headers),
                Map.class
            );

            if (body == null) throw new ServiceException(ErrorCode.AUTH_TOKEN_EXCHANGE_FAILED);

            Object expiresIn = body.getOrDefault("expires_in", 300);
            int expiresInInt = expiresIn instanceof Number n ? n.intValue() : 300;

            return new TokenResult(
                (String) body.get("access_token"),
                (String) body.get("refresh_token"),
                expiresInInt
            );
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new ServiceException(ErrorCode.AUTH_TOKEN_EXCHANGE_FAILED, e);
        }
    }
}
