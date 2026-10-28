package com.sunset.product.service;

import com.sunset.product.dto.CatalogPage;
import com.sunset.product.dto.ProductDTO;
import com.sunset.product.model.Product;
import com.sunset.product.repository.ProductRepository;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class CatalogSearchService {
    private final NamedParameterJdbcTemplate jdbc;
    private final ProductRepository repository;
    private final ProductService products;

    public CatalogSearchService(NamedParameterJdbcTemplate jdbc, ProductRepository repository, ProductService products) {
        this.jdbc = jdbc;
        this.repository = repository;
        this.products = products;
    }

    public CatalogPage search(MultiValueMap<String, String> query) {
        int page = integer(query.getFirst("page"), 1, 1, 10000);
        int pageSize = integer(query.getFirst("pageSize"), 48, 1, 100);
        String gender = query.getFirst("gender");
        String availability = query.getFirst("availability");
        String sort = query.getFirst("sort");
        if (gender != null && !List.of("all", "WOMEN", "MEN").contains(gender)) badRequest("Некорректный раздел каталога");
        if (availability != null && !List.of("all", "in-stock", "low-stock").contains(availability)) badRequest("Некорректный фильтр наличия");
        if (sort != null && !List.of("new", "price-asc", "price-desc", "rating-desc", "name").contains(sort)) badRequest("Некорректная сортировка");

        MapSqlParameterSource values = new MapSqlParameterSource();
        StringBuilder from = new StringBuilder("""
                FROM products p
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS review_count, COALESCE(ROUND(AVG(rating)::numeric,1),0) AS rating
                    FROM product_reviews WHERE product_id=p.id AND NOT is_hidden
                ) reviews ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(quantity),0) AS quantity FROM %s stock
                    WHERE stock.product_id=p.id %s
                ) inventory ON TRUE
                WHERE 1=1
                """.formatted(query.getFirst("store") == null || query.getFirst("store").isBlank() ? "product_stock" : "location_stock",
                query.getFirst("store") == null || query.getFirst("store").isBlank() ? "" : "AND stock.location_id=:storeId"));

        String store = query.getFirst("store");
        if (store != null && !store.isBlank()) {
            try { values.addValue("storeId", UUID.fromString(store)); }
            catch (IllegalArgumentException error) { badRequest("Некорректный магазин"); }
            from.append(" AND EXISTS (SELECT 1 FROM stores s WHERE s.id=:storeId AND s.kind='STORE' AND s.active) AND inventory.quantity>0");
        }
        if (gender != null && !gender.equals("all")) {
            from.append(" AND p.gender IN (:gender, 'UNISEX')");
            values.addValue("gender", gender);
        }
        BigDecimal min = decimal(query.getFirst("min"), new BigDecimal("100000000"));
        BigDecimal max = decimal(query.getFirst("max"), new BigDecimal("100000000"));
        if (min != null) { from.append(" AND p.price>=:min"); values.addValue("min", min); }
        if (max != null) { from.append(" AND p.price<=:max"); values.addValue("max", max); }
        if (min != null && max != null && min.compareTo(max) > 0) badRequest("Минимальная цена выше максимальной");

        List<String> categories = list(query, "category[]");
        if (!categories.isEmpty()) {
            from.append(' ').append("""
                    AND EXISTS (WITH RECURSIVE subtree AS (
                        SELECT id FROM categories WHERE name IN (:categories)
                        UNION ALL SELECT child.id FROM categories child JOIN subtree parent ON child.parent_id=parent.id
                    ) SELECT 1 FROM product_categories pc JOIN subtree c ON c.id=pc.category_id WHERE pc.product_id=p.id)
                    """);
            values.addValue("categories", categories);
        }
        List<String> colors = list(query, "color[]");
        if (!colors.isEmpty()) {
            from.append(store != null && !store.isBlank()
                    ? " AND EXISTS (SELECT 1 FROM location_stock ls JOIN colors c ON c.id=ls.color_id WHERE ls.product_id=p.id AND ls.location_id=:storeId AND ls.quantity>0 AND c.name IN (:colors))"
                    : " AND EXISTS (SELECT 1 FROM product_colors pc JOIN colors c ON c.id=pc.color_id WHERE pc.product_id=p.id AND c.name IN (:colors))");
            values.addValue("colors", colors);
        }
        List<String> sizes = list(query, "size[]");
        if (!sizes.isEmpty()) {
            from.append(store != null && !store.isBlank()
                    ? " AND EXISTS (SELECT 1 FROM location_stock ls JOIN sizes s ON s.id=ls.size_id WHERE ls.product_id=p.id AND ls.location_id=:storeId AND ls.quantity>0 AND (s.type || ':' || s.name) IN (:sizes))"
                    : " AND EXISTS (SELECT 1 FROM product_stock ps JOIN sizes s ON s.id=ps.size_id WHERE ps.product_id=p.id AND ps.quantity>0 AND (s.type || ':' || s.name) IN (:sizes))");
            values.addValue("sizes", sizes);
        }
        if ("1".equals(query.getFirst("reviewed"))) from.append(" AND reviews.review_count>0");
        BigDecimal ratingMin = decimal(query.getFirst("ratingMin"), new BigDecimal("5"));
        BigDecimal ratingMax = decimal(query.getFirst("ratingMax"), new BigDecimal("5"));
        if (ratingMin != null) { from.append(" AND reviews.review_count>0 AND reviews.rating>=:ratingMin"); values.addValue("ratingMin", ratingMin); }
        if (ratingMax != null) { from.append(" AND reviews.review_count>0 AND reviews.rating<=:ratingMax"); values.addValue("ratingMax", ratingMax); }
        if (ratingMin != null && ratingMax != null && ratingMin.compareTo(ratingMax) > 0) badRequest("Некорректный диапазон рейтинга");
        if ("in-stock".equals(availability)) from.append(" AND inventory.quantity>0");
        if ("low-stock".equals(availability)) from.append(" AND inventory.quantity BETWEEN 1 AND 10");

        String search = query.getFirst("q");
        if (search != null && !search.isBlank()) {
            if (search.length() > 100) badRequest("Слишком длинный поисковый запрос");
            String[] tokens = search.toLowerCase().replace('ё', 'е').split("[^a-zа-я0-9]+", 11);
            int index = 0;
            for (String token : Arrays.stream(tokens).filter(s -> !s.isBlank()).limit(10).toList()) {
                String key = "search" + index++;
                List<String> conditions = new ArrayList<>(List.of(
                        "replace(lower(p.name),'ё','е') LIKE :" + key,
                        "replace(lower(COALESCE(p.description,'')),'ё','е') LIKE :" + key,
                        "EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND replace(lower(c.name),'ё','е') LIKE :" + key + ")",
                        "EXISTS (SELECT 1 FROM product_colors pc JOIN colors c ON c.id=pc.color_id WHERE pc.product_id=p.id AND replace(lower(c.name),'ё','е') LIKE :" + key + ")"));
                if (token.length() >= 4) conditions.add("word_similarity(:" + key + "Token, replace(lower(p.name),'ё','е')) >= 0.53");
                values.addValue(key, "%" + token + "%");
                values.addValue(key + "Token", token);
                int synonymIndex = 0;
                for (String synonym : synonyms(token)) {
                    String synonymKey = key + "Synonym" + synonymIndex++;
                    conditions.add("replace(lower(p.name),'ё','е') LIKE :" + synonymKey);
                    values.addValue(synonymKey, "%" + synonym + "%");
                }
                from.append(" AND (").append(String.join(" OR ", conditions)).append(")");
            }
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) " + from, values, Long.class);
        String order = switch (sort == null ? "new" : sort) {
            case "price-asc" -> "p.price ASC, p.id";
            case "price-desc" -> "p.price DESC, p.id";
            case "rating-desc" -> "reviews.rating DESC, p.created_at DESC, p.id";
            case "name" -> "p.name ASC, p.id";
            default -> "p.created_at DESC, p.id";
        };
        values.addValue("limit", pageSize).addValue("offset", (page - 1) * pageSize);
        List<UUID> ids = jdbc.query("SELECT p.id " + from + " ORDER BY " + order + " LIMIT :limit OFFSET :offset", values,
                (rs, row) -> rs.getObject(1, UUID.class));
        if (ids.isEmpty()) return new CatalogPage(List.of(), total == null ? 0 : total, page, pageSize);
        Map<UUID, Product> indexed = new HashMap<>();
        repository.findAllById(ids).forEach(product -> indexed.put(product.getId(), product));
        List<ProductDTO> items = ids.stream().map(indexed::get).filter(p -> p != null).map(products::toDTO).toList();
        return new CatalogPage(items, total == null ? 0 : total, page, pageSize);
    }

    private static List<String> list(MultiValueMap<String, String> query, String key) {
        List<String> values = query.get(key);
        if (values == null) return List.of();
        if (values.size() > 20 || values.stream().anyMatch(value -> value.length() > 100)) badRequest("Слишком много параметров фильтра");
        return values.stream().filter(value -> !value.isBlank()).distinct().toList();
    }

    private static List<String> synonyms(String token) {
        for (List<String> group : List.of(
                List.of("худи", "толстовка"), List.of("джинсы", "деним"),
                List.of("пиджак", "жакет"), List.of("кроссовки", "сникеры"))) {
            if (group.contains(token)) return group.stream().filter(value -> !value.equals(token)).toList();
        }
        return List.of();
    }

    private static int integer(String value, int defaultValue, int min, int max) {
        if (value == null || value.isBlank()) return defaultValue;
        try {
            int parsed = Integer.parseInt(value);
            if (parsed >= min && parsed <= max) return parsed;
        } catch (NumberFormatException ignored) { }
        badRequest("Некорректная страница каталога");
        return defaultValue;
    }

    private static BigDecimal decimal(String value, BigDecimal max) {
        if (value == null || value.isBlank()) return null;
        try {
            BigDecimal parsed = new BigDecimal(value);
            if (parsed.signum() >= 0 && parsed.compareTo(max) <= 0) return parsed;
        } catch (NumberFormatException ignored) { }
        badRequest("Некорректное значение фильтра");
        return null;
    }

    private static void badRequest(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
