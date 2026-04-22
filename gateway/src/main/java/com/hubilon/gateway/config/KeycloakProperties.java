package com.hubilon.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;

@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(
        String url,
        String realm,
        Map<String, ClientConfig> clients
) {
    public record ClientConfig(String secret, String serviceRedirectUrl) {}

    public String tokenEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/token";
    }

    public String logoutEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/logout";
    }

    public String authEndpoint() {
        return url + "/realms/" + realm + "/protocol/openid-connect/auth";
    }

    public String jwkSetUri() {
        return url + "/realms/" + realm + "/protocol/openid-connect/certs";
    }
}
