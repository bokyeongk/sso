package com.hubilon.gateway.controller;

import com.hubilon.gateway.config.KeycloakProperties;
import com.hubilon.gateway.security.LoginUrlBuilder;
import com.hubilon.gateway.util.CookieHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import java.util.Map;

@RestController
@RequestMapping("/api/logout")
public class LogoutController {

    private static final Logger log = LoggerFactory.getLogger(LogoutController.class);

    private final KeycloakProperties keycloakProperties;
    private final CookieHelper cookieHelper;
    private final LoginUrlBuilder loginUrlBuilder;
    private final WebClient webClient;

    public LogoutController(
            KeycloakProperties keycloakProperties,
            CookieHelper cookieHelper,
            LoginUrlBuilder loginUrlBuilder,
            WebClient.Builder webClientBuilder) {
        this.keycloakProperties = keycloakProperties;
        this.cookieHelper = cookieHelper;
        this.loginUrlBuilder = loginUrlBuilder;
        this.webClient = webClientBuilder.build();
    }

    @PostMapping
    public Mono<ResponseEntity<Map<String, String>>> logout(ServerWebExchange exchange) {
        var refreshCookie = exchange.getRequest().getCookies().getFirst("refresh_token");
        String refreshToken = (refreshCookie != null) ? refreshCookie.getValue() : null;

        exchange.getResponse().addCookie(cookieHelper.deleteCookie("access_token"));
        exchange.getResponse().addCookie(cookieHelper.deleteCookie("refresh_token"));

        String clientId = keycloakProperties.clients().keySet().iterator().next();

        if (refreshToken == null || refreshToken.isBlank()) {
            String loginUrl = loginUrlBuilder.build(clientId, "/", exchange);
            return Mono.just(ResponseEntity.ok(Map.of("loginUrl", loginUrl)));
        }

        KeycloakProperties.ClientConfig clientConfig = keycloakProperties.clients().get(clientId);

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", clientId);
        formData.add("client_secret", clientConfig.secret());
        formData.add("refresh_token", refreshToken);

        return webClient.post()
                .uri(keycloakProperties.logoutEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        res -> Mono.error(new RuntimeException("Keycloak logout failed with status: " + res.statusCode())))
                .toBodilessEntity()
                .timeout(Duration.ofSeconds(5))
                .then(Mono.defer(() -> {
                    log.info("[Logout] Keycloak session terminated — clientId={}", clientId);
                    String loginUrl = loginUrlBuilder.build(clientId, "/", exchange);
                    return Mono.just(ResponseEntity.ok(Map.of("loginUrl", loginUrl)));
                }))
                .onErrorResume(e -> {
                    log.warn("[Logout] Keycloak logout failed — reason={}", e.getMessage());
                    String loginUrl = loginUrlBuilder.build(clientId, "/", exchange) + "&prompt=login";
                    return Mono.just(ResponseEntity.ok(Map.of("loginUrl", loginUrl)));
                });
    }
}
