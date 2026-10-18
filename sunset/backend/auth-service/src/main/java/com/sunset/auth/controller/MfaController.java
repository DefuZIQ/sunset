package com.sunset.auth.controller;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.service.MfaService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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

    @PostMapping("/login")
    public AuthResponse login(@RequestBody ChallengeInput input) {
        AuthResponse result = mfa.verifyLogin(input.challengeToken(), input.code());
        if (result == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверный код или временная блокировка");
        return result;
    }

    @PostMapping("/setup/start")
    public MfaService.Enrollment setupStart(@RequestBody SetupInput input) {
        MfaService.Enrollment result = mfa.startSetup(input.setupToken());
        if (result == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Повторите вход для настройки MFA");
        return result;
    }

    @PostMapping("/setup/confirm")
    public MfaService.SetupCompletion setupConfirm(@RequestBody SetupConfirmInput input) {
        MfaService.SetupCompletion result = mfa.confirmSetup(input.setupToken(), input.code());
        if (result == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Неверный код или время настройки истекло");
        return result;
    }

    public record ChallengeInput(String challengeToken, String code) {}
    public record SetupInput(String setupToken) {}
    public record SetupConfirmInput(String setupToken, String code) {}
}
