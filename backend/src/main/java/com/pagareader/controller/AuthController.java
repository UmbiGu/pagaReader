package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import com.pagareader.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AppUserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(AppUserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());
        Optional<AppUser> userOpt = userRepository.findByEmail(request.getEmail());
        
        if (userOpt.isPresent() && passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            AppUser user = userOpt.get();
            Map<String, Object> claims = new HashMap<>();
            claims.put("role", user.getRole().name());
            
            String token = jwtService.generateToken(claims, user.getEmail());
            log.info("Login successful for user: {} [Role: {}]", user.getEmail(), user.getRole().name());
            return ResponseEntity.ok(new AuthResponse(token));
        }
        
        log.warn("Login failed: invalid credentials for email: {}", request.getEmail());
        return ResponseEntity.status(401).body("Credenziali non valide");
    }

    public static class LoginRequest {
        private String email;
        private String password;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthResponse {
        private String token;
        
        public AuthResponse(String token) { this.token = token; }
        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
    }
}
