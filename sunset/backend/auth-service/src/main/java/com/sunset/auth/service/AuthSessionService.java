package com.sunset.auth.service;

import com.sunset.auth.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
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
        record(token, userId, false);
    }

    public void record(String token, UUID userId, boolean mfaVerified) {
        Claims claims = jwt.parse(token);
        if (claims == null || claims.getId() == null || claims.getIssuedAt() == null || claims.getExpiration() == null
                || !userId.toString().equals(claims.getSubject())) {
            throw new IllegalStateException("Не удалось зарегистрировать сеанс");
        }
        jdbc.update("INSERT INTO auth_sessions(id,user_id,issued_at,expires_at,mfa_verified) VALUES (?,?,?,?,?)",
                UUID.fromString(claims.getId()), userId,
                Timestamp.from(claims.getIssuedAt().toInstant()), Timestamp.from(claims.getExpiration().toInstant()), mfaVerified);
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
                    SELECT EXISTS(SELECT 1 FROM auth_sessions s
                    JOIN users u ON u.id=s.user_id
                    WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at > NOW()
                    AND (u.role NOT IN ('ADMIN','STAFF') OR
                         (s.mfa_verified AND EXISTS
                          (SELECT 1 FROM mfa_totp f WHERE f.user_id=u.id AND f.enabled))))
                    """, Boolean.class, sessionId, userId);
            if (!Boolean.TRUE.equals(active)) return null;
            String realm = claims.get("realm", String.class);
            if (realm == null) return userId; // Existing tokens expire under their original policy.
            List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?",
                    (rs, row) -> rs.getString(1), userId);
            if (roles.isEmpty()) return null;
            boolean staff = "ADMIN".equalsIgnoreCase(roles.get(0)) || "STAFF".equalsIgnoreCase(roles.get(0));
            return (staff && "STAFF".equals(realm)) || (!staff && "CUSTOMER".equals(realm)) ? userId : null;
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

    public boolean isElevatedSession(String token, UUID userId) {
        Claims claims = jwt.parse(token);
        if (claims == null || claims.getId() == null || !userId.toString().equals(claims.getSubject())) return false;
        String realm = claims.get("realm", String.class);
        if (realm != null && !"STAFF".equals(realm)) return false;
        try {
            Boolean active = jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM auth_sessions s JOIN users u ON u.id=s.user_id
                    JOIN mfa_totp f ON f.user_id=u.id AND f.enabled
                    WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>NOW()
                    AND s.mfa_verified AND u.role IN ('ADMIN','STAFF'))
                    """, Boolean.class, UUID.fromString(claims.getId()), userId);
            return Boolean.TRUE.equals(active);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public void revokeAll(UUID userId) {
        jdbc.update("UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL", userId);
    }

    public int purgeExpiredBefore(Instant cutoff) {
        return jdbc.update("DELETE FROM auth_sessions WHERE expires_at < ?", Timestamp.from(cutoff));
    }
}
