package com.sunset.auth.config;

import com.sunset.auth.security.JwtFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
        System.out.println(">>> SecurityConfig инициализирован");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        log.info("Настройка SecurityFilterChain...");

        http
                .csrf(csrf -> {
                    csrf.disable();
                    log.info("CSRF отключён");
                })
                .authorizeHttpRequests(auth -> {
                    log.info("Разрешены запросы без авторизации на пути: /auth/register, /auth/login");
                    auth.requestMatchers("/auth/register", "/auth/login").permitAll();
                    auth.anyRequest().authenticated();
                })
                .sessionManagement(session -> {
                    log.info("SessionCreationPolicy установлен в STATELESS");
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS);
                })
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        log.info("Фильтр JWT добавлен перед UsernamePasswordAuthenticationFilter");

        return http.build();
    }
}
