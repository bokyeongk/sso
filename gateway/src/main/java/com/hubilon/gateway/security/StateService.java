package com.hubilon.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hubilon.gateway.config.GatewayProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class StateService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int STATE_TTL_SECONDS = 300;

    private final GatewayProperties gatewayProperties;
    private final ObjectMapper objectMapper;

    public StateService(GatewayProperties gatewayProperties, ObjectMapper objectMapper) {
        this.gatewayProperties = gatewayProperties;
        this.objectMapper = objectMapper;
    }

    public record StatePayload(String nonce, String returnUrl, String clientId) {}

    public String generate(String clientId, String returnUrl) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("nonce", UUID.randomUUID().toString());
            payload.put("returnUrl", returnUrl != null ? returnUrl : "");
            payload.put("clientId", clientId);
            payload.put("exp", Instant.now().plusSeconds(STATE_TTL_SECONDS).getEpochSecond());

            String payloadJson = objectMapper.writeValueAsString(payload);
            String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

            String signature = hmacSha256(encodedPayload, gatewayProperties.stateHmacSecret());
            return encodedPayload + "." + signature;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate state token", e);
        }
    }

    public StatePayload verify(String state) {
        if (state == null || !state.contains(".")) {
            throw new IllegalArgumentException("Invalid state format");
        }

        int dotIndex = state.lastIndexOf('.');
        String encodedPayload = state.substring(0, dotIndex);
        String providedSignature = state.substring(dotIndex + 1);

        String expectedSignature;
        try {
            expectedSignature = hmacSha256(encodedPayload, gatewayProperties.stateHmacSecret());
        } catch (Exception e) {
            throw new IllegalArgumentException("State signature verification failed", e);
        }

        if (!safeEquals(providedSignature, expectedSignature)) {
            throw new IllegalArgumentException("State signature mismatch");
        }

        try {
            byte[] decodedBytes = Base64.getUrlDecoder().decode(encodedPayload);
            String payloadJson = new String(decodedBytes, StandardCharsets.UTF_8);

            @SuppressWarnings("unchecked")
            Map<String, Object> payloadMap = objectMapper.readValue(payloadJson, Map.class);

            long exp = ((Number) payloadMap.get("exp")).longValue();
            if (Instant.now().getEpochSecond() > exp) {
                throw new IllegalArgumentException("State token expired");
            }

            String nonce = (String) payloadMap.get("nonce");
            String returnUrl = (String) payloadMap.get("returnUrl");
            String clientId = (String) payloadMap.get("clientId");

            return new StatePayload(nonce, returnUrl, clientId);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse state payload", e);
        }
    }

    private String hmacSha256(String data, String secret)
            throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        SecretKeySpec keySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
        mac.init(keySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
    }

    private boolean safeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
