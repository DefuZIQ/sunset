package com.sunset.auth.dto;

import com.sunset.auth.model.User;
import java.time.LocalDate;
import java.util.UUID;

public class UserDTO {

    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private LocalDate birthday;
    private String avatar;

    public UserDTO() {
    }

    public UserDTO(UUID id, String email, String firstName, String lastName, LocalDate birthday, String avatar) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.birthday = birthday;
        this.avatar = avatar;
    }

    // Геттеры и сеттеры

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public LocalDate getBirthday() {
        return birthday;
    }

    public void setBirthday(LocalDate birthday) {
        this.birthday = birthday;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    // Метод преобразования из User в UserDTO

    public static UserDTO fromUser(User user) {
        if (user == null) return null;
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getBirthday(),
                user.getAvatar()
        );
    }
}
