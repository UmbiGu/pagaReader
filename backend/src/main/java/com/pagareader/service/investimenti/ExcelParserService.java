package com.pagareader.service.investimenti;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import com.pagareader.entity.investimenti.PortafoglioMovimento;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class ExcelParserService {

    private static final Logger log = LoggerFactory.getLogger(ExcelParserService.class);

    private static final List<DateTimeFormatter> DATE_FORMATTERS = Arrays.asList(
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("d/M/yyyy"),
        DateTimeFormatter.ofPattern("dd-MM-yyyy"),
        DateTimeFormatter.ofPattern("d-M-yyyy"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd/MM/yy"),
        DateTimeFormatter.ofPattern("d/M/yy")
    );

    public ParseResult parseDirectaExcel(MultipartFile file, AppUser user) throws Exception {
        ParseResult result = new ParseResult();

        // WorkbookFactory supports both .xlsx (OOXML) and .xls (OLE2/HSSF)
        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            log.info("====== EXCEL IMPORT START: {} (Sheets count: {}) ======", file.getOriginalFilename(), workbook.getNumberOfSheets());

            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String sheetName = sheet.getSheetName();
                log.info("Scanning sheet [{}]: '{}' (Physical rows: {})", s, sheetName, sheet.getPhysicalNumberOfRows());

                parseSheet(sheet, user, result);
            }

            log.info("====== EXCEL IMPORT SUCCESS: {} patrimoni, {} movimenti parsed ======", 
                     result.patrimoni.size(), result.movimenti.size());
        }
        return result;
    }

    private void parseSheet(Sheet sheet, AppUser user, ParseResult result) {
        String sheetNameLower = normalizeText(sheet.getSheetName());

        Map<String, Integer> patrCols = new HashMap<>();
        Map<String, Integer> movCols = new HashMap<>();

        // If sheet name indicates a dedicated single-purpose sheet, pre-configure default mappings
        if (sheetNameLower.contains("moviment") || sheetNameLower.contains("estratto") || sheetNameLower.contains("operazion")) {
            movCols.put("data", 0);
            movCols.put("descrizione", 1);
            movCols.put("valore", 2);
            movCols.put("titolo", 3);
            movCols.put("isin", 4);
            movCols.put("ticker", 5);
        } else if (sheetNameLower.contains("patrimoni") || sheetNameLower.contains("liquidit") || sheetNameLower.contains("saldo")) {
            patrCols.put("data", 0);
            patrCols.put("liquidita", 1);
            patrCols.put("finanziamento", 2);
            patrCols.put("garanzia", 3);
            patrCols.put("portafoglio", 4);
            patrCols.put("patrimonio", 5);
            patrCols.put("nota", 6);
        }

        for (Row row : sheet) {
            if (row == null) continue;

            // 1. Check if row defines column mappings (supports both side-by-side and stacked headers)
            detectAndMergeHeaders(row, patrCols, movCols);

            // 2. Extract Patrimonio if columns are mapped
            if (patrCols.containsKey("data")) {
                int dateCol = patrCols.get("data");
                Cell dateCell = row.getCell(dateCol);
                LocalDate patrDate = parseCellDate(dateCell);
                if (patrDate != null) {
                    PatrimonioGiornaliero pat = parsePatrimonioRow(row, user, patrCols, patrDate);
                    if (pat != null) {
                        result.patrimoni.add(pat);
                    }
                }
            }

            // 3. Extract Movimenti if columns are mapped (supports side-by-side in parallel columns)
            if (movCols.containsKey("data")) {
                int movDateCol = movCols.get("data");
                Cell movDateCell = row.getCell(movDateCol);
                LocalDate movDate = parseCellDate(movDateCell);
                if (movDate != null) {
                    PortafoglioMovimento mov = parseMovimentoRow(row, user, movCols, movDate);
                    if (mov != null) {
                        result.movimenti.add(mov);
                    }
                }
            }
        }
    }

    private void detectAndMergeHeaders(Row row, Map<String, Integer> patrCols, Map<String, Integer> movCols) {
        Map<Integer, String> headersInRow = new HashMap<>();

        for (int c = 0; c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell == null) continue;
            // A header cell must not be a formatted numeric date
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                continue;
            }
            String text = normalizeText(getCellString(cell));
            if (!text.isEmpty()) {
                headersInRow.put(c, text);
            }
        }

        // 1. Check for Patrimonio headers in this row
        Map<String, Integer> detectedPatr = new HashMap<>();
        for (Map.Entry<Integer, String> entry : headersInRow.entrySet()) {
            int col = entry.getKey();
            String val = entry.getValue();

            if (val.equals("data") || val.startsWith("data ")) detectedPatr.put("data", col);
            else if (val.contains("liquidit") || val.contains("disponib") || val.contains("saldo")) detectedPatr.put("liquidita", col);
            else if (val.contains("finanz") || val.contains("long")) detectedPatr.put("finanziamento", col);
            else if (val.contains("garan") || val.contains("short")) detectedPatr.put("garanzia", col);
            else if (val.contains("portafogl") || val.contains("titoli")) detectedPatr.put("portafoglio", col);
            else if (val.contains("patrimon") || val.contains("totale")) detectedPatr.put("patrimonio", col);
            else if (val.contains("nota") || val.contains("note")) detectedPatr.put("nota", col);
        }

        if (detectedPatr.containsKey("data") && (detectedPatr.containsKey("liquidita") || detectedPatr.containsKey("portafoglio") || detectedPatr.containsKey("patrimonio"))) {
            int newPatrDateCol = detectedPatr.get("data");
            // If Movimenti was occupying the same date column, clear it (vertical section switch)
            if (movCols.containsKey("data") && movCols.get("data") == newPatrDateCol) {
                movCols.clear();
            }
            patrCols.clear();
            patrCols.putAll(detectedPatr);
            log.debug("Found Patrimonio headers at row {} (dateCol: {}): {}", row.getRowNum(), newPatrDateCol, patrCols);
        }

        // 2. Check for Movimenti headers in this row
        Map<String, Integer> detectedMov = new HashMap<>();
        for (Map.Entry<Integer, String> entry : headersInRow.entrySet()) {
            int col = entry.getKey();
            String val = entry.getValue();

            if (val.equals("data") || val.startsWith("data ")) detectedMov.put("data", col);
            else if (val.contains("titolo") || val.contains("denominaz") || val.contains("strumento")) detectedMov.put("titolo", col);
            else if (val.contains("descrizion") || val.contains("operazion") || val.contains("movimento")) detectedMov.put("descrizione", col);
            else if (val.contains("valore") || val.contains("importo") || val.contains("euro") || val.contains("controval")) detectedMov.put("valore", col);
            else if (val.contains("isin")) detectedMov.put("isin", col);
            else if (val.contains("ticker") || val.contains("simbolo") || val.contains("codice")) detectedMov.put("ticker", col);
            else if (val.contains("nota") || val.contains("note")) detectedMov.put("nota", col);
        }

        if (detectedMov.containsKey("data") && (detectedMov.containsKey("descrizione") || detectedMov.containsKey("valore"))) {
            int newMovDateCol = detectedMov.get("data");
            // If Patrimonio was occupying the same date column, clear it (vertical section switch)
            if (patrCols.containsKey("data") && patrCols.get("data") == newMovDateCol) {
                patrCols.clear();
            }
            movCols.clear();
            movCols.putAll(detectedMov);
            log.debug("Found Movimenti headers at row {} (dateCol: {}): {}", row.getRowNum(), newMovDateCol, movCols);
        }
    }

    private PatrimonioGiornaliero parsePatrimonioRow(Row row, AppUser user, Map<String, Integer> colMap, LocalDate date) {
        int liqCol = colMap.getOrDefault("liquidita", 1);
        int finCol = colMap.getOrDefault("finanziamento", 2);
        int garCol = colMap.getOrDefault("garanzia", 3);
        int portCol = colMap.getOrDefault("portafoglio", 4);
        int patrCol = colMap.getOrDefault("patrimonio", 5);
        int notaCol = colMap.getOrDefault("nota", 6);

        Double liq = getCellNumeric(row.getCell(liqCol));
        Double fin = finCol >= 0 ? getCellNumeric(row.getCell(finCol)) : 0.0;
        Double gar = garCol >= 0 ? getCellNumeric(row.getCell(garCol)) : 0.0;
        Double port = portCol >= 0 ? getCellNumeric(row.getCell(portCol)) : 0.0;
        Double patr = patrCol >= 0 ? getCellNumeric(row.getCell(patrCol)) : 0.0;

        if (patr == 0.0 && (liq != 0.0 || port != 0.0)) {
            patr = liq + port - fin + gar;
        }

        // Validate that this row has at least some meaningful value
        if (patr == 0.0 && liq == 0.0 && port == 0.0 && fin == 0.0 && gar == 0.0) {
            return null;
        }

        PatrimonioGiornaliero p = new PatrimonioGiornaliero();
        p.setUser(user);
        p.setDataValuta(date);
        p.setLiquidita(liq);
        p.setFinanziamentoLong(fin);
        p.setGaranziaShort(gar);
        p.setPortafoglio(port);
        p.setPatrimonio(patr);
        p.setNotaMovimento(notaCol >= 0 ? getCellString(row.getCell(notaCol)) : "");

        return p;
    }

    private PortafoglioMovimento parseMovimentoRow(Row row, AppUser user, Map<String, Integer> colMap, LocalDate date) {
        int descCol = colMap.getOrDefault("descrizione", 9);
        int valCol = colMap.getOrDefault("valore", 10);
        int titCol = colMap.getOrDefault("titolo", 11);
        int isinCol = colMap.getOrDefault("isin", 12);
        int tickCol = colMap.getOrDefault("ticker", 13);
        int notaCol = colMap.getOrDefault("nota", 14);

        String desc = descCol >= 0 ? getCellString(row.getCell(descCol)) : "";
        Double val = valCol >= 0 ? getCellNumeric(row.getCell(valCol)) : 0.0;
        String tit = titCol >= 0 ? getCellString(row.getCell(titCol)) : "";
        String isin = isinCol >= 0 ? getCellString(row.getCell(isinCol)) : "";
        String ticker = tickCol >= 0 ? getCellString(row.getCell(tickCol)) : "";
        String nota = notaCol >= 0 ? getCellString(row.getCell(notaCol)) : "";

        // Row must have a description or a non-zero value
        if (desc.isEmpty() && val == 0.0 && tit.isEmpty() && isin.isEmpty() && ticker.isEmpty()) {
            return null;
        }

        PortafoglioMovimento m = new PortafoglioMovimento();
        m.setUser(user);
        m.setDataValuta(date);
        m.setDescrizione(desc);
        m.setValore(val);
        m.setDescrizioneTitolo(tit);
        m.setIsin(isin);
        m.setTicker(ticker);
        m.setNotaMovimento(nota);

        return m;
    }

    private LocalDate parseCellDate(Cell cell) {
        if (cell == null) return null;

        if (cell.getCellType() == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(cell)) {
                try {
                    return cell.getLocalDateTimeCellValue().toLocalDate();
                } catch (Exception e) {
                    Date d = cell.getDateCellValue();
                    if (d != null) {
                        return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                    }
                }
            }
            // Check numeric serial in valid date range (approx years 2000 to 2050)
            double num = cell.getNumericCellValue();
            if (num >= 30000 && num <= 60000) {
                try {
                    Date d = DateUtil.getJavaDate(num);
                    if (d != null) {
                        return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                    }
                } catch (Exception ignored) {}
            }
        }

        String str = getCellString(cell);
        if (str == null || str.isBlank()) return null;

        // Trim away time portion if present (e.g. "15/10/2024 10:30:00" -> "15/10/2024")
        if (str.contains(" ")) {
            str = str.split(" ")[0].trim();
        }

        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(str, fmt);
            } catch (DateTimeParseException ignored) {}
        }

        return null;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        try {
            return switch (cell.getCellType()) {
                case STRING -> cell.getStringCellValue().trim();
                case NUMERIC -> {
                    if (DateUtil.isCellDateFormatted(cell)) {
                        yield cell.getLocalDateTimeCellValue().toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                    }
                    double num = cell.getNumericCellValue();
                    if (num == Math.floor(num) && !Double.isInfinite(num)) {
                        yield String.valueOf((long) num);
                    }
                    yield String.valueOf(num);
                }
                case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
                case FORMULA -> {
                    try {
                        yield cell.getStringCellValue().trim();
                    } catch (Exception e) {
                        try {
                            double num = cell.getNumericCellValue();
                            if (num == Math.floor(num)) yield String.valueOf((long) num);
                            yield String.valueOf(num);
                        } catch (Exception ex) {
                            yield "";
                        }
                    }
                }
                default -> "";
            };
        } catch (Exception e) {
            return "";
        }
    }

    private Double getCellNumeric(Cell cell) {
        if (cell == null) return 0.0;
        try {
            switch (cell.getCellType()) {
                case NUMERIC -> {
                    return cell.getNumericCellValue();
                }
                case FORMULA -> {
                    try {
                        return cell.getNumericCellValue();
                    } catch (Exception e) {
                        return parseDoubleString(cell.getStringCellValue());
                    }
                }
                case STRING -> {
                    return parseDoubleString(cell.getStringCellValue());
                }
                default -> {
                    return 0.0;
                }
            }
        } catch (Exception e) {
            return 0.0;
        }
    }

    private Double parseDoubleString(String val) {
        if (val == null || val.isBlank()) return 0.0;
        String cleaned = val.replace("€", "")
                            .replace("EUR", "")
                            .replace("\u00A0", "")
                            .replace(" ", "")
                            .trim();
        if (cleaned.isEmpty() || cleaned.equals("-")) return 0.0;

        if (cleaned.contains(".") && cleaned.contains(",")) {
            if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                cleaned = cleaned.replace(".", "").replace(",", ".");
            } else {
                cleaned = cleaned.replace(",", "");
            }
        } else if (cleaned.contains(",")) {
            cleaned = cleaned.replace(",", ".");
        }

        try {
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        return text.toLowerCase(Locale.ITALIAN)
                   .replace("à", "a")
                   .replace("è", "e")
                   .replace("é", "e")
                   .replace("ì", "i")
                   .replace("ò", "o")
                   .replace("ù", "u")
                   .replace("'", "")
                   .trim();
    }

    public static class ParseResult {
        public List<PortafoglioMovimento> movimenti = new ArrayList<>();
        public List<PatrimonioGiornaliero> patrimoni = new ArrayList<>();
    }
}
