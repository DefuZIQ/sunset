package com.sunset.apigateway;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class GatewayHttpContractTest {
    private static final String SECRET = "gateway-http-contract-secret-at-least-32-bytes";
    private static final String CUSTOMER_ID = "10000000-0000-0000-0000-000000000001";
    private static final AtomicReference<ForwardedRequest> FORWARDED = new AtomicReference<>();
    private static final AtomicInteger REQUEST_COUNT = new AtomicInteger();
    private static final DisposableServer DOWNSTREAM = HttpServer.create().port(0)
            .handle((request, response) -> request.receive().aggregate().asString()
                    .defaultIfEmpty("")
                    .flatMap(body -> {
                        REQUEST_COUNT.incrementAndGet();
                        FORWARDED.set(new ForwardedRequest(request.method().name(), request.uri(),
                                request.requestHeaders().get("user-id"),
                                request.requestHeaders().get("X-Request-Id"), body));
                        String result = request.uri().startsWith("/auth/register")
                                ? "{\"token\":\"registered\"}"
                                : request.method().name().equals("POST")
                                        ? "{\"id\":\"" + UUID.randomUUID() + "\"}"
                                        : "[{\"id\":\"" + UUID.randomUUID() + "\"}]";
                        if (request.method().name().equals("POST") && request.uri().equals("/order")) {
                            response.status(201);
                        }
                        return response.header("Content-Type", "application/json")
                                .sendString(Mono.just(result)).then();
                    }))
            .bindNow();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> SECRET);
        registry.add("spring.cloud.gateway.routes[0].id", () -> "auth-test");
        registry.add("spring.cloud.gateway.routes[0].uri", () -> "http://localhost:" + DOWNSTREAM.port());
        registry.add("spring.cloud.gateway.routes[0].predicates[0]", () -> "Path=/auth/**");
        registry.add("spring.cloud.gateway.routes[1].id", () -> "order-test");
        registry.add("spring.cloud.gateway.routes[1].uri", () -> "http://localhost:" + DOWNSTREAM.port());
        registry.add("spring.cloud.gateway.routes[1].predicates[0]", () -> "Path=/order/**");
    }

    @AfterAll
    static void stopDownstream() {
        DOWNSTREAM.disposeNow();
    }

    @Autowired
    private WebTestClient client;

    @BeforeEach
    void resetCapture() {
        FORWARDED.set(null);
        REQUEST_COUNT.set(0);
    }

    @Test
    void publicRegistrationForwardsBodyButRemovesForgedIdentity() {
        client.post().uri("/auth/register")
                .header("user-id", "forged-admin")
                .bodyValue("{\"email\":\"buyer@sunset.test\"}")
                .exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.token").isEqualTo("registered");

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/auth/register");
        assertThat(FORWARDED.get().userId()).isNull();
        assertThat(FORWARDED.get().body()).contains("buyer@sunset.test");
    }

    @Test
    void validJwtReplacesForgedIdentityBeforeForwardingOrderRequest() {
        client.get().uri("/order/my")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$[0].id").exists();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/order/my");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void checkoutForwardsItemsAndPickupMethodWithTrustedIdentity() {
        client.post().uri("/order")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .bodyValue("{\"deliveryMethod\":\"pickup\",\"items\":[{\"productId\":\"20000000-0000-0000-0000-000000000001\",\"quantity\":1}]}")
                .exchange()
                .expectStatus().isCreated()
                .expectBody().jsonPath("$.id").exists();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().method()).isEqualTo("POST");
        assertThat(FORWARDED.get().path()).isEqualTo("/order");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
        assertThat(FORWARDED.get().body()).contains("\"deliveryMethod\":\"pickup\"")
                .contains("\"quantity\":1");
    }

    @Test
    void serverGeneratedRequestIdReplacesClientValueAndReachesDownstream() {
        var result = client.get().uri("/order/my")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("X-Request-Id", "forged-client-value")
                .exchange()
                .expectStatus().isOk()
                .expectBody().returnResult();

        String requestId = result.getResponseHeaders().getFirst("X-Request-Id");
        assertThat(requestId).isNotEqualTo("forged-client-value");
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        assertThat(FORWARDED.get().requestId()).isEqualTo(requestId);
    }

    @Test
    void missingOrInvalidJwtNeverReachesOrderService() {
        client.get().uri("/order/my")
                .header("user-id", "forged-admin")
                .exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().exists("X-Request-Id")
                .expectHeader().doesNotExist(HttpHeaders.WWW_AUTHENTICATE);
        client.get().uri("/order/my")
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                .exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().exists("X-Request-Id");

        assertThat(REQUEST_COUNT.get()).isZero();
    }

    private String token(String subject) {
        return Jwts.builder().setSubject(subject)
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();
    }

    private record ForwardedRequest(String method, String path, String userId, String requestId, String body) {}
}
