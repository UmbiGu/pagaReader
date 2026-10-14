package com.pagareader.service;

import com.pagareader.entity.Cedolino;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

public class PdfParserServiceTest {

    private final PdfParserService parser = new PdfParserService();

    @Test
    public void testParseTredicesimaAggiuntiva() throws Exception {
        String pdfContent = """
AA01 CALZEDONIA S.P.A.
Via Monte Baldo 20
37069 VILLAFRANCA DI VERONA (VR)
01037050422 9004540341/00 043301709/11
LC_0001702
NAPOLI HUB
Dicembre 2025 AGG.
0267582 GUGLIELMUCCI UMBERTO GGLMRT98M14G596I
14-08-1998 04-04-2024
Impiegato Livello 4
DEVELOPER
CNEL H011
PAGA BASE
1.257,46000
5-2027
CONTING.
524,22000
3'ELEMEN.
9,80000
SUP.ASS.
131,74143
E.d.r.B.
5,35000
1.928,57143
Zucchetti spa, Autorizzazione Inail n. 299 del 15/01/2009
Aut. A112850
Del 06-12-2019 Sede 15600
22-12-2025 10:38
Nr.
**Z5000013ma Mensilita' 11,47959 168,00000ORE 1.928,57
ZP9960Arrotond. mese pr. 0,17
* Z00000Contributo IVS 1.929,00 % 9,19000 177,28
* Z00073CIGS > 200 dipendenti 1.929,00 % 0,30000 5,79
* Z00135FIS D.Lgs.148/2015 >50 dip. 1.929,00 % 0,26667 5,14
Z20000Contr. base  FONTE su retr.TFR 1.928,57 % 0,55000 10,61
* Z20000Contr. base  FONTE su retr.TFR C/Ditta % 1,55000 ( ) 29,89
* F01998Ctr.prev.compl.deducib. 40,50
F06000Imponibile        Tass.aut. 1.729,75
F06010IRPEF lorda       Tass.aut. 397,84
F06020Ritenute IRPEF    Tass.aut. 397,84
Quota T.F.R. a Fondi 133,21
Imp. INAIL 1.929,00 Voce Tariffa 0722
Ferie 54,00000 154,00000 144,00000 64,00000 ORE
Ex-Fest. 9,00000 29,33333 29,00000 9,33333 ORE
596,83
1.928,57 Residuo AP Goduto Saldo Maturato
Imp. INPS
24.685,00
Imp. INAIL
24.685,00
Imp. IRPEF
22.128,33
IRPEF pagata
2.404,23
0,26
1.332,00
""";

        // Generate synthetic PDF with PDFBox
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 8);
                cs.setLeading(10f);
                cs.newLineAtOffset(50, 750);
                for (String line : pdfContent.split("\n")) {
                    cs.showText(line);
                    cs.newLine();
                }
                cs.endText();
            }
            doc.save(baos);
        }

        MockMultipartFile file = new MockMultipartFile("file", "cedolino_13ma.pdf", "application/pdf", baos.toByteArray());
        Cedolino c = parser.parsePdf(file);

        assertTrue(c.getAggiuntiva(), "Deve essere rilevata come mensilita aggiuntiva");
        assertEquals(12, c.getMese());
        assertEquals(2025, c.getAnno());

        assertEquals(1928.57, c.getTotaleCompetenze(), 0.05, "Il totale competenze della 13ma deve essere 1928.57");
        assertEquals(596.83, c.getTotaleTrattenute(), 0.05, "Il totale trattenute deve essere 596.83");
        assertEquals(1332.00, c.getNettoMese(), 0.05, "Il netto del mese deve essere 1332.00");
    }
}
