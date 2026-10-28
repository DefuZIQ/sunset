package com.sunset.contract;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Customer fields displayed in the staff directory; no credentials or sessions. */
public record CustomerDirectoryEntry(UUID id, String email, String firstName, String lastName,
                                     String phone, LocalDate birthday, String role, Instant createdAt) {
}
