package com.sunset.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.sunset.auth.service.AuthSessionService;
import org.springframework.dao.DataAccessException;
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

    private final AuthSessionService sessions;

    @Value("${spring.security.jwt.secret}")
    private String secretKey;

    public JwtFilter(AuthSessionService sessions) {
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();
        logger.info("Поступил запрос на путь: {}", requestPath);

        if (isPublicPath(requestPath)) {
            logger.debug("Путь '{}' не требует авторизации. Пропускаем фильтр.", requestPath);
            chain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.warn("Отсутствует или некорректный заголовок Authorization");
            reject(response, "Доступ запрещён: отсутствует токен.");
            return;
        }

        String token = authHeader.substring(7);
        try {
            UUID userId = sessions.authenticatedUser(token);

            if (userId == null) {
                logger.warn("Не удалось извлечь userId из токена.");
                reject(response, "Неверный или просроченный токен.");
                return;
            }

            logger.debug("Аутентификация пройдена. userId: {}", userId);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, null);

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (DataAccessException e) {
            logger.error("Хранилище сеансов недоступно: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            return;
        } catch (Exception e) {
            logger.error("Ошибка при проверке токена: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            reject(response, "Ошибка авторизации.");
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean isPublicPath(String path) {
        return path.startsWith("/auth/login")
                || path.startsWith("/internal/iam/")
                || path.equals("/internal/customers")
                || path.startsWith("/internal/customers/")
                || path.equals("/auth/staff/login")
                || path.equals("/auth/mfa/login")
                || path.equals("/auth/mfa/setup/start")
                || path.equals("/auth/mfa/setup/confirm")
                || path.startsWith("/auth/register")
                || path.startsWith("/actuator/health")
                || path.startsWith("/actuator/prometheus");
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(message);
    }
}
