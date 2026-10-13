package com.pagareader.config;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DatabaseRecalculatorRunner implements CommandLineRunner {

    @Autowired
    private AppUserRepository userRepository;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) throws Exception {
        System.out.println("====== SYSTEM STARTUP: PREPARING DATABASE & USERS ======");
        
        // 1. Seed Default Admin User
        final AppUser adminUser;
        Optional<AppUser> existingUser = userRepository.findByEmail("test@pagareader.com");
        if (existingUser.isPresent()) {
            adminUser = existingUser.get();
            // Ensure existing test user is upgraded to ADMIN if running from previous DB state
            if (adminUser.getRole() != AppUser.Role.ADMIN) {
                adminUser.setRole(AppUser.Role.ADMIN);
                userRepository.save(adminUser);
            }
        } else {
            AppUser newUser = new AppUser();
            newUser.setEmail("test@pagareader.com");
            newUser.setPassword(passwordEncoder.encode("password123"));
            newUser.setRole(AppUser.Role.ADMIN);
            adminUser = userRepository.save(newUser);
            System.out.println("-> Seeded default admin user: test@pagareader.com");
        }
        
        System.out.println("====== STARTUP COMPLETATO CON SUCCESSO ======");
    }
}
