package com.sunset.auth.service;

import com.sunset.auth.dto.AuthResponse;
import com.sunset.auth.dto.ChangePasswordRequest;
import com.sunset.auth.dto.LoginRequest;
import com.sunset.auth.dto.RegisterRequest;
import com.sunset.auth.dto.UpdateProfileRequest;
import com.sunset.auth.dto.UserDTO;
import com.sunset.auth.exceptions.UserNotFoundException;
import com.sunset.auth.exceptions.InvalidPasswordException;
import com.sunset.auth.model.User;
import com.sunset.auth.repository.UserRepository;
import com.sunset.auth.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDate;

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
        return new AuthResponse(user.getId().toString(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhone(), user.getRole(), null);
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

        return new AuthResponse(user.getId().toString(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhone(), user.getRole(), token);
    }

    public UserDTO getProfile(UUID userId) {
        return UserDTO.fromUser(findUser(userId));
    }

    public UserDTO updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUser(userId);
        String email = cleanRequired(request.getEmail(), "Email");
        String firstName = cleanRequired(request.getFirstName(), "Имя");
        String lastName = cleanRequired(request.getLastName(), "Фамилия");

        if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(email)) {
            throw new RuntimeException("Этот email уже используется");
        }

        String phone = request.getPhone() == null ? null : request.getPhone().trim();
        if (phone != null && phone.length() > 30) {
            throw new RuntimeException("Номер телефона слишком длинный");
        }

        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPhone(phone == null || phone.isBlank() ? null : phone);
        LocalDate birthday = request.getBirthday();
        if (birthday != null && (birthday.isAfter(LocalDate.now()) || birthday.isBefore(LocalDate.now().minusYears(120)))) {
            throw new RuntimeException("Проверьте дату рождения");
        }
        user.setBirthday(birthday);
        String avatar = request.getAvatar();
        if (avatar != null && avatar.length() > 700_000) throw new RuntimeException("Файл аватара слишком большой");
        if (avatar != null && !avatar.isBlank() && !avatar.startsWith("data:image/")) throw new RuntimeException("Некорректный формат аватара");
        user.setAvatar(avatar == null || avatar.isBlank() ? null : avatar);
        return UserDTO.fromUser(userRepository.save(user));
    }

    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = findUser(userId);
        String currentPassword = request == null ? null : request.getCurrentPassword();
        String newPassword = request == null ? null : request.getNewPassword();

        if (currentPassword == null || currentPassword.isEmpty()) {
            throw new RuntimeException("Введите текущий пароль");
        }
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new InvalidPasswordException("Текущий пароль указан неверно");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new RuntimeException("Новый пароль должен содержать не менее 8 символов");
        }
        if (newPassword.length() > 72) {
            throw new RuntimeException("Новый пароль должен содержать не более 72 символов");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new RuntimeException("Новый пароль должен отличаться от текущего");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Пользователь не найден"));
    }

    private String cleanRequired(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(fieldName + " не может быть пустым");
        }
        return value.trim();
    }
}
