package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userRepository.findAll().stream()
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getRole().name()))
                .toList();
        log.debug("Admin fetched all users count: {}", users.size());
        return ResponseEntity.ok(users);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        log.info("Admin creating user with email: {}", request.getEmail());
        Optional<AppUser> existing = userRepository.findByEmail(request.getEmail());
        if (existing.isPresent()) {
            log.warn("User creation rejected: email {} already in use", request.getEmail());
            return ResponseEntity.badRequest().body("L'email è già in uso.");
        }

        AppUser.Role role = AppUser.Role.USER;
        if (request.getRole() != null) {
            try {
                role = AppUser.Role.valueOf(request.getRole().trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }

        AppUser newUser = AppUser.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        AppUser saved = userRepository.save(newUser);
        log.info("Successfully created user ID {} with role {}", saved.getId(), saved.getRole());
        return ResponseEntity.ok(new UserDto(saved.getId(), saved.getEmail(), saved.getRole().name()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<AppUser> user = userRepository.findById(id);
        if (user.isPresent()) {
            if ("test@pagareader.com".equalsIgnoreCase(user.get().getEmail())) {
                log.warn("Attempt to delete primary admin account blocked");
                return ResponseEntity.badRequest().body("Cannot delete the primary admin account.");
            }
            userRepository.deleteById(id);
            log.info("Admin deleted user ID: {}", id);
            return ResponseEntity.ok().build();
        }
        log.warn("Delete user failed: ID {} not found", id);
        return ResponseEntity.notFound().build();
    }

    public record UserDto(Long id, String email, String role) {}

    @Getter
    @Setter
    public static class CreateUserRequest {
        private String email;
        private String password;
        private String role;
    }
}
