package com.pagareader.config;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.Cedolino;
import com.pagareader.repository.AppUserRepository;
import com.pagareader.repository.CedolinoRepository;
import com.pagareader.service.PdfParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.util.Optional;

@Component
public class DatabaseRecalculatorRunner implements CommandLineRunner {

    @Autowired
    private CedolinoRepository repository;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private PdfParserService pdfParserService;

    private static final String UPLOAD_DIR = "src/main/resources/uploads/";
    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) throws Exception {
        System.out.println("====== SYSTEM STARTUP: PREPARING DATABASE & USERS ======");
        
        // 1. Seed Default Admin User
        final AppUser adminUser;
        Optional<AppUser> existingUser = userRepository.findByEmail("test@pagareader.com");
        if (existingUser.isPresent()) {
            adminUser = existingUser.get();
        } else {
            AppUser newUser = new AppUser();
            newUser.setEmail("test@pagareader.com");
            newUser.setPassword(passwordEncoder.encode("password123"));
            adminUser = userRepository.save(newUser);
            System.out.println("-> Seeded default user: test@pagareader.com");
        }

        // 2. Parse existing PDFs
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists() || !dir.isDirectory()) {
            System.out.println("Nessuna cartella uploads trovata. Ricalcolo bypassato.");
            return;
        }

        File[] pdfFiles = dir.listFiles((d, name) -> name.toLowerCase().endsWith(".pdf"));
        if (pdfFiles == null || pdfFiles.length == 0) {
            System.out.println("Nessun PDF salvato. Database pronto.");
            return;
        }

        System.out.println("Trovati " + pdfFiles.length + " file PDF. Avvio parsing in corso...");

        for (File pdfFile : pdfFiles) {
            try {
                byte[] content = Files.readAllBytes(pdfFile.toPath());
                MockMultipartFile multipartFile = new MockMultipartFile("file", pdfFile.getName(), "application/pdf", content);
                
                Cedolino parsed = pdfParserService.parsePdf(multipartFile);
                parsed.setFileName(pdfFile.getName());
                
                // IMPORTANT: Associate the parsed payslip with the user
                parsed.setUser(adminUser);

                Optional<Cedolino> existing = repository.findAll().stream()
                    .filter(c -> c.getMese().equals(parsed.getMese()) && c.getAnno().equals(parsed.getAnno()) && c.getUser().getId().equals(adminUser.getId()))
                    .findFirst();
                    
                if (existing.isPresent()) {
                    parsed.setId(existing.get().getId());
                }
                
                repository.save(parsed);
                System.out.println("-> Ricalcolato e salvato: " + parsed.getMese() + "/" + parsed.getAnno());

            } catch (Exception e) {
                System.err.println("X Errore durante il ricalcolo del file " + pdfFile.getName() + ": " + e.getMessage());
            }
        }
        
        System.out.println("====== STARTUP COMPLETATO CON SUCCESSO ======");
    }
}
