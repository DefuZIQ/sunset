package com.sunset.product;

import com.sunset.product.dto.OrderDtos.CreateOrderRequest;
import com.sunset.product.dto.OrderDtos.OrderItemRequest;
import com.sunset.product.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class OrderPostgresIntegrationTest {
    private static final UUID CUSTOMER_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID ADMIN_ID = UUID.fromString("10000000-0000-0000-0000-000000000002");
    private static final UUID PRODUCT_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID COLOR_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID SIZE_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("sunset_order_test")
            .withUsername("sunset")
            .withPassword("sunset-test")
            .withInitScript("db/test-support.sql");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database", () -> "postgresql");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.security.jwt.secret", () -> "test-secret-that-is-at-least-32-bytes");
    }

    @Autowired private OrderService service;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void resetDatabase() {
        jdbc.execute("TRUNCATE TABLE return_requests, order_events, stock_reservations, payments, deliveries, " +
                "order_items, orders, loyalty_transactions, loyalty_accounts, product_images, images, " +
                "product_stock, products, colors, sizes, users RESTART IDENTITY CASCADE");
        jdbc.execute("ALTER SEQUENCE order_number_seq RESTART WITH 1001");
        jdbc.update("UPDATE promotions SET usage_count=0");

        jdbc.update("INSERT INTO users(id,email,password,first_name,last_name,phone,role) VALUES (?,?,?,?,?,?,?)",
                CUSTOMER_ID, "customer@sunset.test", "hash", "Иван", "Соколов", "+79990000001", "CUSTOMER");
        jdbc.update("INSERT INTO users(id,email,password,first_name,last_name,phone,role) VALUES (?,?,?,?,?,?,?)",
                ADMIN_ID, "admin@sunset.test", "hash", "Анна", "Администратор", "+79990000002", "ADMIN");
        jdbc.update("INSERT INTO products(id,name,price) VALUES (?,?,?)", PRODUCT_ID, "Тестовое пальто", new BigDecimal("4000.00"));
        jdbc.update("INSERT INTO colors(id,name,hex_code) VALUES (?,?,?)", COLOR_ID, "Карамельный", "#A56B46");
        jdbc.update("INSERT INTO sizes(id,name,type,gender,region,sort_order) VALUES (?,?,?,?,?,?)", SIZE_ID, "M", "clothes", "female", "RU", 20);
        jdbc.update("INSERT INTO product_stock(product_id,size_id,color_id,quantity) VALUES (?,?,?,5)", PRODUCT_ID, SIZE_ID, COLOR_ID);
        jdbc.update("INSERT INTO loyalty_accounts(user_id,balance,lifetime_earned,tier) VALUES (?,?,?,?)", CUSTOMER_ID, 1000, 0, "SUNRISE");
    }

    @Test
    void confirmsThenCancelsOrderWithCompleteCompensation() {
        Map<String, Object> created = service.create(CUSTOMER_ID, order("checkout-complete", "WELCOME10", 500, 1, "CARD"));
        UUID orderId = (UUID) created.get("id");

        assertThat(created.get("status")).isEqualTo("PENDING");
        assertThat(created.get("bonusesEarned")).isEqualTo(155);
        assertThat(balance()).isEqualTo(500);
        assertThat(stock()).isEqualTo(4);
        assertThat(transactionCount("EARN")).isZero();

        service.updateStatus(ADMIN_ID, orderId, "CONFIRMED");

        assertThat(balance()).isEqualTo(655);
        assertThat(transactionCount("EARN")).isEqualTo(1);

        Map<String, Object> cancelled = service.cancel(CUSTOMER_ID, orderId);

        assertThat(cancelled.get("status")).isEqualTo("CANCELLED");
        assertThat(balance()).isEqualTo(1000);
        assertThat(stock()).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT status FROM payments WHERE order_id=?", String.class, orderId)).isEqualTo("REFUNDED");
        assertThat(jdbc.queryForObject("SELECT status FROM stock_reservations WHERE order_id=?", String.class, orderId)).isEqualTo("RELEASED");
        assertThat(jdbc.queryForObject("SELECT usage_count FROM promotions WHERE code='WELCOME10'", Integer.class)).isZero();
        assertThat(transactionCount("CANCEL_ADJUST")).isEqualTo(2);

        // Network retries and double clicks must not refund stock or bonuses twice.
        service.cancel(CUSTOMER_ID, orderId);
        assertThat(balance()).isEqualTo(1000);
        assertThat(stock()).isEqualTo(5);
        assertThat(transactionCount("CANCEL_ADJUST")).isEqualTo(2);
    }

    @Test
    void idempotencyPreventsDuplicateOrdersAndStockOverselling() {
        CreateOrderRequest request = order("same-checkout", null, 0, 1, "CARD");

        UUID first = (UUID) service.create(CUSTOMER_ID, request).get("id");
        UUID replay = (UUID) service.create(CUSTOMER_ID, request).get("id");

        assertThat(replay).isEqualTo(first);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class)).isEqualTo(1);
        assertThat(stock()).isEqualTo(4);

        assertThatThrownBy(() -> service.create(CUSTOMER_ID, order("too-many", null, 0, 5, "CARD")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("недостаточно");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class)).isEqualTo(1);
        assertThat(stock()).isEqualTo(4);
    }

    @Test
    void paymentFailureRollsBackOrderAndReservation() {
        assertThatThrownBy(() -> service.create(CUSTOMER_ID, order("bad-payment", null, 0, 1, "CRYPTO")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("способ оплаты");

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM stock_reservations", Integer.class)).isZero();
        assertThat(stock()).isEqualTo(5);
        assertThat(balance()).isEqualTo(1000);
    }

    private CreateOrderRequest order(String key, String promoCode, int bonuses, int quantity, String paymentMethod) {
        return new CreateOrderRequest("Иван Соколов", "customer@sunset.test", "+79990000001",
                "SUNSET Нижний Новгород, Большая Покровская, 34", "pickup", paymentMethod,
                key, promoCode, bonuses, List.of(new OrderItemRequest(PRODUCT_ID, COLOR_ID, SIZE_ID, quantity)));
    }

    private int balance() {
        return jdbc.queryForObject("SELECT balance FROM loyalty_accounts WHERE user_id=?", Integer.class, CUSTOMER_ID);
    }

    private int stock() {
        return jdbc.queryForObject("SELECT quantity FROM product_stock WHERE product_id=? AND size_id=? AND color_id=?",
                Integer.class, PRODUCT_ID, SIZE_ID, COLOR_ID);
    }

    private int transactionCount(String type) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM loyalty_transactions WHERE user_id=? AND type=?",
                Integer.class, CUSTOMER_ID, type);
    }
}
