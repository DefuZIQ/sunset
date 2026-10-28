package com.sunset.contract;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class RemoteIamAccessTest {
    @Test
    void deniesAdministrativeActionWhenAuthIsUnavailable() {
        RemoteIamAccess access = new RemoteIamAccess("http://127.0.0.1:1",
                "test-internal-iam-secret-at-least-32-bytes", mock(JdbcTemplate.class));
        assertThatThrownBy(() -> access.require(UUID.randomUUID(), "catalog:write"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> org.assertj.core.api.Assertions.assertThat(
                        ((ResponseStatusException) error).getStatusCode().value()).isEqualTo(503));
    }
}
