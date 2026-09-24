package com.sunset.product.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class AdminProductService {
    private final JdbcTemplate jdbc;
    public AdminProductService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public Map<String,Object> create(UUID userId, Map<String,Object> request) {
        ensureAdmin(userId);
        String name = text(request.get("name"));
        if (name.isBlank()) throw new IllegalArgumentException("Укажите название товара");
        BigDecimal price = new BigDecimal(Objects.toString(request.get("price"), "0"));
        if (price.signum() <= 0) throw new IllegalArgumentException("Цена должна быть больше нуля");
        int quantity = Math.max(0, Integer.parseInt(Objects.toString(request.get("quantity"), "10")));
        UUID productId = UUID.randomUUID();
        String gender = normalizedGender(request.get("gender"));
        jdbc.update("INSERT INTO products(id,name,description,price,gender) VALUES (?,?,?,?,?)", productId, name, text(request.get("description")), price, gender);
        String imageUrl = text(request.get("imageUrl"));
        if (imageUrl.isBlank()) imageUrl = "/images/products/1.png";
        UUID imageId = UUID.randomUUID();
        jdbc.update("INSERT INTO images(id,url) VALUES (?,?)", imageId, imageUrl);
        jdbc.update("INSERT INTO product_images(id,product_id,image_id,type_image) VALUES (?,?,?,'front')", UUID.randomUUID(), productId, imageId);
        List<UUID> categories = jdbc.query("SELECT id FROM categories WHERE LOWER(name)=LOWER(?) LIMIT 1", (rs,n)->rs.getObject(1,UUID.class), text(request.get("category")));
        UUID categoryId = categories.isEmpty() ? jdbc.queryForObject("SELECT id FROM categories ORDER BY name LIMIT 1", UUID.class) : categories.get(0);
        UUID colorId = jdbc.queryForObject("SELECT id FROM colors ORDER BY name LIMIT 1", UUID.class);
        jdbc.update("INSERT INTO product_categories(product_id,category_id) VALUES (?,?)", productId, categoryId);
        jdbc.update("INSERT INTO product_colors(product_id,color_id) VALUES (?,?)", productId, colorId);
        String sizeType = sizeType(categoryId, gender);
        for (UUID sizeId : jdbc.query("SELECT id FROM sizes WHERE type=? ORDER BY sort_order NULLS LAST", (rs,n)->rs.getObject(1,UUID.class), sizeType)) {
            jdbc.update("INSERT INTO product_stock(product_id,size_id,color_id,quantity) VALUES (?,?,?,?)", productId,sizeId,colorId,quantity);
        }
        return Map.of("id",productId,"name",name,"price",price,"quantity",quantity,"imageUrl",imageUrl);
    }

    @Transactional
    public void delete(UUID userId, UUID productId) { ensureAdmin(userId); if (jdbc.update("DELETE FROM products WHERE id=?", productId)==0) throw new IllegalArgumentException("Товар не найден"); }

    @Transactional
    public Map<String,Object> update(UUID userId, UUID productId, Map<String,Object> request) {
        ensureAdmin(userId);
        String name = text(request.get("name"));
        BigDecimal price = new BigDecimal(Objects.toString(request.get("price"), "0"));
        if (name.isBlank() || price.signum() <= 0) throw new IllegalArgumentException("Укажите название и корректную цену");
        String gender = normalizedGender(request.get("gender"));
        if (jdbc.update("UPDATE products SET name=?,description=?,price=?,gender=?,updated_at=NOW() WHERE id=?", name,text(request.get("description")),price,gender,productId)==0) throw new IllegalArgumentException("Товар не найден");
        String imageUrl = text(request.get("imageUrl"));
        if (!imageUrl.isBlank()) jdbc.update("UPDATE images SET url=?,updated_at=NOW() WHERE id=(SELECT image_id FROM product_images WHERE product_id=? ORDER BY created_at LIMIT 1)", imageUrl,productId);
        String category = text(request.get("category"));
        if (!category.isBlank()) {
            List<UUID> ids = jdbc.query("SELECT id FROM categories WHERE LOWER(name)=LOWER(?) LIMIT 1", (rs,n)->rs.getObject(1,UUID.class), category);
            if (!ids.isEmpty()) {
                jdbc.update("DELETE FROM product_categories WHERE product_id=?",productId);
                jdbc.update("INSERT INTO product_categories(product_id,category_id) VALUES (?,?)",productId,ids.get(0));
            }
        }
        return Map.of("id",productId,"name",name,"price",price);
    }

    @Transactional
    public Map<String,Object> updateStock(UUID userId, UUID productId, Map<String,Object> request) {
        ensureAdmin(userId);
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE id=?", Integer.class, productId);
        if (exists == null || exists == 0) throw new IllegalArgumentException("Товар не найден");
        Map<String,Object> productInfo = jdbc.queryForMap("SELECT p.gender,c.id AS category_id FROM products p JOIN product_categories pc ON pc.product_id=p.id JOIN categories c ON c.id=pc.category_id WHERE p.id=? ORDER BY c.name LIMIT 1", productId);
        String expectedSizeType = sizeType((UUID) productInfo.get("category_id"), Objects.toString(productInfo.get("gender"), "WOMEN"));
        Object raw = request.get("stock");
        if (!(raw instanceof List<?> rows)) throw new IllegalArgumentException("Передайте остатки по вариантам");
        List<Map<String,Object>> normalized = new ArrayList<>();
        Set<String> uniqueVariants = new HashSet<>();
        int total = 0;
        for (Object item : rows) {
            if (!(item instanceof Map<?,?> row)) continue;
            UUID sizeId;
            UUID colorId;
            try {
                sizeId = UUID.fromString(Objects.toString(row.get("sizeId")));
                colorId = UUID.fromString(Objects.toString(row.get("colorId")));
            } catch (RuntimeException error) {
                throw new IllegalArgumentException("Выберите размер и цвет для каждого варианта");
            }
            String key = sizeId + ":" + colorId;
            if (!uniqueVariants.add(key)) throw new IllegalArgumentException("Одинаковая комбинация размера и цвета добавлена дважды");
            int quantity = Math.max(0, Integer.parseInt(Objects.toString(row.get("quantity"), "0")));
            List<String> sizeTypes = jdbc.query("SELECT type FROM sizes WHERE id=?", (rs,n) -> rs.getString(1), sizeId);
            Integer colors = jdbc.queryForObject("SELECT COUNT(*) FROM colors WHERE id=?", Integer.class, colorId);
            if (sizeTypes.isEmpty() || colors == null || colors == 0) throw new IllegalArgumentException("Размер или цвет больше не существует");
            if (!expectedSizeType.equals(sizeTypes.get(0))) throw new IllegalArgumentException("Выбранный размер не подходит категории этого товара");
            Map<String,Object> variant = new HashMap<>();
            variant.put("sizeId", sizeId);
            variant.put("colorId", colorId);
            variant.put("quantity", quantity);
            normalized.add(variant);
            total += quantity;
        }
        jdbc.update("DELETE FROM product_stock WHERE product_id=?", productId);
        jdbc.update("DELETE FROM product_colors WHERE product_id=?", productId);
        for (Map<String,Object> variant : normalized) {
            UUID sizeId = (UUID) variant.get("sizeId");
            UUID colorId = (UUID) variant.get("colorId");
            int quantity = (Integer) variant.get("quantity");
            jdbc.update("INSERT INTO product_colors(product_id,color_id) VALUES (?,?) ON CONFLICT DO NOTHING", productId, colorId);
            jdbc.update("INSERT INTO product_stock(product_id,size_id,color_id,quantity) VALUES (?,?,?,?)", productId, sizeId, colorId, quantity);
        }
        return Map.of("id",productId,"totalQuantity",total,"totalVariants",normalized.size());
    }

    public Map<String,Object> variants(UUID userId) {
        ensureAdmin(userId);
        List<Map<String,Object>> colors = jdbc.query("SELECT id,name,hex_code FROM colors ORDER BY name", (rs,n) -> {
            Map<String,Object> item = new LinkedHashMap<>();
            item.put("id", rs.getObject("id", UUID.class));
            item.put("name", rs.getString("name"));
            item.put("hexCode", rs.getString("hex_code"));
            return item;
        });
        List<Map<String,Object>> sizes = jdbc.query("SELECT id,label,type,gender,region,description FROM sizes ORDER BY type,sort_order NULLS LAST,name", (rs,n) -> {
            Map<String,Object> item = new LinkedHashMap<>();
            item.put("id", rs.getObject("id", UUID.class));
            item.put("name", rs.getString("label"));
            item.put("type", rs.getString("type"));
            item.put("gender", rs.getString("gender"));
            item.put("region", rs.getString("region"));
            item.put("description", rs.getString("description"));
            return item;
        });
        return Map.of("colors", colors, "sizes", sizes);
    }
    private void ensureAdmin(UUID userId) { List<String> roles=jdbc.query("SELECT role FROM users WHERE id=?",(rs,n)->rs.getString(1),userId); if(roles.isEmpty()||!"ADMIN".equalsIgnoreCase(roles.get(0))) throw new SecurityException("Требуются права администратора"); }
    private String normalizedGender(Object value) { String raw=text(value).toUpperCase(Locale.ROOT); return Set.of("WOMEN","MEN","UNISEX").contains(raw)?raw:"WOMEN"; }
    private String sizeType(UUID categoryId, String gender) {
        String name=jdbc.queryForObject("SELECT name FROM categories WHERE id=?",String.class,categoryId);
        if(name!=null && name.toLowerCase(Locale.ROOT).matches(".*(аксессуар|сумк|ремн|головн|кепк|очк|час).*")) return "accessory";
        if(name!=null && name.toLowerCase(Locale.ROOT).contains("плать")) return "women_dress";
        if(name!=null && name.toLowerCase(Locale.ROOT).contains("джинс")) return "jeans";
        if(name!=null && name.toLowerCase(Locale.ROOT).contains("брюк")) return "MEN".equals(gender)?"men_trousers":"women_trousers";
        return "MEN".equals(gender)?"men_clothing":"women_clothing";
    }
    private String text(Object value) { return value == null ? "" : value.toString().trim(); }
}
