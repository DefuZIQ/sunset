package com.sunset.auth.controller;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.service.MfaService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth/mfa")
public class MfaController {
    private final MfaService mfa;

    public MfaController(MfaService mfa) {
        this.mfa = mfa;
    }

    @GetMapping("/status")
    public Map<String, Object> status(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        return Map.of("enabled", mfa.enabled(userId), "recoveryCodesRemaining", mfa.recoveryCodesRemaining(userId));
    }

    @PostMapping("/enroll/start")
    public MfaService.Enrollment start(Authentication authentication, @RequestBody PasswordInput input) {
        return mfa.startEnrollment((UUID) authentication.getPrincipal(), input.currentPassword());
    }

    @PostMapping("/enroll/confirm")
    public Map<String, List<String>> confirm(Authentication authentication, @RequestBody CodeInput input) {
        List<String> codes = mfa.confirmEnrollment((UUID) authentication.getPrincipal(), input.code());
        if (codes.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Неверный код или временная блокировка");
        return Map.of("recoveryCodes", codes);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody ChallengeInput input) {
        AuthResponse result = mfa.verifyLogin(input.challengeToken(), input.code());
        if (result == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверный код или временная блокировка");
        return result;
    }

    @PostMapping("/disable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disable(Authentication authentication, @RequestBody DisableInput input) {
        if (!mfa.disable((UUID) authentication.getPrincipal(), input.currentPassword(), input.code()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Не удалось отключить MFA");
    }

    public record PasswordInput(String currentPassword) {}
    public record CodeInput(String code) {}
    public record ChallengeInput(String challengeToken, String code) {}
    public record DisableInput(String currentPassword, String code) {}
}
