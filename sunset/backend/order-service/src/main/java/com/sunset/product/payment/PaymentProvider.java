package com.sunset.product.payment;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentProvider {
    PaymentResult authorize(UUID orderId, BigDecimal amount, String method);
    PaymentResult refund(String providerPaymentId, BigDecimal amount);

    record PaymentResult(String provider, String providerPaymentId, String status, String message) {}
}

