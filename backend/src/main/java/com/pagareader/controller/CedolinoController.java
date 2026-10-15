package com.pagareader.controller;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.Cedolino;
import com.pagareader.repository.CedolinoRepository;
import com.pagareader.service.PdfParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/cedolini")
@RequiredArgsConstructor
@Slf4j
public class CedolinoController {

    private final CedolinoRepository repository;
    private final PdfParserService pdfParserService;

    private AppUser getCurrentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Cedolino>> getAllCedolini() {
        AppUser currentUser = getCurrentUser();
        List<Cedolino> list = repository.findByUserIdOrderByPeriodo(currentUser.getId());
        log.debug("Retrieved {} payslips for user {}", list.size(), currentUser.getEmail());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> uploadPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "overwrite", defaultValue = "false") boolean overwrite) {
        try {
            AppUser currentUser = getCurrentUser();
            log.info("Processing PDF upload '{}' (size: {} bytes) for user {}", 
                     file.getOriginalFilename(), file.getSize(), currentUser.getEmail());
            
            // Parse the PDF
            Cedolino newCedolino = pdfParserService.parsePdf(file);
            newCedolino.setFileName(file.getOriginalFilename());
            newCedolino.setFileData(file.getBytes());
            newCedolino.setUser(currentUser);
            
            // Check if already exists (scoped by user, month, year, and aggiuntiva)
            List<Cedolino> existing = repository.findByUserAndPeriodo(
                currentUser.getId(),
                newCedolino.getAnno(),
                newCedolino.getMese(),
                newCedolino.getAggiuntiva()
            );
                
            if (!existing.isEmpty()) {
                if (!overwrite) {
                    log.warn("Duplicate upload blocked for user {}: {}/{}{}", 
                             currentUser.getEmail(), newCedolino.getMese(), newCedolino.getAnno(), 
                             newCedolino.getAggiuntiva() ? " (Aggiuntiva)" : "");
                    String tipoMsg = newCedolino.getAggiuntiva() 
                        ? (newCedolino.getMese() == 6 ? "14ª Mensilità " : "13ª Mensilità ") 
                        : "Busta Paga ";
                    return ResponseEntity.status(409).body(
                        "Duplicato rilevato: la " + tipoMsg + "di " + 
                        newCedolino.getMese() + "/" + newCedolino.getAnno() + 
                        " è già presente nel vault. Caricamento annullato."
                    );
                } else {
                    newCedolino.setId(existing.get(0).getId());
                    log.info("Overwriting existing payslip [ID: {}] for {}/{}{}", 
                             existing.get(0).getId(), newCedolino.getMese(), newCedolino.getAnno(), 
                             newCedolino.getAggiuntiva() ? " (Aggiuntiva)" : "");
                }
            } else {
                log.info("Creating new payslip for {}/{}{}", 
                         newCedolino.getMese(), newCedolino.getAnno(), 
                         newCedolino.getAggiuntiva() ? " (Aggiuntiva)" : "");
            }
            
            Cedolino saved = repository.save(newCedolino);
            return ResponseEntity.ok(saved);
            
        } catch (Exception e) {
            log.error("Error parsing payslip PDF '{}': {}", file.getOriginalFilename(), e.getMessage(), e);
            return ResponseEntity.badRequest().body("Errore parsing: " + e.getMessage());
        }
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> getPdf(@PathVariable Long id) {
        try {
            AppUser currentUser = getCurrentUser();
            Cedolino c = repository.findById(id).orElseThrow(() -> new RuntimeException("Cedolino non trovato"));
            
            // Security check
            if (!c.getUser().getId().equals(currentUser.getId())) {
                log.warn("Unauthorized access attempt to payslip ID {} by user {}", id, currentUser.getEmail());
                return ResponseEntity.status(403).build();
            }
            
            if (c.getFileData() == null || c.getFileData().length == 0) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok().body(c.getFileData());
        } catch (Exception e) {
            log.error("Error retrieving PDF for payslip ID {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteCedolino(@PathVariable Long id) {
        AppUser currentUser = getCurrentUser();
        Optional<Cedolino> c = repository.findById(id);
        if (c.isPresent() && c.get().getUser().getId().equals(currentUser.getId())) {
            repository.delete(c.get());
            log.info("Deleted payslip ID {} and associated items for user {}", id, currentUser.getEmail());
            return ResponseEntity.ok().build();
        }
        log.warn("Failed delete: payslip ID {} not found or unauthorized for user {}", id, currentUser.getEmail());
        return ResponseEntity.status(403).build();
    }

    @DeleteMapping("/all")
    @Transactional
    public ResponseEntity<?> deleteAllCedolini() {
        AppUser currentUser = getCurrentUser();
        List<Cedolino> userCedolini = repository.findByUserIdOrderByPeriodo(currentUser.getId());
        repository.deleteAll(userCedolini);
        log.info("Deleted all {} payslips and associated items for user {}", userCedolini.size(), currentUser.getEmail());
        return ResponseEntity.ok().build();
    }
}
