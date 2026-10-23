package com.sunset.auth;

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
