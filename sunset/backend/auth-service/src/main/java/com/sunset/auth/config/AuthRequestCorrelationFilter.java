package com.sunset.auth.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthRequestCorrelationFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(AuthRequestCorrelationFilter.class);
    private static final String HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = validId(request.getHeader(HEADER));
        response.setHeader(HEADER, requestId);
        long started = System.nanoTime();
        MDC.put("requestId", requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            if (!request.getRequestURI().startsWith("/actuator/")) {
                log.info("requestId={} method={} path={} status={} durationMs={}", requestId,
                        request.getMethod(), request.getRequestURI(), response.getStatus(),
                        TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started));
            }
            MDC.remove("requestId");
        }
    }

    private String validId(String value) {
        if (value != null) {
            try {
                UUID parsed = UUID.fromString(value);
                if (parsed.toString().equalsIgnoreCase(value)) return parsed.toString();
            } catch (IllegalArgumentException ignored) {
                // A direct caller cannot inject arbitrary text into logs.
            }
        }
        return UUID.randomUUID().toString();
    }
}
