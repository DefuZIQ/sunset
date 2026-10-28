package com.sunset.contract;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Shared-database IAM adapter. Replace SQL reads with Auth Service API when databases are separated. */
public final class IamAccess implements IamAuthorizer {
    public static final Set<String> PERMISSIONS = Set.of(
            "catalog:write", "stock:write", "orders:read", "orders:manage",
            "reviews:moderate", "promotions:manage", "customers:read",
            "customers:bonuses:write", "stores:manage");
    public static final Map<String, Set<String>> STAFF_ROLES = Map.of(
            "WAREHOUSE_ADMIN", Set.of("stock:write"),
            "STORE_MANAGER", Set.of("stock:write", "orders:read", "orders:manage"),
            "CONTENT_MARKETING", Set.of("catalog:write", "reviews:moderate", "promotions:manage"));

    private final JdbcTemplate jdbc;

    public IamAccess(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean isAdmin(UUID userId) {
        if (userId == null) return false;
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), userId);
        return !roles.isEmpty() && "ADMIN".equalsIgnoreCase(roles.get(0));
    }

    public boolean isOwner(UUID userId) {
        return isAdmin(userId) && "OWNER".equals(staffRole(userId));
    }

    public List<String> permissions(UUID userId) {
        if (isAdmin(userId)) return PERMISSIONS.stream().sorted().toList();
        if (userId == null) return List.of();
        String staffRole = staffRole(userId);
        if (staffRole != null && STAFF_ROLES.containsKey(staffRole)) return STAFF_ROLES.get(staffRole).stream().sorted().toList();
        return jdbc.query("SELECT permission FROM iam_user_permissions WHERE user_id=? ORDER BY permission",
                (rs, row) -> rs.getString(1), userId);
    }

    public String staffRole(UUID userId) {
        if (userId == null) return null;
        List<String> roles = jdbc.query("SELECT a.role_code FROM iam_staff_role_assignments a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND (u.role='STAFF' OR (u.role='ADMIN' AND a.role_code='OWNER'))",
                (rs, row) -> rs.getString(1), userId);
        return roles.isEmpty() ? null : roles.get(0);
    }

    public UUID scopedLocation(UUID userId) {
        if (userId == null) return null;
        List<UUID> locations = jdbc.query("SELECT a.location_id FROM iam_staff_role_assignments a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND u.role='STAFF'",
                (rs, row) -> rs.getObject(1, UUID.class), userId);
        return locations.isEmpty() ? null : locations.get(0);
    }

    public void requireLocation(UUID userId, String permission, UUID locationId) {
        require(userId, permission);
        if (isAdmin(userId)) return;
        String role = staffRole(userId);
        if ("WAREHOUSE_ADMIN".equals(role) || "STORE_MANAGER".equals(role)) {
            if (locationId == null || !locationId.equals(scopedLocation(userId))) {
                throw new SecurityException("Нет доступа к этой торговой точке или складу");
            }
            String kind = "WAREHOUSE_ADMIN".equals(role) ? "WAREHOUSE" : "STORE";
            Boolean active = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM stores WHERE id=? AND kind=? AND active=TRUE)",
                    Boolean.class, locationId, kind);
            if (!Boolean.TRUE.equals(active)) throw new SecurityException("Назначенная точка больше не активна");
        }
    }

    public void requireAdmin(UUID userId) {
        if (!isAdmin(userId)) throw new SecurityException("Требуются права администратора");
    }

    public void require(UUID userId, String permission) {
        if (!PERMISSIONS.contains(permission)) throw new IllegalArgumentException("Неизвестное разрешение");
        if (isAdmin(userId)) return;
        if (userId == null) throw new SecurityException("Недостаточно прав: " + permission);
        String role = staffRole(userId);
        if (role != null && STAFF_ROLES.containsKey(role)) {
            if (!STAFF_ROLES.get(role).contains(permission)) throw new SecurityException("Недостаточно прав: " + permission);
            return;
        }
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM iam_user_permissions WHERE user_id=? AND permission=?)",
                Boolean.class, userId, permission))) {
            throw new SecurityException("Недостаточно прав: " + permission);
        }
    }
}
