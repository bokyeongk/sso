package com.hubilon.gateway.controller;

import com.hubilon.gateway.config.KeycloakProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;

@RestController
@RequestMapping("/logout")
public class LogoutController {

    private static final Logger log = LoggerFactory.getLogger(LogoutController.class);

    private final KeycloakProperties keycloakProperties;
    private final WebClient webClient;

    @Value("${cookie.same-site:Lax}")
    private String sameSite;

    @Value("${cookie.secure:false}")
    private boolean secure;

    public LogoutController(
            KeycloakProperties keycloakProperties,
            WebClient.Builder webClientBuilder) {
        this.keycloakProperties = keycloakProperties;
        this.webClient = webClientBuilder.build();
    }

    @PostMapping
    public Mono<Void> logout(ServerWebExchange exchange) {
        String refreshToken = null;
        var refreshCookie = exchange.getRequest().getCookies().getFirst("refresh_token");
        if (refreshCookie != null) {
            refreshToken = refreshCookie.getValue();
        }

        exchange.getResponse().addCookie(deleteCookie("access_token"));
        exchange.getResponse().addCookie(deleteCookie("refresh_token"));

        if (refreshToken == null || refreshToken.isBlank()) {
            exchange.getResponse().setStatusCode(HttpStatus.OK);
            return exchange.getResponse().setComplete();
        }

        String clientId = keycloakProperties.clients().keySet().iterator().next();
        KeycloakProperties.ClientConfig clientConfig = keycloakProperties.clients().get(clientId);

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", clientId);
        formData.add("client_secret", clientConfig.secret());
        formData.add("refresh_token", refreshToken);

        final String finalRefreshToken = refreshToken;

        return webClient.post()
                .uri(keycloakProperties.logoutEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        res -> Mono.error(new RuntimeException("Keycloak logout failed with status: " + res.statusCode())))
                .toBodilessEntity()
                .timeout(Duration.ofSeconds(5))
                .then(Mono.fromRunnable(() ->
                        log.info("[Logout] Keycloak session terminated — clientId={}", clientId)
                ))
                .then(Mono.defer(() -> {
                    exchange.getResponse().setStatusCode(HttpStatus.OK);
                    return exchange.getResponse().setComplete();
                }))
                .onErrorResume(e -> {
                    log.warn("[Logout] Keycloak logout failed — reason={}", e.getMessage());
                    exchange.getResponse().getHeaders().set("X-Logout-Warning", "keycloak-session-not-terminated");
                    exchange.getResponse().setStatusCode(HttpStatus.OK);
                    return exchange.getResponse().setComplete();
                });
    }

    private ResponseCookie deleteCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
    }
}
