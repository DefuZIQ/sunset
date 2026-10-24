package com.sunset.auth.service;

import com.sunset.auth.security.MfaSecretCipher;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Offline, operator-invoked copy. Never changes the customer database. */
public final class StaffMigrationCli {
    private StaffMigrationCli() {}

    public static void main(String[] args) throws Exception {
        if (args.length != 1 || !"copy".equals(args[0])) {
            throw new IllegalArgumentException("Usage: StaffMigrationCli copy");
        }
        if (!"COPY_STAFF_IDENTITIES".equals(required("STAFF_MIGRATION_CONFIRM"))) {
            throw new IllegalArgumentException("Migration confirmation is missing");
        }
        try (Connection source = DriverManager.getConnection(required("SOURCE_JDBC_URL"),
                     required("SOURCE_DB_USER"), required("SOURCE_DB_PASSWORD"));
             Connection target = DriverManager.getConnection(required("STAFF_JDBC_URL"),
                     required("STAFF_DB_USER"), required("STAFF_DB_PASSWORD"))) {
            source.setReadOnly(true);
            source.setAutoCommit(false);
            source.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            List<UUID> staffIds = new ArrayList<>();
            try (Statement statement = source.createStatement(); ResultSet rows = statement.executeQuery(
                    "SELECT id FROM users WHERE role IN ('ADMIN','STAFF') ORDER BY created_at,id")) {
                while (rows.next()) staffIds.add(rows.getObject(1, UUID.class));
            }
            if (staffIds.isEmpty()) throw new IllegalStateException("No staff accounts to migrate");
            MfaSecretCipher cipher = new MfaSecretCipher(required("MFA_ENCRYPTION_KEY"));
            for (UUID oldId : staffIds) {
                UUID newId = StaffAccountCopier.copy(source, target, oldId, cipher);
                StaffAccountCopier.installRuntimeIdentity(target, newId);
            }
            source.rollback();
            System.out.println("Copied and verified staff accounts: " + staffIds.size());
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing " + name);
        return value;
    }
}
