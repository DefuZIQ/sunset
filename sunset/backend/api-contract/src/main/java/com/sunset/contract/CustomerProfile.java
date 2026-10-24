package com.sunset.contract;

import java.time.LocalDate;
import java.util.UUID;

/** Minimal customer identity data needed by commerce; never includes credentials. */
public record CustomerProfile(UUID id, String email, String firstName, String lastName,
                              String phone, LocalDate birthday) {
    public String displayName() {
        String name = ((firstName == null ? "" : firstName) + " "
                + (lastName == null ? "" : lastName)).trim();
        return name.isBlank() ? "Клиент SUNSET" : name;
    }
}
