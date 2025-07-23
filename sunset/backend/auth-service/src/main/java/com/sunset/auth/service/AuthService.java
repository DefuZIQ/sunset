package com.sunset.auth.service;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.exceptions.UserNotFoundException;
import com.sunset.auth.exceptions.InvalidPasswordException;
import com.sunset.auth.model.User;
import com.sunset.auth.repository.UserRepository;
import com.sunset.auth.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse registerUser(RegisterRequest request) {
        // Проверка на существующего пользователя
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        userRepository.save(user);

        // Преобразуем user.getId() в String для ответа
        return new AuthResponse(user.getId().toString(), user.getEmail(), user.getFirstName(), user.getLastName(), null);
    }

    public AuthResponse loginUser(LoginRequest request) {
        Optional<User> optionalUser = userRepository.findByEmail(request.getEmail());
        if (optionalUser.isEmpty()) {
            throw new UserNotFoundException("User with email " + request.getEmail() + " not found");
        }

        User user = optionalUser.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidPasswordException("Invalid password for user " + request.getEmail());
        }

        // Преобразуем UUID в строку для генерации токена
        String token = jwtUtil.generateToken(user.getId());

        return new AuthResponse(user.getId().toString(), user.getEmail(), user.getFirstName(), user.getLastName(), token);
    }
}
