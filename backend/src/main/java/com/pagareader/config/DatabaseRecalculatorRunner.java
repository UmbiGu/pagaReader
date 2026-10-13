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
            boolean needsUpdate = false;
            
            // Ensure existing test user is upgraded to ADMIN if running from previous DB state
            if (adminUser.getRole() != AppUser.Role.ADMIN) {
                adminUser.setRole(AppUser.Role.ADMIN);
                needsUpdate = true;
            }
            // Force reset password in case it was corrupted or saved in plain text earlier
            if (!passwordEncoder.matches("password123", adminUser.getPassword())) {
                adminUser.setPassword(passwordEncoder.encode("password123"));
                needsUpdate = true;
                System.out.println("-> Admin password resynced.");
            }
            
            if (needsUpdate) {
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
