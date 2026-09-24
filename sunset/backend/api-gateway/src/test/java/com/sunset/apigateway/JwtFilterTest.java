package com.sunset.apigateway;

import com.sunset.apigateway.config.WhitelistConfig;
import com.sunset.apigateway.security.JwtFilter;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
}
