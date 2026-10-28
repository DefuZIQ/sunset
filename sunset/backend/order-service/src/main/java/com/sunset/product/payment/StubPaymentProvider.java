package com.sunset.product.payment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Component
public class StubPaymentProvider implements PaymentProvider {
    private static final Set<String> METHODS = Set.of("CARD", "SBP", "ON_RECEIPT");

    @Override
    public PaymentResult authorize(UUID orderId, BigDecimal amount, String method) {
        String normalized = method == null ? "CARD" : method.trim().toUpperCase(Locale.ROOT);
        if (!METHODS.contains(normalized)) {
            throw new IllegalArgumentException("Недоступный способ оплаты");
        }
        String status = "ON_RECEIPT".equals(normalized) ? "PENDING" : "PAID";
        return new PaymentResult("STUB", "stub_" + orderId, status,
                "Платёж обработан тестовым провайдером");
    }

    @Override
    public PaymentResult refund(String providerPaymentId, BigDecimal amount) {
        return new PaymentResult("STUB", providerPaymentId, "REFUNDED",
                "Возврат выполнен тестовым провайдером");
    }
}
