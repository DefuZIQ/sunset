package com.sunset.contract;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

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
        assertThatThrownBy(() -> reader.list(0, 200))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(503));
    }

    @Test void remoteDirectoryDecodesCustomerTimestamps() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        UUID id = UUID.randomUUID();
        server.createContext("/internal/customers", exchange -> {
            String body = "[{\"id\":\"" + id + "\",\"email\":\"client@example.com\","
                    + "\"firstName\":\"Анна\",\"lastName\":\"Иванова\",\"phone\":null,"
                    + "\"birthday\":null,\"role\":\"CUSTOMER\",\"createdAt\":\"2026-10-01T00:00:00Z\"}]";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (var output = exchange.getResponseBody()) { output.write(bytes); }
        });
        server.start();
        try {
            RemoteCustomerProfileReader reader = new RemoteCustomerProfileReader(
                    "http://127.0.0.1:" + server.getAddress().getPort(),
                    "test-internal-profile-secret-at-least-32-bytes");
            assertThat(reader.list(0, 200)).hasSize(1)
                    .first().extracting(CustomerDirectoryEntry::createdAt)
                    .isEqualTo(java.time.Instant.parse("2026-10-01T00:00:00Z"));
        } finally {
            server.stop(0);
        }
    }
}
