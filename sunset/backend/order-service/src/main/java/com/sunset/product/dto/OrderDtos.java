package com.sunset.product.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {
    private OrderDtos() {}

    public record OrderItemRequest(UUID productId, UUID colorId, UUID sizeId, Integer quantity) {}
    public record CreateOrderRequest(
            String customerName, String customerEmail, String customerPhone,
            String address, String deliveryMethod, String paymentMethod,
            String idempotencyKey, String promoCode, Integer bonusesToUse,
            List<OrderItemRequest> items) {}
    public record StatusRequest(String status) {}
    public record BonusAdjustmentRequest(Integer amount, String reason) {}
    public record ReturnRequest(String reason, String comment) {}
    public record ReturnStatusRequest(String status, String comment) {}
    public record PromotionRequest(
            String code, String title, String description, Integer discountPercent,
            BigDecimal bonusMultiplier, BigDecimal minOrder, Boolean birthdayOnly,
            Boolean active, OffsetDateTime validFrom, OffsetDateTime validUntil,
            Integer usageLimit) {}
}
