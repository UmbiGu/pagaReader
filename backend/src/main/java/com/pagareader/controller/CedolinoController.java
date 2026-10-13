package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.Cedolino;
import com.pagareader.repository.CedolinoRepository;
import com.pagareader.service.PdfParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cedolini")
public class CedolinoController {

    @Autowired
    private CedolinoRepository repository;

    @Autowired
    private PdfParserService pdfParserService;

    private AppUser getCurrentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<Cedolino> getAllCedolini() {
        AppUser currentUser = getCurrentUser();
        return repository.findAll().stream()
                .filter(c -> c.getUser().getId().equals(currentUser.getId()))
                .sorted(Comparator.comparing(Cedolino::getAnno).thenComparing(Cedolino::getMese))
                .collect(Collectors.toList());
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPdf(@RequestParam("file") MultipartFile file) {
        try {
            AppUser currentUser = getCurrentUser();
            
            // Parse the PDF
            Cedolino newCedolino = pdfParserService.parsePdf(file);
            newCedolino.setFileName(file.getOriginalFilename());
            newCedolino.setFileData(file.getBytes()); // Save raw bytes to database BLOB
            newCedolino.setUser(currentUser);
            
            // Check if already exists for upsert behavior (scoped by user)
            Optional<Cedolino> existing = repository.findAll().stream()
                .filter(c -> c.getMese().equals(newCedolino.getMese()) 
                          && c.getAnno().equals(newCedolino.getAnno())
                          && c.getUser().getId().equals(currentUser.getId()))
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
            AppUser currentUser = getCurrentUser();
            Cedolino c = repository.findById(id).orElseThrow(() -> new RuntimeException("Cedolino non trovato"));
            
            // Security check
            if (!c.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).build();
            }
            
            if (c.getFileData() == null || c.getFileData().length == 0) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok().body(c.getFileData());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCedolino(@PathVariable Long id) {
        AppUser currentUser = getCurrentUser();
        Optional<Cedolino> c = repository.findById(id);
        if (c.isPresent() && c.get().getUser().getId().equals(currentUser.getId())) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(403).build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllCedolini() {
        AppUser currentUser = getCurrentUser();
        
        List<Cedolino> userCedolini = repository.findAll().stream()
                .filter(c -> c.getUser().getId().equals(currentUser.getId()))
                .collect(Collectors.toList());
                
        repository.deleteAll(userCedolini);
        // Physical files are no longer needed to be deleted since they are cascade deleted with the entity
        
        return ResponseEntity.ok().build();
    }
}
