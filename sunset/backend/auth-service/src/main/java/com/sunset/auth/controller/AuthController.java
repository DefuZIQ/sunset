package com.sunset.auth.controller;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.dto.ChangePasswordRequest;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.dto.UpdateProfileRequest;
import com.sunset.auth.dto.UserDTO;
import com.sunset.auth.service.AuthService;
import com.sunset.auth.service.AuthSessionService;
import com.sunset.auth.security.AdminCookieSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;
import java.util.Map;

@RestController
@ResponseBody
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthSessionService sessions;
    private final AdminCookieSession cookieSession;

    public AuthController(AuthService authService, AuthSessionService sessions, AdminCookieSession cookieSession) {
        this.authService = authService;
        this.sessions = sessions;
        this.cookieSession = cookieSession;
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest registerRequest) {
        return authService.registerUser(registerRequest);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest loginRequest) {
        return authService.loginUser(loginRequest);
    }

    @PostMapping("/staff/login")
    public AuthResponse staffLogin(@RequestBody LoginRequest loginRequest) {
        return authService.loginStaff(loginRequest);
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

    @GetMapping("/session/validate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void validateSession() {
        // JwtFilter has already checked both the JWT and the server-side session.
    }

    @GetMapping("/session/admin/validate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void validateAdminSession(Authentication authentication, @RequestHeader("Authorization") String authorization) {
        if (!sessions.isElevatedSession(authorization.substring(7), (UUID) authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Недействительный сеанс администратора");
        }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authentication authentication, @RequestHeader("Authorization") String authorization,
                       HttpServletRequest request, HttpServletResponse response) {
        sessions.revoke(authorization.substring(7), (UUID) authentication.getPrincipal());
        cookieSession.clear(request, response);
    }

    @GetMapping("/admin/session")
    public Map<String, String> adminSession(Authentication authentication,
                                            @RequestHeader("Authorization") String authorization) {
        String token = authorization.substring(7);
        if (!sessions.isElevatedSession(token, (UUID) authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Недействительный сеанс администратора");
        }
        return Map.of("csrfToken", cookieSession.csrf(token));
    }
}
