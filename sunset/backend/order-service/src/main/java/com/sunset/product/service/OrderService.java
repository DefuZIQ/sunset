package com.sunset.product.service;

import com.sunset.product.dto.OrderDtos.CreateOrderRequest;
import com.sunset.product.dto.OrderDtos.OrderItemRequest;
import com.sunset.product.dto.OrderDtos.PromotionRequest;
import com.sunset.product.dto.OrderDtos.BonusAdjustmentRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class OrderService {
    private static final Set<String> STATUSES = Set.of("PENDING", "CONFIRMED", "ASSEMBLING", "SHIPPED", "DELIVERED", "CANCELLED");
    private final JdbcTemplate jdbc;

    public OrderService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public Map<String, Object> create(UUID userId, CreateOrderRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Корзина пуста");
        }
        Map<String, Object> customer = jdbc.queryForMap("SELECT email, first_name, last_name, phone, birthday FROM users WHERE id=?", userId);
        List<Map<String, Object>> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItemRequest item : request.items()) {
            if (item == null || item.productId() == null || item.quantity() == null || item.quantity() < 1 || item.quantity() > 20) {
                throw new IllegalArgumentException("Некорректное количество товара");
            }
            Map<String, Object> product = jdbc.queryForMap("SELECT id,name,price FROM products WHERE id=?", item.productId());
            BigDecimal price = (BigDecimal) product.get("price");
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(item.quantity()));
            subtotal = subtotal.add(lineTotal);
            LinkedHashMap<String, Object> line = new LinkedHashMap<>(product);
            line.put("quantity", item.quantity());
            line.put("colorId", item.colorId());
            line.put("sizeId", item.sizeId());
            line.put("lineTotal", lineTotal);
            lines.add(line);
        }

        LocalDate birthday = customer.get("birthday") == null ? null : ((Date) customer.get("birthday")).toLocalDate();
        boolean birthdayToday = birthday != null && birthday.getMonthValue() == LocalDate.now().getMonthValue()
                && birthday.getDayOfMonth() == LocalDate.now().getDayOfMonth();
        Map<String, Object> promo = findPromotion(request.promoCode(), subtotal, birthdayToday);
        int promoPercent = promo == null ? 0 : ((Number) promo.get("discount_percent")).intValue();
        int discountPercent = Math.max(promoPercent, birthdayToday ? 15 : 0);
        BigDecimal discount = subtotal.multiply(BigDecimal.valueOf(discountPercent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal afterDiscount = subtotal.subtract(discount);

        jdbc.update("INSERT INTO loyalty_accounts(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        Integer balance = jdbc.queryForObject("SELECT balance FROM loyalty_accounts WHERE user_id=? FOR UPDATE", Integer.class, userId);
        int requestedBonuses = Math.max(0, Objects.requireNonNullElse(request.bonusesToUse(), 0));
        int bonusCap = afterDiscount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.DOWN).intValue();
        int used = Math.min(Math.min(requestedBonuses, balance == null ? 0 : balance), bonusCap);
        BigDecimal total = afterDiscount.subtract(BigDecimal.valueOf(used)).max(BigDecimal.ZERO);
        BigDecimal multiplier = promo == null ? BigDecimal.ONE : (BigDecimal) promo.get("bonus_multiplier");
        if (birthdayToday) multiplier = multiplier.multiply(BigDecimal.valueOf(2));
        int earned = total.multiply(new BigDecimal("0.05")).multiply(multiplier).setScale(0, RoundingMode.DOWN).intValue();

        UUID orderId = UUID.randomUUID();
        String orderNumber = jdbc.queryForObject("SELECT 'SUN-' || LPAD(nextval('order_number_seq')::text,6,'0')", String.class);
        String name = valueOr(request.customerName(), ((String) customer.get("first_name")) + " " + customer.get("last_name"));
        String email = valueOr(request.customerEmail(), (String) customer.get("email"));
        String phone = valueOr(request.customerPhone(), (String) customer.get("phone"));
        jdbc.update("INSERT INTO orders(id,order_number,user_id,customer_name,customer_email,customer_phone,status,subtotal,discount_amount,bonuses_used,bonuses_earned,promo_code,total_amount) VALUES (?,?,?,?,?,?,'PENDING',?,?,?,?,?,?)",
                orderId, orderNumber, userId, name, email, phone, subtotal, discount, used, earned,
                promo == null ? null : promo.get("code"), total);
        for (Map<String, Object> line : lines) {
            jdbc.update("INSERT INTO order_items(id,order_id,product_id,color_id,size_id,quantity,price) VALUES (gen_random_uuid(),?,?,?,?,?,?)",
                    orderId, line.get("id"), line.get("colorId"), line.get("sizeId"), line.get("quantity"), line.get("price"));
        }
        if (request.address() != null && !request.address().isBlank()) {
            String method = request.address().trim().toUpperCase(Locale.ROOT).startsWith("SUNSET ") ? "pickup" : "courier";
            jdbc.update("INSERT INTO deliveries(id,order_id,address,delivery_method,delivery_status) VALUES (gen_random_uuid(),?,?,?,'preparing')", orderId, request.address().trim(), method);
        }
        // Бонусы за заказ резервируются в orders.bonuses_earned, но становятся
        // доступными только после подтверждения заказа администратором.
        jdbc.update("UPDATE loyalty_accounts SET balance=GREATEST(0,balance-?),updated_at=NOW() WHERE user_id=?",
                used, userId);
        if (used > 0) jdbc.update("INSERT INTO loyalty_transactions(user_id,order_id,amount,type,description) VALUES (?,?,?,'SPEND','Оплата заказа бонусами')", userId, orderId, -used);
        if (promo != null) jdbc.update("UPDATE promotions SET usage_count=usage_count+1,updated_at=NOW() WHERE id=?", promo.get("id"));
        return getOrder(orderId);
    }

    public List<Map<String, Object>> myOrders(UUID userId) {
        return jdbc.query("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC", (rs, n) -> orderMap(rs), userId);
    }
    public Map<String, Object> myOrder(UUID userId, UUID orderId) {
        Map<String, Object> order = getOrder(orderId);
        if (!userId.toString().equalsIgnoreCase(String.valueOf(order.get("userId")))) throw new SecurityException("Заказ принадлежит другому клиенту");
        order.put("delivery", jdbc.query("SELECT address,CASE WHEN UPPER(address) LIKE 'SUNSET %' THEN 'pickup' ELSE delivery_method END AS \"deliveryMethod\",delivery_status AS \"deliveryStatus\" FROM deliveries WHERE order_id=?", rs -> rs.next() ? Map.of("address", rs.getString("address"), "deliveryMethod", rs.getString("deliveryMethod"), "deliveryStatus", rs.getString("deliveryStatus")) : null, orderId));
        return order;
    }
    @Transactional
    public Map<String, Object> updatePending(UUID userId, UUID orderId, Map<String, Object> request) {
        Map<String, Object> order = myOrder(userId, orderId);
        if (!"PENDING".equals(order.get("status"))) throw new IllegalArgumentException("Редактировать можно только заказ до подтверждения");
        String name = valueOr((String) request.get("customerName"), (String) order.get("customerName"));
        String email = valueOr((String) request.get("customerEmail"), (String) order.get("customerEmail"));
        String phone = valueOr((String) request.get("customerPhone"), (String) order.get("customerPhone"));
        String address = valueOr((String) request.get("address"), "");
        String method = "pickup".equalsIgnoreCase(String.valueOf(request.get("deliveryMethod"))) ? "pickup" : "courier";
        if (address.isBlank()) throw new IllegalArgumentException("Укажите адрес доставки или магазин самовывоза");
        jdbc.update("UPDATE orders SET customer_name=?,customer_email=?,customer_phone=?,updated_at=NOW() WHERE id=? AND user_id=?", name, email, phone, orderId, userId);
        jdbc.update("UPDATE deliveries SET address=?,delivery_method=?,updated_at=NOW() WHERE order_id=?", address, method, orderId);
        return myOrder(userId, orderId);
    }
    @Transactional
    public Map<String, Object> cancel(UUID userId, UUID orderId) {
        Map<String, Object> order = myOrder(userId, orderId);
        String status = String.valueOf(order.get("status"));
        if (Set.of("SHIPPED", "DELIVERED", "CANCELLED").contains(status)) throw new IllegalArgumentException("Этот заказ уже нельзя отменить");
        int earned = ((Number) order.get("bonusesEarned")).intValue();
        int used = ((Number) order.get("bonusesUsed")).intValue();
        int earnedCredited = jdbc.queryForObject("SELECT COUNT(*) FROM loyalty_transactions WHERE order_id=? AND type='EARN' AND amount>0", Integer.class, orderId) > 0 ? earned : 0;
        jdbc.update("UPDATE orders SET status='CANCELLED',updated_at=NOW() WHERE id=? AND user_id=?", orderId, userId);
        jdbc.update("INSERT INTO loyalty_accounts(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        jdbc.update("UPDATE loyalty_accounts SET balance=GREATEST(0,balance-?+?),updated_at=NOW() WHERE user_id=?", earnedCredited, used, userId);
        if (earnedCredited > 0) jdbc.update("INSERT INTO loyalty_transactions(user_id,order_id,amount,type,description) VALUES (?,?,?,'ADJUST','Компенсация: отмена заказа, списание начисленных бонусов')", userId, orderId, -earnedCredited);
        if (used > 0) jdbc.update("INSERT INTO loyalty_transactions(user_id,order_id,amount,type,description) VALUES (?,?,?,'ADJUST','Возврат бонусов: отмена заказа')", userId, orderId, used);
        return myOrder(userId, orderId);
    }

    public Map<String, Object> loyalty(UUID userId) {
        jdbc.update("INSERT INTO loyalty_accounts(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        Map<String, Object> account = new LinkedHashMap<>(jdbc.queryForMap("SELECT balance,lifetime_earned AS \"lifetimeEarned\",tier,updated_at AS \"updatedAt\" FROM loyalty_accounts WHERE user_id=?", userId));
        Date birthday = jdbc.queryForObject("SELECT birthday FROM users WHERE id=?", Date.class, userId);
        boolean birthdayToday = birthday != null && birthday.toLocalDate().getMonthValue() == LocalDate.now().getMonthValue() && birthday.toLocalDate().getDayOfMonth() == LocalDate.now().getDayOfMonth();
        account.put("birthdayToday", birthdayToday);
        account.put("birthdayBenefit", "Скидка 15% и двойные бонусы в день рождения");
        account.put("transactions", jdbc.queryForList("SELECT amount,type,description,created_at AS \"createdAt\" FROM loyalty_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 20", userId));
        return account;
    }

    public List<Map<String, Object>> activePromotions() {
        return jdbc.queryForList("SELECT id,code,title,description,discount_percent AS \"discountPercent\",bonus_multiplier AS \"bonusMultiplier\",min_order AS \"minOrder\",birthday_only AS \"birthdayOnly\",valid_until AS \"validUntil\" FROM promotions WHERE active=TRUE AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>=NOW()) ORDER BY created_at DESC");
    }

    public Map<String, Object> validatePromo(String code, BigDecimal subtotal, UUID userId) {
        boolean birthday = false;
        if (userId != null) {
            Date value = jdbc.queryForObject("SELECT birthday FROM users WHERE id=?", Date.class, userId);
            birthday = value != null && value.toLocalDate().getMonthValue() == LocalDate.now().getMonthValue() && value.toLocalDate().getDayOfMonth() == LocalDate.now().getDayOfMonth();
        }
        Map<String, Object> promo = findPromotion(code, subtotal == null ? BigDecimal.ZERO : subtotal, birthday);
        if (promo == null) throw new IllegalArgumentException("Промокод недействителен или не подходит к заказу");
        return promo;
    }

    public List<Map<String, Object>> adminOrders(UUID userId) { ensureAdmin(userId); return jdbc.query("SELECT * FROM orders ORDER BY created_at DESC", (rs,n) -> orderMap(rs)); }
    public List<Map<String, Object>> adminUsers(UUID userId) {
        ensureAdmin(userId);
        return jdbc.queryForList("SELECT u.id,u.email,u.first_name AS \"firstName\",u.last_name AS \"lastName\",u.phone,u.birthday,u.role,u.created_at AS \"createdAt\",COALESCE(l.balance,0) AS \"bonusBalance\",COUNT(o.id) AS \"orderCount\",COALESCE(SUM(o.total_amount),0) AS \"orderTotal\" FROM users u LEFT JOIN loyalty_accounts l ON l.user_id=u.id LEFT JOIN orders o ON o.user_id=u.id GROUP BY u.id,l.balance ORDER BY u.created_at DESC");
    }
    public List<Map<String, Object>> adminPromotions(UUID userId) { ensureAdmin(userId); return jdbc.queryForList("SELECT * FROM promotions ORDER BY created_at DESC"); }

    @Transactional
    public Map<String, Object> adjustBonuses(UUID adminId, UUID targetUserId, BonusAdjustmentRequest request) {
        ensureAdmin(adminId);
        int amount = request == null || request.amount() == null ? 0 : request.amount();
        if (amount == 0 || Math.abs(amount) > 100000) throw new IllegalArgumentException("Укажите изменение бонусов от −100 000 до 100 000");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id=?", Integer.class, targetUserId) == 0) throw new IllegalArgumentException("Клиент не найден");
        jdbc.update("INSERT INTO loyalty_accounts(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING",targetUserId);
        Integer balance = jdbc.queryForObject("SELECT balance FROM loyalty_accounts WHERE user_id=? FOR UPDATE",Integer.class,targetUserId);
        int newBalance = Math.max(0,(balance == null ? 0 : balance)+amount);
        int applied = newBalance-(balance == null ? 0 : balance);
        jdbc.update("UPDATE loyalty_accounts SET balance=?,lifetime_earned=lifetime_earned+?,updated_at=NOW() WHERE user_id=?",newBalance,Math.max(0,applied),targetUserId);
        String reason = request.reason() == null || request.reason().isBlank() ? "Корректировка администратором" : request.reason().trim();
        jdbc.update("INSERT INTO loyalty_transactions(user_id,amount,type,description) VALUES (?,?,?,?)",targetUserId,applied,"ADJUST",reason);
        return Map.of("userId",targetUserId,"balance",newBalance,"applied",applied);
    }

    @Transactional
    public Map<String, Object> updateStatus(UUID userId, UUID orderId, String status) {
        ensureAdmin(userId);
        String normalized = status == null ? "" : status.toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) throw new IllegalArgumentException("Недопустимый статус");
        if (jdbc.update("UPDATE orders SET status=?,updated_at=NOW() WHERE id=?", normalized, orderId) == 0) throw new IllegalArgumentException("Заказ не найден");
        if (Set.of("CONFIRMED", "ASSEMBLING", "SHIPPED", "DELIVERED").contains(normalized)) creditEarnedOnce(orderId);
        return getOrder(orderId);
    }

    /** Начисляет бонусы один раз при подтверждении заказа. */
    private void creditEarnedOnce(UUID orderId) {
        Map<String, Object> order = jdbc.queryForMap("SELECT user_id,bonuses_earned FROM orders WHERE id=? FOR UPDATE", orderId);
        int earned = ((Number) order.get("bonuses_earned")).intValue();
        if (earned <= 0) return;
        Integer alreadyCredited = jdbc.queryForObject("SELECT COUNT(*) FROM loyalty_transactions WHERE order_id=? AND type='EARN' AND amount>0", Integer.class, orderId);
        if (alreadyCredited != null && alreadyCredited > 0) return;
        UUID userId = (UUID) order.get("user_id");
        jdbc.update("INSERT INTO loyalty_accounts(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        jdbc.update("UPDATE loyalty_accounts SET balance=balance+?,lifetime_earned=lifetime_earned+?,tier=CASE WHEN lifetime_earned+?>=10000 THEN 'SUNSET' WHEN lifetime_earned+?>=3000 THEN 'GOLDEN HOUR' ELSE 'SUNRISE' END,updated_at=NOW() WHERE user_id=?", earned, earned, earned, earned, earned, userId);
        jdbc.update("INSERT INTO loyalty_transactions(user_id,order_id,amount,type,description) VALUES (?,?,?,'EARN','Бонусы за подтвержденный заказ')", userId, orderId, earned);
    }

    @Transactional
    public Map<String, Object> createPromotion(UUID userId, PromotionRequest request) {
        ensureAdmin(userId);
        if (request == null || request.code() == null || request.code().isBlank() || request.title() == null || request.title().isBlank()) throw new IllegalArgumentException("Укажите код и название акции");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO promotions(id,code,title,description,discount_percent,bonus_multiplier,min_order,birthday_only,active,valid_from,valid_until,usage_limit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                id, request.code().trim().toUpperCase(Locale.ROOT), request.title().trim(), request.description(), Objects.requireNonNullElse(request.discountPercent(),0), Objects.requireNonNullElse(request.bonusMultiplier(),BigDecimal.ONE), Objects.requireNonNullElse(request.minOrder(),BigDecimal.ZERO), Objects.requireNonNullElse(request.birthdayOnly(),false), Objects.requireNonNullElse(request.active(),true), request.validFrom() == null ? OffsetDateTime.now() : request.validFrom(), request.validUntil(), request.usageLimit());
        return jdbc.queryForMap("SELECT * FROM promotions WHERE id=?", id);
    }

    private Map<String, Object> findPromotion(String code, BigDecimal subtotal, boolean birthday) {
        if (code == null || code.isBlank()) return null;
        List<Map<String, Object>> promos = jdbc.queryForList("SELECT * FROM promotions WHERE UPPER(code)=? AND active=TRUE AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>=NOW()) AND (usage_limit IS NULL OR usage_count<usage_limit)", code.trim().toUpperCase(Locale.ROOT));
        if (promos.isEmpty()) return null;
        Map<String, Object> promo = promos.get(0);
        if (subtotal.compareTo((BigDecimal) promo.get("min_order")) < 0 || (Boolean.TRUE.equals(promo.get("birthday_only")) && !birthday)) return null;
        return promo;
    }

    private Map<String, Object> getOrder(UUID orderId) {
        Map<String, Object> order = jdbc.query("SELECT * FROM orders WHERE id=?", rs -> rs.next() ? orderMap(rs) : null, orderId);
        if (order == null) throw new IllegalArgumentException("Заказ не найден");
        order.put("items", jdbc.queryForList("SELECT oi.product_id AS \"productId\",oi.color_id AS \"colorId\",c.name AS \"colorName\",oi.size_id AS \"sizeId\",s.name AS \"sizeName\",COALESCE(p.name,'Товар') AS name,COALESCE((SELECT i.url FROM product_images pi JOIN images i ON i.id=pi.image_id WHERE pi.product_id=oi.product_id ORDER BY pi.created_at LIMIT 1),'') AS \"imageUrl\",oi.quantity,oi.price FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN colors c ON c.id=oi.color_id LEFT JOIN sizes s ON s.id=oi.size_id WHERE oi.order_id=?", orderId));
        return order;
    }

    private Map<String, Object> orderMap(java.sql.ResultSet rs) throws java.sql.SQLException {
        LinkedHashMap<String, Object> row = new LinkedHashMap<>();
        row.put("id", rs.getObject("id", UUID.class)); row.put("orderNumber", rs.getString("order_number")); row.put("userId", rs.getObject("user_id", UUID.class));
        row.put("customerName", rs.getString("customer_name")); row.put("customerEmail", rs.getString("customer_email")); row.put("customerPhone", rs.getString("customer_phone"));
        row.put("status", rs.getString("status")); row.put("subtotal", rs.getBigDecimal("subtotal")); row.put("discountAmount", rs.getBigDecimal("discount_amount"));
        row.put("bonusesUsed", rs.getInt("bonuses_used")); row.put("bonusesEarned", rs.getInt("bonuses_earned")); row.put("promoCode", rs.getString("promo_code")); row.put("totalAmount", rs.getBigDecimal("total_amount")); row.put("createdAt", rs.getTimestamp("created_at").toInstant());
        return row;
    }

    private void ensureAdmin(UUID userId) {
        List<String> roles = jdbc.query("SELECT role FROM users WHERE id=?", (rs,n) -> rs.getString(1), userId);
        if (roles.isEmpty() || !"ADMIN".equalsIgnoreCase(roles.get(0))) throw new SecurityException("Требуются права администратора");
    }
    private String valueOr(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }
}
