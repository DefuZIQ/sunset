package com.sunset.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);

    private final SecretKey secretKey;
    private static final long CUSTOMER_EXPIRATION = 1000L * 60 * 60 * 24;
    private static final long STAFF_EXPIRATION = 1000L * 60 * 15;

    public JwtUtil(@Value("${spring.security.jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID userId, String role) {
        boolean staff = "ADMIN".equalsIgnoreCase(role) || "STAFF".equalsIgnoreCase(role);
        long expiration = staff
                ? STAFF_EXPIRATION : CUSTOMER_EXPIRATION;
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("realm", staff ? "STAFF" : "CUSTOMER")
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expiration))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public UUID extractUserId(String token) {
        Claims claims = parse(token);
        return claims == null ? null : UUID.fromString(claims.getSubject());
    }

    public Claims parse(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            logger.warn("Токен истёк: {}", e.getMessage());
        } catch (JwtException | IllegalArgumentException e) {
            logger.warn("Невалидный токен: {}", e.getMessage());
        }
        return null;
    }
}
