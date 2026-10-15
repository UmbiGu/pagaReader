package com.pagareader.config;

import com.pagareader.entity.AppUser;
import com.pagareader.repository.AppUserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;

@Component
@Slf4j
public class DatabaseRecalculatorRunner implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final Environment environment;
    private final String adminEmail;
    private final String adminPassword;
    private final String datasourceUrl;
    private final PasswordEncoder passwordEncoder;

    public DatabaseRecalculatorRunner(
            AppUserRepository userRepository,
            Environment environment,
            @Value("${app.admin.email}") String adminEmail,
            @Value("${app.admin.password}") String adminPassword,
            @Value("${spring.datasource.url:N/A}") String datasourceUrl,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.environment = environment;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.datasourceUrl = datasourceUrl;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("=======================================================================");
        log.info(">>> ACTIVE PROFILES:    {}", Arrays.toString(environment.getActiveProfiles()));
        log.info(">>> DATABASE CONNECTED: {}", datasourceUrl);
        log.info("=======================================================================");
        
        Optional<AppUser> existingUser = userRepository.findByEmail(adminEmail);
        if (existingUser.isPresent()) {
            AppUser adminUser = existingUser.get();
            boolean needsUpdate = false;
            
            if (adminUser.getRole() != AppUser.Role.ADMIN) {
                adminUser.setRole(AppUser.Role.ADMIN);
                needsUpdate = true;
            }
            if (!passwordEncoder.matches(adminPassword, adminUser.getPassword())) {
                adminUser.setPassword(passwordEncoder.encode(adminPassword));
                needsUpdate = true;
                log.info("-> Admin password resynced.");
            }
            
            if (needsUpdate) {
                userRepository.save(adminUser);
            }
        } else {
            AppUser newUser = AppUser.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .role(AppUser.Role.ADMIN)
                    .build();
            userRepository.save(newUser);
            log.info("-> Seeded default admin user: {}", adminEmail);
        }
        
        log.info("====== STARTUP COMPLETATO CON SUCCESSO ======");
    }
}
