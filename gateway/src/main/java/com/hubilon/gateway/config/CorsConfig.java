package com.hubilon.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${allowed.origin:http://localhost:5173}")
    private String fallbackAllowedOrigin;

    private final GatewayProperties gatewayProperties;

    public CorsConfig(GatewayProperties gatewayProperties) {
        this.gatewayProperties = gatewayProperties;
    }

    // SecurityConfig.http.cors()와 CorsWebFilter 모두에서 재사용
    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOrigins(buildAllowedOrigins());
        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.setAllowedMethods(
                Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        corsConfiguration.addAllowedHeader("*");
        corsConfiguration.setMaxAge(3600L);
        corsConfiguration.setExposedHeaders(
                Arrays.asList("X-Redirect-To", "X-Logout-Warning"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }

    @Bean
    public CorsWebFilter corsWebFilter(UrlBasedCorsConfigurationSource corsConfigurationSource) {
        return new CorsWebFilter(corsConfigurationSource);
    }

    private List<String> buildAllowedOrigins() {
        List<String> origins = new ArrayList<>();

        List<String> allowedDomains = gatewayProperties.allowedRedirectDomains();
        if (allowedDomains != null) {
            for (String domain : allowedDomains) {
                if (domain.startsWith("localhost") || domain.startsWith("127.")) {
                    origins.add("http://" + domain);
                    origins.add("https://" + domain);
                } else {
                    origins.add("https://" + domain);
                }
            }
        }

        if (fallbackAllowedOrigin != null && !fallbackAllowedOrigin.isBlank()
                && !origins.contains(fallbackAllowedOrigin)) {
            origins.add(fallbackAllowedOrigin);
        }

        return origins.isEmpty() ? List.of(fallbackAllowedOrigin) : origins;
    }
}
