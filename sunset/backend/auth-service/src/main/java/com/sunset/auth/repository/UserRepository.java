// src/main/java/com/sunset/auth/repository/UserRepository.java
package com.sunset.auth.repository;

import com.sunset.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Добавьте этот метод для проверки существования пользователя по email
    boolean existsByEmail(String email);

    // Добавьте метод для поиска пользователя по email
    Optional<User> findByEmail(String email);
}
