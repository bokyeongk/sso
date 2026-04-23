package com.hubilon.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hubilon.gateway.config.GatewayProperties;
import com.hubilon.gateway.config.KeycloakProperties;
import com.hubilon.gateway.security.JwtVerifier;
import com.hubilon.gateway.security.LoginUrlBuilder;
import com.hubilon.gateway.security.StateService;
import com.hubilon.gateway.util.CookieHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationFilter.class);

    private static final List<String> WHITE_LIST = List.of(
            "/callback/**",
            "/api/logout",
            "/actuator/health",
            "/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    );

    private static final List<String> SANITIZE_HEADERS = List.of(
            "X-User-Id",
            "X-User-Role",
            "X-User-Email"
    );

    private final JwtVerifier jwtVerifier;
    private final KeycloakProperties keycloakProperties;
    private final GatewayProperties gatewayProperties;
    private final StateService stateService;
    private final CookieHelper cookieHelper;
    private final LoginUrlBuilder loginUrlBuilder;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public AuthenticationFilter(
            JwtVerifier jwtVerifier,
            KeycloakProperties keycloakProperties,
            GatewayProperties gatewayProperties,
            StateService stateService,
            CookieHelper cookieHelper,
            LoginUrlBuilder loginUrlBuilder,
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {
        this.jwtVerifier = jwtVerifier;
        this.keycloakProperties = keycloakProperties;
        this.gatewayProperties = gatewayProperties;
        this.stateService = stateService;
        this.cookieHelper = cookieHelper;
        this.loginUrlBuilder = loginUrlBuilder;
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest sanitizedRequest = exchange.getRequest().mutate()
                .headers(headers -> SANITIZE_HEADERS.forEach(headers::remove))
                .build();
        ServerWebExchange sanitizedExchange = exchange.mutate().request(sanitizedRequest).build();

        String path = sanitizedRequest.getURI().getPath();

        boolean isWhitelisted = WHITE_LIST.stream()
                .anyMatch(pattern -> pathMatcher.match(pattern, path));
        if (isWhitelisted) {
            return chain.filter(sanitizedExchange);
        }

        String accessToken = extractCookieValue(sanitizedExchange, "access_token");

        if (accessToken != null && !accessToken.isBlank()) {
            return jwtVerifier.verify(accessToken)
                    .flatMap(jwt -> proceedWithJwt(jwt, sanitizedExchange, chain))
                    .onErrorResume(e -> handleTokenError(sanitizedExchange, chain, e));
        } else {
            return handleTokenError(sanitizedExchange, chain, null);
        }
    }

    private Mono<Void> handleTokenError(ServerWebExchange exchange, GatewayFilterChain chain, Throwable cause) {
        String refreshToken = extractCookieValue(exchange, "refresh_token");
        if (refreshToken == null || refreshToken.isBlank()) {
            return handleUnauthorized(exchange);
        }
        return attemptRefresh(exchange, refreshToken, chain);
    }

    private Mono<Void> proceedWithJwt(Jwt jwt, ServerWebExchange exchange, GatewayFilterChain chain) {
        String userId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String role = extractFirstRole(jwt);

        String path = exchange.getRequest().getURI().getPath();
        log.info("[AuthFilter] injected — X-User-Id={}, X-User-Role={}, X-User-Email={}, path={}", userId, role, email, path);

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .headers(headers -> {
                    if (userId != null) headers.set("X-User-Id", userId);
                    if (role != null) headers.set("X-User-Role", role);
                    if (email != null) headers.set("X-User-Email", email);
                })
                .build();
        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @SuppressWarnings("unchecked")
    private String extractFirstRole(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null) return null;
        Object rolesObj = realmAccess.get("roles");
        if (rolesObj instanceof List<?> roles && !roles.isEmpty()) {
            return (String) roles.get(0);
        }
        return null;
    }

    private Mono<Void> attemptRefresh(ServerWebExchange exchange, String refreshToken, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String clientId = resolveClientId(path);
        KeycloakProperties.ClientConfig clientConfig = keycloakProperties.clients().get(clientId);
        if (clientConfig == null) {
            log.warn("[AuthFilter] No client config for clientId={}", clientId);
            return handleUnauthorized(exchange);
        }

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "refresh_token");
        formData.add("client_id", clientId);
        formData.add("client_secret", clientConfig.secret());
        formData.add("refresh_token", refreshToken);

        return webClient.post()
                .uri(keycloakProperties.tokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        res -> Mono.error(new RuntimeException("refresh failed with status: " + res.statusCode())))
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(5))
                .flatMap(tokenResponse -> {
                    String newAccessToken = (String) tokenResponse.get("access_token");
                    String newRefreshToken = (String) tokenResponse.get("refresh_token");

                    if (newAccessToken == null) {
                        return handleUnauthorized(exchange);
                    }

                    return Mono.fromCallable(() -> parseRawClaims(newAccessToken))
                            .flatMap(jwt -> {
                                long accessTokenExpiresIn = tokenResponse.containsKey("expires_in")
                                        ? ((Number) tokenResponse.get("expires_in")).longValue()
                                        : 300L;
                                long refreshTokenExpiresIn = tokenResponse.containsKey("refresh_expires_in")
                                        ? ((Number) tokenResponse.get("refresh_expires_in")).longValue()
                                        : 1800L;

                                exchange.getResponse().addCookie(
                                        cookieHelper.buildCookie("access_token", newAccessToken, (int) accessTokenExpiresIn));
                                if (newRefreshToken != null) {
                                    exchange.getResponse().addCookie(
                                            cookieHelper.buildCookie("refresh_token", newRefreshToken, (int) refreshTokenExpiresIn));
                                }

                                return proceedWithJwt(jwt, exchange, chain);
                            });
                })
                .onErrorResume(e -> {
                    log.warn("[AuthFilter] Refresh failed — path={}, reason={}", path, e.getMessage());
                    return handleUnauthorized(exchange);
                });
    }

    private Mono<Void> handleUnauthorized(ServerWebExchange exchange) {
        String path = exchange.getRequest().getURI().getPath();
        String query = exchange.getRequest().getURI().getRawQuery();
        String returnUrl = path + (query != null ? "?" + query : "");
        String clientId = resolveClientId(path);
        String loginUrl = loginUrlBuilder.build(clientId, returnUrl, exchange);

        if (isHtmlNavigation(exchange)) {
            exchange.getResponse().setStatusCode(HttpStatus.FOUND);
            exchange.getResponse().getHeaders().setLocation(URI.create(loginUrl));
        } else {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            exchange.getResponse().getHeaders().set("X-Redirect-To", loginUrl);
        }
        return exchange.getResponse().setComplete();
    }

    private boolean isHtmlNavigation(ServerWebExchange exchange) {
        String accept = exchange.getRequest().getHeaders().getFirst(HttpHeaders.ACCEPT);
        if (accept == null || accept.isBlank()) return false;
        if (accept.contains("application/json")) return false;
        return accept.contains("text/html");
    }

    private String resolveClientId(String path) {
        Map<String, String> pathToClientId = gatewayProperties.pathToClientId();

        if (pathToClientId != null) {
            for (Map.Entry<String, String> entry : pathToClientId.entrySet()) {
                if (pathMatcher.match(entry.getKey(), path)) {
                    return entry.getValue();
                }
            }
        }
        if (keycloakProperties.clients() != null && !keycloakProperties.clients().isEmpty()) {
            return keycloakProperties.clients().keySet().iterator().next();
        }
        throw new IllegalStateException("No client configured");
    }

    private String extractCookieValue(ServerWebExchange exchange, String cookieName) {
        var cookie = exchange.getRequest().getCookies().getFirst(cookieName);
        return (cookie != null) ? cookie.getValue() : null;
    }

    @SuppressWarnings("unchecked")
    private Jwt parseRawClaims(String rawToken) {
        try {
            String[] parts = rawToken.split("\\.");
            if (parts.length < 2) throw new IllegalArgumentException("Invalid JWT structure");

            byte[] headerBytes = Base64.getUrlDecoder().decode(padBase64(parts[0]));
            Map<String, Object> headers = objectMapper.readValue(headerBytes, Map.class);

            byte[] payloadBytes = Base64.getUrlDecoder().decode(padBase64(parts[1]));
            Map<String, Object> claims = objectMapper.readValue(payloadBytes, Map.class);

            Instant issuedAt = claims.containsKey("iat")
                    ? Instant.ofEpochSecond(((Number) claims.get("iat")).longValue()) : null;
            Instant expiresAt = claims.containsKey("exp")
                    ? Instant.ofEpochSecond(((Number) claims.get("exp")).longValue()) : null;

            return new Jwt(rawToken, issuedAt, expiresAt, headers, claims);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse JWT claims: " + e.getMessage(), e);
        }
    }

    private String padBase64(String base64) {
        int padding = (4 - base64.length() % 4) % 4;
        return base64 + "=".repeat(padding);
    }
}
