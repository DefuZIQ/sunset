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
}
