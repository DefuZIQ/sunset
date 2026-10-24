package com.sunset.auth;

import com.sunset.auth.security.MfaSecretCipher;
import com.sunset.auth.service.StaffAccountCopier;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Checks that staff identity can be installed without any customer tables. */
class StaffSchemaIntegrationTest {
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("sunset_staff_test")
            .withUsername("staff_test")
            .withPassword("staff-test");

    static { POSTGRES.start(); }

    @Test
    void isolatedSchemaEnforcesIdentityAndRoleBoundaries() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/staff/V1__staff_identity.sql"));
            assertThat(scalar(connection, "SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema='public' AND table_name LIKE 'staff_%'"))
                    .isEqualTo(8);
            assertThat(scalar(connection, "SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema='public' AND table_name='users'"))
                    .isZero();

            UUID owner = UUID.randomUUID();
            try (PreparedStatement insert = connection.prepareStatement("""
                    INSERT INTO staff_accounts(id,email,password_hash,first_name,last_name,role_code)
                    VALUES (?,?,'hashed-password','Anna','Owner','OWNER')
                    """)) {
                insert.setObject(1, owner);
                insert.setString(2, "owner@sunset.test");
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
            assertThatThrownBy(() -> execute(connection, """
                    INSERT INTO staff_accounts(email,password_hash,first_name,last_name,role_code)
                    VALUES ('OWNER@SUNSET.TEST','hash','Other','Owner','OWNER')
                    """))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> execute(connection, """
                    INSERT INTO staff_accounts(email,password_hash,first_name,last_name,role_code)
                    VALUES ('scoped@sunset.test','hash','Store','Manager','STORE_MANAGER')
                    """))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> execute(connection, """
                    INSERT INTO staff_permissions(staff_id,permission)
                    VALUES ('00000000-0000-0000-0000-000000000001','catalog:write')
                    """))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> execute(connection, """
                    INSERT INTO staff_permissions(staff_id,permission)
                    VALUES ('%s','unknown:permission')
                    """.formatted(owner)))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void copiesEmployeeWithNewIdButLeavesCustomerHistoryUntouched() throws Exception {
        String legacyDatabase = "sunset_legacy_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection target = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            execute(target, "CREATE SCHEMA staff_copy_test");
            target.setSchema("staff_copy_test");
            ScriptUtils.executeSqlScript(target, new ClassPathResource("db/staff/V1__staff_identity.sql"));
            execute(target, "CREATE DATABASE " + legacyDatabase);
            String legacyUrl = POSTGRES.getJdbcUrl().replace("/sunset_staff_test", "/" + legacyDatabase);
            try (Connection source = DriverManager.getConnection(
                    legacyUrl, POSTGRES.getUsername(), POSTGRES.getPassword())) {
                execute(source, "CREATE TABLE users(id uuid PRIMARY KEY,email text,password text,"
                        + "first_name text,last_name text,phone text,role text,created_at timestamptz)");
                execute(source, "CREATE TABLE iam_staff_role_assignments(user_id uuid PRIMARY KEY,"
                        + "role_code text,location_id uuid)");
                execute(source, "CREATE TABLE iam_user_permissions(user_id uuid,permission text)");
                execute(source, "CREATE TABLE mfa_totp(user_id uuid,secret_ciphertext text,enabled boolean,"
                        + "last_used_step bigint,failed_attempts integer,locked_until timestamptz,created_at timestamptz)");
                execute(source, "CREATE TABLE mfa_recovery_codes(user_id uuid,code_hash char(64))");
                execute(source, "CREATE TABLE orders(id uuid,user_id uuid)");
                UUID oldId = UUID.randomUUID();
                UUID orderId = UUID.randomUUID();
                MfaSecretCipher cipher = new MfaSecretCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
                byte[] secret = "old-totp-secret".getBytes(StandardCharsets.UTF_8);
                try (PreparedStatement insert = source.prepareStatement("""
                        INSERT INTO users VALUES (?,'owner@sunset.test','bcrypt-hash','Anna','Owner',
                                                 '+79990000000','ADMIN',NOW())
                        """)) {
                    insert.setObject(1, oldId);
                    insert.executeUpdate();
                }
                execute(source, "INSERT INTO iam_staff_role_assignments VALUES ('" + oldId + "','OWNER',NULL)");
                execute(source, "INSERT INTO iam_user_permissions VALUES ('" + oldId + "','catalog:write')");
                try (PreparedStatement insert = source.prepareStatement("""
                        INSERT INTO mfa_totp VALUES (?,?,TRUE,42,0,NULL,NOW())
                        """)) {
                    insert.setObject(1, oldId);
                    insert.setString(2, cipher.encrypt(secret, oldId));
                    insert.executeUpdate();
                }
                execute(source, "INSERT INTO mfa_recovery_codes VALUES ('" + oldId + "','" + "a".repeat(64) + "')");
                execute(source, "INSERT INTO orders VALUES ('" + orderId + "','" + oldId + "')");

                UUID newId = StaffAccountCopier.copy(source, target, oldId, cipher);
                assertThat(newId).isNotEqualTo(oldId);
                assertThat(StaffAccountCopier.copy(source, target, oldId, cipher)).isEqualTo(newId);
                execute(target, "CREATE TABLE users(id uuid PRIMARY KEY,email text UNIQUE,password text,"
                        + "first_name text,last_name text,phone text,role text,created_at timestamptz,updated_at timestamptz)");
                execute(target, "CREATE TABLE iam_staff_role_assignments(user_id uuid PRIMARY KEY,"
                        + "role_code text,location_id uuid)");
                execute(target, "CREATE TABLE iam_user_permissions(user_id uuid,permission text,"
                        + "PRIMARY KEY(user_id,permission))");
                execute(target, "CREATE TABLE mfa_totp(user_id uuid PRIMARY KEY,secret_ciphertext text,"
                        + "enabled boolean,last_used_step bigint,failed_attempts integer,locked_until timestamptz,"
                        + "created_at timestamptz)");
                execute(target, "CREATE TABLE mfa_recovery_codes(user_id uuid,code_hash char(64),"
                        + "PRIMARY KEY(user_id,code_hash))");
                StaffAccountCopier.installRuntimeIdentity(target, newId);
                StaffAccountCopier.installRuntimeIdentity(target, newId);
                assertThat(scalar(target, "SELECT count(*) FROM users WHERE id='" + newId
                        + "' AND role='ADMIN'")).isEqualTo(1);
                assertThat(scalar(target, "SELECT count(*) FROM mfa_totp WHERE user_id='" + newId
                        + "'")).isEqualTo(1);
                assertThat(scalar(target, "SELECT count(*) FROM iam_staff_role_assignments WHERE user_id='" + newId
                        + "' AND role_code='OWNER'")).isEqualTo(1);
                assertThat(scalar(source, "SELECT count(*) FROM orders WHERE user_id='" + oldId + "'"))
                        .isEqualTo(1);
                assertThat(scalar(source, "SELECT count(*) FROM users WHERE id='" + oldId
                        + "' AND role='ADMIN'")).isEqualTo(1);
                assertThat(scalar(target, "SELECT count(*) FROM staff_accounts WHERE id='" + newId
                        + "' AND legacy_user_id='" + oldId + "' AND role_code='OWNER'"))
                        .isEqualTo(1);
                assertThat(scalar(target, "SELECT count(*) FROM staff_permissions WHERE staff_id='" + newId + "'"))
                        .isEqualTo(1);
                assertThat(scalar(target, "SELECT count(*) FROM staff_mfa_recovery_codes WHERE staff_id='" + newId
                        + "'")).isEqualTo(1);
                try (PreparedStatement query = target.prepareStatement(
                        "SELECT secret_ciphertext FROM staff_mfa_totp WHERE staff_id=?")) {
                    query.setObject(1, newId);
                    try (ResultSet rows = query.executeQuery()) {
                        assertThat(rows.next()).isTrue();
                        assertThat(cipher.decrypt(rows.getString(1), newId)).isEqualTo(secret);
                        assertThatThrownBy(() -> cipher.decrypt(rows.getString(1), oldId))
                                .isInstanceOf(IllegalStateException.class);
                    }
                }
            }
        }
    }

    private static int scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            rows.next();
            return rows.getInt(1);
        }
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
