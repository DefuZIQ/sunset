package com.sunset.auth.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;

public final class TotpCodes {
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long STEP_SECONDS = 30;

    private TotpCodes() {}

    public static byte[] newSecret() {
        byte[] secret = new byte[20];
        RANDOM.nextBytes(secret);
        return secret;
    }

    public static String base32(byte[] bytes) {
        StringBuilder encoded = new StringBuilder((bytes.length * 8 + 4) / 5);
        int buffer = 0;
        int bits = 0;
        for (byte value : bytes) {
            buffer = (buffer << 8) | (value & 0xff);
            bits += 8;
            while (bits >= 5) {
                encoded.append(BASE32.charAt((buffer >> (bits -= 5)) & 31));
            }
        }
        if (bits > 0) encoded.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return encoded.toString();
    }

    public static String at(byte[] secret, long epochSeconds) {
        return atStep(secret, Math.floorDiv(epochSeconds, STEP_SECONDS), 6);
    }

    static String atStep(byte[] secret, long step, int digits) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(secret, "HmacSHA1"));
            byte[] digest = mac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(step).array());
            int offset = digest[digest.length - 1] & 0x0f;
            int binary = ((digest[offset] & 0x7f) << 24)
                    | ((digest[offset + 1] & 0xff) << 16)
                    | ((digest[offset + 2] & 0xff) << 8)
                    | (digest[offset + 3] & 0xff);
            int modulus = digits == 8 ? 100_000_000 : 1_000_000;
            return String.format(java.util.Locale.ROOT, "%0" + digits + "d", binary % modulus);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("TOTP недоступен", exception);
        }
    }

    public static long matchingStep(byte[] secret, String code, Instant now, long lastUsedStep) {
        if (code == null || !code.matches("[0-9]{6}")) return -1;
        long current = Math.floorDiv(now.getEpochSecond(), STEP_SECONDS);
        for (long step = current - 1; step <= current + 1; step++) {
            if (step > lastUsedStep && atStep(secret, step, 6).equals(code)) return step;
        }
        return -1;
    }
}
