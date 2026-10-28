package com.sunset.contract;

import jakarta.servlet.http.HttpServletResponse;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Shared HTTP error shape for servlet services. */
public record ApiError(String code, String message, Map<String, String> fieldErrors,
                       String requestId, String timestamp) {
    public static ApiError of(String code, String message, Map<String, String> fieldErrors,
                              HttpServletResponse response) {
        String requestId = response.getHeader("X-Request-Id");
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
            response.setHeader("X-Request-Id", requestId);
        }
        return new ApiError(code, message, Map.copyOf(fieldErrors), requestId, Instant.now().toString());
    }
}
