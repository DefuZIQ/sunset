package com.sunset.product;

import com.sunset.product.payment.StubPaymentProvider;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StubPaymentProviderTest {
    private final StubPaymentProvider provider = new StubPaymentProvider();

    @Test void cardPaymentIsMarkedPaid() {
        var result = provider.authorize(UUID.randomUUID(), BigDecimal.valueOf(1200), "CARD");
        assertEquals("STUB", result.provider());
        assertEquals("PAID", result.status());
    }

    @Test void paymentOnReceiptStaysPending() {
        var result = provider.authorize(UUID.randomUUID(), BigDecimal.valueOf(1200), "ON_RECEIPT");
        assertEquals("PENDING", result.status());
    }

    @Test void unsupportedMethodIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> provider.authorize(UUID.randomUUID(), BigDecimal.TEN, "CRYPTO"));
    }

    @Test void refundIsMarkedRefunded() {
        assertEquals("REFUNDED", provider.refund("stub-id", BigDecimal.TEN).status());
    }
}
