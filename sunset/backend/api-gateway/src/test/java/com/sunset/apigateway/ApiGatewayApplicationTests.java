package com.sunset.apigateway;

import com.sunset.apigateway.ApiGatewayApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(classes = ApiGatewayApplication.class, properties = "jwt.secret=test-secret-that-is-at-least-32-bytes")
public class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
    }
}
