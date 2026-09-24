package com.sunset.product.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ReviewService {
    private final JdbcTemplate jdbc;

    public ReviewService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> list(UUID productId) {
        return jdbc.queryForList("SELECT id,user_id AS \"userId\",author_name AS \"authorName\",rating,body,created_at AS \"createdAt\" FROM product_reviews WHERE product_id=? ORDER BY created_at DESC", productId);
    }

    @Transactional
    public Map<String, Object> save(UUID userId, UUID productId, Map<String, Object> request) {
        int rating;
        try { rating = Integer.parseInt(Objects.toString(request.get("rating"), "0")); }
        catch (NumberFormatException e) { throw new IllegalArgumentException("Укажите оценку от 1 до 5"); }
        String body = Objects.toString(request.get("body"), "").trim();
        if (rating < 1 || rating > 5) throw new IllegalArgumentException("Укажите оценку от 1 до 5");
        if (body.length() < 3 || body.length() > 1500) throw new IllegalArgumentException("Отзыв должен содержать от 3 до 1500 символов");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE id=?", Integer.class, productId) == 0) throw new IllegalArgumentException("Товар не найден");
        Map<String, Object> user = jdbc.queryForMap("SELECT first_name,last_name FROM users WHERE id=?", userId);
        String author = (Objects.toString(user.get("first_name"), "") + " " + Objects.toString(user.get("last_name"), "")).trim();
        if (author.isBlank()) author = "Клиент SUNSET";
        jdbc.update("INSERT INTO product_reviews(product_id,user_id,author_name,rating,body) VALUES (?,?,?,?,?) ON CONFLICT (product_id,user_id) DO UPDATE SET author_name=EXCLUDED.author_name,rating=EXCLUDED.rating,body=EXCLUDED.body,updated_at=NOW()", productId,userId,author,rating,body);
        return jdbc.queryForMap("SELECT id,user_id AS \"userId\",author_name AS \"authorName\",rating,body,created_at AS \"createdAt\" FROM product_reviews WHERE product_id=? AND user_id=?", productId,userId);
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
