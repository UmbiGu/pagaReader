package com.pagareader.controller.margine;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.margine.MargineMese;
import com.pagareader.entity.margine.MargineMovimento;
import com.pagareader.repository.margine.MargineMeseRepository;
import com.pagareader.repository.margine.MargineMovimentoRepository;
import com.pagareader.service.margine.MargineExcelParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/margine")
@RequiredArgsConstructor
@Slf4j
public class MargineController {

    private final MargineMeseRepository meseRepository;
    private final MargineMovimentoRepository movimentoRepository;
    private final MargineExcelParserService parserService;

    private static final String[] NOMI_MESI = {
        "", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    };

    private AppUser getCurrentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file) {
        try {
            AppUser user = getCurrentUser();
            log.info("Processing Margine Excel upload '{}' for user {}", file.getOriginalFilename(), user.getEmail());

            MargineExcelParserService.ParseResult result = parserService.parseWorkbook(file.getInputStream(), user);

            // Wipe existing Margine data for this user to perform a clean sync
            movimentoRepository.deleteByUserId(user.getId());
            meseRepository.deleteByUserId(user.getId());

            List<MargineMese> savedMesi = meseRepository.saveAll(result.mesi());
            List<MargineMovimento> savedMovimenti = movimentoRepository.saveAll(result.movimenti());

            log.info("Margine Excel imported successfully: {} months, {} movements", savedMesi.size(), savedMovimenti.size());

            return ResponseEntity.ok(Map.of(
                    "message", "File importato con successo",
                    "mesiCount", savedMesi.size(),
                    "movimentiCount", savedMovimenti.size()
            ));
        } catch (Exception e) {
            log.error("Error parsing Margine Excel file: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("message", "Errore importazione: " + e.getMessage()));
        }
    }

    @GetMapping("/mesi")
    @Transactional(readOnly = true)
    public ResponseEntity<List<MargineMese>> getMesi() {
        AppUser user = getCurrentUser();
        List<MargineMese> list = meseRepository.findByUserIdOrderByPeriodo(user.getId());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/mesi")
    @Transactional
    public ResponseEntity<?> createMese(@RequestBody MargineMese req) {
        AppUser user = getCurrentUser();
        if (req.getAnno() == null || req.getMese() == null) {
            return ResponseEntity.badRequest().body("Anno e Mese sono obbligatori");
        }

        Optional<MargineMese> existing = meseRepository.findByUserAndPeriodo(user.getId(), req.getAnno(), req.getMese());
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("Il mese selezionato (" + req.getMese() + "/" + req.getAnno() + ") esiste già.");
        }

        String label = req.getSheetName();
        if (label == null || label.isBlank()) {
            label = (req.getMese() >= 1 && req.getMese() <= 12 ? NOMI_MESI[req.getMese()] : "Mese " + req.getMese()) + " " + req.getAnno();
        }

        double entrate = req.getEntrate() != null ? req.getEntrate() : 0.0;
        double speseCasa = req.getSpeseCasa() != null ? req.getSpeseCasa() : 0.0;
        double totSpese = 0.0;

        MargineMese mm = MargineMese.builder()
                .user(user)
                .anno(req.getAnno())
                .mese(req.getMese())
                .sheetName(label)
                .entrate(entrate)
                .speseCasa(speseCasa)
                .totaleSpese(totSpese)
                .risparmiati(entrate - totSpese)
                .note(req.getNote())
                .build();

        MargineMese saved = meseRepository.save(mm);
        log.info("Created new month {}/{} for user {}", saved.getMese(), saved.getAnno(), user.getEmail());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/mesi/{id}")
    @Transactional
    public ResponseEntity<?> updateMese(@PathVariable Long id, @RequestBody MargineMese req) {
        AppUser user = getCurrentUser();
        Optional<MargineMese> opt = meseRepository.findById(id);
        if (opt.isEmpty() || !opt.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Mese non trovato o non autorizzato");
        }

        MargineMese mm = opt.get();
        if (req.getSheetName() != null && !req.getSheetName().isBlank()) {
            mm.setSheetName(req.getSheetName());
        }
        if (req.getEntrate() != null) {
            mm.setEntrate(req.getEntrate());
        }
        if (req.getSpeseCasa() != null) {
            mm.setSpeseCasa(req.getSpeseCasa());
        }
        if (req.getNote() != null) {
            mm.setNote(req.getNote());
        }

        double totSpese = mm.getTotaleSpese() != null ? mm.getTotaleSpese() : 0.0;
        double entrate = mm.getEntrate() != null ? mm.getEntrate() : 0.0;
        mm.setRisparmiati(Math.round((entrate - totSpese) * 100.0) / 100.0);

        MargineMese updated = meseRepository.save(mm);
        log.info("Updated month ID {} ({}/{}) for user {}", id, mm.getMese(), mm.getAnno(), user.getEmail());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/mesi/{id}")
    @Transactional
    public ResponseEntity<?> deleteMese(@PathVariable Long id) {
        AppUser user = getCurrentUser();
        Optional<MargineMese> opt = meseRepository.findById(id);
        if (opt.isPresent() && opt.get().getUser().getId().equals(user.getId())) {
            MargineMese mm = opt.get();
            movimentoRepository.deleteByUserIdAndPeriodo(user.getId(), mm.getAnno(), mm.getMese());
            meseRepository.delete(mm);
            log.info("Deleted month ID {} and associated movements for user {}", id, user.getEmail());
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(403).build();
    }

    @GetMapping("/movimenti")
    @Transactional(readOnly = true)
    public ResponseEntity<List<MargineMovimento>> getMovimenti(
            @RequestParam(value = "anno", required = false) Integer anno,
            @RequestParam(value = "mese", required = false) Integer mese) {
        AppUser user = getCurrentUser();
        List<MargineMovimento> list;
        if (anno != null && mese != null) {
            list = movimentoRepository.findByUserIdAndPeriodo(user.getId(), anno, mese);
        } else {
            list = movimentoRepository.findByUserIdOrderByPeriodo(user.getId());
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping("/movimenti")
    @Transactional
    public ResponseEntity<MargineMovimento> createMovimento(@RequestBody MargineMovimento mov) {
        AppUser user = getCurrentUser();
        mov.setUser(user);
        if (mov.getData() == null) mov.setData(LocalDate.now());
        if (mov.getAnno() == null) mov.setAnno(mov.getData().getYear());
        if (mov.getMese() == null) mov.setMese(mov.getData().getMonthValue());

        // Ensure associated month exists
        Optional<MargineMese> optMese = meseRepository.findByUserAndPeriodo(user.getId(), mov.getAnno(), mov.getMese());
        if (optMese.isEmpty()) {
            String label = (mov.getMese() >= 1 && mov.getMese() <= 12 ? NOMI_MESI[mov.getMese()] : "Mese " + mov.getMese()) + " " + mov.getAnno();
            MargineMese autoMese = MargineMese.builder()
                    .user(user)
                    .anno(mov.getAnno())
                    .mese(mov.getMese())
                    .sheetName(label)
                    .entrate(0.0)
                    .totaleSpese(0.0)
                    .risparmiati(0.0)
                    .build();
            meseRepository.save(autoMese);
        }
        
        MargineMovimento saved = movimentoRepository.save(mov);
        recalculateMonthSummary(user.getId(), mov.getAnno(), mov.getMese());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/movimenti/{id}")
    @Transactional
    public ResponseEntity<?> updateMovimento(@PathVariable Long id, @RequestBody MargineMovimento movDetails) {
        AppUser user = getCurrentUser();
        Optional<MargineMovimento> opt = movimentoRepository.findById(id);
        if (opt.isEmpty() || !opt.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Movimento non trovato o non autorizzato");
        }

        MargineMovimento mov = opt.get();
        if (movDetails.getData() != null) mov.setData(movDetails.getData());
        if (movDetails.getConto() != null) mov.setConto(movDetails.getConto());
        if (movDetails.getDescrizione() != null) mov.setDescrizione(movDetails.getDescrizione());
        if (movDetails.getUscite() != null) mov.setUscite(movDetails.getUscite());
        if (movDetails.getNote() != null) mov.setNote(movDetails.getNote());
        if (movDetails.getPagato() != null) mov.setPagato(movDetails.getPagato());
        if (movDetails.getCategoria() != null) mov.setCategoria(movDetails.getCategoria());

        MargineMovimento updated = movimentoRepository.save(mov);
        recalculateMonthSummary(user.getId(), mov.getAnno(), mov.getMese());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/movimenti/{id}")
    @Transactional
    public ResponseEntity<?> deleteMovimento(@PathVariable Long id) {
        AppUser user = getCurrentUser();
        Optional<MargineMovimento> opt = movimentoRepository.findById(id);
        if (opt.isPresent() && opt.get().getUser().getId().equals(user.getId())) {
            MargineMovimento mov = opt.get();
            Integer anno = mov.getAnno();
            Integer mese = mov.getMese();
            movimentoRepository.delete(mov);
            recalculateMonthSummary(user.getId(), anno, mese);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(403).build();
    }

    @DeleteMapping("/all")
    @Transactional
    public ResponseEntity<?> deleteAll() {
        AppUser user = getCurrentUser();
        movimentoRepository.deleteByUserId(user.getId());
        meseRepository.deleteByUserId(user.getId());
        log.info("Wiped all Margine data for user {}", user.getEmail());
        return ResponseEntity.ok().build();
    }

    private void recalculateMonthSummary(Long userId, Integer anno, Integer mese) {
        List<MargineMovimento> list = movimentoRepository.findByUserIdAndPeriodo(userId, anno, mese);
        double sumUscite = list.stream().mapToDouble(m -> m.getUscite() != null ? m.getUscite() : 0.0).sum();
        sumUscite = Math.round(sumUscite * 100.0) / 100.0;

        Optional<MargineMese> optMese = meseRepository.findByUserAndPeriodo(userId, anno, mese);
        if (optMese.isPresent()) {
            MargineMese mm = optMese.get();
            mm.setTotaleSpese(sumUscite);
            if (mm.getEntrate() != null && mm.getEntrate() > 0.0) {
                mm.setRisparmiati(Math.round((mm.getEntrate() - sumUscite) * 100.0) / 100.0);
            } else {
                mm.setRisparmiati(-sumUscite);
            }
            meseRepository.save(mm);
        }
    }
}
