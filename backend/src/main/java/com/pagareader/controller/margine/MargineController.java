package com.pagareader.controller.margine;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.margine.MargineMese;
import com.pagareader.entity.margine.MargineMovimento;
import com.pagareader.repository.margine.MargineMeseRepository;
import com.pagareader.repository.margine.MargineMovimentoRepository;
import com.pagareader.service.margine.MargineExcelParserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/margine")
public class MargineController {

    private static final Logger log = LoggerFactory.getLogger(MargineController.class);

    private final MargineMeseRepository meseRepository;
    private final MargineMovimentoRepository movimentoRepository;
    private final MargineExcelParserService parserService;

    public MargineController(
            MargineMeseRepository meseRepository,
            MargineMovimentoRepository movimentoRepository,
            MargineExcelParserService parserService) {
        this.meseRepository = meseRepository;
        this.movimentoRepository = movimentoRepository;
        this.parserService = parserService;
    }

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
        if (mov.getData() == null) mov.setData(java.time.LocalDate.now());
        if (mov.getAnno() == null) mov.setAnno(mov.getData().getYear());
        if (mov.getMese() == null) mov.setMese(mov.getData().getMonthValue());
        
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
            }
            meseRepository.save(mm);
        }
    }
}
