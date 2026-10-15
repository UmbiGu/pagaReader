package com.pagareader.service.margine;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.margine.MargineMese;
import com.pagareader.entity.margine.MargineMovimento;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Slf4j
public class MargineExcelParserService {

    private static final DateTimeFormatter FORMATTER_DD_MM_YYYY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public record ParseResult(List<MargineMese> mesi, List<MargineMovimento> movimenti) {}

    public ParseResult parseWorkbook(InputStream is, AppUser user) throws Exception {
        List<MargineMese> mesiList = new ArrayList<>();
        List<MargineMovimento> movimentiList = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(is)) {
            int sheetCount = wb.getNumberOfSheets();
            log.info("Starting Margine Excel parsing: {} sheets detected", sheetCount);

            for (int s = 0; s < sheetCount; s++) {
                Sheet sheet = wb.getSheetAt(s);
                String sheetName = sheet.getSheetName().trim();

                MonthYear my = parseMonthYear(sheetName);
                if (my == null) {
                    log.debug("Skipping non-monthly sheet: '{}'", sheetName);
                    continue;
                }

                log.info("Parsing month sheet: '{}' -> Mese: {}, Anno: {}", sheetName, my.mese(), my.anno());

                // Identify Header row
                int headerRow = -1;
                for (int r = 0; r < Math.min(10, sheet.getLastRowNum() + 1); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    String c0 = getCellString(row.getCell(0)).toLowerCase();
                    String c1 = getCellString(row.getCell(1)).toLowerCase();
                    String c2 = getCellString(row.getCell(2)).toLowerCase();
                    if (c0.contains("data") && (c1.contains("conto") || c2.contains("descrizione"))) {
                        headerRow = r;
                        break;
                    }
                }

                if (headerRow == -1) {
                    log.warn("Header not found in sheet '{}', skipping", sheetName);
                    continue;
                }

                // Parse movements and summary
                List<MargineMovimento> sheetMovs = new ArrayList<>();
                Double totaleSpese = 0.0;
                Double entrate = 0.0;
                Double risparmiati = 0.0;
                Double speseCasa = 0.0;

                int lastRow = sheet.getLastRowNum();
                for (int r = headerRow + 1; r <= lastRow; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    Cell cell0 = row.getCell(0);
                    Cell cell1 = row.getCell(1);
                    Cell cell2 = row.getCell(2);
                    Cell cell3 = row.getCell(3);

                    String text0 = getCellString(cell0);
                    String text1 = getCellString(cell1);
                    String text2 = getCellString(cell2);

                    // Check for Totale Spese row
                    if (text0.toLowerCase().contains("totale spese") ||
                        text1.toLowerCase().contains("totale spese") ||
                        text2.toLowerCase().contains("totale spese")) {
                        Double val = getCellDouble(row.getCell(3));
                        if (val == null) val = getCellDouble(row.getCell(2));
                        if (val != null) totaleSpese = Math.abs(val);
                        continue;
                    }

                    // Check for Summary labels in right columns or footer
                    for (int c = 0; c < row.getLastCellNum(); c++) {
                        String txt = getCellString(row.getCell(c)).toLowerCase();
                        if (txt.contains("risparmiat")) {
                            Double val = getCellDouble(row.getCell(c));
                            if (val == null && c > 0) val = getCellDouble(row.getCell(c - 1));
                            if (val == null && c + 1 < row.getLastCellNum()) val = getCellDouble(row.getCell(c + 1));
                            if (val != null) risparmiati = val;
                        } else if (txt.contains("stipendio") || txt.contains("entrate") || txt.contains("totale entrate")) {
                            Double val = getCellDouble(row.getCell(c));
                            if (val == null && c > 0) val = getCellDouble(row.getCell(c - 1));
                            if (val == null && c + 1 < row.getLastCellNum()) val = getCellDouble(row.getCell(c + 1));
                            if (val != null && val > 0) entrate = val;
                        } else if (txt.contains("spese casa")) {
                            Double val = getCellDouble(row.getCell(c));
                            if (val == null && c + 1 < row.getLastCellNum()) val = getCellDouble(row.getCell(c + 1));
                            if (val != null) speseCasa = val;
                        }
                    }

                    // Movement row: must have either a valid date or a description
                    LocalDate data = getCellDate(cell0);
                    String conto = text1.trim();
                    String desc = text2.trim();
                    Double uscite = getCellDouble(cell3);

                    if (desc.isEmpty() && !text1.isEmpty() && uscite != null) {
                        desc = text1;
                        conto = "isybank";
                    }

                    if (desc.isEmpty() || uscite == null || uscite == 0.0) {
                        continue;
                    }

                    // Note & Pagato columns (standard: col 4 = Note, col 5 = Pagato)
                    String note = getCellString(row.getCell(4));
                    Boolean pagato = getCellBoolean(row.getCell(5));

                    // Category inference
                    String categoria = inferCategory(desc, note);

                    MargineMovimento mov = MargineMovimento.builder()
                            .user(user)
                            .sheetName(sheetName)
                            .anno(my.anno())
                            .mese(my.mese())
                            .data(data != null ? data : LocalDate.of(my.anno(), my.mese(), 1))
                            .conto(conto.isEmpty() ? "isybank" : conto)
                            .descrizione(desc)
                            .uscite(Math.abs(uscite))
                            .note(note)
                            .pagato(pagato != null ? pagato : true)
                            .categoria(categoria)
                            .build();

                    sheetMovs.add(mov);
                }

                // If totaleSpese not explicitly in sheet, sum movements
                if (totaleSpese == 0.0 && !sheetMovs.isEmpty()) {
                    totaleSpese = sheetMovs.stream().mapToDouble(MargineMovimento::getUscite).sum();
                }

                // If risparmiati not parsed, derive from entrate - totaleSpese
                if (risparmiati == 0.0 && entrate > 0.0) {
                    risparmiati = entrate - totaleSpese;
                }

                MargineMese mm = MargineMese.builder()
                        .user(user)
                        .sheetName(sheetName)
                        .anno(my.anno())
                        .mese(my.mese())
                        .totaleSpese(Math.round(totaleSpese * 100.0) / 100.0)
                        .entrate(Math.round(entrate * 100.0) / 100.0)
                        .risparmiati(Math.round(risparmiati * 100.0) / 100.0)
                        .speseCasa(Math.round(speseCasa * 100.0) / 100.0)
                        .build();

                mesiList.add(mm);
                movimentiList.addAll(sheetMovs);
            }

            log.info("Margine Excel parsed successfully: {} months, {} movements", mesiList.size(), movimentiList.size());
        }

        return new ParseResult(mesiList, movimentiList);
    }

    private String inferCategory(String desc, String note) {
        String s = (desc + " " + note).toLowerCase();
        if (s.contains("rata macchina") || s.contains("iliad") || s.contains("unipol") || s.contains("domiciliazion") || s.contains("ricarica") || s.contains("icloud") || s.contains("palestra")) {
            return "Domiciliazioni";
        }
        if (s.contains("affitto") || s.contains("bollett") || s.contains("luce") || s.contains("gas") || s.contains("energia") || s.contains("condominio") || s.contains("casa") || s.contains("deghi") || s.contains("brico")) {
            return "Casa & Utenze";
        }
        if (s.contains("benzina") || s.contains("pedaggio") || s.contains("parcheggio") || s.contains("treno") || s.contains("tagliando") || s.contains("gomme") || s.contains("telepass")) {
            return "Auto & Trasporti";
        }
        if (s.contains("dentista") || s.contains("analisi") || s.contains("visita") || s.contains("farmacia") || s.contains("medico") || s.contains("terapia") || s.contains("salute") || s.contains("coach") || s.contains("bombafit") || s.contains("zycortal")) {
            return "Salute & Benessere";
        }
        if (s.contains("volo") || s.contains("hotel") || s.contains("viaggio") || s.contains("vacanz") || s.contains("airbnb") || s.contains("bnb") || s.contains("tour") || s.contains("lisbona") || s.contains("polonia") || s.contains("armenia") || s.contains("corfu") || s.contains("orvieto")) {
            return "Viaggi & Vacanze";
        }
        if (s.contains("klarna") || s.contains("paypal")) {
            return "Klarna / PayPal";
        }
        if (s.contains("regal") || s.contains("sephora") || s.contains("zalando") || s.contains("concerto") || s.contains("cena") || s.contains("pranzo") || s.contains("aperitivo") || s.contains("birkenstock")) {
            return "Shopping & Svago";
        }
        return "Spese Varie";
    }

    private MonthYear parseMonthYear(String sheetName) {
        String s = sheetName.trim().toLowerCase();
        Integer anno = 2026; // Default to 2026

        if (s.contains("25")) anno = 2025;
        else if (s.contains("26")) anno = 2026;
        else if (s.contains("2025")) anno = 2025;
        else if (s.contains("2026")) anno = 2026;

        Integer mese = null;
        if (s.startsWith("gen")) mese = 1;
        else if (s.startsWith("feb")) mese = 2;
        else if (s.startsWith("mar")) mese = 3;
        else if (s.startsWith("apr")) mese = 4;
        else if (s.startsWith("mag")) mese = 5;
        else if (s.startsWith("giu")) mese = 6;
        else if (s.startsWith("lug")) mese = 7;
        else if (s.startsWith("ago")) mese = 8;
        else if (s.startsWith("set")) mese = 9;
        else if (s.startsWith("ott")) mese = 10;
        else if (s.startsWith("nov")) mese = 11;
        else if (s.startsWith("dic")) mese = 12;

        if (mese == null) return null;
        return new MonthYear(mese, anno, sheetName);
    }

    private record MonthYear(Integer mese, Integer anno, String nome) {}

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        try {
            return switch (cell.getCellType()) {
                case STRING -> cell.getStringCellValue().trim();
                case NUMERIC -> {
                    if (DateUtil.isCellDateFormatted(cell)) {
                        yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                    }
                    double num = cell.getNumericCellValue();
                    if (num == Math.floor(num)) yield String.valueOf((long) num);
                    yield String.valueOf(num);
                }
                case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
                case FORMULA -> {
                    try {
                        double n = cell.getNumericCellValue();
                        if (n == Math.floor(n)) yield String.valueOf((long) n);
                        yield String.valueOf(n);
                    } catch (Exception e) {
                        try {
                            yield cell.getStringCellValue().trim();
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

    private Double getCellDouble(Cell cell) {
        if (cell == null) return null;
        try {
            return switch (cell.getCellType()) {
                case NUMERIC -> cell.getNumericCellValue();
                case FORMULA -> {
                    try {
                        yield cell.getNumericCellValue();
                    } catch (Exception e) {
                        yield null;
                    }
                }
                case STRING -> {
                    String str = cell.getStringCellValue().trim()
                            .replace("€", "")
                            .replace(" ", "")
                            .replace(".", "")
                            .replace(",", ".");
                    try {
                        yield Double.parseDouble(str);
                    } catch (Exception e) {
                        yield null;
                    }
                }
                default -> null;
            };
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDate getCellDate(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            } else if (cell.getCellType() == CellType.STRING) {
                String s = cell.getStringCellValue().trim();
                if (s.matches("^\\d{4}-\\d{2}-\\d{2}.*")) {
                    return LocalDate.parse(s.substring(0, 10));
                } else if (s.matches("^\\d{2}/\\d{2}/\\d{4}.*")) {
                    return LocalDate.parse(s.substring(0, 10), FORMATTER_DD_MM_YYYY);
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private Boolean getCellBoolean(Cell cell) {
        if (cell == null) return true;
        try {
            return switch (cell.getCellType()) {
                case BOOLEAN -> cell.getBooleanCellValue();
                case FORMULA -> {
                    try {
                        yield cell.getBooleanCellValue();
                    } catch (Exception e) {
                        yield true;
                    }
                }
                case STRING -> {
                    String s = cell.getStringCellValue().trim().toLowerCase();
                    if (s.equals("false") || s.equals("0") || s.equals("no") || s.equals("❌")) yield false;
                    yield true;
                }
                case NUMERIC -> cell.getNumericCellValue() != 0;
                default -> true;
            };
        } catch (Exception e) {
            return true;
        }
    }
}
