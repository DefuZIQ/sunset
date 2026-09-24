package com.sunset.auth.dto;

public class AuthResponse {

    private String uuid;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String role;
    private String token;  // Токен в DTO

    public AuthResponse() {}

    public AuthResponse(String uuid, String email, String firstName, String lastName, String phone, String role, String token) {
        this.uuid = uuid;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.role = role;
        this.token = token;
    }

    // Геттеры и сеттеры

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
