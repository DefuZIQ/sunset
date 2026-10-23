package com.sunset.auth.service;

import com.sunset.auth.security.MfaSecretCipher;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.UUID;

/**
 * Explicit, offline copy step for the staff database migration. The legacy
 * identity is deliberately retained as the customer's identity and UUID.
 * This class is not invoked by application startup.
 */
public final class StaffAccountCopier {
    private StaffAccountCopier() {}

    public static UUID copy(Connection legacy, Connection staff, UUID legacyId, MfaSecretCipher cipher)
            throws SQLException {
        if (legacy == null || staff == null || legacyId == null || cipher == null) {
            throw new IllegalArgumentException("Укажите оба соединения, пользователя и ключ MFA");
        }
        if (databaseName(legacy).equals(databaseName(staff))) {
            throw new IllegalArgumentException("База сотрудников должна быть отдельной от клиентской");
        }
        if (!staff.getAutoCommit()) {
            throw new IllegalArgumentException("Для миграции требуется отдельная транзакция целевой базы");
        }
        boolean committed = false;
        staff.setAutoCommit(false);
        try {
            UUID existing = existingStaffId(staff, legacyId);
            if (existing != null) {
                staff.commit();
                committed = true;
                return existing;
            }
            UUID staffId = UUID.randomUUID();
            copyAccount(legacy, staff, legacyId, staffId);
            copyPermissions(legacy, staff, legacyId, staffId);
            copyMfa(legacy, staff, legacyId, staffId, cipher);
            staff.commit();
            committed = true;
            return staffId;
        } finally {
            if (!committed) staff.rollback();
            staff.setAutoCommit(true);
        }
    }

    private static String databaseName(Connection connection) throws SQLException {
        try (PreparedStatement query = connection.prepareStatement("SELECT current_database()");
             ResultSet rows = query.executeQuery()) {
            rows.next();
            return rows.getString(1);
        }
    }

    private static UUID existingStaffId(Connection staff, UUID legacyId) throws SQLException {
        try (PreparedStatement query = staff.prepareStatement(
                "SELECT id FROM staff_accounts WHERE legacy_user_id=?")) {
            query.setObject(1, legacyId);
            try (ResultSet rows = query.executeQuery()) {
                return rows.next() ? rows.getObject(1, UUID.class) : null;
            }
        }
    }

    private static void copyAccount(Connection legacy, Connection staff, UUID legacyId, UUID staffId)
            throws SQLException {
        String sql = """
                SELECT u.email,u.password,u.first_name,u.last_name,u.phone,u.role,u.created_at,
                       a.role_code,a.location_id
                FROM users u LEFT JOIN iam_staff_role_assignments a ON a.user_id=u.id
                WHERE u.id=? AND u.role IN ('ADMIN','STAFF')
                """;
        try (PreparedStatement query = legacy.prepareStatement(sql)) {
            query.setObject(1, legacyId);
            try (ResultSet row = query.executeQuery()) {
                if (!row.next()) throw new IllegalArgumentException("Сотрудник не найден в исходной базе");
                String legacyRole = row.getString("role");
                String assignedRole = row.getString("role_code");
                String role = "ADMIN".equals(legacyRole)
                        ? ("OWNER".equals(assignedRole) ? "OWNER" : "ADMIN")
                        : (assignedRole == null ? "LEGACY_STAFF" : assignedRole);
                try (PreparedStatement insert = staff.prepareStatement("""
                        INSERT INTO staff_accounts(id,legacy_user_id,email,password_hash,first_name,last_name,
                                                   phone,role_code,location_id,created_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?)
                        """)) {
                    insert.setObject(1, staffId);
                    insert.setObject(2, legacyId);
                    insert.setString(3, row.getString("email"));
                    insert.setString(4, row.getString("password"));
                    insert.setString(5, valueOrEmpty(row.getString("first_name")));
                    insert.setString(6, valueOrEmpty(row.getString("last_name")));
                    insert.setString(7, row.getString("phone"));
                    insert.setString(8, role);
                    insert.setObject(9, row.getObject("location_id", UUID.class));
                    insert.setTimestamp(10, row.getTimestamp("created_at"));
                    insert.executeUpdate();
                }
            }
        }
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private static void copyPermissions(Connection legacy, Connection staff, UUID legacyId, UUID staffId)
            throws SQLException {
        try (PreparedStatement query = legacy.prepareStatement(
                "SELECT permission FROM iam_user_permissions WHERE user_id=?")) {
            query.setObject(1, legacyId);
            try (ResultSet rows = query.executeQuery(); PreparedStatement insert = staff.prepareStatement(
                    "INSERT INTO staff_permissions(staff_id,permission) VALUES (?,?)")) {
                while (rows.next()) {
                    insert.setObject(1, staffId);
                    insert.setString(2, rows.getString(1));
                    insert.executeUpdate();
                }
            }
        }
    }

    private static void copyMfa(Connection legacy, Connection staff, UUID legacyId, UUID staffId,
                                MfaSecretCipher cipher) throws SQLException {
        try (PreparedStatement query = legacy.prepareStatement("""
                SELECT secret_ciphertext,enabled,last_used_step,failed_attempts,locked_until,created_at
                FROM mfa_totp WHERE user_id=?
                """)) {
            query.setObject(1, legacyId);
            try (ResultSet row = query.executeQuery()) {
                if (row.next()) {
                    byte[] secret = cipher.decrypt(row.getString("secret_ciphertext"), legacyId);
                    try (PreparedStatement insert = staff.prepareStatement("""
                            INSERT INTO staff_mfa_totp(staff_id,secret_ciphertext,enabled,last_used_step,
                                                       failed_attempts,locked_until,created_at)
                            VALUES (?,?,?,?,?,?,?)
                            """)) {
                        insert.setObject(1, staffId);
                        insert.setString(2, cipher.encrypt(secret, staffId));
                        insert.setBoolean(3, row.getBoolean("enabled"));
                        insert.setLong(4, row.getLong("last_used_step"));
                        insert.setInt(5, row.getInt("failed_attempts"));
                        insert.setTimestamp(6, row.getTimestamp("locked_until"));
                        insert.setTimestamp(7, row.getTimestamp("created_at"));
                        insert.executeUpdate();
                    } finally {
                        Arrays.fill(secret, (byte) 0);
                    }
                }
            }
        }
        try (PreparedStatement query = legacy.prepareStatement(
                "SELECT code_hash FROM mfa_recovery_codes WHERE user_id=?")) {
            query.setObject(1, legacyId);
            try (ResultSet rows = query.executeQuery(); PreparedStatement insert = staff.prepareStatement(
                    "INSERT INTO staff_mfa_recovery_codes(staff_id,code_hash) VALUES (?,?)")) {
                while (rows.next()) {
                    insert.setObject(1, staffId);
                    insert.setString(2, rows.getString(1));
                    insert.executeUpdate();
                }
            }
        }
    }
}
