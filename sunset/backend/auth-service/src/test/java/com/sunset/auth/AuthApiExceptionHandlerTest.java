package com.sunset.auth;

import com.sunset.auth.exceptions.GlobalExceptionHandler;
import com.sunset.auth.exceptions.InvalidPasswordException;
import com.sunset.auth.exceptions.UserNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthApiExceptionHandlerTest {
    @RestController
    static class FailingController {
        @GetMapping("/wrong-password") String wrongPassword() {
            throw new InvalidPasswordException("Sensitive account detail");
        }

        @GetMapping("/unknown-user") String unknownUser() {
            throw new UserNotFoundException("Sensitive account detail");
        }
    }

    @Test
    void invalidPasswordIsSanitizedAndCorrelated() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new FailingController())
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        var result = mvc.perform(get("/wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Неверный email или пароль"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(jsonPath("$.timestamp").exists())
                .andReturn();

        String requestId = result.getResponse().getHeader("X-Request-Id");
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        assertThat(result.getResponse().getContentAsString())
                .contains("\"requestId\":\"" + requestId + "\"")
                .doesNotContain("Sensitive account detail");
    }

    @Test
    void unknownUserDoesNotExposeAccountDetail() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new FailingController())
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/unknown-user"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Пользователь не найден"));
    }
}
