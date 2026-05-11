package com.hubilon.sso.infrastructure.crypto;

import com.hubilon.sso.infrastructure.exception.ErrorCode;
import com.hubilon.sso.infrastructure.exception.ServiceException;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.MGF1ParameterSpec;
import java.util.Base64;

@Component
public class RsaKeyHolder {
    private final KeyPair keyPair;

    public RsaKeyHolder() throws NoSuchAlgorithmException {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        this.keyPair = gen.generateKeyPair();
    }

    public String getPublicKeyBase64() {
        return Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());
    }

    public String decrypt(String base64Ciphertext) {
        try {
            byte[] encrypted = Base64.getDecoder().decode(base64Ciphertext);
            Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPPadding");
            OAEPParameterSpec spec = new OAEPParameterSpec(
                "SHA-256", "MGF1",
                new MGF1ParameterSpec("SHA-256"),
                PSource.PSpecified.DEFAULT
            );
            cipher.init(Cipher.DECRYPT_MODE, keyPair.getPrivate(), spec);
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new ServiceException(ErrorCode.DECRYPTION_FAILED);
        }
    }
}
