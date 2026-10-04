package com.sunset.apigateway.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/** Creates a trusted request ID before Security and forwards it to services. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter implements WebFilter {
    public static final String HEADER = "X-Request-Id";
    private static final Logger log = LoggerFactory.getLogger(RequestCorrelationFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String requestId = UUID.randomUUID().toString();
        long started = System.nanoTime();
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> headers.set(HEADER, requestId))
                .build();
        exchange.getResponse().getHeaders().set(HEADER, requestId);
        ServerWebExchange traced = exchange.mutate().request(request).build();
        return chain.filter(traced).doFinally(signal -> {
            String path = request.getPath().value();
            if (path.startsWith("/actuator/")) return;
            int status = traced.getResponse().getStatusCode() == null
                    ? 200 : traced.getResponse().getStatusCode().value();
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            log.info("requestId={} method={} path={} status={} durationMs={}", requestId,
                    request.getMethod(), path, status, durationMs);
        });
    }
}
