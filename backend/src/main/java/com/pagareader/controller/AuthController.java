package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import com.pagareader.security.JwtService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AppUserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());
        Optional<AppUser> userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isPresent() && passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            AppUser user = userOpt.get();
            Map<String, Object> claims = Map.of("role", user.getRole().name());

            String token = jwtService.generateToken(claims, user.getEmail());
            log.info("Login successful for user: {} [Role: {}]", user.getEmail(), user.getRole().name());
            return ResponseEntity.ok(new AuthResponse(token));
        }

        log.warn("Login failed: invalid credentials for email: {}", request.getEmail());
        return ResponseEntity.status(401).body("Credenziali non valide");
    }

    @Getter
    @Setter
    public static class LoginRequest {
        private String email;
        private String password;
    }

    public record AuthResponse(String token) {}
}
