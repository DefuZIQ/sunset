package com.sunset.auth.service;

import com.sunset.auth.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

@Service
public class AuthSessionService {
    private final JdbcTemplate jdbc;
    private final JwtUtil jwt;

    public AuthSessionService(JdbcTemplate jdbc, JwtUtil jwt) {
        this.jdbc = jdbc;
        this.jwt = jwt;
    }

    public void record(String token, UUID userId) {
        Claims claims = jwt.parse(token);
        if (claims == null || claims.getId() == null || claims.getIssuedAt() == null || claims.getExpiration() == null
                || !userId.toString().equals(claims.getSubject())) {
            throw new IllegalStateException("Не удалось зарегистрировать сеанс");
        }
        jdbc.update("INSERT INTO auth_sessions(id,user_id,issued_at,expires_at) VALUES (?,?,?,?)",
                UUID.fromString(claims.getId()), userId,
                Timestamp.from(claims.getIssuedAt().toInstant()), Timestamp.from(claims.getExpiration().toInstant()));
    }

    public UUID authenticatedUser(String token) {
        Claims claims = jwt.parse(token);
        if (claims == null) return null;
        try {
            UUID userId = UUID.fromString(claims.getSubject());
            if (claims.getId() == null) {
                // Pre-migration customer tokens may finish their original 24-hour lifetime.
                // Old administrator/staff tokens must reauthenticate under the new session policy.
                List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?",
                        (rs, row) -> rs.getString(1), userId);
                return !roles.isEmpty() && "CUSTOMER".equalsIgnoreCase(roles.get(0)) ? userId : null;
            }
            UUID sessionId = UUID.fromString(claims.getId());
            Boolean active = jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM auth_sessions
                    WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at > NOW())
                    """, Boolean.class, sessionId, userId);
            return Boolean.TRUE.equals(active) ? userId : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    public void revoke(String token, UUID userId) {
        Claims claims = jwt.parse(token);
        if (claims == null || claims.getId() == null || !userId.toString().equals(claims.getSubject())) return;
        jdbc.update("UPDATE auth_sessions SET revoked_at=NOW() WHERE id=? AND user_id=? AND revoked_at IS NULL",
                UUID.fromString(claims.getId()), userId);
    }

    public void revokeAll(UUID userId) {
        jdbc.update("UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL", userId);
    }
}
