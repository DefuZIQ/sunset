package com.sunset.product.service;

import com.sunset.contract.IamAccess;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class AdminProductService {
    private static final UUID WAREHOUSE_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private final JdbcTemplate jdbc;
    private final IamAccess access;
    public AdminProductService(JdbcTemplate jdbc) { this.jdbc = jdbc; this.access = new IamAccess(jdbc); }

    @Transactional
    public Map<String,Object> create(UUID userId, Map<String,Object> request) {
        access.require(userId, "catalog:write");
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
            jdbc.update("INSERT INTO location_stock(location_id,product_id,size_id,color_id,quantity) VALUES (?,?,?,?,?)", WAREHOUSE_ID,productId,sizeId,colorId,quantity);
        }
        return Map.of("id",productId,"name",name,"price",price,"quantity",quantity,"imageUrl",imageUrl);
    }

    @Transactional
    public void delete(UUID userId, UUID productId) { access.require(userId, "catalog:write"); if (jdbc.update("DELETE FROM products WHERE id=?", productId)==0) throw new IllegalArgumentException("Товар не найден"); }

    @Transactional
    public Map<String,Object> update(UUID userId, UUID productId, Map<String,Object> request) {
        access.require(userId, "catalog:write");
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
        access.require(userId, "stock:write");
        UUID locationId;
        try { locationId = UUID.fromString(Objects.toString(request.get("locationId"), "")); }
        catch (RuntimeException error) { throw new IllegalArgumentException("Выберите магазин или склад"); }
        Integer locationExists = jdbc.queryForObject("SELECT COUNT(*) FROM stores WHERE id=?", Integer.class, locationId);
        if (locationExists == null || locationExists == 0) throw new IllegalArgumentException("Магазин или склад не найден");
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
            int quantity = Integer.parseInt(Objects.toString(row.get("quantity"), "0"));
            if (quantity < 0) throw new IllegalArgumentException("Количество не может быть отрицательным");
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
        jdbc.queryForList("SELECT product_id FROM product_stock WHERE product_id=? FOR UPDATE", productId);
        jdbc.update("DELETE FROM location_stock WHERE location_id=? AND product_id=?", locationId, productId);
        for (Map<String,Object> variant : normalized) {
            jdbc.update("INSERT INTO location_stock(location_id,product_id,size_id,color_id,quantity) VALUES (?,?,?,?,?)",
                    locationId, productId, variant.get("sizeId"), variant.get("colorId"), variant.get("quantity"));
        }
        jdbc.update("DELETE FROM product_stock WHERE product_id=?", productId);
        jdbc.update("INSERT INTO product_stock(product_id,size_id,color_id,quantity) SELECT product_id,size_id,color_id,SUM(quantity)::integer FROM location_stock WHERE product_id=? GROUP BY product_id,size_id,color_id", productId);
        jdbc.update("DELETE FROM product_colors WHERE product_id=?", productId);
        jdbc.update("INSERT INTO product_colors(product_id,color_id) SELECT DISTINCT product_id,color_id FROM location_stock WHERE product_id=? ON CONFLICT DO NOTHING", productId);
        return Map.of("id",productId,"totalQuantity",total,"totalVariants",normalized.size());
    }

    public List<Map<String,Object>> stock(UUID userId, UUID productId, UUID locationId) {
        access.require(userId, "stock:write");
        return jdbc.queryForList("""
                SELECT ls.size_id AS "sizeId", s.label AS "sizeName", s.type AS "sizeType",
                       s.gender AS "sizeGender", s.description AS "sizeDescription",
                       ls.color_id AS "colorId", c.name AS "colorName", ls.quantity
                FROM location_stock ls
                JOIN sizes s ON s.id=ls.size_id
                JOIN colors c ON c.id=ls.color_id
                WHERE ls.product_id=? AND ls.location_id=?
                ORDER BY c.name,s.sort_order NULLS LAST,s.name
                """, productId, locationId);
    }

    public Map<String,Object> variants(UUID userId) {
        access.require(userId, "stock:write");
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
