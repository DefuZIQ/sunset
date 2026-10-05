package com.sunset.apigateway.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Map;

/** Writes authentication errors without exposing tokens or internal exception details. */
@Component
public class ApiErrorWriter {
    private final ObjectMapper objectMapper;

    public ApiErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Mono<Void> write(ServerWebExchange exchange, HttpStatus status, String code, String message) {
        var response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String requestId = exchange.getRequest().getHeaders().getFirst(RequestCorrelationFilter.HEADER);
        Map<String, Object> body = Map.of(
                "code", code,
                "message", message,
                "fieldErrors", Map.of(),
                "requestId", requestId == null ? "" : requestId,
                "timestamp", Instant.now().toString());
        final byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(body);
        } catch (JsonProcessingException exception) {
            return Mono.error(exception);
        }
        return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
    }
}
