package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
public class AdminController {

    @Autowired
    private AppUserRepository userRepository;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userRepository.findAll().stream()
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getRole().name()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        Optional<AppUser> existing = userRepository.findByEmail(request.getEmail());
        if (existing.isPresent()) {
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
        return ResponseEntity.ok(new UserDto(saved.getId(), saved.getEmail(), saved.getRole().name()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<AppUser> user = userRepository.findById(id);
        if (user.isPresent()) {
            // Cannot delete the main admin for safety in this demo
            if (user.get().getEmail().equals("test@pagareader.com")) {
                return ResponseEntity.badRequest().body("Cannot delete the primary admin account.");
            }
            userRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
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
