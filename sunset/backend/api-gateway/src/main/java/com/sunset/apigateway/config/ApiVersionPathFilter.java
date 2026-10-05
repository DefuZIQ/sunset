package com.sunset.apigateway.config;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/** Exposes versioned API URLs without changing the existing service routes. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ApiVersionPathFilter implements WebFilter {
    private static final String PREFIX = "/api/v1";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getRawPath();
        if (!path.startsWith(PREFIX + "/")) {
            return chain.filter(exchange);
        }

        ServerHttpRequest request = exchange.getRequest().mutate()
                .path(path.substring(PREFIX.length()))
                .build();
        return chain.filter(exchange.mutate().request(request).build());
    }
}
