package com.sunset.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)  // Отключаем CSRF для REST
                .authorizeExchange(exchange -> exchange
                        .pathMatchers("/auth/register","/auth/login", "/public/**").permitAll() // Публичные маршруты
                        .anyExchange().authenticated()) // Остальное требует токен
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)  // Отключаем basic auth
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)  // Отключаем форму входа
                .build();
    }
}
