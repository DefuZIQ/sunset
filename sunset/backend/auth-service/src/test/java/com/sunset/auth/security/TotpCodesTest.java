package com.sunset.auth.security;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class TotpCodesTest {
    private static final byte[] RFC_SECRET = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    @Test
    void matchesRfc6238Sha1Vectors() {
        assertThat(TotpCodes.atStep(RFC_SECRET, 59 / 30, 8)).isEqualTo("94287082");
        assertThat(TotpCodes.atStep(RFC_SECRET, 1111111109L / 30, 8)).isEqualTo("07081804");
        assertThat(TotpCodes.atStep(RFC_SECRET, 2000000000L / 30, 8)).isEqualTo("69279037");
    }

    @Test
    void acceptsNarrowClockSkewButNeverReusesAStep() {
        Instant now = Instant.ofEpochSecond(1_700_000_000L);
        long current = now.getEpochSecond() / 30;
        String previousCode = TotpCodes.atStep(RFC_SECRET, current - 1, 6);
        assertThat(TotpCodes.matchingStep(RFC_SECRET, previousCode, now, -1)).isEqualTo(current - 1);
        assertThat(TotpCodes.matchingStep(RFC_SECRET, previousCode, now, current - 1)).isEqualTo(-1);
        assertThat(TotpCodes.matchingStep(RFC_SECRET, "123", now, -1)).isEqualTo(-1);
    }

    @Test
    void encodesSecretForAuthenticatorEnrollment() {
        assertThat(TotpCodes.base32("foo".getBytes(StandardCharsets.US_ASCII))).isEqualTo("MZXW6");
        assertThat(TotpCodes.newSecret()).hasSize(20);
    }
}
