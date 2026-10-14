package com.pagareader.service.margine;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.margine.MargineMese;
import com.pagareader.entity.margine.MargineMovimento;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class MargineExcelParserService {

    private static final Logger log = LoggerFactory.getLogger(MargineExcelParserService.class);

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

                double calculatedUscite = 0.0;
                Double parsedTotaleSpese = null;
                Double parsedRisparmiati = null;
                Double parsedEntrate = null;
                Double parsedSpeseCasa = null;

                // Scan rows starting after header
                for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    Cell c0 = row.getCell(0);
                    Cell c1 = row.getCell(1);
                    Cell c2 = row.getCell(2);
                    Cell c3 = row.getCell(3);
                    Cell c4 = row.getCell(4);
                    Cell c5 = row.getCell(5);

                    LocalDate rowDate = getCellDate(c0);
                    String desc = getCellString(c2);
                    String descLower = desc.toLowerCase();

                    // Check for Totale Spese row
                    if (descLower.contains("totale spese") || descLower.contains("tot. spese") || getCellString(c0).toLowerCase().contains("totale spese")) {
                        Double tot = getCellDouble(c3);
                        if (tot != null) parsedTotaleSpese = tot;
                        continue;
                    }

                    // Movement row if date is present and has description or expense
                    if (rowDate != null) {
                        String conto = getCellString(c1);
                        Double uscite = getCellDouble(c3);
                        if (uscite == null) uscite = 0.0;
                        String note = getCellString(c4);
                        Boolean pagato = getCellBoolean(c5);

                        MargineMovimento mov = new MargineMovimento();
                        mov.setUser(user);
                        mov.setSheetName(sheetName);
                        mov.setAnno(my.anno());
                        mov.setMese(my.mese());
                        mov.setData(rowDate);
                        mov.setConto(conto.isEmpty() ? "Altro" : conto);
                        mov.setDescrizione(desc.isEmpty() ? "Spesa" : desc);
                        mov.setUscite(Math.round(uscite * 100.0) / 100.0);
                        mov.setNote(note);
                        mov.setPagato(pagato);
                        mov.setCategoria(categorizeExpense(desc, note));

                        movimentiList.add(mov);
                        calculatedUscite += mov.getUscite();
                    }

                    // Also search anywhere in row for "risparmiati", "stipendio", "spese casa"
                    for (int col = 0; col < Math.min(12, row.getLastCellNum()); col++) {
                        String cellText = getCellString(row.getCell(col)).toLowerCase();
                        if (cellText.contains("risparmiati")) {
                            Double val = findNearbyNumber(sheet, r, col);
                            if (val != null) parsedRisparmiati = val;
                        } else if (cellText.contains("totale entrate") || cellText.contains("stipendio")) {
                            Double val = findNearbyNumber(sheet, r, col);
                            if (val != null && Math.abs(val) > 200.0) parsedEntrate = val;
                        } else if (cellText.contains("spese casa")) {
                            Double val = findNearbyNumber(sheet, r, col);
                            if (val != null) parsedSpeseCasa = val;
                        }
                    }
                }

                // Month summary calculations
                MargineMese mm = new MargineMese();
                mm.setUser(user);
                mm.setSheetName(sheetName);
                mm.setAnno(my.anno());
                mm.setMese(my.mese());

                double finalTotaleSpese = (parsedTotaleSpese != null && parsedTotaleSpese > 0.0)
                        ? parsedTotaleSpese : calculatedUscite;
                mm.setTotaleSpese(Math.round(finalTotaleSpese * 100.0) / 100.0);

                if (parsedRisparmiati != null) {
                    mm.setRisparmiati(Math.round(parsedRisparmiati * 100.0) / 100.0);
                }

                if (parsedEntrate != null) {
                    mm.setEntrate(Math.round(parsedEntrate * 100.0) / 100.0);
                    if (mm.getRisparmiati() == 0.0) {
                        mm.setRisparmiati(Math.round((mm.getEntrate() - mm.getTotaleSpese()) * 100.0) / 100.0);
                    }
                } else if (mm.getRisparmiati() != 0.0) {
                    mm.setEntrate(Math.round((mm.getTotaleSpese() + mm.getRisparmiati()) * 100.0) / 100.0);
                }

                if (parsedSpeseCasa != null) {
                    mm.setSpeseCasa(Math.round(parsedSpeseCasa * 100.0) / 100.0);
                }

                mesiList.add(mm);
            }
        }

        log.info("Margine Excel parsed successfully: {} months, {} movements", mesiList.size(), movimentiList.size());
        return new ParseResult(mesiList, movimentiList);
    }

    private Double findNearbyNumber(Sheet sheet, int r, int col) {
        // 1. Check cell ABOVE (most common in user's Excel)
        if (r > 0 && sheet.getRow(r - 1) != null) {
            Double d = getCellDouble(sheet.getRow(r - 1).getCell(col));
            if (d != null) return d;
        }
        // 2. Check 2 cells ABOVE
        if (r > 1 && sheet.getRow(r - 2) != null) {
            Double d = getCellDouble(sheet.getRow(r - 2).getCell(col));
            if (d != null) return d;
        }
        // 3. Check cell LEFT
        Row row = sheet.getRow(r);
        if (row != null && col > 0) {
            Double d = getCellDouble(row.getCell(col - 1));
            if (d != null) return d;
        }
        // 4. Check cell RIGHT
        if (row != null && col + 1 < row.getLastCellNum()) {
            Double d = getCellDouble(row.getCell(col + 1));
            if (d != null) return d;
        }
        // 5. Check cell BELOW
        if (r + 1 <= sheet.getLastRowNum() && sheet.getRow(r + 1) != null) {
            Double d = getCellDouble(sheet.getRow(r + 1).getCell(col));
            if (d != null) return d;
        }
        return null;
    }

    private String categorizeExpense(String desc, String note) {
        String text = (desc + " " + note).toLowerCase();
        if (text.contains("domiciliazion")) return "Domiciliazioni";
        if (text.contains("klarna") || text.contains("paypal")) return "Klarna / PayPal";
        if (text.contains("affitto") || text.contains("casa") || text.contains("condominio") || text.contains("energia") || text.contains("acqua") || text.contains("internet") || text.contains("deghi")) return "Casa & Utenze";
        if (text.contains("rata macchina") || text.contains("unipol") || text.contains("benzina") || text.contains("parcheggio") || text.contains("patente") || text.contains("box auto") || text.contains("garage")) return "Auto & Trasporti";
        if (text.contains("palestra") || text.contains("bombafit") || text.contains("coach") || text.contains("dentista") || text.contains("analisi") || text.contains("ecografia") || text.contains("zycortal")) return "Salute & Benessere";
        if (text.contains("volo") || text.contains("hotel") || text.contains("viaggio") || text.contains("bnb") || text.contains("tour") || text.contains("apt") || text.contains("treno") || text.contains("cracovia") || text.contains("polonia") || text.contains("armenia") || text.contains("portogallo") || text.contains("lisbona") || text.contains("corfu") || text.contains("toscana")) return "Viaggi & Vacanze";
        if (text.contains("spesa") || text.contains("sigarette") || text.contains("sephora") || text.contains("zalando") || text.contains("birkenstock") || text.contains("tatuaggio") || text.contains("regal")) return "Shopping & Svago";
        return "Spese Varie";
    }

    private MonthYear parseMonthYear(String sheetName) {
        String s = sheetName.trim().toLowerCase();
        int anno = 2026;
        if (s.contains("25")) anno = 2025;
        else if (s.contains("26")) anno = 2026;

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
                    return LocalDate.parse(s.substring(0, 10), DateTimeFormatter.ofPattern("dd/MM/yyyy"));
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
