package com.sunset.auth;

import com.sunset.auth.controller.InternalCustomerController;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InternalCustomerControllerTest {
    private static final String SECRET = "test-internal-profile-secret-at-least-32-bytes";

    @Test void rejectsRequestsWithoutServiceTokenBeforeDatabaseAccess() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        InternalCustomerController controller = new InternalCustomerController(jdbc, SECRET, "CUSTOMER");
        assertThatThrownBy(() -> controller.get(UUID.randomUUID(), null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(403));
        verifyNoInteractions(jdbc);
    }

    @Test void staffAuthNeverExposesCustomerProfileEvenWithServiceToken() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        InternalCustomerController controller = new InternalCustomerController(jdbc, SECRET, "STAFF");
        assertThatThrownBy(() -> controller.get(UUID.randomUUID(), SECRET))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(403));
        verifyNoInteractions(jdbc);
    }

    @Test void httpRouteBindsCustomerIdBeforeCheckingServiceToken() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new InternalCustomerController(mock(JdbcTemplate.class), SECRET, "CUSTOMER"))
                .build();
        mvc.perform(get("/internal/customers/{id}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/internal/customers"))
                .andExpect(status().isForbidden());
    }
}
