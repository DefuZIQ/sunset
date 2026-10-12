package com.sunset.product;

import com.sunset.product.service.ProductService;
import com.sunset.product.service.AdminProductService;
import com.sunset.product.service.ReviewService;
import com.sunset.product.service.ReviewPhotoService;
import com.sunset.product.service.ReviewCommentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.liquibase.enabled", () -> "true");
        registry.add("spring.security.jwt.secret", () -> "test-secret-that-is-at-least-32-bytes");
    }

    @Autowired private ProductService products;
    @Autowired private AdminProductService adminProducts;
    @Autowired private ReviewService reviews;
    @Autowired private ReviewPhotoService photos;
    @Autowired private ReviewCommentService comments;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void migrationsSeedUsableCatalogAndCategoryTree() {
        assertThat(jdbc.queryForObject("SELECT character_maximum_length FROM information_schema.columns WHERE table_name='colors' AND column_name='hex_code'", Integer.class)).isEqualTo(7);
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
    @Transactional
    void changingOneStoreStockKeepsWarehouseAndAggregateCorrect() {
        UUID adminId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'ADMIN')", adminId, "Администратор");
        jdbc.update("INSERT INTO stores(id,name,city,address,kind,active) VALUES (?,?,?,?, 'STORE',TRUE)", storeId, "Тестовый магазин", "Нижний Новгород", "Тестовая, 1");
        UUID productId = (UUID) adminProducts.create(adminId, Map.of(
                "name", "Тестовый товар для остатков", "price", 1000,
                "quantity", 2, "category", "Женские боди", "gender", "WOMEN")).get("id");
        Map<String,Object> variant = jdbc.queryForMap("SELECT size_id,color_id FROM product_stock WHERE product_id=? LIMIT 1", productId);
        UUID sizeId = (UUID) variant.get("size_id");
        UUID colorId = (UUID) variant.get("color_id");

        adminProducts.updateStock(adminId, productId, Map.of("locationId", storeId.toString(),
                "stock", List.of(Map.of("sizeId", sizeId.toString(), "colorId", colorId.toString(), "quantity", 3))));
        assertThat(jdbc.queryForObject("SELECT quantity FROM product_stock WHERE product_id=? AND size_id=? AND color_id=?", Integer.class,
                productId, sizeId, colorId)).isEqualTo(5);
        assertThat(adminProducts.stock(adminId, productId, storeId)).hasSize(1);
        assertThat(products.getStoreAvailability(storeId)).anySatisfy(row -> {
            assertThat(row.get("productId")).isEqualTo(productId);
            assertThat(row.get("quantity")).isEqualTo(3);
        });
        assertThatThrownBy(() -> products.getStoreAvailability(UUID.fromString("00000000-0000-4000-8000-000000000001")))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(jdbc.queryForObject("SELECT quantity FROM location_stock WHERE location_id='00000000-0000-4000-8000-000000000001' AND product_id=? AND size_id=? AND color_id=?", Integer.class,
                productId, sizeId, colorId)).isEqualTo(2);

        adminProducts.updateStock(adminId, productId, Map.of("locationId", storeId.toString(), "stock", List.of()));
        assertThat(jdbc.queryForObject("SELECT quantity FROM product_stock WHERE product_id=? AND size_id=? AND color_id=?", Integer.class,
                productId, sizeId, colorId)).isEqualTo(2);
        assertThat(products.getStoreAvailability(storeId)).noneMatch(row -> productId.equals(row.get("productId")));
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
    @Transactional
    void commentsArePaginatedOwnedAndRemovedWithReview() {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID reviewerId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID strangerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,? ,?)", reviewerId, "Иван", "Соколов");
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,? ,?)", authorId, "Анна", "Мирная");
        jdbc.update("INSERT INTO users(id,first_name,last_name) VALUES (?,? ,?)", strangerId, "Пётр", "Петров");
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'ADMIN')", adminId, "Модератор");
        UUID reviewId = jdbc.queryForObject("INSERT INTO product_reviews(product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?) RETURNING id",
                UUID.class, productId, reviewerId, "Иван Соколов", 5, "Отличная вещь");

        assertThatThrownBy(() -> comments.create(authorId, reviewId, Map.of("body", " ")))
                .isInstanceOf(IllegalArgumentException.class);
        UUID firstId = null;
        for (int index = 0; index < 21; index++) {
            Map<String, Object> saved = comments.create(authorId, reviewId, Map.of("body", "Вопрос " + index));
            if (index == 0) firstId = (UUID) saved.get("id");
        }
        assertThat(comments.list(reviewId, 0).get("total")).isEqualTo(21L);
        assertThat((List<?>) comments.list(reviewId, 0).get("items")).hasSize(20);
        assertThat((List<?>) comments.list(reviewId, 20).get("items")).hasSize(1);
        assertThat(reviews.list(productId)).filteredOn(row -> reviewId.equals(row.get("id")))
                .singleElement().satisfies(row -> assertThat(row.get("commentCount")).isEqualTo(21L));

        UUID commentId = firstId;
        assertThatThrownBy(() -> comments.delete(strangerId, commentId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
        comments.delete(adminId, commentId);
        assertThat(comments.list(reviewId, 0).get("total")).isEqualTo(20L);
        jdbc.update("UPDATE product_reviews SET is_hidden=TRUE WHERE id=?", reviewId);
        assertThatThrownBy(() -> comments.list(reviewId, 0)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        assertThatThrownBy(() -> comments.create(authorId, reviewId, Map.of("body", "Новый вопрос")))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        jdbc.update("DELETE FROM product_reviews WHERE id=?", reviewId);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM review_comments WHERE review_id=?", Integer.class, reviewId)).isZero();
    }

    @Test
    void reviewerCanDeleteOnlyOwnReviewTogetherWithVotesAndPhoto() throws IOException {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name) VALUES (?,?)", ownerId, "Автор");
        jdbc.update("INSERT INTO users(id,first_name) VALUES (?,?)", otherId, "Другой");

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(12, 12, BufferedImage.TYPE_INT_RGB), "png", output);
        String photoUrl = photos.upload(ownerId, productId,
                new MockMultipartFile("file", "review.png", "image/png", output.toByteArray())).get("photoUrl");
        UUID photoId = UUID.fromString(photoUrl.substring(photoUrl.lastIndexOf('/') + 1));
        UUID reviewId = (UUID) reviews.save(ownerId, productId,
                Map.of("rating", 5, "body", "Отличное качество", "photoUrl", photoUrl)).get("id");
        reviews.vote(otherId, reviewId, "LIKE");

        assertThatThrownBy(() -> reviews.deleteOwn(otherId, reviewId))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(reviews.list(productId)).anyMatch(row -> reviewId.equals(row.get("id")));

        reviews.deleteOwn(ownerId, reviewId);
        assertThat(reviews.list(productId)).noneMatch(row -> reviewId.equals(row.get("id")));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM product_review_helpful_votes WHERE review_id=?", Integer.class, reviewId)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM product_review_photos WHERE id=?", Integer.class, photoId)).isZero();
        assertThatThrownBy(() -> reviews.deleteOwn(ownerId, reviewId)).isInstanceOf(ResponseStatusException.class);
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
    void reviewReactionsCanSwitchAndToggleWithoutLosingPreviousHelpfulVotes() {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID authorId = UUID.randomUUID();
        UUID voterId = UUID.randomUUID();
        UUID secondVoterId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name) VALUES (?,?)", authorId, "Автор");
        jdbc.update("INSERT INTO users(id,first_name) VALUES (?,?)", voterId, "Читатель");
        jdbc.update("INSERT INTO users(id,first_name) VALUES (?,?)", secondVoterId, "Другой читатель");
        UUID reviewId = UUID.randomUUID();
        jdbc.update("INSERT INTO product_reviews(id,product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?,?)",
                reviewId, productId, authorId, "Автор", 5, "Хорошее качество");

        reviews.markHelpful(secondVoterId, reviewId);
        assertThat(reviews.vote(voterId, reviewId, "LIKE")).containsEntry("likeCount", 2L).containsEntry("dislikeCount", 0L).containsEntry("myVote", "LIKE");
        assertThat(reviews.vote(voterId, reviewId, "DISLIKE")).containsEntry("likeCount", 1L).containsEntry("dislikeCount", 1L).containsEntry("myVote", "DISLIKE");
        assertThat(reviews.list(productId, voterId).stream().filter(row -> reviewId.equals(row.get("id"))).findFirst().orElseThrow())
                .containsEntry("myVote", "DISLIKE").containsEntry("likeCount", 1L).containsEntry("dislikeCount", 1L);
        assertThat(reviews.vote(voterId, reviewId, "DISLIKE")).containsEntry("dislikeCount", 0L).containsEntry("myVote", null);
        assertThatThrownBy(() -> reviews.vote(voterId, reviewId, "OTHER")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> reviews.vote(authorId, reviewId, "LIKE")).isInstanceOf(IllegalArgumentException.class);
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

    @Test
    void uploadedPhotoIsOwnedByReviewerAndVisibleOnlyWithPublishedReview() throws IOException {
        UUID productId = jdbc.queryForObject("SELECT id FROM products LIMIT 1", UUID.class);
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'USER')", userId, "Фотограф");
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'USER')", otherUserId, "Другой");
        jdbc.update("INSERT INTO users(id,first_name,role) VALUES (?,?,'ADMIN')", adminId, "Менеджер");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(12, 12, BufferedImage.TYPE_INT_RGB), "png", output);
        byte[] png = output.toByteArray();
        String photoUrl = photos.upload(userId, productId,
                new MockMultipartFile("file", "photo.png", "image/png", png)).get("photoUrl");
        UUID photoId = UUID.fromString(photoUrl.substring(photoUrl.lastIndexOf('/') + 1));
        assertThatThrownBy(() -> photos.readPublished(photoId)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> reviews.save(otherUserId, productId,
                Map.of("rating", 5, "body", "Чужая фотография", "photoUrl", photoUrl))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> reviews.save(userId, productId,
                Map.of("rating", 5, "body", "Внешняя ссылка", "photoUrl", "https://example.test/photo.png"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> photos.upload(userId, productId,
                new MockMultipartFile("file", "fake.png", "image/png", "not an image".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);

        Map<String, Object> saved = reviews.save(userId, productId,
                Map.of("rating", 5, "body", "Фото ткани", "photoUrl", photoUrl));
        assertThat(saved.get("photoUrl")).isEqualTo(photoUrl);
        assertThat(photos.readPublished(photoId).contentType()).isEqualTo("image/png");
        assertThat(photos.readPublished(photoId).bytes()).isNotEmpty();
        reviews.setHidden(adminId, (UUID) saved.get("id"), Map.of("isHidden", true));
        assertThatThrownBy(() -> photos.readPublished(photoId)).isInstanceOf(ResponseStatusException.class);
        reviews.setHidden(adminId, (UUID) saved.get("id"), Map.of("isHidden", false));
        assertThat(photos.readPublished(photoId).bytes()).isNotEmpty();
        Map<String, Object> edited = reviews.save(userId, productId, Map.of("rating", 4, "body", "Обновлённый отзыв"));
        assertThat(edited.get("photoUrl")).isEqualTo(photoUrl);
        assertThat(photos.readPublished(photoId).bytes()).isNotEmpty();

        String unusedUrl = photos.upload(userId, productId,
                new MockMultipartFile("file", "unused.png", "image/png", png)).get("photoUrl");
        UUID unusedId = UUID.fromString(unusedUrl.substring(unusedUrl.lastIndexOf('/') + 1));
        jdbc.update("UPDATE product_review_photos SET created_at=NOW() - INTERVAL '2 days' WHERE id=?", unusedId);
        photos.cleanupOrphans();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM product_review_photos WHERE id=?", Integer.class, unusedId)).isZero();
        assertThat(photos.readPublished(photoId).bytes()).isNotEmpty();
        assertThat(reviews.save(userId, productId, Map.of("rating", 4, "body", "Удаляю фотографию", "photoUrl", "")).get("photoUrl")).isNull();
        assertThatThrownBy(() -> photos.readPublished(photoId)).isInstanceOf(ResponseStatusException.class);
    }
}
