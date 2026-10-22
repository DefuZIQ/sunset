package com.sunset.product;

import com.sunset.product.service.AdminProductService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AdminProductServiceTest {
    @Test
    @SuppressWarnings("unchecked")
    void contentRoleCannotSetInitialStockOrDeleteProducts() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UUID userId = UUID.randomUUID();
        when(jdbc.query(eq("SELECT role FROM users WHERE id=?"), any(RowMapper.class), eq(userId)))
                .thenReturn(List.of("STAFF"));
        when(jdbc.query(eq("SELECT a.role_code FROM iam_staff_role_assignments a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND (u.role='STAFF' OR (u.role='ADMIN' AND a.role_code='OWNER'))"), any(RowMapper.class), eq(userId)))
                .thenReturn(List.of("CONTENT_MARKETING"));
        AdminProductService service = new AdminProductService(jdbc);

        assertThrows(SecurityException.class, () -> service.create(userId,
                Map.of("name", "Пальто", "price", 5000, "quantity", 2)));
        assertThrows(SecurityException.class, () -> service.delete(userId, UUID.randomUUID()));
        verify(jdbc, never()).update(any(String.class), any(Object[].class));
    }
}
