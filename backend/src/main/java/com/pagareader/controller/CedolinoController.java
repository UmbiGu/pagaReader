package com.pagareader.controller;

import com.pagareader.entity.Cedolino;
import com.pagareader.repository.CedolinoRepository;
import com.pagareader.service.PdfParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Sort;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/cedolini")
@CrossOrigin(origins = "http://localhost:4200") // Angular default port
public class CedolinoController {

    @Autowired
    private CedolinoRepository repository;

    @Autowired
    private PdfParserService pdfParserService;

    private static final String UPLOAD_DIR = "src/main/resources/uploads/";

    @GetMapping
    public List<Cedolino> getAllCedolini() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "anno", "mese"));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPdf(@RequestParam("file") MultipartFile file) {
        try {
            // 1. Save the file to disk for auto-recalculation feature
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            Path filePath = Paths.get(UPLOAD_DIR + file.getOriginalFilename());
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 2. Parse the PDF
            Cedolino newCedolino = pdfParserService.parsePdf(file);
            newCedolino.setFileName(file.getOriginalFilename());
            
            // 3. Check if already exists for upsert behavior
            Optional<Cedolino> existing = repository.findAll().stream()
                .filter(c -> c.getMese().equals(newCedolino.getMese()) && c.getAnno().equals(newCedolino.getAnno()))
                .findFirst();
                
            if (existing.isPresent()) {
                newCedolino.setId(existing.get().getId());
            }
            
            Cedolino saved = repository.save(newCedolino);
            return ResponseEntity.ok(saved);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Errore parsing: " + e.getMessage());
        }
    }

    @GetMapping(value = "/{id}/pdf", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getPdf(@PathVariable Long id) {
        try {
            Cedolino c = repository.findById(id).orElseThrow(() -> new RuntimeException("Cedolino non trovato"));
            if (c.getFileName() == null) {
                return ResponseEntity.notFound().build();
            }
            File file = new File(UPLOAD_DIR + c.getFileName());
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            byte[] pdfBytes = Files.readAllBytes(file.toPath());
            return ResponseEntity.ok().body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCedolino(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllCedolini() {
        repository.deleteAll();
        
        // Also clean up the physical PDF files so they don't get reparsed on next reboot
        File dir = new File(UPLOAD_DIR);
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File file : files) {
                    file.delete();
                }
            }
        }
        return ResponseEntity.ok().build();
    }
}
