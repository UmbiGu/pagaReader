package com.pagareader.controller.investimenti;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import com.pagareader.entity.investimenti.PortafoglioMovimento;
import com.pagareader.repository.investimenti.PatrimonioGiornalieroRepository;
import com.pagareader.repository.investimenti.PortafoglioMovimentoRepository;
import com.pagareader.service.investimenti.ExcelParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/investimenti")
@RequiredArgsConstructor
@Slf4j
public class InvestimentiController {

    private final ExcelParserService excelParserService;
    private final PatrimonioGiornalieroRepository patrimonioRepository;
    private final PortafoglioMovimentoRepository movimentiRepository;

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

            // Incremental sync for patrimoni: append only new dates without invalidating historical data
            int patrimoniAggiunti = 0;
            if (!result.patrimoni.isEmpty()) {
                Set<LocalDate> existingDates = patrimonioRepository.findDatesByUserId(user.getId());
                Map<LocalDate, PatrimonioGiornaliero> candidatesByDate = new LinkedHashMap<>();

                for (PatrimonioGiornaliero pat : result.patrimoni) {
                    if (pat.getDataValuta() != null && !existingDates.contains(pat.getDataValuta())) {
                        candidatesByDate.put(pat.getDataValuta(), pat);
                    }
                }

                List<PatrimonioGiornaliero> newPatrimoni = new ArrayList<>(candidatesByDate.values());
                if (!newPatrimoni.isEmpty()) {
                    patrimonioRepository.saveAll(newPatrimoni);
                    patrimoniAggiunti = newPatrimoni.size();
                    log.info("Incrementally saved {} new patrimonio records for user {}", patrimoniAggiunti, user.getEmail());
                } else {
                    log.info("All {} patrimonio records in Excel already exist for user {}", result.patrimoni.size(), user.getEmail());
                }
            }

            // Incremental sync for movimenti: append only movements that do not already exist in historical data
            int movimentiAggiunti = 0;
            if (!result.movimenti.isEmpty()) {
                List<PortafoglioMovimento> existingMovimenti = movimentiRepository.findByUserIdOrderByDataValutaAsc(user.getId());
                Map<String, Integer> existingCounts = new HashMap<>();
                for (PortafoglioMovimento m : existingMovimenti) {
                    existingCounts.merge(buildMovimentoKey(m), 1, Integer::sum);
                }

                List<PortafoglioMovimento> newMovimenti = new ArrayList<>();
                for (PortafoglioMovimento m : result.movimenti) {
                    String key = buildMovimentoKey(m);
                    int count = existingCounts.getOrDefault(key, 0);
                    if (count > 0) {
                        existingCounts.put(key, count - 1); // Exists in DB, skip
                    } else {
                        newMovimenti.add(m);
                    }
                }

                if (!newMovimenti.isEmpty()) {
                    movimentiRepository.saveAll(newMovimenti);
                    movimentiAggiunti = newMovimenti.size();
                    log.info("Incrementally saved {} new movimenti for user {}", movimentiAggiunti, user.getEmail());
                } else {
                    log.info("All {} movimenti in Excel already exist for user {}", result.movimenti.size(), user.getEmail());
                }
            }

            long totalPatrimoni = patrimonioRepository.countByUserId(user.getId());
            long totalMovimenti = movimentiRepository.countByUserId(user.getId());

            String msg;
            if (patrimoniAggiunti == 0 && movimentiAggiunti == 0) {
                msg = "I dati nel file Excel risultano già completamente importati. Nessun nuovo record aggiunto.";
            } else {
                msg = String.format("Sincronizzazione completata: aggiunte %d nuove rilevazioni patrimonio e %d nuovi movimenti. Storico attivo: %d rilevazioni, %d movimenti.",
                    patrimoniAggiunti, movimentiAggiunti, totalPatrimoni, totalMovimenti);
            }

            return ResponseEntity.ok(Map.of(
                "message", msg,
                "patrimoniAggiunti", patrimoniAggiunti,
                "movimentiAggiunti", movimentiAggiunti,
                "patrimoniTotali", totalPatrimoni,
                "movimentiTotali", totalMovimenti
            ));

        } catch (Exception e) {
            log.error("Error during Excel upload processing: {}", e.getMessage(), e);
            String errorDetails = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.badRequest().body(Map.of(
                "message", "Errore durante il parsing del file Excel: " + errorDetails
            ));
        }
    }

    private String buildMovimentoKey(PortafoglioMovimento m) {
        String data = m.getDataValuta() != null ? m.getDataValuta().toString() : "";
        String desc = m.getDescrizione() != null ? m.getDescrizione().trim().toLowerCase() : "";
        long valCents = m.getValore() != null ? Math.round(m.getValore() * 100.0) : 0L;
        String isin = m.getIsin() != null ? m.getIsin().trim().toUpperCase() : "";
        String ticker = m.getTicker() != null ? m.getTicker().trim().toUpperCase() : "";
        String titolo = m.getDescrizioneTitolo() != null ? m.getDescrizioneTitolo().trim().toLowerCase() : "";
        return data + "|" + desc + "|" + valCents + "|" + isin + "|" + ticker + "|" + titolo;
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
