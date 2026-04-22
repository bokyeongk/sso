package com.hubilon.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "gateway")
public record GatewayProperties(
        String baseUrl,
        Map<String, String> pathToClientId,
        List<String> allowedRedirectDomains,
        String stateHmacSecret,
        int jwtExpiryBufferSeconds
) {}
