package com.sunset.apigateway.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.authentication.AuthenticationWebFilter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;

@Configuration
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final WhitelistConfig whitelistConfig;

    @Value("${jwt.secret}")
    private String secretKey;

    public SecurityConfig(WhitelistConfig whitelistConfig) {
        this.whitelistConfig = whitelistConfig;
        log.info(">>> SecurityConfig инициализирован");
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        log.info("Настройка SecurityWebFilterChain...");

        ReactiveAuthenticationManager jwtAuthenticationManager = authentication -> {
            try {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8)))
                        .build()
                        .parseClaimsJws(authentication.getCredentials().toString())
                        .getBody();
                return Mono.just(new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, Collections.emptyList()));
            } catch (Exception exception) {
                return Mono.error(new BadCredentialsException("Invalid JWT", exception));
            }
        };
        AuthenticationWebFilter jwtAuthenticationFilter =
                new AuthenticationWebFilter(jwtAuthenticationManager);
        jwtAuthenticationFilter.setServerAuthenticationConverter(exchange -> {
            String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                return Mono.empty();
            }
            String token = authorization.substring(7);
            return Mono.just(new UsernamePasswordAuthenticationToken(token, token));
        });
        jwtAuthenticationFilter.setSecurityContextRepository(NoOpServerSecurityContextRepository.getInstance());

        http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .addFilterAt(jwtAuthenticationFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                // JWT is the only authentication mechanism for the API. Do not let
                // Spring Security advertise HTTP Basic, otherwise browsers show a
                // native username/password dialog for an ordinary 401 response.
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint((exchange, exception) -> {
                    exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete();
                }))
                .authorizeExchange(auth -> {
                    auth.pathMatchers(HttpMethod.OPTIONS).permitAll();
                    auth.pathMatchers(HttpMethod.POST, "/subscriptions").permitAll();
                    auth.pathMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll();
                    auth.pathMatchers(HttpMethod.GET, "/products/reviews/**", "/products/categories/tree").permitAll();
                    whitelistConfig.getWhitelistPaths()
                            .forEach(path -> auth.pathMatchers(path).permitAll());
                    auth.anyExchange().authenticated();
                })
                .securityContextRepository(NoOpServerSecurityContextRepository.getInstance());

        log.info("SecurityWebFilterChain настроен");
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        log.info("Настройка CORS...");

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);
        config.addExposedHeader("Authorization");
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
