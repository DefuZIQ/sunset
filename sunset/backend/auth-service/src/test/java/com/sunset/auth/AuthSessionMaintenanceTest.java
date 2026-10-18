package com.sunset.auth;

import com.sunset.auth.service.AuthSessionMaintenance;
import com.sunset.auth.service.AuthSessionService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AuthSessionMaintenanceTest {
    @Test
    void retainsSevenDaysOfExpiredSessionHistory() {
        AuthSessionService sessions = mock(AuthSessionService.class);
        Instant before = Instant.now().minus(7, ChronoUnit.DAYS);

        new AuthSessionMaintenance(sessions).purgeExpiredSessions();

        Instant after = Instant.now().minus(7, ChronoUnit.DAYS);
        ArgumentCaptor<Instant> cutoff = ArgumentCaptor.forClass(Instant.class);
        verify(sessions).purgeExpiredBefore(cutoff.capture());
        assertThat(cutoff.getValue()).isBetween(before, after);
    }
}
