package com.sunset.apigateway;

import com.sunset.apigateway.config.WhitelistConfig;
import com.sunset.apigateway.security.JwtFilter;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtFilterTest {
    @Test void publicPathPassesWithoutToken() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/auth/login").build());
        filter.filter(exchange, chain).block();
        verify(chain).filter(any());
    }

    @Test void publicPathRemovesSpoofedUserId() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config);
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
        JwtFilter filter = new JwtFilter(config);
        ReflectionTestUtils.setField(filter, "secretKey", secret);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        String token = Jwts.builder().setSubject("trusted-user")
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))).compact();
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

    @Test void protectedPathWithoutTokenReturnsUnauthorized() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/order/my").build());
        filter.filter(exchange, chain).block();
        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }

    @Test void similarPathIsNotAccidentallyPublic() {
        WhitelistConfig config = new WhitelistConfig();
        config.setWhitelistPaths(List.of("/auth/login"));
        JwtFilter filter = new JwtFilter(config);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        var exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/auth/login-evil").build());

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.UNAUTHORIZED, exchange.getResponse().getStatusCode());
        verifyNoInteractions(chain);
    }
}
