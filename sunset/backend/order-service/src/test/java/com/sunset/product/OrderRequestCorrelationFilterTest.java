package com.sunset.product;

import com.sunset.product.observability.OrderRequestCorrelationFilter;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class OrderRequestCorrelationFilterTest {
    private final OrderRequestCorrelationFilter filter = new OrderRequestCorrelationFilter();

    @Test
    void preservesGatewayIdInResponseAndRequestLogsWithoutLeakingMdc() throws Exception {
        String requestId = UUID.randomUUID().toString();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/order/my");
        request.addHeader("X-Request-Id", requestId);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> insideChain = new AtomicReference<>();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            insideChain.set(MDC.get("requestId"));
            ((MockHttpServletResponse) servletResponse).setStatus(202);
        });

        assertThat(response.getHeader("X-Request-Id")).isEqualTo(requestId);
        assertThat(insideChain.get()).isEqualTo(requestId);
        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    void replacesMalformedDirectRequestId() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/order/my");
        request.addHeader("X-Request-Id", "not-a-uuid\nlog-forgery");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {});

        String replacement = response.getHeader("X-Request-Id");
        assertThat(replacement).isNotEqualTo("not-a-uuid\nlog-forgery");
        assertThat(UUID.fromString(replacement).toString()).isEqualTo(replacement);
        assertThat(MDC.get("requestId")).isNull();
    }
}
