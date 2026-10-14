package com.pagareader.controller.investimenti;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import com.pagareader.entity.investimenti.PortafoglioMovimento;
import com.pagareader.repository.investimenti.PatrimonioGiornalieroRepository;
import com.pagareader.repository.investimenti.PortafoglioMovimentoRepository;
import com.pagareader.service.investimenti.ExcelParserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/investimenti")
public class InvestimentiController {

    private static final Logger log = LoggerFactory.getLogger(InvestimentiController.class);

    private final ExcelParserService excelParserService;
    private final PatrimonioGiornalieroRepository patrimonioRepository;
    private final PortafoglioMovimentoRepository movimentiRepository;

    public InvestimentiController(
            ExcelParserService excelParserService,
            PatrimonioGiornalieroRepository patrimonioRepository,
            PortafoglioMovimentoRepository movimentiRepository) {
        this.excelParserService = excelParserService;
        this.patrimonioRepository = patrimonioRepository;
        this.movimentiRepository = movimentiRepository;
    }

    private AppUser getCurrentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file) {
        try {
            AppUser user = getCurrentUser();

            if (file == null || file.isEmpty()) {
                log.warn("Upload rejected: empty or null file received from user {}", user.getEmail());
                return ResponseEntity.badRequest().body(Map.of("message", "Nessun file selezionato o file vuoto."));
            }

            log.info("Processing Excel upload '{}' (size: {} bytes) for user {}", 
                     file.getOriginalFilename(), file.getSize(), user.getEmail());

            ExcelParserService.ParseResult result = excelParserService.parseDirectaExcel(file, user);

            if (result.patrimoni.isEmpty() && result.movimenti.isEmpty()) {
                log.warn("Excel parsing returned 0 records for file '{}'", file.getOriginalFilename());
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "Nessun dato valido riconosciuto nel file Excel. Verifica che il file contenga le colonne Data, Descrizione/Movimenti o Liquidità/Portafoglio/Patrimonio di Directa."
                ));
            }

            // Sync patrimoni if parsed
            if (!result.patrimoni.isEmpty()) {
                patrimonioRepository.deleteByUserId(user.getId());
                patrimonioRepository.saveAll(result.patrimoni);
                log.info("Persisted {} patrimonio records for user {}", result.patrimoni.size(), user.getEmail());
            }

            // Sync movimenti if parsed
            if (!result.movimenti.isEmpty()) {
                movimentiRepository.deleteByUserId(user.getId());
                movimentiRepository.saveAll(result.movimenti);
                log.info("Persisted {} movimenti records for user {}", result.movimenti.size(), user.getEmail());
            }

            String msg = String.format("Sincronizzazione completata con successo: %d rilevazioni patrimonio e %d movimenti importati.",
                result.patrimoni.size(), result.movimenti.size());

            return ResponseEntity.ok(Map.of(
                "message", msg,
                "patrimoniProcessati", result.patrimoni.size(),
                "movimentiProcessati", result.movimenti.size()
            ));

        } catch (Exception e) {
            log.error("Error during Excel upload processing: {}", e.getMessage(), e);
            String errorDetails = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.badRequest().body(Map.of(
                "message", "Errore durante il parsing del file Excel: " + errorDetails
            ));
        }
    }

    @GetMapping("/patrimonio")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PatrimonioGiornaliero>> getPatrimonioStorico() {
        AppUser user = getCurrentUser();
        List<PatrimonioGiornaliero> list = patrimonioRepository.findByUserIdOrderByDataValutaAsc(user.getId());
        log.debug("Retrieved {} patrimonio records for user {}", list.size(), user.getEmail());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/movimenti")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PortafoglioMovimento>> getMovimenti() {
        AppUser user = getCurrentUser();
        List<PortafoglioMovimento> list = movimentiRepository.findByUserIdOrderByDataValutaAsc(user.getId());
        log.debug("Retrieved {} movimenti records for user {}", list.size(), user.getEmail());
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/all")
    @Transactional
    public ResponseEntity<?> deleteAll() {
        AppUser user = getCurrentUser();
        patrimonioRepository.deleteByUserId(user.getId());
        movimentiRepository.deleteByUserId(user.getId());
        log.info("Deleted all investment data for user {}", user.getEmail());
        return ResponseEntity.ok().build();
    }
}
