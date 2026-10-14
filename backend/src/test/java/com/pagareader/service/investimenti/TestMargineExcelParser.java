package com.pagareader.service.investimenti;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.margine.MargineMese;
import com.pagareader.entity.margine.MargineMovimento;
import com.pagareader.service.margine.MargineExcelParserService;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileInputStream;

import static org.junit.jupiter.api.Assertions.*;

public class TestMargineExcelParser {

    @Test
    public void testParseBilancio() throws Exception {
        File file = new File("src/main/resources/uploads/Copia di Bilancio 2025-2026.xlsx");
        assertTrue(file.exists(), "Bilancio file should exist in uploads");

        AppUser mockUser = new AppUser();
        mockUser.setId(1L);
        mockUser.setEmail("test@pagareader.com");

        MargineExcelParserService service = new MargineExcelParserService();
        try (FileInputStream fis = new FileInputStream(file)) {
            MargineExcelParserService.ParseResult result = service.parseWorkbook(fis, mockUser);
            assertNotNull(result);
            assertFalse(result.mesi().isEmpty(), "Should parse at least one month");
            assertFalse(result.movimenti().isEmpty(), "Should parse movements");

            System.out.println("PARSED MONTHS: " + result.mesi().size());
            System.out.println("PARSED MOVEMENTS: " + result.movimenti().size());

            for (MargineMese m : result.mesi()) {
                System.out.printf("MESE: %s (%d/%d) | Spese: %.2f | Entrate: %.2f | Risparmiati: %.2f%n",
                        m.getSheetName(), m.getMese(), m.getAnno(), m.getTotaleSpese(), m.getEntrate(), m.getRisparmiati());
            }

            // Verify first few movements
            for (int i = 0; i < Math.min(5, result.movimenti().size()); i++) {
                MargineMovimento mov = result.movimenti().get(i);
                System.out.printf("MOV %d: [%s] %s - %s: %.2f € (%s) [Pagato: %b]%n",
                        i, mov.getData(), mov.getConto(), mov.getDescrizione(), mov.getUscite(), mov.getCategoria(), mov.getPagato());
            }
        }
    }
}
