package com.sunset.auth;

import com.sunset.auth.security.JwtFilter;
import com.sunset.auth.service.AuthSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class InternalCustomerFilterTest {
    @Test void bothInternalCustomerRoutesReachTheServiceTokenController() throws Exception {
        AuthSessionService sessions = mock(AuthSessionService.class);
        JwtFilter filter = new JwtFilter(sessions);
        for (String path : new String[]{"/internal/customers", "/internal/customers/123"}) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
            MockHttpServletResponse response = new MockHttpServletResponse();
            AtomicBoolean reachedController = new AtomicBoolean();
            filter.doFilter(request, response, (req, res) -> reachedController.set(true));
            assertThat(reachedController).as(path).isTrue();
            assertThat(response.getStatus()).isEqualTo(200);
        }
        verifyNoInteractions(sessions);
    }
}
