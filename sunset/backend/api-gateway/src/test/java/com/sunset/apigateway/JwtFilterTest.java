package com.sunset.apigateway;

import com.sunset.apigateway.config.WhitelistConfig;
import com.sunset.apigateway.security.JwtFilter;
import com.sunset.apigateway.security.AuthSessionVerifier;
import com.sunset.apigateway.security.AdminCookieCsrf;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpCookie;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtFilterTest {
    private final AuthSessionVerifier sessions = mock(AuthSessionVerifier.class);

    @Test void publicPathPassesWithoutToken() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config, sessions, new AdminCookieCsrf("test-secret-that-is-at-least-32-bytes"));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/auth/login").build());
        filter.filter(exchange, chain).block();
        verify(chain).filter(any());
    }

    @Test void publicPathRemovesSpoofedUserId() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config, sessions, new AdminCookieCsrf("test-secret-that-is-at-least-32-bytes"));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/auth/login")
                .header("user-id", "intruder").build());

        filter.filter(exchange, chain).block();

        var forwarded = argumentCaptor(chain);
        assertNull(forwarded.getRequest().getHeaders().getFirst("user-id"));
    }

    @Test void validJwtReplacesSpoofedUserId() {
        String secret = "test-secret-that-is-at-least-32-bytes";
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config, sessions, new AdminCookieCsrf(secret));
        ReflectionTestUtils.setField(filter, "secretKey", secret);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        String token = Jwts.builder().setSubject("trusted-user")
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
        when(sessions.isActive(token)).thenReturn(Mono.just(true));
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/order/my")
                .header("user-id", "intruder")
                .header("Authorization", "Bearer " + token).build());

        filter.filter(exchange, chain).block();

        var forwarded = argumentCaptor(chain);
        assertEquals(List.of("trusted-user"), forwarded.getRequest().getHeaders().get("user-id"));
    }

    private ServerWebExchange argumentCaptor(GatewayFilterChain chain) {
        var captor = org.mockito.ArgumentCaptor.forClass(ServerWebExchange.class);
        verify(chain).filter(captor.capture());
        return captor.getValue();
    }

    @Test void staffBearerUsesOnlyStaffSessionVerifier() {
        String secret = "test-secret-that-is-at-least-32-bytes";
        JwtFilter filter = new JwtFilter(new WhitelistConfig(), sessions, new AdminCookieCsrf(secret));
        ReflectionTestUtils.setField(filter, "secretKey", secret);
        String token = Jwts.builder().setSubject("staff-user").claim("realm", "STAFF")
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
        when(sessions.isStaffActive(token)).thenReturn(Mono.just(true));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/auth/iam/me")
                .header("Authorization", "Bearer " + token).build());

        filter.filter(exchange, chain).block();

        assertEquals("staff-user", argumentCaptor(chain).getRequest().getHeaders().getFirst("user-id"));
        verify(sessions).isStaffActive(token);
        verify(sessions, never()).isActive(token);
    }

    @Test void protectedPathWithoutTokenReturnsUnauthorized() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config, sessions, new AdminCookieCsrf("test-secret-that-is-at-least-32-bytes"));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/order/my").build());
        filter.filter(exchange, chain).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test void revokedSessionNeverReachesBackend() {
        String secret = "test-secret-that-is-at-least-32-bytes";
        JwtFilter filter = new JwtFilter(new WhitelistConfig(), sessions, new AdminCookieCsrf(secret));
        ReflectionTestUtils.setField(filter, "secretKey", secret);
        String token = Jwts.builder().setSubject("trusted-user")
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
        when(sessions.isActive(token)).thenReturn(Mono.just(false));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/order/my")
                .header("Authorization", "Bearer " + token).build());

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test void unavailableSessionStoreFailsClosed() {
        String secret = "test-secret-that-is-at-least-32-bytes";
        JwtFilter filter = new JwtFilter(new WhitelistConfig(), sessions, new AdminCookieCsrf(secret));
        ReflectionTestUtils.setField(filter, "secretKey", secret);
        String token = Jwts.builder().setSubject("trusted-user")
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
        when(sessions.isActive(token)).thenReturn(Mono.error(new IllegalStateException("offline")));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/order/my")
                .header("Authorization", "Bearer " + token).build());

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test void similarPathIsNotAccidentallyPublic() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config, sessions, new AdminCookieCsrf("test-secret-that-is-at-least-32-bytes"));
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/auth/login-evil").build());

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test void cookieSessionRequiresCsrfForWritesAndNeverForwardsCookie() throws Exception {
        String secret = "test-secret-that-is-at-least-32-bytes";
        AdminCookieCsrf csrf = new AdminCookieCsrf(secret);
        JwtFilter filter = new JwtFilter(new WhitelistConfig(), sessions, csrf);
        ReflectionTestUtils.setField(filter, "secretKey", secret);
        String token = Jwts.builder().setSubject("trusted-user")
                .claim("realm", "STAFF")
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        when(sessions.isAdminActive(token)).thenReturn(Mono.just(true));

        var missing = MockServerWebExchange.from(MockServerHttpRequest.post("/order/admin/promotions")
                .cookie(new HttpCookie(AdminCookieCsrf.COOKIE, token)).build());
        filter.filter(missing, chain).block();
        assertEquals(HttpStatus.FORBIDDEN, missing.getResponse().getStatusCode());
        verifyNoInteractions(chain);

        var invalid = MockServerWebExchange.from(MockServerHttpRequest.post("/order/admin/promotions")
                .cookie(new HttpCookie(AdminCookieCsrf.COOKIE, token))
                .header(AdminCookieCsrf.HEADER, "invalid").build());
        filter.filter(invalid, chain).block();
        assertEquals(HttpStatus.FORBIDDEN, invalid.getResponse().getStatusCode());
        verifyNoInteractions(chain);

        var read = MockServerWebExchange.from(MockServerHttpRequest.get("/order/admin/orders")
                .cookie(new HttpCookie(AdminCookieCsrf.COOKIE, token)).build());
        filter.filter(read, chain).block();
        var forwarded = argumentCaptor(chain);
        assertEquals("Bearer " + token, forwarded.getRequest().getHeaders().getFirst("Authorization"));
        assertNull(forwarded.getRequest().getHeaders().getFirst("Cookie"));
        assertEquals("trusted-user", forwarded.getRequest().getHeaders().getFirst("user-id"));

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String csrfToken = Base64.getUrlEncoder().withoutPadding().encodeToString(
                mac.doFinal(("sunset-admin-csrf-v1:" + token).getBytes(StandardCharsets.UTF_8)));
        clearInvocations(chain);
        var write = MockServerWebExchange.from(MockServerHttpRequest.post("/order/admin/promotions")
                .cookie(new HttpCookie(AdminCookieCsrf.COOKIE, token))
                .header(AdminCookieCsrf.HEADER, csrfToken).build());
        filter.filter(write, chain).block();
        var forwardedWrite = argumentCaptor(chain);
        assertNull(forwardedWrite.getRequest().getHeaders().getFirst(AdminCookieCsrf.HEADER));
        assertEquals("Bearer " + token, forwardedWrite.getRequest().getHeaders().getFirst("Authorization"));
    }
}
