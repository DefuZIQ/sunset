package com.sunset.auth.service;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.model.User;
import com.sunset.auth.repository.UserRepository;
import com.sunset.auth.security.JwtUtil;
import com.sunset.auth.security.MfaSecretCipher;
import com.sunset.auth.security.TotpCodes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class MfaService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int RECOVERY_COUNT = 8;
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AuthSessionService sessions;
    private final JwtUtil jwt;
    private final MfaSecretCipher cipher;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public MfaService(JdbcTemplate jdbc, UserRepository users, AuthSessionService sessions, JwtUtil jwt,
                      @Value("${mfa.encryption-key}") String encryptionKey) {
        this.jdbc = jdbc;
        this.users = users;
        this.sessions = sessions;
        this.jwt = jwt;
        this.cipher = new MfaSecretCipher(encryptionKey);
    }

    public boolean enabled(UUID userId) {
        Boolean active = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM mfa_totp WHERE user_id=? AND enabled)",
                Boolean.class, userId);
        return Boolean.TRUE.equals(active);
    }

    public int recoveryCodesRemaining(UUID userId) {
        return jdbc.queryForObject("SELECT count(*) FROM mfa_recovery_codes WHERE user_id=?", Integer.class, userId);
    }

    @Transactional
    public String beginChallenge(UUID userId) {
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        // Only the latest password-authenticated challenge may be used.
        jdbc.update("DELETE FROM mfa_login_challenges WHERE user_id=?", userId);
        jdbc.update("INSERT INTO mfa_login_challenges(token_hash,user_id,expires_at) VALUES (?,?,?)",
                hash(token), userId, Timestamp.from(Instant.now().plus(5, ChronoUnit.MINUTES)));
        return token;
    }

    @Transactional
    public Enrollment startEnrollment(UUID userId, String currentPassword) {
        User user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        requireElevatedRole(user);
        if (currentPassword == null || !passwords.matches(currentPassword, user.getPassword()))
            throw new IllegalArgumentException("Неверный пароль");
        if (enabled(userId)) throw new IllegalArgumentException("Двухфакторная защита уже включена");
        byte[] secret = TotpCodes.newSecret();
        String encoded = TotpCodes.base32(secret);
        int changed = jdbc.update("""
                INSERT INTO mfa_totp(user_id,secret_ciphertext) VALUES (?,?)
                ON CONFLICT (user_id) DO UPDATE SET secret_ciphertext=EXCLUDED.secret_ciphertext,
                enabled=FALSE,last_used_step=-1,failed_attempts=0,locked_until=NULL
                WHERE mfa_totp.enabled=FALSE
                """, userId, cipher.encrypt(secret, userId));
        if (changed != 1) throw new IllegalArgumentException("Двухфакторная защита уже включена");
        String account = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);
        String uri = "otpauth://totp/SUNSET:" + account + "?secret=" + encoded
                + "&issuer=SUNSET&algorithm=SHA1&digits=6&period=30";
        return new Enrollment(encoded, uri);
    }

    @Transactional
    public List<String> confirmEnrollment(UUID userId, String code) {
        requireElevatedRole(users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден")));
        Factor factor = factorForUpdate(userId);
        if (factor == null || factor.enabled || locked(factor)) return List.of();
        long step = TotpCodes.matchingStep(cipher.decrypt(factor.ciphertext, userId), code,
                Instant.now(), factor.lastStep);
        if (step < 0) {
            registerFailure(userId, factor.failedAttempts);
            return List.of();
        }
        jdbc.update("UPDATE mfa_totp SET enabled=TRUE,last_used_step=?,failed_attempts=0,locked_until=NULL WHERE user_id=?",
                step, userId);
        jdbc.update("DELETE FROM mfa_recovery_codes WHERE user_id=?", userId);
        List<String> recoveryCodes = new ArrayList<>(RECOVERY_COUNT);
        for (int i = 0; i < RECOVERY_COUNT; i++) {
            String plain = recoveryCode();
            jdbc.update("INSERT INTO mfa_recovery_codes(user_id,code_hash) VALUES (?,?)", userId, hash(normalizeCode(plain)));
            recoveryCodes.add(plain);
        }
        sessions.revokeAll(userId);
        return recoveryCodes;
    }

    @Transactional
    public AuthResponse verifyLogin(String challengeToken, String code) {
        if (challengeToken == null || challengeToken.length() != 43) return null;
        List<UUID> ids = jdbc.query("""
                SELECT user_id FROM mfa_login_challenges WHERE token_hash=? AND expires_at>NOW() FOR UPDATE
                """, (rs, row) -> rs.getObject(1, UUID.class), hash(challengeToken));
        if (ids.isEmpty()) return null;
        UUID userId = ids.get(0);
        Factor factor = factorForUpdate(userId);
        if (factor == null || !factor.enabled || locked(factor)) return null;
        User user = users.findById(userId).orElse(null);
        if (user == null || !elevatedRole(user)) return null;

        long step = TotpCodes.matchingStep(cipher.decrypt(factor.ciphertext, userId), code,
                Instant.now(), factor.lastStep);
        boolean recovery = step < 0 && isRecoveryCode(code)
                && jdbc.update("DELETE FROM mfa_recovery_codes WHERE user_id=? AND code_hash=?",
                        userId, hash(normalizeCode(code))) == 1;
        if (step < 0 && !recovery) {
            registerFailure(userId, factor.failedAttempts);
            return null;
        }
        jdbc.update("UPDATE mfa_totp SET last_used_step=?,failed_attempts=0,locked_until=NULL WHERE user_id=?",
                Math.max(step, factor.lastStep), userId);
        jdbc.update("DELETE FROM mfa_login_challenges WHERE token_hash=?", hash(challengeToken));
        String token = jwt.generateToken(userId, user.getRole());
        sessions.record(token, userId, true);
        return new AuthResponse(userId.toString(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(), user.getRole(), token);
    }

    @Transactional
    public boolean disable(UUID userId, String currentPassword, String code) {
        User user = users.findById(userId).orElse(null);
        Factor factor = factorForUpdate(userId);
        if (user == null || factor == null || !factor.enabled || locked(factor)) return false;
        if (currentPassword == null || !passwords.matches(currentPassword, user.getPassword())) {
            registerFailure(userId, factor.failedAttempts);
            return false;
        }
        long step = TotpCodes.matchingStep(cipher.decrypt(factor.ciphertext, userId), code,
                Instant.now(), factor.lastStep);
        boolean recovery = step < 0 && isRecoveryCode(code)
                && jdbc.update("DELETE FROM mfa_recovery_codes WHERE user_id=? AND code_hash=?",
                        userId, hash(normalizeCode(code))) == 1;
        if (step < 0 && !recovery) {
            registerFailure(userId, factor.failedAttempts);
            return false;
        }
        jdbc.update("DELETE FROM mfa_login_challenges WHERE user_id=?", userId);
        jdbc.update("DELETE FROM mfa_recovery_codes WHERE user_id=?", userId);
        jdbc.update("DELETE FROM mfa_totp WHERE user_id=?", userId);
        sessions.revokeAll(userId);
        return true;
    }

    public int purgeExpiredChallenges() {
        return jdbc.update("DELETE FROM mfa_login_challenges WHERE expires_at<NOW()");
    }

    private Factor factorForUpdate(UUID userId) {
        List<Factor> factors = jdbc.query("""
                SELECT secret_ciphertext,enabled,last_used_step,failed_attempts,locked_until
                FROM mfa_totp WHERE user_id=? FOR UPDATE
                """, (rs, row) -> new Factor(rs.getString(1), rs.getBoolean(2), rs.getLong(3),
                rs.getInt(4), rs.getTimestamp(5) == null ? null : rs.getTimestamp(5).toInstant()), userId);
        return factors.isEmpty() ? null : factors.get(0);
    }

    private void registerFailure(UUID userId, int previousFailures) {
        int failures = previousFailures + 1;
        jdbc.update("UPDATE mfa_totp SET failed_attempts=?,locked_until=? WHERE user_id=?",
                failures >= 5 ? 0 : failures,
                failures >= 5 ? Timestamp.from(Instant.now().plus(15, ChronoUnit.MINUTES)) : null,
                userId);
    }

    private static boolean locked(Factor factor) {
        return factor.lockedUntil != null && factor.lockedUntil.isAfter(Instant.now());
    }

    private static boolean elevatedRole(User user) {
        return "ADMIN".equalsIgnoreCase(user.getRole()) || "STAFF".equalsIgnoreCase(user.getRole());
    }

    private static void requireElevatedRole(User user) {
        if (!elevatedRole(user)) throw new IllegalArgumentException("MFA доступна сотрудникам магазина");
    }

    private static boolean isRecoveryCode(String code) {
        return code != null && normalizeCode(code).matches("[A-Z2-7]{26}");
    }

    private static String recoveryCode() {
        byte[] raw = new byte[16];
        RANDOM.nextBytes(raw);
        String encoded = TotpCodes.base32(raw);
        return encoded.substring(0, 5) + "-" + encoded.substring(5, 10) + "-" + encoded.substring(10, 15)
                + "-" + encoded.substring(15, 20) + "-" + encoded.substring(20);
    }

    private static String normalizeCode(String code) {
        return code == null ? "" : code.replace("-", "").replace(" ", "").toUpperCase(java.util.Locale.ROOT);
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public record Enrollment(String secret, String otpauthUri) {}
    private record Factor(String ciphertext, boolean enabled, long lastStep, int failedAttempts, Instant lockedUntil) {}
}
