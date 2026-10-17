package com.sunset.product.service;

import com.sunset.contract.IamAccess;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class ReviewService {
    private final JdbcTemplate jdbc;
    private final ReviewPhotoService photos;
    private static final String REVIEW_FIELDS = "r.id,r.user_id AS \"userId\",r.author_name AS \"authorName\",r.rating,r.quality_rating AS \"qualityRating\",r.fit,r.photo_url AS \"photoUrl\",r.verified_purchase AS \"verifiedPurchase\",r.body,r.created_at AS \"createdAt\",r.store_reply AS \"storeReply\",r.store_replied_at AS \"storeRepliedAt\",r.is_hidden AS \"isHidden\",r.moderated_at AS \"moderatedAt\",(SELECT COUNT(*) FROM product_review_helpful_votes v WHERE v.review_id=r.id AND v.vote='LIKE') AS \"helpfulCount\",(SELECT COUNT(*) FROM product_review_helpful_votes v WHERE v.review_id=r.id AND v.vote='LIKE') AS \"likeCount\",(SELECT COUNT(*) FROM product_review_helpful_votes v WHERE v.review_id=r.id AND v.vote='DISLIKE') AS \"dislikeCount\",(SELECT COUNT(*) FROM review_comments c WHERE c.review_id=r.id) AS \"commentCount\"";

    public ReviewService(JdbcTemplate jdbc, ReviewPhotoService photos) { this.jdbc = jdbc; this.photos = photos; }

    public List<Map<String, Object>> list(UUID productId) {
        return list(productId, null);
    }

    public List<Map<String, Object>> list(UUID productId, UUID viewerId) {
        String sql = "SELECT " + REVIEW_FIELDS + ", (SELECT v.vote FROM product_review_helpful_votes v WHERE v.review_id=r.id AND v.user_id=?) AS \"myVote\" FROM product_reviews r WHERE r.product_id=? AND NOT r.is_hidden ORDER BY r.verified_purchase DESC,r.created_at DESC";
        return jdbc.queryForList(sql, viewerId, productId);
    }

    @Transactional
    public Map<String, Object> save(UUID userId, UUID productId, Map<String, Object> request) {
        int rating;
        try { rating = Integer.parseInt(Objects.toString(request.get("rating"), "0")); }
        catch (NumberFormatException e) { throw new IllegalArgumentException("Укажите оценку от 1 до 5"); }
        String body = Objects.toString(request.get("body"), "").trim();
        int qualityRating;
        try { qualityRating = Integer.parseInt(Objects.toString(request.get("qualityRating"), String.valueOf(rating))); }
        catch (NumberFormatException e) { qualityRating = rating; }
        String fit = Objects.toString(request.get("fit"), "AS_EXPECTED").toUpperCase(Locale.ROOT);
        boolean replacePhoto = request.containsKey("photoUrl");
        String photoUrl = replacePhoto ? Objects.toString(request.get("photoUrl"), "").trim()
                : jdbc.query("SELECT photo_url FROM product_reviews WHERE product_id=? AND user_id=?",
                    (rs, row) -> Objects.toString(rs.getString(1), ""), productId, userId).stream().findFirst().orElse("");
        if (rating < 1 || rating > 5) throw new IllegalArgumentException("Укажите оценку от 1 до 5");
        if (qualityRating < 1 || qualityRating > 5) throw new IllegalArgumentException("Оценка качества должна быть от 1 до 5");
        if (!Set.of("SMALL", "AS_EXPECTED", "LARGE").contains(fit)) throw new IllegalArgumentException("Некорректная оценка посадки");
        if (photoUrl.length() > 1000) throw new IllegalArgumentException("Ссылка на фото слишком длинная");
        if (replacePhoto && !photoUrl.isBlank()) {
            try {
                UUID photoId = UUID.fromString(photoUrl.replaceFirst("^/api/v1/products/review-photos/", ""));
                if (!photoUrl.equals(ReviewPhotoService.path(photoId)) || !photos.ownedBy(userId, productId, photoId)) {
                    throw new IllegalArgumentException("Загрузите фото через форму отзыва");
                }
            } catch (IllegalArgumentException error) {
                throw new IllegalArgumentException("Загрузите фото через форму отзыва", error);
            }
        }
        if (body.length() < 3 || body.length() > 1500) throw new IllegalArgumentException("Отзыв должен содержать от 3 до 1500 символов");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE id=?", Integer.class, productId) == 0) throw new IllegalArgumentException("Товар не найден");
        Map<String, Object> user = jdbc.queryForMap("SELECT first_name,last_name FROM users WHERE id=?", userId);
        String author = (Objects.toString(user.get("first_name"), "") + " " + Objects.toString(user.get("last_name"), "")).trim();
        if (author.isBlank()) author = "Клиент SUNSET";
        boolean verified = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=? AND o.user_id=? AND o.status='DELIVERED')", Boolean.class, productId, userId));
        jdbc.update("INSERT INTO product_reviews(product_id,user_id,author_name,rating,quality_rating,fit,photo_url,verified_purchase,body) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (product_id,user_id) DO UPDATE SET author_name=EXCLUDED.author_name,rating=EXCLUDED.rating,quality_rating=EXCLUDED.quality_rating,fit=EXCLUDED.fit,photo_url=EXCLUDED.photo_url,verified_purchase=EXCLUDED.verified_purchase,body=EXCLUDED.body,updated_at=NOW()", productId,userId,author,rating,qualityRating,fit,photoUrl.isBlank()?null:photoUrl,verified,body);
        photos.removeUnused(userId, productId, photoUrl);
        return jdbc.queryForMap("SELECT " + REVIEW_FIELDS + " FROM product_reviews r WHERE r.product_id=? AND r.user_id=?", productId,userId);
    }

    @Transactional
    public void deleteOwn(UUID userId, UUID reviewId) {
        List<UUID> productIds = jdbc.query("DELETE FROM product_reviews WHERE id=? AND user_id=? RETURNING product_id",
                (rs, row) -> rs.getObject(1, UUID.class), reviewId, userId);
        if (productIds.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Отзыв не найден");
        photos.removeUnused(userId, productIds.get(0), "");
    }

    public List<Map<String, Object>> adminList(UUID adminId) {
        ensureAdmin(adminId);
        return jdbc.queryForList("SELECT " + REVIEW_FIELDS + ",p.id AS \"productId\",p.name AS \"productName\" FROM product_reviews r JOIN products p ON p.id=r.product_id ORDER BY r.created_at DESC LIMIT 200");
    }

    @Transactional
    public Map<String, Object> saveStoreReply(UUID adminId, UUID reviewId, Map<String, Object> request) {
        ensureAdmin(adminId);
        String reply = Objects.toString(request.get("reply"), "").trim();
        if (reply.length() > 1500) throw new IllegalArgumentException("Ответ магазина не должен превышать 1500 символов");
        String value = reply.isBlank() ? null : reply;
        int updated = jdbc.update("UPDATE product_reviews SET store_reply=?,store_replied_at=CASE WHEN ? THEN NULL ELSE NOW() END,store_replied_by=?,updated_at=NOW() WHERE id=?", value, value == null, value == null ? null : adminId, reviewId);
        if (updated == 0) throw new IllegalArgumentException("Отзыв не найден");
        return jdbc.queryForMap("SELECT " + REVIEW_FIELDS + ",p.id AS \"productId\",p.name AS \"productName\" FROM product_reviews r JOIN products p ON p.id=r.product_id WHERE r.id=?", reviewId);
    }

    @Transactional
    public Map<String, Object> setHidden(UUID adminId, UUID reviewId, Map<String, Object> request) {
        ensureAdmin(adminId);
        if (!(request.get("isHidden") instanceof Boolean hidden)) throw new IllegalArgumentException("Укажите isHidden: true или false");
        int updated = jdbc.update("UPDATE product_reviews SET is_hidden=?,moderated_at=NOW(),moderated_by=?,updated_at=NOW() WHERE id=?", hidden, adminId, reviewId);
        if (updated == 0) throw new IllegalArgumentException("Отзыв не найден");
        return jdbc.queryForMap("SELECT " + REVIEW_FIELDS + ",p.id AS \"productId\",p.name AS \"productName\" FROM product_reviews r JOIN products p ON p.id=r.product_id WHERE r.id=?", reviewId);
    }

    @Transactional
    public Map<String, Object> markHelpful(UUID userId, UUID reviewId) {
        List<UUID> authors = jdbc.query("SELECT user_id FROM product_reviews WHERE id=? AND NOT is_hidden", (rs, row) -> rs.getObject(1, UUID.class), reviewId);
        if (authors.isEmpty()) throw new IllegalArgumentException("Отзыв не найден");
        if (authors.get(0).equals(userId)) throw new IllegalArgumentException("Нельзя оценить собственный отзыв");
        jdbc.update("INSERT INTO product_review_helpful_votes(review_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING", reviewId, userId);
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM product_review_helpful_votes WHERE review_id=? AND vote='LIKE'", Long.class, reviewId);
        return Map.of("reviewId", reviewId, "helpfulCount", count == null ? 0L : count);
    }

    @Transactional
    public Map<String, Object> vote(UUID userId, UUID reviewId, String vote) {
        if (!Set.of("LIKE", "DISLIKE").contains(vote)) throw new IllegalArgumentException("Выберите лайк или дизлайк");
        List<UUID> authors = jdbc.query("SELECT user_id FROM product_reviews WHERE id=? AND NOT is_hidden", (rs, row) -> rs.getObject(1, UUID.class), reviewId);
        if (authors.isEmpty()) throw new IllegalArgumentException("Отзыв не найден");
        if (authors.get(0).equals(userId)) throw new IllegalArgumentException("Нельзя оценить собственный отзыв");
        List<String> existing = jdbc.query("SELECT vote FROM product_review_helpful_votes WHERE review_id=? AND user_id=? FOR UPDATE", (rs, row) -> rs.getString(1), reviewId, userId);
        String myVote;
        if (!existing.isEmpty() && vote.equals(existing.get(0))) {
            jdbc.update("DELETE FROM product_review_helpful_votes WHERE review_id=? AND user_id=?", reviewId, userId);
            myVote = null;
        } else {
            jdbc.update("INSERT INTO product_review_helpful_votes(review_id,user_id,vote) VALUES (?,?,?) ON CONFLICT (review_id,user_id) DO UPDATE SET vote=EXCLUDED.vote", reviewId, userId, vote);
            myVote = vote;
        }
        Map<String, Object> counts = jdbc.queryForMap("SELECT COUNT(*) FILTER (WHERE vote='LIKE') AS \"likeCount\", COUNT(*) FILTER (WHERE vote='DISLIKE') AS \"dislikeCount\" FROM product_review_helpful_votes WHERE review_id=?", reviewId);
        Map<String, Object> result = new LinkedHashMap<>(counts);
        result.put("reviewId", reviewId);
        result.put("myVote", myVote);
        return result;
    }

    private void ensureAdmin(UUID userId) {
        new IamAccess(jdbc).require(userId, "reviews:moderate");
    }

    public List<Map<String, Object>> categoryTree() {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id,name,parent_id AS \"parentId\" FROM categories ORDER BY name");
        Map<UUID, Map<String, Object>> nodes = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            LinkedHashMap<String, Object> node = new LinkedHashMap<>(row);
            node.put("children", new ArrayList<Map<String, Object>>());
            nodes.put((UUID) row.get("id"), node);
        }
        List<Map<String, Object>> roots = new ArrayList<>();
        for (Map<String, Object> node : nodes.values()) {
            UUID parentId = (UUID) node.get("parentId");
            if (parentId != null && nodes.containsKey(parentId)) {
                @SuppressWarnings("unchecked") List<Map<String, Object>> children = (List<Map<String, Object>>) nodes.get(parentId).get("children");
                children.add(node);
            } else roots.add(node);
        }
        return roots;
    }
}
