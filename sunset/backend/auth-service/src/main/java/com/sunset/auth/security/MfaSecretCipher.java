package com.sunset.auth.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

public final class MfaSecretCipher {
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SecretKeySpec key;

    public MfaSecretCipher(String encodedKey) {
        byte[] decoded = Base64.getDecoder().decode(encodedKey);
        if (decoded.length != 32) throw new IllegalArgumentException("MFA_ENCRYPTION_KEY должен содержать 32 байта в Base64");
        this.key = new SecretKeySpec(decoded, "AES");
    }

    public String encrypt(byte[] secret, UUID userId) {
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(userBytes(userId));
            byte[] ciphertext = cipher.doFinal(secret);
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + ciphertext.length)
                    .put(nonce).put(ciphertext).array());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Не удалось защитить MFA-секрет", exception);
        }
    }

    public byte[] decrypt(String stored, UUID userId) {
        try {
            byte[] packed = Base64.getDecoder().decode(stored);
            if (packed.length < NONCE_BYTES + 16) throw new IllegalArgumentException("Повреждён MFA-секрет");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key,
                    new GCMParameterSpec(TAG_BITS, packed, 0, NONCE_BYTES));
            cipher.updateAAD(userBytes(userId));
            return cipher.doFinal(packed, NONCE_BYTES, packed.length - NONCE_BYTES);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Не удалось прочитать MFA-секрет", exception);
        }
    }

    private static byte[] userBytes(UUID userId) {
        return ByteBuffer.allocate(16).putLong(userId.getMostSignificantBits())
                .putLong(userId.getLeastSignificantBits()).array();
    }
}
