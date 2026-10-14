package com.pagareader.service;

import com.pagareader.entity.Cedolino;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.File;
import java.nio.file.Files;

public class ParseAllUploadsTest {

    private final PdfParserService parser = new PdfParserService();

    @Test
    public void testAllFiles() {
        File dir = new File("src/main/resources/uploads");
        if (!dir.exists()) return;
        File[] files = dir.listFiles((d, name) -> name.endsWith(".pdf"));
        if (files == null) return;

        System.out.println("Found " + files.length + " PDFs to inspect");
        for (File f : files) {
            try {
                byte[] bytes = Files.readAllBytes(f.toPath());
                MockMultipartFile mf = new MockMultipartFile("file", f.getName(), "application/pdf", bytes);
                Cedolino c = parser.parsePdf(mf);
                System.out.println(String.format("File: %-55s | %02d/%d | TotComp: %8.2f | TotTrat: %8.2f | Netto: %8.2f",
                        f.getName(), c.getMese(), c.getAnno(), c.getTotaleCompetenze(), c.getTotaleTrattenute(), c.getNettoMese()));
            } catch (Exception e) {
                System.err.println("Error parsing " + f.getName() + ": " + e.getMessage());
            }
        }
    }
}
