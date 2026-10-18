package com.sunset.auth;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.security.AdminCookieSession;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AdminCookieSessionTest {
    private final AdminCookieSession cookies = new AdminCookieSession("test-secret-that-is-at-least-32-bytes");

    @Test void publicHostUsesSecureHttpOnlyCookieAndNeverReturnsJwt() {
        AuthResponse auth = new AuthResponse("id", "admin@example.test", null, null, null, "ADMIN", "signed-jwt");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "t3ch.pro");
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookies.issue(auth, request, response);

        assertThat(response.getHeader("Set-Cookie"))
                .contains("SUNSET_ADMIN_SESSION=signed-jwt", "HttpOnly", "Secure", "SameSite=Strict", "Path=/api/v1")
                .contains("Max-Age=900");
        assertThat(auth.getToken()).isNull();
        assertThat(auth.getCsrfToken()).isEqualTo(cookies.csrf("signed-jwt"));
    }

    @Test void localHostAllowsHttpAndLogoutClearsCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "192.168.1.186");
        MockHttpServletResponse response = new MockHttpServletResponse();
        cookies.clear(request, response);
        assertThat(response.getHeader("Set-Cookie"))
                .contains("SUNSET_ADMIN_SESSION=", "Max-Age=0", "HttpOnly", "SameSite=Strict")
                .doesNotContain("Secure");
    }
}
