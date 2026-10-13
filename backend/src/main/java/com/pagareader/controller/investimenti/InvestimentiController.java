package com.pagareader.controller.investimenti;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import com.pagareader.entity.investimenti.PortafoglioMovimento;
import com.pagareader.repository.investimenti.PatrimonioGiornalieroRepository;
import com.pagareader.repository.investimenti.PortafoglioMovimentoRepository;
import com.pagareader.service.investimenti.ExcelParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/investimenti")
public class InvestimentiController {

    @Autowired
    private ExcelParserService excelParserService;

    @Autowired
    private PatrimonioGiornalieroRepository patrimonioRepository;

    @Autowired
    private PortafoglioMovimentoRepository movimentiRepository;

    private AppUser getCurrentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file) {
        try {
            AppUser user = getCurrentUser();
            
            // Delete old data for this user to perform a fresh sync from the Excel
            patrimonioRepository.deleteByUserId(user.getId());
            movimentiRepository.deleteByUserId(user.getId());

            ExcelParserService.ParseResult result = excelParserService.parseDirectaExcel(file, user);
            
            patrimonioRepository.saveAll(result.patrimoni);
            movimentiRepository.saveAll(result.movimenti);

            return ResponseEntity.ok(Map.of(
                "message", "Sincronizzazione completata",
                "patrimoniProcessati", result.patrimoni.size(),
                "movimentiProcessati", result.movimenti.size()
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Errore parsing Excel: " + e.getMessage());
        }
    }

    @GetMapping("/patrimonio")
    public ResponseEntity<List<PatrimonioGiornaliero>> getPatrimonioStorico() {
        AppUser user = getCurrentUser();
        return ResponseEntity.ok(patrimonioRepository.findByUserIdOrderByDataValutaAsc(user.getId()));
    }

    @GetMapping("/movimenti")
    public ResponseEntity<List<PortafoglioMovimento>> getMovimenti() {
        AppUser user = getCurrentUser();
        return ResponseEntity.ok(movimentiRepository.findByUserIdOrderByDataValutaAsc(user.getId()));
    }

    @DeleteMapping("/all")
    @Transactional
    public ResponseEntity<?> deleteAll() {
        AppUser user = getCurrentUser();
        patrimonioRepository.deleteByUserId(user.getId());
        movimentiRepository.deleteByUserId(user.getId());
        return ResponseEntity.ok().build();
    }
}
