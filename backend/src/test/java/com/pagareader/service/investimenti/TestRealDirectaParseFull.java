package com.pagareader.service.investimenti;

import com.pagareader.entity.AppUser;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.File;
import java.nio.file.Files;

import static org.junit.jupiter.api.Assertions.*;

public class TestRealDirectaParseFull {

    private final ExcelParserService parserService = new ExcelParserService();

    @Test
    public void testParseRealFile() throws Exception {
        File file = new File("src/main/resources/uploads/PatrimonioTotale_H5122_20261006.xlsx");
        if (!file.exists()) {
            return;
        }

        byte[] bytes = Files.readAllBytes(file.toPath());
        MockMultipartFile mf = new MockMultipartFile("file", file.getName(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);

        AppUser user = new AppUser();
        user.setId(1L);

        ExcelParserService.ParseResult res = parserService.parseDirectaExcel(mf, user);

        assertEquals(840, res.patrimoni.size(), "Deve estrarre esattamente tutte le 840 rilevazioni di patrimonio storico");
        assertEquals(42, res.movimenti.size(), "Deve estrarre esattamente tutti i 42 movimenti di portafoglio");

        // Verify first and last entries
        assertEquals(100.0, res.patrimoni.get(0).getPatrimonio(), 0.01);
        assertEquals("Conferimento con bonifico", res.movimenti.get(0).getDescrizione());
        assertEquals(100.0, res.movimenti.get(0).getValore(), 0.01);
    }
}
