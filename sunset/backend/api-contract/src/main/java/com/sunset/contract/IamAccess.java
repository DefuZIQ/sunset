package com.sunset.contract;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Shared-database IAM adapter. Replace SQL reads with Auth Service API when databases are separated. */
public final class IamAccess {
    public static final Set<String> PERMISSIONS = Set.of(
            "catalog:write", "stock:write", "orders:read", "orders:manage",
            "reviews:moderate", "promotions:manage", "customers:read",
            "customers:bonuses:write", "stores:manage");

    private final JdbcTemplate jdbc;

    public IamAccess(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean isAdmin(UUID userId) {
        if (userId == null) return false;
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), userId);
        return !roles.isEmpty() && "ADMIN".equalsIgnoreCase(roles.get(0));
    }

    public List<String> permissions(UUID userId) {
        if (isAdmin(userId)) return PERMISSIONS.stream().sorted().toList();
        if (userId == null) return List.of();
        return jdbc.query("SELECT permission FROM iam_user_permissions WHERE user_id=? ORDER BY permission",
                (rs, row) -> rs.getString(1), userId);
    }

    public void requireAdmin(UUID userId) {
        if (!isAdmin(userId)) throw new SecurityException("Требуются права администратора");
    }

    public void require(UUID userId, String permission) {
        if (!PERMISSIONS.contains(permission)) throw new IllegalArgumentException("Неизвестное разрешение");
        if (isAdmin(userId)) return;
        if (userId == null || !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM iam_user_permissions WHERE user_id=? AND permission=?)",
                Boolean.class, userId, permission))) {
            throw new SecurityException("Недостаточно прав: " + permission);
        }
    }
}
