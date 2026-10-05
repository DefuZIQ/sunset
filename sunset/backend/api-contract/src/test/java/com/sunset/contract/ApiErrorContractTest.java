package com.sunset.contract;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ApiErrorContractTest {
    @RestController
    static class FailingController {
        @GetMapping("/bad") String bad() { throw new IllegalArgumentException("Проверьте значение"); }
        @GetMapping("/missing") String missing() { throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Нет товара"); }
        @GetMapping("/broken") String broken() { throw new IllegalStateException("private database detail"); }
    }

    @RestControllerAdvice
    static class Advice extends BaseApiExceptionHandler {}

    @Test
    void inheritedAdviceReturnsUniformBodyAndMatchingRequestId() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new FailingController()).setControllerAdvice(new Advice()).build();
        var result = mvc.perform(get("/bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Проверьте значение"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(jsonPath("$.timestamp").exists())
                .andReturn();
        String requestId = result.getResponse().getHeader("X-Request-Id");
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        assertThat(result.getResponse().getContentAsString()).contains("\"requestId\":\"" + requestId + "\"");
    }

    @Test
    void statusExceptionsKeepStatusAndInternalErrorsHideDetails() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new FailingController()).setControllerAdvice(new Advice()).build();
        mvc.perform(get("/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Нет товара"));
        mvc.perform(get("/broken"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("Внутренняя ошибка сервера"));
    }
}
