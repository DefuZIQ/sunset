package com.sunset.apigateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
public class AuthSessionVerifier {
    private final WebClient client;
    private final String url;
    private final String adminUrl;

    public AuthSessionVerifier(
            @Value("${auth.session-validation-url:http://auth-service:8081/auth/session/validate}") String url,
            @Value("${auth.admin-session-validation-url:http://auth-service:8081/auth/session/admin/validate}") String adminUrl) {
        this.client = WebClient.builder().build();
        this.url = url;
        this.adminUrl = adminUrl;
    }

    public Mono<Boolean> isActive(String token) {
        return validate(token, url);
    }

    public Mono<Boolean> isAdminActive(String token) {
        return validate(token, adminUrl);
    }

    private Mono<Boolean> validate(String token, String validationUrl) {
        return client.get().uri(validationUrl).headers(headers -> headers.setBearerAuth(token))
                .exchangeToMono(response -> {
                    if (response.statusCode().is5xxServerError()) {
                        return Mono.error(new IllegalStateException("Auth Service unavailable"));
                    }
                    return Mono.just(response.statusCode().is2xxSuccessful());
                })
                .timeout(Duration.ofSeconds(3));
    }
}
