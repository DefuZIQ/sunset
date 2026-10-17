package com.sunset.auth.controller;

import com.sunset.contract.IamAccess;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@RestController
@RequestMapping("/auth/iam")
public class IamController {
    private final JdbcTemplate jdbc;
    private final IamAccess access;

    public IamController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.access = new IamAccess(jdbc);
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), userId);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return Map.of("role", roles.get(0), "permissions", access.permissions(userId));
    }

    @GetMapping("/staff")
    public List<Map<String, Object>> staff(Authentication authentication) {
        access.requireAdmin((UUID) authentication.getPrincipal());
        return jdbc.queryForList("""
                SELECT u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName", u.role
                FROM users u WHERE u.role IN ('ADMIN', 'STAFF') ORDER BY u.created_at
                """);
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
        String oldPermissions = String.join(",", access.permissions(id));
        jdbc.update("DELETE FROM iam_user_permissions WHERE user_id=?", id);
        for (String permission : permissions) {
            jdbc.update("INSERT INTO iam_user_permissions(user_id,permission,granted_by) VALUES (?,?,?)", id, permission, actorId);
        }
        jdbc.update("UPDATE users SET role=?,updated_at=NOW() WHERE id=?", permissions.isEmpty() ? "CUSTOMER" : "STAFF", id);
        jdbc.update("INSERT INTO iam_access_audit(actor_id,target_id,old_permissions,new_permissions) VALUES (?,?,?,?)",
                actorId, id, oldPermissions, String.join(",", permissions));
        return Map.of("userId", id, "role", permissions.isEmpty() ? "CUSTOMER" : "STAFF", "permissions", permissions);
    }

    public record PermissionUpdate(List<String> permissions) {}

    @GetMapping("/staff/{id}/permissions")
    public Map<String, Object> userPermissions(Authentication authentication, @PathVariable UUID id) {
        access.requireAdmin((UUID) authentication.getPrincipal());
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), id);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
        return Map.of("role", roles.get(0), "permissions", access.permissions(id));
    }
}
