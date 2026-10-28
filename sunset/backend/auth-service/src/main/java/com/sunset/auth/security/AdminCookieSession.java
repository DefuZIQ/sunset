package com.sunset.auth.security;

import com.sunset.auth.dto.AuthResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class AdminCookieSession {
    public static final String COOKIE = "SUNSET_ADMIN_SESSION";
    private static final String PATH = "/api/v1";
    private final byte[] secret;

    public AdminCookieSession(@Value("${spring.security.jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public void issue(AuthResponse auth, HttpServletRequest request, HttpServletResponse response) {
        String token = auth.getToken();
        if (token == null || !("ADMIN".equals(auth.getRole()) || "STAFF".equals(auth.getRole()))) {
            throw new IllegalArgumentException("Cookie-сеанс доступен только сотрудникам");
        }
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(token, request, 15 * 60));
        auth.setCsrfToken(csrf(token));
        auth.setToken(null);
    }

    public void clear(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", request, 0));
    }

    public String csrf(String token) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    mac.doFinal(("sunset-admin-csrf-v1:" + token).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Не удалось подготовить CSRF-токен", e);
        }
    }

    private String cookie(String value, HttpServletRequest request, long maxAge) {
        String host = request.getHeader("X-Sunset-Request-Host");
        if (host == null) host = request.getHeader(HttpHeaders.HOST);
        boolean localHttp = host != null && (host.equals("192.168.1.186") || host.startsWith("192.168.1.186:"));
        return ResponseCookie.from(COOKIE, value)
                .httpOnly(true).secure(!localHttp).sameSite("Strict").path(PATH).maxAge(maxAge).build().toString();
    }
}
