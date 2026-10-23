package com.sunset.auth.controller;

import com.sunset.contract.IamAccess;
import com.sunset.auth.service.AuthSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@RestController
@RequestMapping("/auth/iam")
public class IamController {
    private final JdbcTemplate jdbc;
    private final IamAccess access;
    private final AuthSessionService sessions;

    public IamController(JdbcTemplate jdbc, AuthSessionService sessions) {
        this.jdbc = jdbc;
        this.access = new IamAccess(jdbc);
        this.sessions = sessions;
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), userId);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        Map<String, Object> identity = new LinkedHashMap<>();
        identity.put("role", roles.get(0));
        identity.put("staffRole", access.staffRole(userId));
        identity.put("locationId", access.scopedLocation(userId));
        identity.put("permissions", access.permissions(userId));
        return identity;
    }

    @GetMapping("/staff")
    public List<Map<String, Object>> staff(Authentication authentication) {
        access.requireAdmin((UUID) authentication.getPrincipal());
        return jdbc.queryForList("""
                SELECT u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName", u.role
                FROM users u WHERE u.role IN ('ADMIN', 'STAFF') ORDER BY u.created_at
                """);
    }

    @GetMapping("/audit")
    public Map<String, Object> audit(Authentication authentication,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(required = false) UUID targetId) {
        access.requireAdmin((UUID) authentication.getPrincipal());
        if (page < 0 || page > 1000) throw new IllegalArgumentException("Некорректная страница журнала");
        String sql = """
                SELECT a.id, a.actor_id AS "actorId", actor.email AS "actorEmail",
                       a.target_id AS "targetId", target.email AS "targetEmail",
                       a.old_permissions AS "oldPermissions", a.new_permissions AS "newPermissions",
                       a.occurred_at AS "occurredAt"
                FROM iam_access_audit a
                LEFT JOIN users actor ON actor.id = a.actor_id
                LEFT JOIN users target ON target.id = a.target_id
                """ + (targetId == null ? "" : "WHERE a.target_id = ? ")
                + "ORDER BY a.occurred_at DESC, a.id DESC LIMIT 21 OFFSET ?";
        List<Map<String, Object>> rows = targetId == null
                ? jdbc.queryForList(sql, page * 20)
                : jdbc.queryForList(sql, targetId, page * 20);
        return Map.of("items", rows.subList(0, Math.min(rows.size(), 20)),
                "page", page, "hasMore", rows.size() > 20);
    }

    @PutMapping("/staff/{id}/permissions")
    @Transactional
    public Map<String, Object> updatePermissions(Authentication authentication, @PathVariable UUID id,
                                                  @RequestBody PermissionUpdate request) {
        UUID actorId = (UUID) authentication.getPrincipal();
        access.requireAdmin(actorId);
        if (actorId.equals(id)) throw new IllegalArgumentException("Нельзя менять собственные права");
        if (request == null || request.permissions() == null) throw new IllegalArgumentException("Укажите разрешения");
        if (request.permissions().stream().anyMatch(permission -> permission == null || !IamAccess.PERMISSIONS.contains(permission)))
            throw new IllegalArgumentException("Передано неизвестное разрешение");
        Set<String> permissions = new TreeSet<>(request.permissions());
        if (permissions.contains("orders:manage")) permissions.add("orders:read");
        if (permissions.contains("customers:bonuses:write")) permissions.add("customers:read");
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=? FOR UPDATE", (rs, row) -> rs.getString(1), id);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
        if ("ADMIN".equalsIgnoreCase(roles.get(0))) throw new IllegalArgumentException("Права другого администратора нельзя менять здесь");
        if (access.staffRole(id) != null) throw new IllegalArgumentException("Для этого сотрудника назначена роль. Измените роль вместо отдельных прав");
        String oldPermissions = String.join(",", access.permissions(id));
        jdbc.update("DELETE FROM iam_user_permissions WHERE user_id=?", id);
        for (String permission : permissions) {
            jdbc.update("INSERT INTO iam_user_permissions(user_id,permission,granted_by) VALUES (?,?,?)", id, permission, actorId);
        }
        jdbc.update("UPDATE users SET role=?,updated_at=NOW() WHERE id=?", permissions.isEmpty() ? "CUSTOMER" : "STAFF", id);
        jdbc.update("INSERT INTO iam_access_audit(actor_id,target_id,old_permissions,new_permissions) VALUES (?,?,?,?)",
                actorId, id, oldPermissions, String.join(",", permissions));
        sessions.revokeAll(id);
        return Map.of("userId", id, "role", permissions.isEmpty() ? "CUSTOMER" : "STAFF", "permissions", permissions);
    }

    public record PermissionUpdate(List<String> permissions) {}

    public record RoleUpdate(String roleCode, UUID locationId) {}

    @PutMapping("/staff/{id}/role")
    @Transactional
    public Map<String, Object> updateRole(Authentication authentication, @PathVariable UUID id,
                                          @RequestBody RoleUpdate request) {
        UUID actorId = (UUID) authentication.getPrincipal();
        access.requireAdmin(actorId);
        if (actorId.equals(id)) throw new IllegalArgumentException("Нельзя менять собственную роль");
        String roleCode = request == null ? null : request.roleCode();
        if (roleCode == null || !Set.of("CUSTOMER", "ADMIN", "WAREHOUSE_ADMIN", "STORE_MANAGER", "CONTENT_MARKETING").contains(roleCode)) {
            throw new IllegalArgumentException("Неизвестная роль");
        }
        boolean actorOwner = access.isOwner(actorId);
        if ("ADMIN".equals(roleCode) && !actorOwner) throw new SecurityException("Назначать администраторов может только владелец");
        boolean scoped = "WAREHOUSE_ADMIN".equals(roleCode) || "STORE_MANAGER".equals(roleCode);
        UUID locationId = request.locationId();
        if (scoped) {
            if (locationId == null) throw new IllegalArgumentException("Выберите магазин или склад для этой роли");
            String kind = "WAREHOUSE_ADMIN".equals(roleCode) ? "WAREHOUSE" : "STORE";
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM stores WHERE id=? AND kind=? AND active=TRUE",
                    Integer.class, locationId, kind);
            if (count == null || count != 1) throw new IllegalArgumentException("Выбранная точка не подходит этой роли");
        } else if (locationId != null) {
            throw new IllegalArgumentException("Для этой роли точка не назначается");
        }
        List<String> current = jdbc.query("SELECT role FROM users WHERE id=? FOR UPDATE", (rs, row) -> rs.getString(1), id);
        if (current.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
        if ("OWNER".equals(access.staffRole(id))) throw new SecurityException("Роль владельца нельзя изменить здесь");
        if ("ADMIN".equalsIgnoreCase(current.get(0)) && !actorOwner)
            throw new SecurityException("Роль администратора может изменить только владелец");
        String old = String.join(",", access.permissions(id));
        jdbc.update("DELETE FROM iam_user_permissions WHERE user_id=?", id);
        jdbc.update("DELETE FROM iam_staff_role_assignments WHERE user_id=?", id);
        if (scoped || "CONTENT_MARKETING".equals(roleCode)) {
            jdbc.update("INSERT INTO iam_staff_role_assignments(user_id,role_code,location_id,assigned_by) VALUES (?,?,?,?)",
                    id, roleCode, locationId, actorId);
        }
        String newLegacyRole = "CUSTOMER".equals(roleCode) ? "CUSTOMER" : "ADMIN".equals(roleCode) ? "ADMIN" : "STAFF";
        jdbc.update("UPDATE users SET role=?,updated_at=NOW() WHERE id=?", newLegacyRole, id);
        jdbc.update("INSERT INTO iam_access_audit(actor_id,target_id,old_permissions,new_permissions) VALUES (?,?,?,?)",
                actorId, id, old, roleCode + (locationId == null ? "" : ":" + locationId));
        sessions.revokeAll(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", id);
        result.put("role", newLegacyRole);
        result.put("staffRole", Set.of("CUSTOMER", "ADMIN").contains(roleCode) ? null : roleCode);
        result.put("locationId", locationId);
        result.put("permissions", "CUSTOMER".equals(roleCode) ? List.of() : "ADMIN".equals(roleCode)
                ? IamAccess.PERMISSIONS.stream().sorted().toList() : IamAccess.STAFF_ROLES.get(roleCode));
        return result;
    }

    @GetMapping("/staff/{id}/permissions")
    public Map<String, Object> userPermissions(Authentication authentication, @PathVariable UUID id) {
        access.requireAdmin((UUID) authentication.getPrincipal());
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), id);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("role", roles.get(0));
        result.put("staffRole", access.staffRole(id));
        result.put("locationId", access.scopedLocation(id));
        result.put("permissions", access.permissions(id));
        return result;
    }
}
