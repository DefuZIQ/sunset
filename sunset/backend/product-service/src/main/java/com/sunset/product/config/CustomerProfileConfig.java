package com.sunset.product.config;

import com.sunset.contract.CustomerProfileReader;
import com.sunset.contract.LocalCustomerProfileReader;
import com.sunset.contract.RemoteCustomerProfileReader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class CustomerProfileConfig {
    @Bean
    CustomerProfileReader customerProfileReader(JdbcTemplate jdbc,
                                                @Value("${customer-profile.mode:local}") String mode,
                                                @Value("${customer-profile.auth-url:http://auth-service:8081}") String authUrl,
                                                @Value("${internal.iam.secret:}") String secret) {
        if ("local".equalsIgnoreCase(mode)) return new LocalCustomerProfileReader(jdbc);
        if ("remote".equalsIgnoreCase(mode)) return new RemoteCustomerProfileReader(authUrl, secret);
        throw new IllegalArgumentException("Неизвестный режим профиля клиента");
    }
}
