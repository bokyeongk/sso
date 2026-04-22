package com.hubilon.gateway.controller;

import com.hubilon.gateway.config.GatewayProperties;
import com.hubilon.gateway.config.KeycloakProperties;
import com.hubilon.gateway.security.AllowlistValidator;
import com.hubilon.gateway.security.StateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/callback")
public class CallbackController {

    private static final Logger log = LoggerFactory.getLogger(CallbackController.class);

    private final KeycloakProperties keycloakProperties;
    private final GatewayProperties gatewayProperties;
    private final StateService stateService;
    private final AllowlistValidator allowlistValidator;
    private final WebClient webClient;

    @Value("${cookie.same-site:Lax}")
    private String sameSite;

    @Value("${cookie.secure:false}")
    private boolean secure;

    public CallbackController(
            KeycloakProperties keycloakProperties,
            GatewayProperties gatewayProperties,
            StateService stateService,
            AllowlistValidator allowlistValidator,
            WebClient.Builder webClientBuilder) {
        this.keycloakProperties = keycloakProperties;
        this.gatewayProperties = gatewayProperties;
        this.stateService = stateService;
        this.allowlistValidator = allowlistValidator;
        this.webClient = webClientBuilder.build();
    }

    @GetMapping("/{clientId}")
    public Mono<Void> handleCallback(
            @PathVariable String clientId,
            ServerWebExchange exchange) {

        if (!keycloakProperties.clients().containsKey(clientId)) {
            log.warn("[Callback] Unknown clientId={}", clientId);
            exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return exchange.getResponse().setComplete();
        }

        String code = exchange.getRequest().getQueryParams().getFirst("code");
        String state = exchange.getRequest().getQueryParams().getFirst("state");

        if (code == null || state == null) {
            log.warn("[Callback] Missing code or state — clientId={}", clientId);
            exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return exchange.getResponse().setComplete();
        }

        String cookieState = null;
        var stateCookie = exchange.getRequest().getCookies().getFirst("oauth_state");
        if (stateCookie != null) {
            cookieState = stateCookie.getValue();
        }

        if (!state.equals(cookieState)) {
            log.warn("[Callback] State mismatch — clientId={}", clientId);
            exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return exchange.getResponse().setComplete();
        }

        StateService.StatePayload statePayload;
        try {
            statePayload = stateService.verify(state);
        } catch (IllegalArgumentException e) {
            log.warn("[Callback] State verification failed — clientId={}, reason={}", clientId, e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
            return exchange.getResponse().setComplete();
        }

        exchange.getResponse().addCookie(
                ResponseCookie.from("oauth_state", "")
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite(sameSite)
                        .path("/")
                        .maxAge(Duration.ZERO)
                        .build()
        );

        KeycloakProperties.ClientConfig clientConfig = keycloakProperties.clients().get(clientId);
        String redirectUri = gatewayProperties.baseUrl() + "/callback/" + clientId;

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "authorization_code");
        formData.add("client_id", clientId);
        formData.add("client_secret", clientConfig.secret());
        formData.add("code", code);
        formData.add("redirect_uri", redirectUri);

        final StateService.StatePayload finalStatePayload = statePayload;

        return webClient.post()
                .uri(keycloakProperties.tokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        res -> Mono.error(new RuntimeException("Token exchange failed with status: " + res.statusCode())))
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(10))
                .flatMap(tokenResponse -> {
                    String accessToken = (String) tokenResponse.get("access_token");
                    String refreshToken = (String) tokenResponse.get("refresh_token");

                    if (accessToken == null) {
                        log.warn("[Callback] No access_token in response — clientId={}", clientId);
                        exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
                        return exchange.getResponse().setComplete();
                    }

                    long accessExpiresIn = tokenResponse.containsKey("expires_in")
                            ? ((Number) tokenResponse.get("expires_in")).longValue()
                            : 300L;
                    long refreshExpiresIn = tokenResponse.containsKey("refresh_expires_in")
                            ? ((Number) tokenResponse.get("refresh_expires_in")).longValue()
                            : 1800L;

                    exchange.getResponse().addCookie(buildCookie("access_token", accessToken, (int) accessExpiresIn));
                    if (refreshToken != null) {
                        exchange.getResponse().addCookie(buildCookie("refresh_token", refreshToken, (int) refreshExpiresIn));
                    }

                    String returnUrl = finalStatePayload.returnUrl();
                    String targetUrl;

                    if (returnUrl != null && !returnUrl.isBlank() && !returnUrl.startsWith("/")) {
                        // 절대 URL인 경우만 allowlist 검증 후 사용
                        try {
                            allowlistValidator.validate(returnUrl);
                            targetUrl = returnUrl;
                        } catch (IllegalArgumentException e) {
                            log.warn("[Callback] returnUrl not allowed, falling back — url={}", returnUrl);
                            targetUrl = clientConfig.serviceRedirectUrl();
                        }
                    } else {
                        // 상대경로 또는 빈 값: API 경로이므로 서비스 홈으로 이동
                        targetUrl = clientConfig.serviceRedirectUrl();
                    }

                    log.info("[Callback] Token issued, redirecting — clientId={}, target={}", clientId, targetUrl);
                    exchange.getResponse().setStatusCode(HttpStatus.FOUND);
                    exchange.getResponse().getHeaders().setLocation(URI.create(targetUrl));
                    return exchange.getResponse().setComplete();
                })
                .onErrorResume(e -> {
                    log.error("[Callback] Token exchange error — clientId={}, reason={}", clientId, e.getMessage());
                    exchange.getResponse().setStatusCode(HttpStatus.BAD_REQUEST);
                    return exchange.getResponse().setComplete();
                });
    }

    private ResponseCookie buildCookie(String name, String value, int maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
    }
}
