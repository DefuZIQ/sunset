package com.sunset.auth;

import com.sunset.auth.dto.ChangePasswordRequest;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.dto.UpdateProfileRequest;
import com.sunset.auth.exceptions.InvalidPasswordException;
import com.sunset.auth.security.JwtUtil;
import com.sunset.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class AuthPostgresIntegrationTest {
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("sunset_auth_test")
            .withUsername("sunset")
            .withPassword("sunset-test");

    static { POSTGRES.start(); }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database", () -> "postgresql");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.security.jwt.secret", () -> "test-secret-that-is-at-least-32-bytes");
    }

    @Autowired private AuthService service;
    @Autowired private JwtUtil jwt;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void clearUsers() {
        jdbc.execute("TRUNCATE TABLE user_roles, users CASCADE");
    }

    @Test
    void registrationAndLoginPersistCredentialsAndRole() {
        var registered = service.registerUser(new RegisterRequest("client@sunset.test", "initial-pass-123", "Иван", "Соколов"));
        UUID userId = UUID.fromString(registered.getUuid());

        assertThat(registered.getRole()).isEqualTo("CUSTOMER");
        assertThat(jdbc.queryForObject("SELECT password FROM users WHERE id=?", String.class, userId))
                .isNotEqualTo("initial-pass-123").startsWith("$2");

        var login = service.loginUser(new LoginRequest("client@sunset.test", "initial-pass-123"));
        assertThat(jwt.extractUserId(login.getToken())).isEqualTo(userId);
        assertThatThrownBy(() -> service.registerUser(new RegisterRequest("client@sunset.test", "another-pass", "Иван", "Соколов")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Этот email уже используется");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class)).isEqualTo(1);
    }

    @Test
    void profileAndPasswordChangesSurviveDatabaseReload() {
        UUID userId = UUID.fromString(service.registerUser(
                new RegisterRequest("profile@sunset.test", "initial-pass-123", "Анна", "Иванова")).getUuid());
        UpdateProfileRequest profile = new UpdateProfileRequest();
        profile.setEmail("new@sunset.test");
        profile.setFirstName("Анна");
        profile.setLastName("Петрова");
        profile.setPhone("+79990000000");
        profile.setBirthday(LocalDate.of(1995, 5, 12));
        service.updateProfile(userId, profile);

        assertThat(jdbc.queryForObject("SELECT phone FROM users WHERE id=?", String.class, userId)).isEqualTo("+79990000000");
        assertThat(service.getProfile(userId).getBirthday()).isEqualTo(LocalDate.of(1995, 5, 12));

        ChangePasswordRequest password = new ChangePasswordRequest();
        password.setCurrentPassword("initial-pass-123");
        password.setNewPassword("replacement-pass-456");
        service.changePassword(userId, password);

        assertThatThrownBy(() -> service.loginUser(new LoginRequest("new@sunset.test", "initial-pass-123")))
                .isInstanceOf(InvalidPasswordException.class);
        assertThat(jwt.extractUserId(service.loginUser(new LoginRequest("new@sunset.test", "replacement-pass-456")).getToken()))
                .isEqualTo(userId);
    }
}
