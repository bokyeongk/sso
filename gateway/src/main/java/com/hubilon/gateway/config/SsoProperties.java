package com.hubilon.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sso")
public class SsoProperties {

    private String introspectUrl;
    private String loginPageUrl;

    public String getIntrospectUrl() {
        return introspectUrl;
    }

    public void setIntrospectUrl(String introspectUrl) {
        this.introspectUrl = introspectUrl;
    }

    public String getLoginPageUrl() {
        return loginPageUrl;
    }

    public void setLoginPageUrl(String loginPageUrl) {
        this.loginPageUrl = loginPageUrl;
    }
}
