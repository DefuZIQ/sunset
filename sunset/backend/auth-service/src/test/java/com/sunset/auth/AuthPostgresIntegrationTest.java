package com.sunset.auth;

import com.sunset.auth.dto.ChangePasswordRequest;
import com.sunset.auth.dto.CustomerAddress;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.dto.UpdateProfileRequest;
import com.sunset.auth.exceptions.InvalidPasswordException;
import com.sunset.auth.security.JwtUtil;
import com.sunset.auth.security.MfaSecretCipher;
import com.sunset.auth.security.TotpCodes;
import com.sunset.auth.service.AuthService;
import com.sunset.auth.service.AuthSessionService;
import com.sunset.auth.service.MfaService;
import com.sunset.auth.service.CustomerAddressService;
import com.sunset.auth.controller.IamController;
import com.sunset.auth.controller.MfaController;
import com.sunset.auth.security.AdminCookieSession;
import com.sunset.contract.IamAccess;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.security.jwt.secret", () -> "test-secret-that-is-at-least-32-bytes");
        registry.add("mfa.encryption-key", () -> "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    }

    @Autowired private AuthService service;
    @Autowired private JwtUtil jwt;
    @Autowired private AuthSessionService sessions;
    @Autowired private MfaService mfa;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CustomerAddressService addresses;
    @Autowired private IamController iam;

    @BeforeEach
    void clearUsers() {
        jdbc.execute("TRUNCATE TABLE user_roles, users CASCADE");
    }

    @Test
    void adminCanGrantAndRevokeOnlyExplicitPermissions() {
        UUID adminId = UUID.fromString(service.registerUser(new RegisterRequest(
                "admin@sunset.test", "initial-pass-123", "Анна", "Админ")).getUuid());
        UUID staffId = UUID.fromString(service.registerUser(new RegisterRequest(
                "staff@sunset.test", "initial-pass-123", "Иван", "Сотрудник")).getUuid());
        jdbc.update("UPDATE users SET role='ADMIN' WHERE id=?", adminId);
        var adminAuth = new UsernamePasswordAuthenticationToken(adminId, null);
        var staffAuth = new UsernamePasswordAuthenticationToken(staffId, null);
        IamAccess access = new IamAccess(jdbc);

        assertThatThrownBy(() -> access.require(staffId, "stock:write")).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> iam.updatePermissions(staffAuth, staffId,
                new IamController.PermissionUpdate(List.of("stock:write")))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> iam.updatePermissions(adminAuth, adminId,
                new IamController.PermissionUpdate(List.of("stock:write")))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> iam.updatePermissions(adminAuth, staffId,
                new IamController.PermissionUpdate(List.of("unknown:write")))).isInstanceOf(IllegalArgumentException.class);

        iam.updatePermissions(adminAuth, staffId, new IamController.PermissionUpdate(List.of("stock:write")));
        assertThat(access.permissions(staffId)).containsExactly("stock:write");
        assertThat(jdbc.queryForObject("SELECT role FROM users WHERE id=?", String.class, staffId)).isEqualTo("STAFF");
        access.require(staffId, "stock:write");
        assertThatThrownBy(() -> access.require(staffId, "catalog:write")).isInstanceOf(SecurityException.class);

        iam.updatePermissions(adminAuth, staffId, new IamController.PermissionUpdate(List.of("orders:manage")));
        assertThat(access.permissions(staffId)).containsExactly("orders:manage", "orders:read");

        iam.updatePermissions(adminAuth, staffId, new IamController.PermissionUpdate(List.of()));
        assertThat(access.permissions(staffId)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT role FROM users WHERE id=?", String.class, staffId)).isEqualTo("CUSTOMER");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM iam_access_audit WHERE target_id=?", Integer.class, staffId)).isEqualTo(3);
    }

    @Test
    void adminAssignsPresetRoleWithoutCreatingAnOwner() {
        UUID adminId = UUID.fromString(service.registerUser(new RegisterRequest(
                "admin-role@sunset.test", "initial-pass-123", "Анна", "Админ")).getUuid());
        UUID staffId = UUID.fromString(service.registerUser(new RegisterRequest(
                "content-role@sunset.test", "initial-pass-123", "Иван", "Контент")).getUuid());
        jdbc.update("UPDATE users SET role='ADMIN' WHERE id=?", adminId);
        var adminAuth = new UsernamePasswordAuthenticationToken(adminId, null);
        IamAccess access = new IamAccess(jdbc);

        assertThatThrownBy(() -> iam.updateRole(adminAuth, staffId, new IamController.RoleUpdate("OWNER", null)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> iam.updateRole(adminAuth, staffId, new IamController.RoleUpdate("ADMIN", null)))
                .isInstanceOf(SecurityException.class);
        iam.updateRole(adminAuth, staffId, new IamController.RoleUpdate("CONTENT_MARKETING", null));
        assertThat(access.staffRole(staffId)).isEqualTo("CONTENT_MARKETING");
        assertThat(access.permissions(staffId)).containsExactly("catalog:write", "promotions:manage", "reviews:moderate");
        assertThatThrownBy(() -> access.require(staffId, "stock:write")).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> iam.updatePermissions(adminAuth, staffId,
                new IamController.PermissionUpdate(List.of("stock:write")))).isInstanceOf(IllegalArgumentException.class);

        iam.updateRole(adminAuth, staffId, new IamController.RoleUpdate("CUSTOMER", null));
        assertThat(access.staffRole(staffId)).isNull();
        assertThat(access.permissions(staffId)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT role FROM users WHERE id=?", String.class, staffId)).isEqualTo("CUSTOMER");

        jdbc.update("INSERT INTO iam_staff_role_assignments(user_id,role_code) VALUES (?,'OWNER')", adminId);
        iam.updateRole(adminAuth, staffId, new IamController.RoleUpdate("ADMIN", null));
        assertThat(jdbc.queryForObject("SELECT role FROM users WHERE id=?", String.class, staffId)).isEqualTo("ADMIN");
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

    @Test
    void logoutAndPasswordChangeRevokeServerSideSessions() {
        UUID userId = UUID.fromString(service.registerUser(new RegisterRequest(
                "sessions@sunset.test", "initial-pass-123", "Анна", "Сеанс")).getUuid());
        String first = service.loginUser(new LoginRequest("sessions@sunset.test", "initial-pass-123")).getToken();
        String second = service.loginUser(new LoginRequest("sessions@sunset.test", "initial-pass-123")).getToken();
        assertThat(sessions.authenticatedUser(first)).isEqualTo(userId);
        assertThat(sessions.authenticatedUser(second)).isEqualTo(userId);
        assertThat(sessions.isElevatedSession(first, userId)).isFalse();

        sessions.revoke(first, userId);
        assertThat(sessions.authenticatedUser(first)).isNull();
        assertThat(sessions.authenticatedUser(second)).isEqualTo(userId);

        ChangePasswordRequest password = new ChangePasswordRequest();
        password.setCurrentPassword("initial-pass-123");
        password.setNewPassword("replacement-pass-456");
        service.changePassword(userId, password);
        assertThat(sessions.authenticatedUser(second)).isNull();
        assertThat(sessions.authenticatedUser(service.loginUser(
                new LoginRequest("sessions@sunset.test", "replacement-pass-456")).getToken())).isEqualTo(userId);
    }

    @Test
    void staffTokensHaveFifteenMinuteLifetime() {
        UUID userId = UUID.fromString(service.registerUser(new RegisterRequest(
                "staff-session@sunset.test", "initial-pass-123", "Иван", "Сотрудник")).getUuid());
        jdbc.update("UPDATE users SET role='STAFF' WHERE id=?", userId);
        var setup = service.loginUser(new LoginRequest("staff-session@sunset.test", "initial-pass-123"));
        assertThat(setup.getToken()).isNull();
        assertThat(setup.isMfaEnrollmentRequired()).isTrue();
        var enrollment = mfa.startSetup(setup.getSetupToken());
        byte[] secret = new MfaSecretCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
                .decrypt(jdbc.queryForObject("SELECT secret_ciphertext FROM mfa_totp WHERE user_id=?", String.class, userId), userId);
        assertThat(enrollment.secret()).isNotBlank();
        String token = mfa.confirmSetup(setup.getSetupToken(), TotpCodes.at(secret, Instant.now().getEpochSecond()))
                .auth().getToken();
        assertThat(jwt.parse(token).getExpiration().getTime() - jwt.parse(token).getIssuedAt().getTime())
                .isEqualTo(15 * 60 * 1000L);
        assertThat(sessions.authenticatedUser(token)).isEqualTo(userId);
        assertThat(sessions.isElevatedSession(token, userId)).isTrue();
    }

    @Test
    void mfaSetupHttpResponseSetsCookieWithoutLeakingAdminJwt() throws Exception {
        UUID userId = UUID.fromString(service.registerUser(new RegisterRequest(
                "cookie-admin@sunset.test", "initial-pass-123", "Иван", "Админ")).getUuid());
        jdbc.update("UPDATE users SET role='ADMIN' WHERE id=?", userId);
        var setup = service.loginUser(new LoginRequest("cookie-admin@sunset.test", "initial-pass-123"));
        mfa.startSetup(setup.getSetupToken());
        byte[] secret = new MfaSecretCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
                .decrypt(jdbc.queryForObject("SELECT secret_ciphertext FROM mfa_totp WHERE user_id=?", String.class, userId), userId);
        String code = TotpCodes.at(secret, Instant.now().getEpochSecond());
        var mvc = MockMvcBuilders.standaloneSetup(new MfaController(mfa,
                new AdminCookieSession("test-secret-that-is-at-least-32-bytes"))).build();

        mvc.perform(post("/auth/mfa/setup/confirm")
                        .header("X-Sunset-Request-Host", "t3ch.pro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"setupToken\":\"" + setup.getSetupToken() + "\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("Secure")))
                .andExpect(jsonPath("$.auth.token").value(nullValue()))
                .andExpect(jsonPath("$.auth.csrfToken").isString())
                .andExpect(jsonPath("$.recoveryCodes.length()").value(8));
    }

    @Test
    void adminEnrollmentRequiresTotpAndRevokesOldSessions() {
        UUID adminId = UUID.fromString(service.registerUser(new RegisterRequest(
                "mfa-admin@sunset.test", "initial-pass-123", "Анна", "Админ")).getUuid());
        jdbc.update("UPDATE users SET role='ADMIN' WHERE id=?", adminId);
        String oldToken = jwt.generateToken(adminId, "ADMIN");
        sessions.record(oldToken, adminId);
        assertThat(sessions.authenticatedUser(oldToken)).isNull();
        var setup = service.loginUser(new LoginRequest("mfa-admin@sunset.test", "initial-pass-123"));
        assertThat(setup.isMfaEnrollmentRequired()).isTrue();
        assertThat(setup.getToken()).isNull();
        var enrollment = mfa.startSetup(setup.getSetupToken());
        assertThat(enrollment.otpauthUri()).startsWith("otpauth://totp/SUNSET:");
        String encrypted = jdbc.queryForObject("SELECT secret_ciphertext FROM mfa_totp WHERE user_id=?", String.class, adminId);
        byte[] secret = new MfaSecretCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
                .decrypt(encrypted, adminId);
        assertThat(encrypted).doesNotContain(enrollment.secret());
        var completed = mfa.confirmSetup(setup.getSetupToken(), TotpCodes.at(secret, Instant.now().getEpochSecond()));
        List<String> recovery = completed.recoveryCodes();
        assertThat(recovery).hasSize(8);
        assertThat(sessions.authenticatedUser(oldToken)).isNull();
        assertThat(sessions.authenticatedUser(completed.auth().getToken())).isEqualTo(adminId);
        assertThat(mfa.confirmSetup(setup.getSetupToken(), TotpCodes.at(secret, Instant.now().getEpochSecond()))).isNull();

        var challenge = service.loginUser(new LoginRequest("mfa-admin@sunset.test", "initial-pass-123"));
        assertThat(challenge.isMfaRequired()).isTrue();
        assertThat(challenge.getToken()).isNull();
        String nextCode = TotpCodes.at(secret, (Instant.now().getEpochSecond() / 30 + 1) * 30);
        var verified = mfa.verifyLogin(challenge.getChallengeToken(), nextCode);
        assertThat(verified).isNotNull();
        assertThat(sessions.authenticatedUser(verified.getToken())).isEqualTo(adminId);
        assertThat(mfa.verifyLogin(challenge.getChallengeToken(), nextCode)).isNull();

        var replayChallenge = service.loginUser(new LoginRequest("mfa-admin@sunset.test", "initial-pass-123"));
        assertThat(mfa.verifyLogin(replayChallenge.getChallengeToken(), nextCode)).isNull();
        var supersedingChallenge = service.loginUser(new LoginRequest("mfa-admin@sunset.test", "initial-pass-123"));
        assertThat(mfa.verifyLogin(replayChallenge.getChallengeToken(), recovery.get(0))).isNull();
        assertThat(mfa.verifyLogin(supersedingChallenge.getChallengeToken(), recovery.get(0))).isNotNull();
        assertThat(mfa.recoveryCodesRemaining(adminId)).isEqualTo(7);

        var recoveryChallenge = service.loginUser(new LoginRequest("mfa-admin@sunset.test", "initial-pass-123"));
        var recovered = mfa.verifyLogin(recoveryChallenge.getChallengeToken(), recovery.get(2));
        assertThat(recovered).isNotNull();
        assertThat(mfa.recoveryCodesRemaining(adminId)).isEqualTo(6);
        assertThat(sessions.authenticatedUser(recovered.getToken())).isEqualTo(adminId);
        assertThat(service.loginUser(new LoginRequest("mfa-admin@sunset.test", "initial-pass-123"))
                .isMfaRequired()).isTrue();
    }

    @Test
    void oldExpiredSessionsArePurgedWithoutTouchingActiveSessions() {
        UUID userId = UUID.fromString(service.registerUser(new RegisterRequest(
                "cleanup@sunset.test", "initial-pass-123", "Анна", "Очистка")).getUuid());
        String oldToken = service.loginUser(new LoginRequest("cleanup@sunset.test", "initial-pass-123")).getToken();
        String activeToken = service.loginUser(new LoginRequest("cleanup@sunset.test", "initial-pass-123")).getToken();
        UUID oldSession = UUID.fromString(jwt.parse(oldToken).getId());
        jdbc.update("UPDATE auth_sessions SET issued_at=NOW()-INTERVAL '10 days', "
                + "expires_at=NOW()-INTERVAL '8 days' WHERE id=?", oldSession);

        assertThat(sessions.purgeExpiredBefore(java.time.Instant.now().minus(7, java.time.temporal.ChronoUnit.DAYS)))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_sessions WHERE id=?", Integer.class, oldSession))
                .isZero();
        assertThat(sessions.authenticatedUser(activeToken)).isEqualTo(userId);
    }

    @Test
    void addressesPersistAndStayPrivateToTheirOwner() {
        UUID owner = UUID.fromString(service.registerUser(new RegisterRequest("owner@sunset.test", "initial-pass-123", "Анна", "Иванова")).getUuid());
        UUID stranger = UUID.fromString(service.registerUser(new RegisterRequest("stranger@sunset.test", "initial-pass-123", "Иван", "Соколов")).getUuid());
        CustomerAddress draft = new CustomerAddress(null, "Дом", "Нижний Новгород", "Большая Покровская", "34",
                "2", null, "1", "3", "12", null, "603000", "Позвонить заранее", 56.3269, 44.0059);

        CustomerAddress saved = addresses.create(owner, draft);
        assertThat(addresses.list(owner)).containsExactly(saved);
        assertThat(addresses.list(stranger)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM customer_addresses WHERE user_id=?", Integer.class, owner)).isEqualTo(1);

        CustomerAddress changed = new CustomerAddress(null, "Работа", draft.city(), draft.street(), draft.house(),
                draft.building(), draft.structure(), draft.entrance(), draft.floor(), "18", draft.intercom(),
                draft.postalCode(), draft.comment(), draft.lat(), draft.lon());
        assertThatThrownBy(() -> addresses.update(stranger, saved.id(), changed)).hasMessageContaining("Адрес не найден");
        assertThatThrownBy(() -> addresses.delete(stranger, saved.id())).hasMessageContaining("Адрес не найден");
        assertThat(addresses.update(owner, saved.id(), changed).apartment()).isEqualTo("18");
        assertThat(addresses.list(owner)).singleElement().extracting(CustomerAddress::label).isEqualTo("Работа");
        addresses.delete(owner, saved.id());
        assertThat(addresses.list(owner)).isEmpty();
    }

    @Test
    void invalidAddressIsNotSaved() {
        UUID owner = UUID.fromString(service.registerUser(new RegisterRequest("validation@sunset.test", "initial-pass-123", "Анна", "Иванова")).getUuid());
        CustomerAddress invalid = new CustomerAddress(null, "Дом", "Нижний Новгород", "", "34",
                null, null, null, null, null, null, null, null, 91.0, 44.0);
        assertThatThrownBy(() -> addresses.create(owner, invalid)).isInstanceOf(IllegalArgumentException.class);
        assertThat(addresses.list(owner)).isEmpty();
    }
}
