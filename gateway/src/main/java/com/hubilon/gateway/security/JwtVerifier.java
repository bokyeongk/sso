package com.hubilon.gateway.security;

import com.hubilon.gateway.config.GatewayProperties;
import com.hubilon.gateway.config.KeycloakProperties;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Service
public class JwtVerifier {

    private final ReactiveJwtDecoder jwtDecoder;
    private final int expiryBufferSeconds;

    public JwtVerifier(KeycloakProperties keycloakProperties, GatewayProperties gatewayProperties) {
        this.jwtDecoder = NimbusReactiveJwtDecoder.withJwkSetUri(keycloakProperties.jwkSetUri()).build();
        this.expiryBufferSeconds = gatewayProperties.jwtExpiryBufferSeconds();
    }

    public Mono<Jwt> verify(String token) {
        if (token == null || token.isBlank()) {
            return Mono.error(new JwtException("Token is missing"));
        }

        return jwtDecoder.decode(token)
                .flatMap(jwt -> {
                    Instant expiresAt = jwt.getExpiresAt();
                    if (expiresAt != null &&
                            expiresAt.minusSeconds(expiryBufferSeconds).isBefore(Instant.now())) {
                        return Mono.error(new JwtException("expiring-soon"));
                    }
                    return Mono.just(jwt);
                });
    }
}
