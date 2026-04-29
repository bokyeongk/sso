package com.hubilon.gateway.security;

import com.hubilon.gateway.config.GatewayProperties;
import com.hubilon.gateway.config.KeycloakProperties;
import com.hubilon.gateway.util.CookieHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class LoginUrlBuilder {

    private final KeycloakProperties keycloakProperties;
    private final GatewayProperties gatewayProperties;
    private final StateService stateService;
    private final CookieHelper cookieHelper;

    public LoginUrlBuilder(
            KeycloakProperties keycloakProperties,
            GatewayProperties gatewayProperties,
            StateService stateService,
            CookieHelper cookieHelper) {
        this.keycloakProperties = keycloakProperties;
        this.gatewayProperties = gatewayProperties;
        this.stateService = stateService;
        this.cookieHelper = cookieHelper;
    }

    public String build(String clientId, String returnUrl, ServerWebExchange exchange) {
        String state = stateService.generate(clientId, returnUrl);
        exchange.getResponse().addCookie(cookieHelper.buildCookie("oauth_state", state, 300));
        String redirectUri = gatewayProperties.baseUrl() + "/callback/" + clientId;
        return keycloakProperties.authEndpoint()
                + "?response_type=code"
                + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&scope=" + URLEncoder.encode("openid profile email", StandardCharsets.UTF_8)
                + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
    }
}
