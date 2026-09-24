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

    public JwtFilter(WhitelistConfig whitelistConfig) {
        this.whitelistConfig = whitelistConfig;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        boolean publicRequest = isPublicRequest(request);
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (publicRequest && (authHeader == null || !authHeader.startsWith("Bearer "))) {
            log.debug("Путь {} разрешён без авторизации", path);
            return chain.filter(withTrustedUserId(exchange, null));
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Отсутствует или некорректный Authorization заголовок");
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8)))
                    .parseClaimsJws(token)
                    .getBody();

            String userId = claims.getSubject();
            log.debug("JWT валиден. user-id: {}", userId);

            return chain.filter(withTrustedUserId(exchange, userId));

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

    private ServerWebExchange withTrustedUserId(ServerWebExchange exchange, String userId) {
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove("user-id");
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
