package com.sunset.contract;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class CustomerProfileReaderTest {
    @Test void formatsMissingNamesWithoutLeakingNull() {
        assertThat(new CustomerProfile(UUID.randomUUID(), "a@example.com", null, null, null, null)
                .displayName()).isEqualTo("Клиент SUNSET");
    }

    @Test void missingLocalCustomerFailsClosed() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        assertThatThrownBy(() -> new LocalCustomerProfileReader(jdbc).get(UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(404));
    }

    @Test void remoteCustomerServiceOutageDoesNotFallBackToDatabase() {
        RemoteCustomerProfileReader reader = new RemoteCustomerProfileReader("http://127.0.0.1:1",
                "test-internal-profile-secret-at-least-32-bytes");
        assertThatThrownBy(() -> reader.get(UUID.randomUUID()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(503));
    }
}
