package com.hubilon.sso.adapter.in.web;

import com.hubilon.auth.KeycloakAuthService;
import com.hubilon.auth.LoginRequest;
import com.hubilon.auth.LoginResponse;
import com.hubilon.auth.RegisterRequest;
import com.hubilon.sso.adapter.in.web.dto.LoginRequestDto;
import com.hubilon.sso.adapter.in.web.dto.PublicKeyResponse;
import com.hubilon.sso.adapter.in.web.dto.RegisterRequestDto;
import com.hubilon.sso.infrastructure.crypto.RsaKeyHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final KeycloakAuthService keycloakAuthService;
    private final RsaKeyHolder rsaKeyHolder;

    @GetMapping("/public-key")
    public ResponseEntity<PublicKeyResponse> getPublicKey() {
        return ResponseEntity.ok(new PublicKeyResponse(rsaKeyHolder.getPublicKeyBase64()));
    }

    @PostMapping("/login")
    public ResponseEntity login(
        @Valid @RequestBody LoginRequestDto dto,
        HttpServletRequest request,
        HttpServletResponse response,
        CsrfToken csrfToken
    ) {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername(dto.username());
        loginRequest.setPassword(rsaKeyHolder.decrypt(dto.password()));
        return keycloakAuthService.loginWithPassword(loginRequest, request, response, csrfToken);
    }

    @PostMapping("/register")
    public ResponseEntity register(
        @Valid @RequestBody RegisterRequestDto dto,
        CsrfToken csrfToken
    ) {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername(dto.username());
        registerRequest.setPassword(rsaKeyHolder.decrypt(dto.password()));
        registerRequest.setLastName(dto.lastName());
        registerRequest.setFirstName(dto.firstName());
        registerRequest.setEmail(dto.email());
        registerRequest.setAttributes(dto.attributes());
        return keycloakAuthService.register(registerRequest, csrfToken);
    }
}
