package com.hubilon.gateway.filter;

import com.hubilon.gateway.config.SsoProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationFilter.class);

    private static final List<String> WHITE_LIST = List.of(
            "/api/sso/auth/token",
            "/api/sso/auth/refresh",
            "/api/sso/auth/logout",
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

    private final SsoProperties ssoProperties;
    private final WebClient webClient;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public AuthenticationFilter(SsoProperties ssoProperties, WebClient.Builder webClientBuilder) {
        this.ssoProperties = ssoProperties;
        this.webClient = webClientBuilder.build();
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

        String token = null;
        if (sanitizedExchange.getRequest().getCookies().containsKey("access_token")) {
            var cookie = sanitizedExchange.getRequest().getCookies().getFirst("access_token");
            if (cookie != null) {
                token = cookie.getValue();
            }
        }
        if (token == null || token.isBlank()) {
            return unauthorizedResponse(sanitizedExchange);
        }

        final String accessToken = token;

        return webClient.get()
                .uri(ssoProperties.getIntrospectUrl())
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        res -> Mono.error(new RuntimeException("auth failed")))
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(3))
                .flatMap(body -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) body.get("data");
                    if (data == null) {
                        log.warn("[AuthFilter] introspect response has no data — path={}", path);
                        return unauthorizedResponse(sanitizedExchange);
                    }
                    String id = (String) data.get("id");
                    String role = (String) data.get("role");
                    String email = (String) data.get("email");

                    log.info("[AuthFilter] injected — X-User-Id={}, X-User-Role={}, X-User-Email={}, path={}", id, role, email, path);

                    ServerHttpRequest mutatedRequest = sanitizedExchange.getRequest().mutate()
                            .headers(headers -> {
                                if (id != null) headers.set("X-User-Id", id);
                                if (role != null) headers.set("X-User-Role", role);
                                if (email != null) headers.set("X-User-Email", email);
                            })
                            .build();
                    ServerWebExchange mutatedExchange = sanitizedExchange.mutate()
                            .request(mutatedRequest)
                            .build();

                    return chain.filter(mutatedExchange);
                })
                .onErrorResume(e -> {
                    log.warn("[AuthFilter] 401 — path={}, reason={}", path, e.getMessage());
                    return unauthorizedResponse(sanitizedExchange);
                });
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().set("X-Redirect-To", ssoProperties.getLoginPageUrl());
        return exchange.getResponse().setComplete();
    }
}
