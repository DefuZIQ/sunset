package com.sunset.contract;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IamAccessTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final IamAccess access = new IamAccess(jdbc);
    private final UUID userId = UUID.randomUUID();

    @Test
    void unknownPermissionsAndAnonymousRequestsFailClosed() {
        assertThatThrownBy(() -> access.require(userId, "unknown:write"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> access.require(null, "stock:write"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void staffNeedsExplicitPermission() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(userId))).thenReturn(List.of("STAFF"));
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(userId), eq("stock:write"))).thenReturn(true);
        access.require(userId, "stock:write");
        assertThatThrownBy(() -> access.require(userId, "orders:manage"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void scopedStaffRoleRejectsAnotherLocationAndUnrelatedRights() {
        UUID locationId = UUID.randomUUID();
        when(jdbc.query(eq("SELECT role FROM users WHERE id=?"), any(RowMapper.class), eq(userId)))
                .thenReturn(List.of("STAFF"));
        when(jdbc.query(eq("SELECT a.role_code FROM iam_staff_role_assignments a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND (u.role='STAFF' OR (u.role='ADMIN' AND a.role_code='OWNER'))"), any(RowMapper.class), eq(userId)))
                .thenReturn(List.of("WAREHOUSE_ADMIN"));
        when(jdbc.query(eq("SELECT a.location_id FROM iam_staff_role_assignments a JOIN users u ON u.id=a.user_id WHERE a.user_id=? AND u.role='STAFF'"), any(RowMapper.class), eq(userId)))
                .thenReturn(List.of(locationId));
        when(jdbc.queryForObject(eq("SELECT EXISTS(SELECT 1 FROM stores WHERE id=? AND kind=? AND active=TRUE)"), eq(Boolean.class), eq(locationId), eq("WAREHOUSE")))
                .thenReturn(true);

        access.requireLocation(userId, "stock:write", locationId);
        assertThatThrownBy(() -> access.requireLocation(userId, "stock:write", UUID.randomUUID()))
                .isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> access.require(userId, "orders:read"))
                .isInstanceOf(SecurityException.class);
    }
}
