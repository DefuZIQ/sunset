package com.sunset.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class AuthSessionMaintenance {
    private static final Logger log = LoggerFactory.getLogger(AuthSessionMaintenance.class);
    private final AuthSessionService sessions;

    public AuthSessionMaintenance(AuthSessionService sessions) {
        this.sessions = sessions;
    }

    @Scheduled(cron = "0 17 3 * * *", zone = "UTC")
    public void purgeExpiredSessions() {
        int removed = sessions.purgeExpiredBefore(Instant.now().minus(7, ChronoUnit.DAYS));
        if (removed > 0) log.info("Удалено {} старых сеансов", removed);
    }
}
