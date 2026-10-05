package com.sunset.auth.exceptions;

import com.sunset.contract.ApiError;
import com.sunset.contract.BaseApiExceptionHandler;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends BaseApiExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiError> handleUserNotFound(UserNotFoundException ex, HttpServletResponse response) {
        return error(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Пользователь не найден", Map.of(), response);
    }

    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<ApiError> handleInvalidPassword(InvalidPasswordException ex, HttpServletResponse response) {
        return error(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Неверный email или пароль", Map.of(), response);
    }
}
