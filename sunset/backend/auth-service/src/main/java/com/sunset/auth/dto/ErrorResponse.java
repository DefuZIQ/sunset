package com.sunset.auth.dto;

import java.time.LocalDateTime;

public class ErrorResponse {

    private int httpCode;
    private String errorMessage;
    private LocalDateTime timestamp;

    // Конструктор
    public ErrorResponse(int httpCode, String errorMessage, LocalDateTime timestamp) {
        this.httpCode = httpCode;
        this.errorMessage = errorMessage;
        this.timestamp = timestamp;
    }

    // Геттеры и сеттеры
    public int getHttpCode() {
        return httpCode;
    }

    public void setHttpCode(int httpCode) {
        this.httpCode = httpCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
