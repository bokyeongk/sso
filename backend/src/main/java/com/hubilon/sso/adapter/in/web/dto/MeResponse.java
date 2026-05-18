package com.hubilon.sso.adapter.in.web.dto;

import com.hubilon.auth.UserInfo;

import java.util.List;

public record MeResponse(
        String username,
        String email,
        String name,
        List<String> roles
) {
    public static MeResponse from(UserInfo userInfo) {
        String familyName = userInfo.getAttributeAs("family_name", String.class).orElse(null);
        String givenName = userInfo.getAttributeAs("given_name", String.class).orElse(null);
        String name = (familyName != null && givenName != null)
                ? familyName + " " + givenName
                : userInfo.getAttributeAs("name", String.class).orElse(null);
        return new MeResponse(
                userInfo.getUsername(),
                userInfo.getEmail(),
                name,
                userInfo.getRoles()
        );
    }
}
