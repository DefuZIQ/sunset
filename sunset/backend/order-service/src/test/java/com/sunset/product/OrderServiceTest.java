package com.sunset.product;

import com.sunset.product.dto.OrderDtos.BonusAdjustmentRequest;
import com.sunset.product.dto.OrderDtos.CreateOrderRequest;
import com.sunset.product.service.OrderService;
import com.sunset.product.payment.PaymentProvider;
import com.sunset.product.payment.StubPaymentProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrderServiceTest {
    private JdbcTemplate jdbc;
    private OrderService service;

    @BeforeEach void setUp() {
        jdbc = mock(JdbcTemplate.class);
        service = new OrderService(jdbc, new StubPaymentProvider());
    }

    @Test void rejectsEmptyCartBeforeDatabaseWrites() {
        CreateOrderRequest request = new CreateOrderRequest("Иван", "mail@example.com", "+79990000000", "Адрес", "courier", "CARD", "test-key", null, 0, List.of());
        assertThrows(IllegalArgumentException.class, () -> service.create(UUID.randomUUID(), request));
        verifyNoInteractions(jdbc);
    }

    @Test void rejectsInvalidPromotionCodeWithoutDatabaseResult() {
        when(jdbc.queryForList(any(String.class), any(Object[].class))).thenReturn(List.of());
        assertThrows(IllegalArgumentException.class,
                () -> service.validatePromo("NO-SUCH-CODE", BigDecimal.valueOf(5000), null));
    }

    @Test void rejectsUnknownOrderStatusForAdmin() {
        UUID adminId = UUID.randomUUID();
        when(jdbc.query(any(String.class), any(org.springframework.jdbc.core.RowMapper.class), eq(adminId)))
                .thenReturn(List.of("ADMIN"));
        assertThrows(IllegalArgumentException.class,
                () -> service.updateStatus(adminId, UUID.randomUUID(), "UNKNOWN"));
    }

    @Test void rejectsZeroBonusAdjustment() {
        UUID adminId = UUID.randomUUID();
        when(jdbc.query(any(String.class), any(org.springframework.jdbc.core.RowMapper.class), eq(adminId)))
                .thenReturn(List.of("ADMIN"));
        assertThrows(IllegalArgumentException.class,
                () -> service.adjustBonuses(adminId, UUID.randomUUID(), new BonusAdjustmentRequest(0, "test")));
    }

    @Test void calculatesFreePickupQuote() {
        var quote = service.deliveryQuote("pickup", BigDecimal.valueOf(1000));
        org.junit.jupiter.api.Assertions.assertEquals(BigDecimal.ZERO, quote.get("cost"));
        verifyNoInteractions(jdbc);
    }

    @Test void calculatesCourierQuote() {
        var quote = service.deliveryQuote("courier", BigDecimal.valueOf(5000));
        org.junit.jupiter.api.Assertions.assertEquals(BigDecimal.valueOf(390), quote.get("cost"));
        verifyNoInteractions(jdbc);
    }
}
