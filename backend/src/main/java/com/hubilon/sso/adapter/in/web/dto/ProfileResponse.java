package com.hubilon.sso.adapter.in.web.dto;

import java.util.Map;

public record ProfileResponse(
        String username,
        String lastName,
        String firstName,
        String email,
        String telNo,
        String teamId,
        String rank
) {
    public static ProfileResponse from(Map<String, Object> info) {
        return new ProfileResponse(
                info.get("preferred_username") instanceof String s ? s : null,
                info.get("family_name") instanceof String s ? s : null,
                info.get("given_name") instanceof String s ? s : null,
                info.get("email") instanceof String s ? s : null,
                info.get("telNo") instanceof String s ? s : null,
                info.get("teamId") instanceof String s ? s : null,
                info.get("rank") instanceof String s ? s : null
        );
    }
}
