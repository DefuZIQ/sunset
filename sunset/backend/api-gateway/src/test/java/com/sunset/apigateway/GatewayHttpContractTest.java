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
import org.springframework.http.MediaType;
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
                                .header("X-Request-Id", request.requestHeaders().get("X-Request-Id"))
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
        registry.add("spring.cloud.gateway.routes[2].id", () -> "notifications-test");
        registry.add("spring.cloud.gateway.routes[2].uri", () -> "http://localhost:" + DOWNSTREAM.port());
        registry.add("spring.cloud.gateway.routes[2].predicates[0]", () -> "Path=/notifications/**");
        registry.add("spring.cloud.gateway.routes[3].id", () -> "subscriptions-test");
        registry.add("spring.cloud.gateway.routes[3].uri", () -> "http://localhost:" + DOWNSTREAM.port());
        registry.add("spring.cloud.gateway.routes[3].predicates[0]", () -> "Path=/subscriptions/**");
        registry.add("spring.cloud.gateway.routes[4].id", () -> "products-test");
        registry.add("spring.cloud.gateway.routes[4].uri", () -> "http://localhost:" + DOWNSTREAM.port());
        registry.add("spring.cloud.gateway.routes[4].predicates[0]", () -> "Path=/products/**");
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
    void versionedRegistrationUsesTheSamePublicRoute() {
        client.post().uri("/api/v1/auth/register")
                .header("user-id", "forged-admin")
                .bodyValue("{\"email\":\"versioned@sunset.test\"}")
                .exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.token").isEqualTo("registered");

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/auth/register");
        assertThat(FORWARDED.get().userId()).isNull();
        assertThat(FORWARDED.get().body()).contains("versioned@sunset.test");
    }

    @Test
    void versionedNewsletterSignupIsPublicWithoutForwardingForgedIdentity() {
        client.post().uri("/api/v1/subscriptions")
                .header("user-id", "forged-admin")
                .bodyValue("{\"email\":\"guest@sunset.test\"}")
                .exchange()
                .expectStatus().isOk();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/subscriptions");
        assertThat(FORWARDED.get().userId()).isNull();
        assertThat(FORWARDED.get().body()).contains("guest@sunset.test");
    }

    @Test
    void versionedNotificationsRequireJwtAndForwardTrustedIdentity() {
        client.get().uri("/api/v1/notifications?limit=50")
                .exchange()
                .expectStatus().isUnauthorized()
                .expectBody().jsonPath("$.code").isEqualTo("UNAUTHORIZED");
        assertThat(REQUEST_COUNT.get()).isZero();

        client.get().uri("/api/v1/notifications?limit=50")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .exchange()
                .expectStatus().isOk();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/notifications?limit=50");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
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
    void versionedProtectedRouteKeepsQueryAndTrustedIdentity() {
        client.get().uri("/api/v1/order/my?limit=2")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$[0].id").exists();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/order/my?limit=2");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void helpfulReviewVoteRequiresJwtAndForwardsTrustedIdentity() {
        String path = "/api/v1/products/reviews/20000000-0000-0000-0000-000000000001/helpful";
        client.put().uri(path).header("user-id", "forged-admin")
                .exchange().expectStatus().isUnauthorized();
        assertThat(REQUEST_COUNT.get()).isZero();

        client.put().uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .exchange().expectStatus().isOk();
        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().method()).isEqualTo("PUT");
        assertThat(FORWARDED.get().path()).isEqualTo("/products/reviews/20000000-0000-0000-0000-000000000001/helpful");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void adminReviewReplyRequiresJwtAndForwardsTrustedIdentity() {
        String path = "/api/v1/products/admin/reviews/20000000-0000-0000-0000-000000000001/reply";
        client.put().uri(path).header("user-id", "forged-admin")
                .bodyValue("{\"reply\":\"Thanks\"}")
                .exchange().expectStatus().isUnauthorized();
        assertThat(REQUEST_COUNT.get()).isZero();

        client.put().uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .bodyValue("{\"reply\":\"Thanks\"}")
                .exchange().expectStatus().isOk();
        assertThat(FORWARDED.get().method()).isEqualTo("PUT");
        assertThat(FORWARDED.get().path()).isEqualTo("/products/admin/reviews/20000000-0000-0000-0000-000000000001/reply");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
        assertThat(FORWARDED.get().body()).contains("Thanks");
    }

    @Test
    void reviewModerationRequiresJwtAndForwardsTrustedIdentity() {
        String path = "/api/v1/products/admin/reviews/20000000-0000-0000-0000-000000000001/moderation";
        client.put().uri(path).header("user-id", "forged-admin")
                .bodyValue("{\"isHidden\":true}")
                .exchange().expectStatus().isUnauthorized();
        assertThat(REQUEST_COUNT.get()).isZero();

        client.put().uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .bodyValue("{\"isHidden\":true}")
                .exchange().expectStatus().isOk();
        assertThat(FORWARDED.get().path()).isEqualTo("/products/admin/reviews/20000000-0000-0000-0000-000000000001/moderation");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void reviewPhotoReadIsPublicButUploadRequiresJwt() {
        String photoPath = "/api/v1/products/review-photos/20000000-0000-0000-0000-000000000001";
        client.get().uri(photoPath).exchange().expectStatus().isOk();
        assertThat(FORWARDED.get().path()).isEqualTo("/products/review-photos/20000000-0000-0000-0000-000000000001");

        REQUEST_COUNT.set(0);
        String uploadPath = "/api/v1/products/review/20000000-0000-0000-0000-000000000001/photo";
        client.post().uri(uploadPath).header("user-id", "forged-user")
                .exchange().expectStatus().isUnauthorized();
        assertThat(REQUEST_COUNT.get()).isZero();
        client.post().uri(uploadPath)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-user")
                .exchange().expectStatus().isOk();
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void versionedAdminRouteRequiresJwtAndDoesNotTrustClientIdentity() {
        client.get().uri("/api/v1/order/admin/users")
                .header("user-id", "forged-admin")
                .exchange()
                .expectStatus().isUnauthorized()
                .expectBody().jsonPath("$.code").isEqualTo("UNAUTHORIZED");
        assertThat(REQUEST_COUNT.get()).isZero();

        client.get().uri("/api/v1/order/admin/users")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .exchange()
                .expectStatus().isOk();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().path()).isEqualTo("/order/admin/users");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
    }

    @Test
    void versionedAdminWriteForwardsMethodBodyAndTrustedIdentity() {
        client.patch().uri("/api/v1/order/admin/orders/20000000-0000-0000-0000-000000000001/status")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(CUSTOMER_ID))
                .header("user-id", "forged-admin")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{\"status\":\"CONFIRMED\"}")
                .exchange()
                .expectStatus().isOk();

        assertThat(REQUEST_COUNT.get()).isEqualTo(1);
        assertThat(FORWARDED.get().method()).isEqualTo("PATCH");
        assertThat(FORWARDED.get().path()).isEqualTo("/order/admin/orders/20000000-0000-0000-0000-000000000001/status");
        assertThat(FORWARDED.get().userId()).isEqualTo(CUSTOMER_ID);
        assertThat(FORWARDED.get().body()).contains("\"status\":\"CONFIRMED\"");
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
        assertThat(result.getResponseHeaders().get("X-Request-Id")).containsExactly(requestId);
        assertThat(FORWARDED.get().requestId()).isEqualTo(requestId);
    }

    @Test
    void versionedProtectedRouteRejectsAnonymousCallerBeforeForwarding() {
        var result = client.get().uri("/api/v1/order/my")
                .header("X-Request-Id", "untrusted-client-id")
                .exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().contentType(MediaType.APPLICATION_JSON)
                .expectHeader().doesNotExist(HttpHeaders.WWW_AUTHENTICATE)
                .expectBody()
                .jsonPath("$.code").isEqualTo("UNAUTHORIZED")
                .jsonPath("$.message").isEqualTo("Необходим вход в аккаунт")
                .jsonPath("$.timestamp").exists()
                .returnResult();

        String requestId = result.getResponseHeaders().getFirst("X-Request-Id");
        assertThat(requestId).isNotEqualTo("untrusted-client-id");
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        assertThat(new String(result.getResponseBody(), StandardCharsets.UTF_8))
                .contains("\"requestId\":\"" + requestId + "\"");

        assertThat(REQUEST_COUNT.get()).isZero();
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
                .expectHeader().contentType(MediaType.APPLICATION_JSON)
                .expectHeader().doesNotExist(HttpHeaders.WWW_AUTHENTICATE)
                .expectBody()
                .jsonPath("$.code").isEqualTo("INVALID_TOKEN")
                .jsonPath("$.message").isEqualTo("Недействительный токен")
                .jsonPath("$.requestId").exists();

        assertThat(REQUEST_COUNT.get()).isZero();
    }

    private String token(String subject) {
        return Jwts.builder().setSubject(subject)
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();
    }

    private record ForwardedRequest(String method, String path, String userId, String requestId, String body) {}
}
