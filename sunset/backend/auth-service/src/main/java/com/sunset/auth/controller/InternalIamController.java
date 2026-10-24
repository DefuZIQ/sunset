package com.sunset.auth.controller;

import com.sunset.contract.IamAccess;
import com.sunset.contract.IamIdentity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;

/** Docker-internal API only; the public Gateway has no /internal route. */
@RestController
@RequestMapping("/internal/iam")
public class InternalIamController {
    private final JdbcTemplate jdbc;
    private final IamAccess access;
    private final byte[] secret;

    public InternalIamController(JdbcTemplate jdbc, @Value("${internal.iam.secret:}") String secret) {
        this.jdbc = jdbc;
        this.access = new IamAccess(jdbc);
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @GetMapping("/{id}")
    public IamIdentity identity(@PathVariable UUID id,
                                @RequestHeader(value = "X-Sunset-Service-Token", required = false) String token) {
        if (secret.length < 32 || token == null || !MessageDigest.isEqual(
                secret, token.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs, row) -> rs.getString(1), id);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        String role = roles.get(0);
        if (!"ADMIN".equals(role) && !"STAFF".equals(role)) {
            return new IamIdentity(role, null, null, List.of());
        }
        return new IamIdentity(role, access.staffRole(id), access.scopedLocation(id), access.permissions(id));
    }
}
