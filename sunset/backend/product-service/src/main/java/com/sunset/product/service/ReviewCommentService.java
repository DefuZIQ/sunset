package com.sunset.product.service;

import com.sunset.contract.IamAccess;
import com.sunset.contract.IamAuthorizer;
import com.sunset.contract.CustomerProfileReader;
import com.sunset.contract.LocalCustomerProfileReader;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class ReviewCommentService {
    private static final String FIELDS = "id,review_id AS \"reviewId\",user_id AS \"userId\",author_name AS \"authorName\",body,created_at AS \"createdAt\"";
    private final JdbcTemplate jdbc;
    private final IamAuthorizer access;
    private final CustomerProfileReader profiles;

    public ReviewCommentService(JdbcTemplate jdbc) { this(jdbc, new IamAccess(jdbc), new LocalCustomerProfileReader(jdbc)); }
    @Autowired
    public ReviewCommentService(JdbcTemplate jdbc, IamAuthorizer access, CustomerProfileReader profiles) { this.jdbc = jdbc; this.access = access; this.profiles = profiles; }

    public Map<String, Object> list(UUID reviewId, int offset) {
        requireVisibleReview(reviewId);
        if (offset < 0 || offset > 10000) throw new IllegalArgumentException("Некорректная страница комментариев");
        int limit = 20;
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM review_comments WHERE review_id=?", Long.class, reviewId);
        List<Map<String, Object>> items = jdbc.queryForList(
                "SELECT " + FIELDS + " FROM review_comments WHERE review_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
                reviewId, limit, offset);
        Map<String, Object> page = new LinkedHashMap<>();
        page.put("items", items);
        page.put("total", total == null ? 0L : total);
        return page;
    }

    @Transactional
    public Map<String, Object> create(UUID userId, UUID reviewId, Map<String, Object> request) {
        requireVisibleReview(reviewId);
        String body = Objects.toString(request.get("body"), "").trim();
        if (body.length() < 2 || body.length() > 1000) {
            throw new IllegalArgumentException("Комментарий должен содержать от 2 до 1000 символов");
        }
        String author = profiles.get(userId).displayName();
        return jdbc.queryForMap("INSERT INTO review_comments(review_id,user_id,author_name,body) VALUES (?,?,?,?) RETURNING " + FIELDS,
                reviewId, userId, author, body);
    }

    @Transactional
    public void delete(UUID userId, UUID commentId) {
        List<UUID> authors = jdbc.query("SELECT user_id FROM review_comments WHERE id=?", (rs, row) -> rs.getObject(1, UUID.class), commentId);
        if (authors.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Комментарий не найден");
        if (!authors.get(0).equals(userId)) {
            if (!access.permissions(userId).contains("reviews:moderate")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Можно удалить только свой комментарий");
            }
        }
        jdbc.update("DELETE FROM review_comments WHERE id=?", commentId);
    }

    private void requireVisibleReview(UUID reviewId) {
        Boolean visible = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM product_reviews WHERE id=? AND NOT is_hidden)", Boolean.class, reviewId);
        if (!Boolean.TRUE.equals(visible)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Отзыв не найден");
    }
}
