package com.pagareader.config;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Component
public class DatabaseRecalculatorRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseRecalculatorRunner.class);

    private final AppUserRepository userRepository;
    private final Environment environment;
    private final String adminEmail;
    private final String adminPassword;
    private final String datasourceUrl;
    private final BCryptPasswordEncoder passwordEncoder;

    public DatabaseRecalculatorRunner(
            AppUserRepository userRepository,
            Environment environment,
            @Value("${app.admin.email}") String adminEmail,
            @Value("${app.admin.password}") String adminPassword,
            @Value("${spring.datasource.url:N/A}") String datasourceUrl) {
        this.userRepository = userRepository;
        this.environment = environment;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.datasourceUrl = datasourceUrl;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("=======================================================================");
        log.info(">>> ACTIVE PROFILES:    {}", Arrays.toString(environment.getActiveProfiles()));
        log.info(">>> DATABASE CONNECTED: {}", datasourceUrl);
        log.info("=======================================================================");
        
        // 1. Seed Default Admin User
        final AppUser adminUser;
        Optional<AppUser> existingUser = userRepository.findByEmail(adminEmail);
        if (existingUser.isPresent()) {
            adminUser = existingUser.get();
            boolean needsUpdate = false;
            
            // Ensure existing test user has ADMIN role
            if (adminUser.getRole() != AppUser.Role.ADMIN) {
                adminUser.setRole(AppUser.Role.ADMIN);
                needsUpdate = true;
            }
            // Resync password if changed
            if (!passwordEncoder.matches(adminPassword, adminUser.getPassword())) {
                adminUser.setPassword(passwordEncoder.encode(adminPassword));
                needsUpdate = true;
                log.info("-> Admin password resynced.");
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
            log.info("-> Seeded default admin user: {}", adminEmail);
        }
        
        log.info("====== STARTUP COMPLETATO CON SUCCESSO ======");
    }
}
