package com.pagareader.config;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DatabaseRecalculatorRunner implements CommandLineRunner {

    @Autowired
    private AppUserRepository userRepository;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) throws Exception {
        System.out.println("====== SYSTEM STARTUP: PREPARING DATABASE & USERS ======");
        
        // 1. Seed Default Admin User
        final AppUser adminUser;
        Optional<AppUser> existingUser = userRepository.findByEmail(adminEmail);
        if (existingUser.isPresent()) {
            adminUser = existingUser.get();
            boolean needsUpdate = false;
            
            // Ensure existing test user is upgraded to ADMIN if running from previous DB state
            if (adminUser.getRole() != AppUser.Role.ADMIN) {
                adminUser.setRole(AppUser.Role.ADMIN);
                needsUpdate = true;
            }
            // Force reset password in case it was corrupted or saved in plain text earlier
            if (!passwordEncoder.matches(adminPassword, adminUser.getPassword())) {
                adminUser.setPassword(passwordEncoder.encode(adminPassword));
                needsUpdate = true;
                System.out.println("-> Admin password resynced.");
            }
            
            if (needsUpdate) {
                userRepository.save(adminUser);
            }
        } else {
            AppUser newUser = new AppUser();
            newUser.setEmail(adminEmail);
            newUser.setPassword(passwordEncoder.encode(adminPassword));
            newUser.setRole(AppUser.Role.ADMIN);
            adminUser = userRepository.save(newUser);
            System.out.println("-> Seeded default admin user: " + adminEmail);
        }
        
        System.out.println("====== STARTUP COMPLETATO CON SUCCESSO ======");
    }
}
