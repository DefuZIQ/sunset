package com.sunset.apigateway.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import com.sunset.apigateway.config.WhitelistConfig;

import java.nio.charset.StandardCharsets;

@Component
public class JwtFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    @Value("${jwt.secret}")
    private String secretKey;

    private final WhitelistConfig whitelistConfig;
    private final AuthSessionVerifier sessionVerifier;
    private final AdminCookieCsrf adminCookieCsrf;

    public JwtFilter(WhitelistConfig whitelistConfig, AuthSessionVerifier sessionVerifier,
                     AdminCookieCsrf adminCookieCsrf) {
        this.whitelistConfig = whitelistConfig;
        this.sessionVerifier = sessionVerifier;
        this.adminCookieCsrf = adminCookieCsrf;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        boolean publicRequest = isPublicRequest(request);
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        boolean bearerAuth = authHeader != null && authHeader.startsWith("Bearer ");
        String cookieToken = adminCookieCsrf.sessionToken(request);

        if (publicRequest && !bearerAuth) {
            log.debug("Путь {} разрешён без авторизации", path);
            return chain.filter(withTrustedUserId(exchange, null));
        }

        if (!bearerAuth && (cookieToken == null || cookieToken.isBlank())) {
            log.warn("Отсутствует или некорректный Authorization заголовок");
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        boolean cookieAuth = !bearerAuth;
        String token = cookieAuth ? cookieToken : authHeader.substring(7);
        if (cookieAuth && !safeMethod(request) && !adminCookieCsrf.valid(request, token)) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8)))
                    .parseClaimsJws(token)
                    .getBody();

            String userId = claims.getSubject();
            log.debug("JWT валиден. user-id: {}", userId);

            return (cookieAuth ? sessionVerifier.isAdminActive(token) : sessionVerifier.isActive(token))
                    .onErrorResume(error -> {
                        log.error("Проверка сеанса в Auth Service недоступна: {}", error.toString());
                        exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
                        return Mono.empty();
                    })
                    .flatMap(active -> {
                        if (!active) {
                            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                            return exchange.getResponse().setComplete();
                        }
                        return chain.filter(withTrustedUserId(exchange, userId, cookieAuth ? token : null));
                    });

        } catch (ExpiredJwtException e) {
            log.warn("JWT просрочен: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("JWT неподдерживаемый: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("JWT повреждён: {}", e.getMessage());
        } catch (SignatureException e) {
            log.warn("JWT недействительная подпись: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Ошибка при проверке JWT: {}", e.getMessage());
        }

        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    private static boolean safeMethod(ServerHttpRequest request) {
        HttpMethod method = request.getMethod();
        return HttpMethod.GET.equals(method) || HttpMethod.HEAD.equals(method) || HttpMethod.OPTIONS.equals(method);
    }

    private ServerWebExchange withTrustedUserId(ServerWebExchange exchange, String userId) {
        return withTrustedUserId(exchange, userId, null);
    }

    private ServerWebExchange withTrustedUserId(ServerWebExchange exchange, String userId, String cookieToken) {
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove("user-id");
                    headers.remove("X-Sunset-Request-Host");
                    if (exchange.getRequest().getHeaders().getHost() != null) {
                        headers.set("X-Sunset-Request-Host", exchange.getRequest().getHeaders().getHost().getHostString());
                    }
                    headers.remove(AdminCookieCsrf.HEADER);
                    headers.remove(HttpHeaders.COOKIE);
                    if (cookieToken != null) headers.setBearerAuth(cookieToken);
                    if (userId != null && !userId.isBlank()) {
                        headers.set("user-id", userId);
                    }
                })
                .build();
        return exchange.mutate().request(mutatedRequest).build();
    }

    private boolean isPublicRequest(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        if (HttpMethod.POST.equals(request.getMethod()) && "/subscriptions".equals(path)) {
            return true;
        }
        if (HttpMethod.GET.equals(request.getMethod()) && "/order/stores".equals(path)) {
            return true;
        }
        if (whitelistConfig.getWhitelistPaths() == null) {
            return false;
        }
        return whitelistConfig.getWhitelistPaths().stream()
                .anyMatch(publicPath -> path.equals(publicPath) || path.startsWith(publicPath + "/"));
    }

    @Override
    public int getOrder() {
        return -1; // Приоритет фильтра
    }
}
