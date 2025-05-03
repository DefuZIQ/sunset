package com.sunset.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtFilter.class);

    private final JwtUtil jwtUtil;

    // Получаем секрет из application.properties
    @Value("${spring.security.jwt.secret}")
    private String secretKey;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();
        logger.info("Поступил запрос на путь: {}", requestPath);

        if (isPublicPath(requestPath)) {
            logger.info("Путь '{}' не требует авторизации. Пропускаем фильтр.", requestPath);
            chain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.warn("Отсутствует или некорректный заголовок Authorization");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Доступ запрещён: отсутствует токен.");
            return;
        }

        String token = authHeader.substring(7);
        try {
            UUID userId = jwtUtil.extractUserId(token);  // секрет передаём сюда

            if (userId == null) {
                logger.error("Не удалось извлечь userId из токена.");
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Неверный или просроченный токен.");
                return;
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, null);

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            logger.error("Ошибка при проверке токена: {}", e.getMessage());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Ошибка авторизации.");
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean isPublicPath(String path) {
        return path.equals("/auth/login") || path.equals("/auth/register");
    }
}
