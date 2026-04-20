package com.hubilon.sso.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(String url, String realm, String clientId, String redirectUri) {

    public String tokenEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/token";
    }

    public String logoutEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/logout";
    }
}
