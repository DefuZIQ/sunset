package com.sunset.auth;

import com.sunset.auth.dto.ChangePasswordRequest;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.exceptions.InvalidPasswordException;
import com.sunset.auth.model.User;
import com.sunset.auth.repository.UserRepository;
import com.sunset.auth.security.JwtUtil;
import com.sunset.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private UserRepository repository;
    private JwtUtil jwt;
    private AuthService service;

    @BeforeEach void setUp() {
        repository = Mockito.mock(UserRepository.class);
        jwt = Mockito.mock(JwtUtil.class);
        service = new AuthService(repository, jwt);
    }

    @Test void registersUserWithHashedPassword() {
        when(repository.existsByEmail("client@example.com")).thenReturn(false);
        when(repository.save(any(User.class))).thenAnswer(invocation -> {
            User value = invocation.getArgument(0);
            value.setId(UUID.randomUUID());
            return value;
        });
        var response = service.registerUser(new RegisterRequest("client@example.com", "secret123", "Иван", "Иванов"));
        assertEquals("client@example.com", response.getEmail());
        verify(repository).save(argThat(user -> !"secret123".equals(user.getPassword())
                && new BCryptPasswordEncoder().matches("secret123", user.getPassword())));
    }

    @Test void rejectsDuplicateEmail() {
        when(repository.existsByEmail("client@example.com")).thenReturn(true);
        var error = assertThrows(IllegalArgumentException.class,
                () -> service.registerUser(new RegisterRequest("client@example.com", "secret123", "Иван", "Иванов")));
        assertEquals("Этот email уже используется", error.getMessage());
        verify(repository, never()).save(any());
    }

    @Test void logsInAndIssuesToken() {
        UUID id = UUID.randomUUID();
        User user = user(id, "secret123");
        when(repository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(jwt.generateToken(id)).thenReturn("jwt-token");
        assertEquals("jwt-token", service.loginUser(new LoginRequest(user.getEmail(), "secret123")).getToken());
    }

    @Test void rejectsWrongPassword() {
        User user = user(UUID.randomUUID(), "secret123");
        when(repository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(InvalidPasswordException.class,
                () -> service.loginUser(new LoginRequest(user.getEmail(), "wrong")));
    }

    @Test void rejectsShortNewPassword() {
        UUID id = UUID.randomUUID();
        User user = user(id, "secret123");
        when(repository.findById(id)).thenReturn(Optional.of(user));
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("secret123");
        request.setNewPassword("short");
        assertThrows(RuntimeException.class, () -> service.changePassword(id, request));
        verify(repository, never()).save(any());
    }

    private User user(UUID id, String password) {
        User user = new User();
        user.setId(id);
        user.setEmail("client@example.com");
        user.setFirstName("Иван");
        user.setLastName("Иванов");
        user.setPassword(new BCryptPasswordEncoder().encode(password));
        return user;
    }
}
