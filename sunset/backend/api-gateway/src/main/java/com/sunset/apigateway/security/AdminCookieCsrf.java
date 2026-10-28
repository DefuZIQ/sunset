package com.sunset.apigateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Component
public class AdminCookieCsrf {
    public static final String COOKIE = "SUNSET_ADMIN_SESSION";
    public static final String HEADER = "X-SUNSET-CSRF";
    private final byte[] secret;

    public AdminCookieCsrf(@Value("${jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String sessionToken(ServerHttpRequest request) {
        HttpCookie cookie = request.getCookies().getFirst(COOKIE);
        return cookie == null ? null : cookie.getValue();
    }

    public boolean valid(ServerHttpRequest request, String sessionToken) {
        String provided = request.getHeaders().getFirst(HEADER);
        if (provided == null || provided.isBlank() || provided.length() > 128) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            String expected = Base64.getUrlEncoder().withoutPadding().encodeToString(
                    mac.doFinal(("sunset-admin-csrf-v1:" + sessionToken).getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                    provided.getBytes(StandardCharsets.US_ASCII));
        } catch (Exception e) {
            return false;
        }
    }
}
