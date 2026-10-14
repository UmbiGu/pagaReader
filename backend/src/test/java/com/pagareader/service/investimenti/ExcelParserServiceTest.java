package com.pagareader.service.investimenti;

import com.pagareader.entity.AppUser;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

public class ExcelParserServiceTest {

    private final ExcelParserService parserService = new ExcelParserService();

    @Test
    public void testParseDirectaExcelPatrimonioAndMovimenti() throws Exception {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Situazione");

        CreationHelper createHelper = workbook.getCreationHelper();
        CellStyle dateCellStyle = workbook.createCellStyle();
        dateCellStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));

        // Row 0: Title info
        Row r0 = sheet.createRow(0);
        r0.createCell(0).setCellValue("Directa SIMpA - Estratto Conto e Situazione");

        // Row 2: Patrimonio Header
        Row r2 = sheet.createRow(2);
        r2.createCell(0).setCellValue("Data");
        r2.createCell(1).setCellValue("Liquidità");
        r2.createCell(2).setCellValue("Finanziamento Long");
        r2.createCell(3).setCellValue("Garanzia Short");
        r2.createCell(4).setCellValue("Portafoglio");
        r2.createCell(5).setCellValue("Patrimonio");
        r2.createCell(6).setCellValue("Nota");

        // Row 3: Patrimonio Data (Numeric Date)
        Row r3 = sheet.createRow(3);
        Cell c0 = r3.createCell(0);
        c0.setCellValue(LocalDate.of(2024, 10, 15));
        c0.setCellStyle(dateCellStyle);
        r3.createCell(1).setCellValue(5420.50);
        r3.createCell(2).setCellValue(0.0);
        r3.createCell(3).setCellValue(0.0);
        r3.createCell(4).setCellValue(12500.00);
        r3.createCell(5).setCellValue(17920.50);
        r3.createCell(6).setCellValue("Chiusura giornaliera");

        // Row 5: Movimenti Header
        Row r5 = sheet.createRow(5);
        r5.createCell(0).setCellValue("Data");
        r5.createCell(1).setCellValue("Descrizione");
        r5.createCell(2).setCellValue("Valore");
        r5.createCell(3).setCellValue("Titolo");
        r5.createCell(4).setCellValue("ISIN");
        r5.createCell(5).setCellValue("Ticker");

        // Row 6: Movimento Data (String Date)
        Row r6 = sheet.createRow(6);
        r6.createCell(0).setCellValue("14/10/2024");
        r6.createCell(1).setCellValue("Bonifico in entrata");
        r6.createCell(2).setCellValue(1000.00);
        r6.createCell(3).setCellValue("Liquidità");
        r6.createCell(4).setCellValue("");
        r6.createCell(5).setCellValue("");

        // Row 7: Movimento Data (Numeric Date)
        Row r7 = sheet.createRow(7);
        Cell c70 = r7.createCell(0);
        c70.setCellValue(LocalDate.of(2024, 10, 13));
        c70.setCellStyle(dateCellStyle);
        r7.createCell(1).setCellValue("Acquisto");
        r7.createCell(2).setCellValue(-500.25);
        r7.createCell(3).setCellValue("Vanguard All-World");
        r7.createCell(4).setCellValue("IE00BK5BQT80");
        r7.createCell(5).setCellValue("VWCE");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        MockMultipartFile file = new MockMultipartFile("file", "directa.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", baos.toByteArray());

        java.nio.file.Files.write(java.nio.file.Path.of("target", "sample_directa.xlsx"), baos.toByteArray());

        AppUser user = new AppUser();
        user.setId(1L);

        ExcelParserService.ParseResult result = parserService.parseDirectaExcel(file, user);

        assertEquals(1, result.patrimoni.size(), "Deve estrarre 1 riga patrimonio");
        assertEquals(2, result.movimenti.size(), "Deve estrarre 2 righe movimento");

        assertEquals(17920.50, result.patrimoni.get(0).getPatrimonio(), 0.01);
        assertEquals(LocalDate.of(2024, 10, 15), result.patrimoni.get(0).getDataValuta());

        assertEquals("Bonifico in entrata", result.movimenti.get(0).getDescrizione());
        assertEquals(1000.0, result.movimenti.get(0).getValore(), 0.01);

        assertEquals("VWCE", result.movimenti.get(1).getTicker());
        assertEquals(-500.25, result.movimenti.get(1).getValore(), 0.01);
    }
}
