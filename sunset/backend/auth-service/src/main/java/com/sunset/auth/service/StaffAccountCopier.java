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

    /**
     * Materialize a copied identity in the isolated Auth runtime schema. This
     * is an explicit second step: a failed copy never changes the live login
     * table, and repeating the step never creates another account.
     */
    public static void installRuntimeIdentity(Connection staff, UUID staffId) throws SQLException {
        if (!staff.getAutoCommit()) throw new IllegalArgumentException("Требуется отдельная транзакция целевой базы");
        boolean committed = false;
        staff.setAutoCommit(false);
        try {
            try (PreparedStatement insert = staff.prepareStatement("""
                    INSERT INTO users(id,email,password,first_name,last_name,phone,role,created_at,updated_at)
                    SELECT id,email,password_hash,first_name,last_name,phone,
                           CASE WHEN role_code IN ('OWNER','ADMIN') THEN 'ADMIN' ELSE 'STAFF' END,
                           created_at,NOW()
                    FROM staff_accounts WHERE id=?
                    ON CONFLICT (id) DO NOTHING
                    """)) {
                insert.setObject(1, staffId);
                insert.executeUpdate();
            }
            try (PreparedStatement check = staff.prepareStatement("""
                    SELECT a.id FROM staff_accounts a JOIN users u ON u.id=a.id
                    WHERE a.id=? AND lower(a.email)=lower(u.email) AND a.password_hash=u.password
                    """)) {
                check.setObject(1, staffId);
                try (ResultSet rows = check.executeQuery()) {
                    if (!rows.next()) throw new IllegalStateException("Служебная учётная запись не скопирована");
                }
            }
            try (PreparedStatement insert = staff.prepareStatement("""
                    INSERT INTO iam_staff_role_assignments(user_id,role_code,location_id)
                    SELECT id,role_code,location_id FROM staff_accounts
                    WHERE id=? AND role_code IN ('OWNER','WAREHOUSE_ADMIN','STORE_MANAGER','CONTENT_MARKETING')
                    ON CONFLICT (user_id) DO NOTHING
                    """)) {
                insert.setObject(1, staffId);
                insert.executeUpdate();
            }
            try (PreparedStatement insert = staff.prepareStatement("""
                    INSERT INTO iam_user_permissions(user_id,permission)
                    SELECT staff_id,permission FROM staff_permissions WHERE staff_id=?
                    ON CONFLICT (user_id,permission) DO NOTHING
                    """)) {
                insert.setObject(1, staffId);
                insert.executeUpdate();
            }
            try (PreparedStatement insert = staff.prepareStatement("""
                    INSERT INTO mfa_totp(user_id,secret_ciphertext,enabled,last_used_step,
                                         failed_attempts,locked_until,created_at)
                    SELECT staff_id,secret_ciphertext,enabled,last_used_step,
                           failed_attempts,locked_until,created_at
                    FROM staff_mfa_totp WHERE staff_id=? ON CONFLICT (user_id) DO NOTHING
                    """)) {
                insert.setObject(1, staffId);
                insert.executeUpdate();
            }
            try (PreparedStatement insert = staff.prepareStatement("""
                    INSERT INTO mfa_recovery_codes(user_id,code_hash)
                    SELECT staff_id,code_hash FROM staff_mfa_recovery_codes WHERE staff_id=?
                    ON CONFLICT (user_id,code_hash) DO NOTHING
                    """)) {
                insert.setObject(1, staffId);
                insert.executeUpdate();
            }
            staff.commit();
            committed = true;
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
