package com.sunset.auth.security;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MfaSecretCipherTest {
    private final MfaSecretCipher cipher = new MfaSecretCipher(
            Base64.getEncoder().encodeToString(new byte[32]));

    @Test
    void protectsSecretWithUniqueNonceAndUserBinding() {
        UUID owner = UUID.randomUUID();
        byte[] secret = "temporary-totp-secret".getBytes(StandardCharsets.UTF_8);
        String first = cipher.encrypt(secret, owner);
        String second = cipher.encrypt(secret, owner);
        assertThat(first).isNotEqualTo(second);
        assertThat(cipher.decrypt(first, owner)).isEqualTo(secret);
        assertThatThrownBy(() -> cipher.decrypt(first, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsWeakEncryptionKeys() {
        assertThatThrownBy(() -> new MfaSecretCipher(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
