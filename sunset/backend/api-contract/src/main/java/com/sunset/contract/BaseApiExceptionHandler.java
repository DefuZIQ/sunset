package com.sunset.contract;

import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/** Inherited by each service's controller advice so all servlet APIs agree. */
public abstract class BaseApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(BaseApiExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> badRequest(IllegalArgumentException exception, HttpServletResponse response) {
        return error(HttpStatus.BAD_REQUEST, "BAD_REQUEST", exception.getMessage(), Map.of(), response);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiError> forbidden(SecurityException exception, HttpServletResponse response) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", exception.getMessage(), Map.of(), response);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> status(ResponseStatusException exception, HttpServletResponse response) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        String code = switch (status) {
            case NOT_FOUND -> "NOT_FOUND";
            case FORBIDDEN -> "FORBIDDEN";
            case BAD_REQUEST -> "BAD_REQUEST";
            default -> "HTTP_" + status.value();
        };
        String message = exception.getReason() == null ? status.getReasonPhrase() : exception.getReason();
        return error(status, code, message, Map.of(), response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> invalidJson(HttpMessageNotReadableException exception, HttpServletResponse response) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_JSON", "Некорректный JSON-запрос", Map.of(), response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalidFields(MethodArgumentNotValidException exception, HttpServletResponse response) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(field ->
                fields.putIfAbsent(field.getField(), field.getDefaultMessage() == null ? "Некорректное значение" : field.getDefaultMessage()));
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Проверьте поля запроса", fields, response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> internal(Exception exception, HttpServletResponse response) {
        log.error("Unhandled API exception", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Внутренняя ошибка сервера", Map.of(), response);
    }

    protected ResponseEntity<ApiError> error(HttpStatus status, String code, String message,
                                              Map<String, String> fieldErrors, HttpServletResponse response) {
        return ResponseEntity.status(status).body(ApiError.of(code, message, fieldErrors, response));
    }
}
