package com.sunset.auth.exceptions;

import com.sunset.auth.dto.AuthResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<AuthResponse> handleUserNotFound(UserNotFoundException ex) {
        AuthResponse response = new AuthResponse(null, null, null, null, null);
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<AuthResponse> handleInvalidPassword(InvalidPasswordException ex) {
        AuthResponse response = new AuthResponse(null, null, null, null, null);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<AuthResponse> handleRuntimeException(RuntimeException ex) {
        AuthResponse response = new AuthResponse(null, null, null, null, null);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }
}
