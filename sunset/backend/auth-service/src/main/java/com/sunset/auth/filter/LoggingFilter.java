package com.sunset.auth.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class LoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(LoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;

        logger.info("Incoming request: {} {}", httpRequest.getMethod(), httpRequest.getRequestURI());
        // Never log headers or bodies: they include passwords, MFA codes, bearer tokens
        // and service-to-service credentials.
        chain.doFilter(request, response);
    }
}
