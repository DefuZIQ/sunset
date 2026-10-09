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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        int originalCount = products.getProductById(productId).orElseThrow().getReviewCount();
        UUID userId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,?,?)", userId, "Иван", "Соколов");
        jdbc.update("INSERT INTO product_reviews(product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?)",
                productId, userId, "Иван Соколов", 5, "Отличная вещь");

        var product = products.getProductById(productId).orElseThrow();
        assertThat(product.getRating()).isGreaterThan(0);
        assertThat(product.getReviewCount()).isEqualTo(originalCount + 1);
        List<Map<String, Object>> persisted = reviews.list(productId);
        assertThat(persisted).anyMatch(row -> userId.equals(row.get("userId")) && "Иван Соколов".equals(row.get("authorName")));
    }

    @Test
    void helpfulVotesAreIdempotentAndAuthorsCannotVoteForThemselves() {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID authorId = UUID.randomUUID();
        UUID voterId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,?,?)", authorId, "Анна", "Автор");
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,?,?)", voterId, "Иван", "Читатель");
        UUID reviewId = UUID.randomUUID();
        jdbc.update("INSERT INTO product_reviews(id,product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?,?)",
                reviewId, productId, authorId, "Анна Автор", 5, "Хорошее качество");

        assertThat(reviews.markHelpful(voterId, reviewId).get("helpfulCount")).isEqualTo(1L);
        assertThat(reviews.markHelpful(voterId, reviewId).get("helpfulCount")).isEqualTo(1L);
        assertThat(reviews.list(productId).stream().filter(row -> reviewId.equals(row.get("id")))
                .findFirst().orElseThrow().get("helpfulCount")).isEqualTo(1L);
        assertThatThrownBy(() -> reviews.markHelpful(authorId, reviewId))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("собственный");
        assertThatThrownBy(() -> reviews.markHelpful(voterId, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("не найден");
    }

    @Test
    void onlyAdminCanReplyAndPublicReviewShowsTheReply() {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID authorId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,?,?)", authorId, "Анна", "Автор");
        jdbc.update("INSERT INTO users(id,first_name,last_name,role) VALUES (?,?,?,'ADMIN')", adminId, "Мария", "Менеджер");
        UUID reviewId = UUID.randomUUID();
        jdbc.update("INSERT INTO product_reviews(id,product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?,?)",
                reviewId, productId, authorId, "Анна Автор", 5, "Хорошая ткань");

        assertThatThrownBy(() -> reviews.adminList(authorId)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> reviews.saveStoreReply(authorId, reviewId, Map.of("reply", "Неавторизованный ответ")))
                .isInstanceOf(SecurityException.class);
        assertThat(reviews.adminList(adminId)).anySatisfy(row -> assertThat(row.get("id")).isEqualTo(reviewId));

        Map<String, Object> saved = reviews.saveStoreReply(adminId, reviewId, Map.of("reply", "  Спасибо за отзыв!  "));
        assertThat(saved.get("storeReply")).isEqualTo("Спасибо за отзыв!");
        assertThat(saved.get("storeRepliedAt")).isNotNull();
        assertThat(reviews.list(productId).stream().filter(row -> reviewId.equals(row.get("id")))
                .findFirst().orElseThrow().get("storeReply")).isEqualTo("Спасибо за отзыв!");

        assertThatThrownBy(() -> reviews.saveStoreReply(adminId, reviewId, Map.of("reply", "а".repeat(1501))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(reviews.saveStoreReply(adminId, reviewId, Map.of("reply", "")).get("storeReply")).isNull();
        assertThatThrownBy(() -> reviews.saveStoreReply(adminId, UUID.randomUUID(), Map.of("reply", "Ответ")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("не найден");
    }

    @Test
    void moderationHidesReviewFromStorefrontRatingAndHelpfulVotes() {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        int originalCount = products.getProductById(productId).orElseThrow().getReviewCount();
        UUID authorId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID voterId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'USER')", authorId, "Автор");
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'ADMIN')", adminId, "Менеджер");
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'USER')", voterId, "Читатель");
        UUID reviewId = UUID.randomUUID();
        jdbc.update("INSERT INTO product_reviews(id,product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?,?)",
                reviewId, productId, authorId, "Автор", 1, "Не подошло");

        assertThatThrownBy(() -> reviews.setHidden(authorId, reviewId, Map.of("isHidden", true))).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> reviews.setHidden(adminId, reviewId, Map.of("isHidden", "yes"))).isInstanceOf(IllegalArgumentException.class);
        assertThat(reviews.setHidden(adminId, reviewId, Map.of("isHidden", true)).get("isHidden")).isEqualTo(true);
        assertThat(reviews.adminList(adminId).stream().filter(row -> reviewId.equals(row.get("id")))
                .findFirst().orElseThrow().get("isHidden")).isEqualTo(true);
        assertThat(reviews.list(productId)).noneMatch(row -> reviewId.equals(row.get("id")));
        assertThat(products.getProductById(productId).orElseThrow().getReviewCount()).isEqualTo(originalCount);
        assertThatThrownBy(() -> reviews.markHelpful(voterId, reviewId)).isInstanceOf(IllegalArgumentException.class);
        assertThat(reviews.setHidden(adminId, reviewId, Map.of("isHidden", false)).get("isHidden")).isEqualTo(false);
        assertThat(reviews.list(productId)).anyMatch(row -> reviewId.equals(row.get("id")));
        assertThat(products.getProductById(productId).orElseThrow().getReviewCount()).isEqualTo(originalCount + 1);
        assertThatThrownBy(() -> reviews.setHidden(adminId, UUID.randomUUID(), Map.of("isHidden", true)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("не найден");
    }
}
