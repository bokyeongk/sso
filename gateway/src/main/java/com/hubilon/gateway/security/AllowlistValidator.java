package com.hubilon.gateway.security;

import com.hubilon.gateway.config.GatewayProperties;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;

@Service
public class AllowlistValidator {

    private final List<String> allowedRedirectDomains;

    public AllowlistValidator(GatewayProperties gatewayProperties) {
        this.allowedRedirectDomains = gatewayProperties.allowedRedirectDomains();
    }

    public boolean isAllowed(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            int port = uri.getPort();
            String hostWithPort = (port != -1) ? host + ":" + port : host;
            return allowedRedirectDomains.contains(hostWithPort) ||
                    allowedRedirectDomains.contains(host);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public void validate(String url) {
        if (!isAllowed(url)) {
            throw new IllegalArgumentException("Redirect URL is not in the allowed list: " + url);
        }
    }
}
