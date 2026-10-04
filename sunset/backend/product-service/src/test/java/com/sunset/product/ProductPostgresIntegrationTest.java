package com.sunset.product;

import com.sunset.product.service.ProductService;
import com.sunset.product.service.ReviewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ProductPostgresIntegrationTest {
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("sunset_product_test")
            .withUsername("sunset")
            .withPassword("sunset-test")
            .withInitScript("db/test-support.sql");

    static { POSTGRES.start(); }

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

    @Autowired private ProductService products;
    @Autowired private ReviewService reviews;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void migrationsSeedUsableCatalogAndCategoryTree() {
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM products", Integer.class)).isGreaterThanOrEqualTo(100);
        assertThat(products.getProducts()).hasSizeGreaterThanOrEqualTo(100);
        assertThat(reviews.categoryTree()).isNotEmpty();

        UUID productId = jdbc.queryForObject("SELECT id FROM products WHERE EXISTS (SELECT 1 FROM product_stock WHERE product_id=products.id) LIMIT 1", UUID.class);
        var product = products.getProductById(productId).orElseThrow();
        assertThat(product.getName()).isNotBlank();
        assertThat(product.getGender()).isIn("WOMEN", "MEN", "UNISEX");
        assertThat(product.getCategories()).isNotEmpty();
        assertThat(product.getStock()).isNotEmpty();
    }

    @Test
    void ratingUsesPersistedReviews() {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID userId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,?,?)", userId, "Иван", "Соколов");
        jdbc.update("INSERT INTO product_reviews(product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?)",
                productId, userId, "Иван Соколов", 5, "Отличная вещь");

        var product = products.getProductById(productId).orElseThrow();
        assertThat(product.getRating()).isEqualTo(5.0);
        assertThat(product.getReviewCount()).isEqualTo(1);
        List<Map<String, Object>> persisted = reviews.list(productId);
        assertThat(persisted).hasSize(1);
        assertThat(persisted.get(0).get("authorName")).isEqualTo("Иван Соколов");
    }
}
