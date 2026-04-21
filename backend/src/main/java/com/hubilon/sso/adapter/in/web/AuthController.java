package com.hubilon.sso.adapter.in.web;

import com.hubilon.sso.adapter.in.web.dto.TokenRequest;
import com.hubilon.sso.application.port.in.ExchangeTokenUseCase;
import com.hubilon.sso.domain.model.TokenResult;
import com.hubilon.sso.infrastructure.response.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final ExchangeTokenUseCase exchangeTokenUseCase;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    @PostMapping("/token")
    public ApiResponse<Void> token(@Validated @RequestBody TokenRequest request,
                                   HttpServletResponse response) {
        TokenResult result = exchangeTokenUseCase.exchange(request.code(), request.codeVerifier());
        setTokenCookies(response, result);
        return ApiResponse.ok();
    }

    @PostMapping("/refresh")
    public ApiResponse<Void> refresh(@CookieValue(value = "refresh_token", required = false) String refreshToken,
                                     HttpServletResponse response) {
        if (refreshToken == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return ApiResponse.error("refresh_token이 없습니다.");
        }
        TokenResult result = exchangeTokenUseCase.refresh(refreshToken);
        setTokenCookies(response, result);
        return ApiResponse.ok();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@CookieValue(value = "refresh_token", required = false) String refreshToken,
                                    HttpServletResponse response) {
        if (refreshToken != null) {
            exchangeTokenUseCase.logout(refreshToken);
        }
        clearTokenCookies(response);
        return ApiResponse.ok();
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, String>> me(@AuthenticationPrincipal Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        String role = "";
        if (realmAccess != null) {
            Object rolesObj = realmAccess.get("roles");
            if (rolesObj instanceof List<?> roles && !roles.isEmpty()) {
                Object first = roles.get(0);
                role = first != null ? first.toString() : "";
            }
        }
        Map<String, String> user = Map.of(
            "id",    jwt.getSubject() != null ? jwt.getSubject() : "",
            "role",  role,
            "name",  jwt.getClaimAsString("name")  != null ? jwt.getClaimAsString("name")  : "",
            "email", jwt.getClaimAsString("email") != null ? jwt.getClaimAsString("email") : ""
        );
        return ApiResponse.ok(user);
    }

    private void setTokenCookies(HttpServletResponse response, TokenResult result) {
        ResponseCookie accessCookie = ResponseCookie.from("access_token", result.accessToken())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/")
            .maxAge(result.expiresIn())
            .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.refreshToken())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite("Strict")
            .path("/api/auth")
            .maxAge(Duration.ofDays(30).getSeconds())
            .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }

    private void clearTokenCookies(HttpServletResponse response) {
        ResponseCookie accessCookie = ResponseCookie.from("access_token", "")
            .httpOnly(true).secure(cookieSecure).sameSite("Strict").path("/").maxAge(0).build();
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", "")
            .httpOnly(true).secure(cookieSecure).sameSite("Strict").path("/api/auth").maxAge(0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }
}
