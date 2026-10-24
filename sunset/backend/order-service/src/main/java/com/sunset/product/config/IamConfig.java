package com.sunset.product.config;

import com.sunset.contract.IamAccess;
import com.sunset.contract.IamAuthorizer;
import com.sunset.contract.RemoteIamAccess;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class IamConfig {
    @Bean
    IamAuthorizer iamAuthorizer(JdbcTemplate jdbc,
                                @Value("${iam.mode:local}") String mode,
                                @Value("${iam.auth-url:http://auth-service:8081}") String authUrl,
                                @Value("${internal.iam.secret:}") String secret) {
        if ("local".equalsIgnoreCase(mode)) return new IamAccess(jdbc);
        if ("remote".equalsIgnoreCase(mode)) return new RemoteIamAccess(authUrl, secret, jdbc);
        throw new IllegalArgumentException("Неизвестный режим IAM");
    }
}
