package com.sunset.product;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Opt-in, process-level journey through real Gateway, Auth, Product and Order
 * services. The database guard prevents this mutating test from hitting the
 * production store by accident.
 */
class CommerceHttpJourneyIT {
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Test
    void registrationCheckoutConfirmationAndCancellation() throws Exception {
        String baseUrl = required("E2E_BASE_URL");
        String jdbcUrl = required("E2E_JDBC_URL");
        String dbUser = required("E2E_DB_USER");
        String dbPassword = required("E2E_DB_PASSWORD");
        URI base = URI.create(baseUrl);
        if (!"127.0.0.1".equals(base.getHost()) && !"localhost".equals(base.getHost())) {
            throw new IllegalStateException("E2E_BASE_URL must use the local isolated Gateway");
        }
        if (!jdbcUrl.matches("^jdbc:postgresql://[^/]+/sunset_e2e(?:\\?.*)?$")) {
            throw new IllegalStateException("E2E_JDBC_URL must target the sunset_e2e database");
        }

        try (Connection db = DriverManager.getConnection(jdbcUrl, dbUser, dbPassword)) {
            if (!"sunset_e2e".equals(db.getCatalog())) {
                throw new IllegalStateException("Connected database is not sunset_e2e");
            }

            String suffix = UUID.randomUUID().toString().substring(0, 8);
            String customerEmail = "customer-" + suffix + "@sunset.test";
            String adminEmail = "admin-" + suffix + "@sunset.test";
            JsonNode customer = request(base, "POST", "/auth/register", null,
                    registration(customerEmail, "Иван"), 200);
            JsonNode admin = request(base, "POST", "/auth/register", null,
                    registration(adminEmail, "Анна"), 200);
            assertThat(customer.path("role").asText()).isEqualTo("CUSTOMER");
            assertThat(admin.path("role").asText()).isEqualTo("CUSTOMER");

            try (PreparedStatement statement = db.prepareStatement("UPDATE users SET role='ADMIN' WHERE id=?")) {
                statement.setObject(1, UUID.fromString(admin.path("uuid").asText()));
                assertThat(statement.executeUpdate()).isEqualTo(1);
            }
            String customerToken = login(base, customerEmail);
            String adminToken = login(base, adminEmail);
            assertThat(request(base, "POST", "/auth/login", null,
                    loginBody(adminEmail), 200).path("role").asText()).isEqualTo("ADMIN");
            assertThat(request(base, "POST", "/auth/login", null,
                    loginBody(customerEmail).put("password", "incorrect"), 401)
                    .path("code").asText()).isEqualTo("INVALID_CREDENTIALS");
            assertThat(request(base, "POST", "/products/by-uuid", null,
                    json.createObjectNode().put("id", UUID.randomUUID().toString()), 404)
                    .path("code").asText()).isEqualTo("NOT_FOUND");
            assertThat(request(base, "POST", "/order", customerToken,
                    json.createObjectNode().set("items", json.createArrayNode()), 400)
                    .path("code").asText()).isEqualTo("BAD_REQUEST");

            JsonNode catalog = request(base, "GET", "/products/all", null, null, 200);
            JsonNode product = null;
            JsonNode variant = null;
            for (JsonNode candidate : catalog) {
                for (JsonNode stock : candidate.path("stock")) {
                    if (stock.path("quantity").asInt() > 0) {
                        product = candidate;
                        variant = stock;
                        break;
                    }
                }
                if (product != null) break;
            }
            assertThat(product).as("catalog has an in-stock product").isNotNull();
            int originalStock = variant.path("quantity").asInt();
            int originalBalance = request(base, "GET", "/order/loyalty", customerToken, null, 200)
                    .path("balance").asInt();

            ObjectNode orderBody = json.createObjectNode();
            orderBody.put("customerName", "Иван Тестовый");
            orderBody.put("customerEmail", customerEmail);
            orderBody.put("customerPhone", "+79990000001");
            orderBody.put("address", "SUNSET Нижний Новгород, Большая Покровская, 34");
            orderBody.put("deliveryMethod", "pickup");
            orderBody.put("paymentMethod", "CARD");
            orderBody.put("idempotencyKey", "e2e-" + suffix);
            orderBody.put("bonusesToUse", 0);
            ObjectNode item = orderBody.putArray("items").addObject();
            item.put("productId", product.path("id").asText());
            item.put("colorId", variant.path("colorId").asText());
            item.put("sizeId", variant.path("sizeId").asText());
            item.put("quantity", 1);

            JsonNode created = request(base, "POST", "/order", customerToken, orderBody, 201);
            String orderId = created.path("id").asText();
            assertThat(created.path("status").asText()).isEqualTo("PENDING");
            assertThat(request(base, "POST", "/order", customerToken, orderBody, 201)
                    .path("id").asText()).isEqualTo(orderId);
            assertThat(request(base, "GET", "/order/my/" + orderId, customerToken, null, 200)
                    .path("items").size()).isEqualTo(1);

            JsonNode confirmed = request(base, "PATCH", "/order/admin/orders/" + orderId + "/status",
                    adminToken, json.createObjectNode().put("status", "CONFIRMED"), 200);
            assertThat(confirmed.path("status").asText()).isEqualTo("CONFIRMED");
            int earnedBalance = request(base, "GET", "/order/loyalty", customerToken, null, 200)
                    .path("balance").asInt();
            assertThat(earnedBalance).isGreaterThan(originalBalance);

            JsonNode cancelled = request(base, "POST", "/order/my/" + orderId + "/cancel",
                    customerToken, null, 200);
            assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");
            request(base, "POST", "/order/my/" + orderId + "/cancel", customerToken, null, 200);
            assertThat(request(base, "GET", "/order/loyalty", customerToken, null, 200)
                    .path("balance").asInt()).isEqualTo(originalBalance);

            JsonNode refreshedCatalog = request(base, "GET", "/products/all", null, null, 200);
            int restoredStock = -1;
            for (JsonNode candidate : refreshedCatalog) {
                if (!candidate.path("id").asText().equals(product.path("id").asText())) continue;
                for (JsonNode stock : candidate.path("stock")) {
                    if (stock.path("colorId").asText().equals(variant.path("colorId").asText())
                            && stock.path("sizeId").asText().equals(variant.path("sizeId").asText())) {
                        restoredStock = stock.path("quantity").asInt();
                    }
                }
            }
            assertThat(restoredStock).isEqualTo(originalStock);
            assertThat(request(base, "GET", "/order/my", null, null, 401)
                    .path("code").asText()).isEqualTo("UNAUTHORIZED");
            System.out.println("Commerce HTTP E2E passed: registration, catalog, checkout, idempotency, "
                    + "admin confirmation, loyalty compensation, stock restoration and access control");
        }
    }

    private ObjectNode registration(String email, String firstName) {
        return json.createObjectNode().put("email", email).put("password", "TestPass123!")
                .put("firstName", firstName).put("lastName", "Тестовый");
    }

    private ObjectNode loginBody(String email) {
        return json.createObjectNode().put("email", email).put("password", "TestPass123!");
    }

    private String login(URI base, String email) throws Exception {
        String token = request(base, "POST", "/auth/login", null, loginBody(email), 200)
                .path("token").asText();
        assertThat(token).isNotBlank();
        return token;
    }

    private JsonNode request(URI base, String method, String path, String token,
                             JsonNode body, int expectedStatus) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(base.resolve(path))
                .timeout(Duration.ofSeconds(15));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (body != null) builder.header("Content-Type", "application/json");
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as(method + " " + path + ": " + response.body())
                .isEqualTo(expectedStatus);
        String requestId = response.headers().firstValue("X-Request-Id")
                .orElseThrow(() -> new AssertionError(method + " " + path + " has no X-Request-Id"));
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        JsonNode result = response.body().isBlank() ? json.nullNode() : json.readTree(response.body());
        if (expectedStatus >= 400) {
            assertThat(result.path("code").asText()).as(method + " " + path + " error code").isNotBlank();
            assertThat(result.path("message").asText()).as(method + " " + path + " error message").isNotBlank();
            assertThat(result.path("fieldErrors").isObject()).as(method + " " + path + " field errors").isTrue();
            assertThat(result.path("requestId").asText()).isEqualTo(requestId);
            assertThat(result.path("timestamp").asText()).isNotBlank();
        }
        return result;
    }

    private String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException(name + " is required");
        return value;
    }
}
