package com.sunset.auth.controller;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.dto.ChangePasswordRequest;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.dto.UpdateProfileRequest;
import com.sunset.auth.dto.UserDTO;
import com.sunset.auth.service.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import java.util.UUID;
import java.util.Map;

@RestController
@ResponseBody
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest registerRequest) {
        return authService.registerUser(registerRequest);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest loginRequest) {
        return authService.loginUser(loginRequest);
    }

    @GetMapping("/profile")
    public UserDTO profile(Authentication authentication) {
        return authService.getProfile((UUID) authentication.getPrincipal());
    }

    @PutMapping("/profile")
    public UserDTO updateProfile(Authentication authentication, @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile((UUID) authentication.getPrincipal(), request);
    }

    @PutMapping("/profile/password")
    public Map<String, String> changePassword(Authentication authentication, @RequestBody ChangePasswordRequest request) {
        authService.changePassword((UUID) authentication.getPrincipal(), request);
        return Map.of("message", "Пароль успешно изменён");
    }
}
