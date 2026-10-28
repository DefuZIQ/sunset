package com.sunset.product;

import com.sunset.product.dto.OrderDtos.BonusAdjustmentRequest;
import com.sunset.product.dto.OrderDtos.CreateOrderRequest;
import com.sunset.product.service.OrderService;
import com.sunset.product.payment.PaymentProvider;
import com.sunset.product.payment.StubPaymentProvider;
import com.sunset.contract.CustomerDirectoryEntry;
import com.sunset.contract.CustomerProfileReader;
import com.sunset.contract.IamAuthorizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.time.Instant;

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
        CreateOrderRequest request = new CreateOrderRequest("Иван", "mail@example.com", "+79990000000", "Адрес", "courier", "CARD", "test-key", null, 0, null, List.of());
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

    @Test void adminDirectoryCombinesCustomerProfilesWithLocalCommerceMetrics() {
        UUID adminId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        IamAuthorizer access = mock(IamAuthorizer.class);
        CustomerProfileReader profiles = mock(CustomerProfileReader.class);
        OrderService isolated = new OrderService(jdbc, new StubPaymentProvider(), access, profiles);
        when(profiles.list(0, 200)).thenReturn(List.of(new CustomerDirectoryEntry(customerId,
                "client@example.com", "Анна", "Иванова", null, null, "CUSTOMER", Instant.parse("2026-10-01T00:00:00Z"))));
        when(jdbc.queryForList("SELECT user_id,balance FROM loyalty_accounts"))
                .thenReturn(List.of(Map.of("user_id", customerId, "balance", 75)));
        when(jdbc.queryForList("SELECT user_id,COUNT(*) AS order_count,COALESCE(SUM(total_amount),0) AS order_total FROM orders GROUP BY user_id"))
                .thenReturn(List.of(Map.of("user_id", customerId, "order_count", 2L, "order_total", BigDecimal.valueOf(12500))));

        Map<String, Object> row = isolated.adminUsers(adminId).get(0);
        org.junit.jupiter.api.Assertions.assertEquals("client@example.com", row.get("email"));
        org.junit.jupiter.api.Assertions.assertEquals(75, row.get("bonusBalance"));
        org.junit.jupiter.api.Assertions.assertEquals(2L, row.get("orderCount"));
        org.junit.jupiter.api.Assertions.assertEquals(BigDecimal.valueOf(12500), row.get("orderTotal"));
        verify(access).require(adminId, "customers:read");
        verify(profiles).list(0, 200);
    }
}
