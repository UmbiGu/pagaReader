package com.pagareader.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class HttpLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(HttpLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        // Only log API requests to keep console clean
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();
        String method = request.getMethod();
        String query = request.getQueryString() != null ? "?" + request.getQueryString() : "";

        log.info("--> [HTTP IN]  {} {}{}", method, path, query);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            if (status >= 400) {
                log.warn("<-- [HTTP OUT] {} {} - Status: {} (took {}ms)", method, path, status, duration);
            } else {
                log.info("<-- [HTTP OUT] {} {} - Status: {} (took {}ms)", method, path, status, duration);
            }
        }
    }
}
