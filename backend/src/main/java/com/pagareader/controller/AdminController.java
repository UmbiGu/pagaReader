package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final AppUserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AdminController(AppUserRepository userRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userRepository.findAll().stream()
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getRole().name()))
                .collect(Collectors.toList());
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

        AppUser newUser = new AppUser();
        newUser.setEmail(request.getEmail());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        
        try {
            AppUser.Role role = AppUser.Role.valueOf(request.getRole().toUpperCase());
            newUser.setRole(role);
        } catch (Exception e) {
            newUser.setRole(AppUser.Role.USER);
        }

        AppUser saved = userRepository.save(newUser);
        log.info("Successfully created user ID {} with role {}", saved.getId(), saved.getRole());
        return ResponseEntity.ok(new UserDto(saved.getId(), saved.getEmail(), saved.getRole().name()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<AppUser> user = userRepository.findById(id);
        if (user.isPresent()) {
            // Cannot delete primary admin account
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

    // DTOs
    public static class UserDto {
        public Long id;
        public String email;
        public String role;
        public UserDto(Long id, String email, String role) { this.id = id; this.email = email; this.role = role; }
    }

    public static class CreateUserRequest {
        private String email;
        private String password;
        private String role;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }
}
