package com.pagareader.service.investimenti;

import com.pagareader.entity.AppUser;
import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import com.pagareader.entity.investimenti.PortafoglioMovimento;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExcelParserService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public ParseResult parseDirectaExcel(MultipartFile file, AppUser user) throws Exception {
        ParseResult result = new ParseResult();

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            // Assume data is in the first sheet
            Sheet sheet = workbook.getSheetAt(0);

            boolean inMovimentiSection = false;
            boolean inPatrimonioSection = false;

            for (Row row : sheet) {
                if (row == null) continue;

                // Identify sections by looking at the first cell
                String firstCell = getCellStringValue(row.getCell(0));

                if (firstCell.equalsIgnoreCase("Data") && row.getCell(1) != null && getCellStringValue(row.getCell(1)).equalsIgnoreCase("Descrizione")) {
                    inMovimentiSection = true;
                    inPatrimonioSection = false;
                    continue;
                } else if (firstCell.equalsIgnoreCase("Data") && row.getCell(1) != null && getCellStringValue(row.getCell(1)).equalsIgnoreCase("Liquidità")) {
                    inMovimentiSection = false;
                    inPatrimonioSection = true;
                    continue;
                }

                if (inMovimentiSection) {
                    PortafoglioMovimento mov = parseMovimentoRow(row, user);
                    if (mov != null) {
                        result.movimenti.add(mov);
                    }
                } else if (inPatrimonioSection) {
                    PatrimonioGiornaliero pat = parsePatrimonioRow(row, user);
                    if (pat != null) {
                        result.patrimoni.add(pat);
                    }
                }
            }
        }
        return result;
    }

    private PortafoglioMovimento parseMovimentoRow(Row row, AppUser user) {
        String dataStr = getCellStringValue(row.getCell(0));
        LocalDate dataValuta = parseDate(dataStr);
        if (dataValuta == null) return null; // Skip invalid or empty rows

        PortafoglioMovimento mov = new PortafoglioMovimento();
        mov.setUser(user);
        mov.setDataValuta(dataValuta);
        mov.setDescrizione(getCellStringValue(row.getCell(1)));
        mov.setValore(getCellNumericValue(row.getCell(2)));
        mov.setDescrizioneTitolo(getCellStringValue(row.getCell(3)));
        mov.setIsin(getCellStringValue(row.getCell(4)));
        mov.setTicker(getCellStringValue(row.getCell(5)));

        return mov;
    }

    private PatrimonioGiornaliero parsePatrimonioRow(Row row, AppUser user) {
        String dataStr = getCellStringValue(row.getCell(0));
        LocalDate dataValuta = parseDate(dataStr);
        if (dataValuta == null) return null;

        PatrimonioGiornaliero pat = new PatrimonioGiornaliero();
        pat.setUser(user);
        pat.setDataValuta(dataValuta);
        pat.setLiquidita(getCellNumericValue(row.getCell(1)));
        pat.setFinanziamentoLong(getCellNumericValue(row.getCell(2)));
        pat.setGaranziaShort(getCellNumericValue(row.getCell(3)));
        pat.setPortafoglio(getCellNumericValue(row.getCell(4)));
        pat.setPatrimonio(getCellNumericValue(row.getCell(5)));
        pat.setNotaMovimento(getCellStringValue(row.getCell(6)));

        return pat;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            default -> "";
        };
    }

    private Double getCellNumericValue(Cell cell) {
        if (cell == null) return 0.0;
        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                String val = cell.getStringCellValue().trim();
                // Handling Italian formats e.g. -0,89 or 100,05
                val = val.replace(".", "").replace(",", ".");
                try {
                    return Double.parseDouble(val);
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            default:
                return 0.0;
        }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return LocalDate.parse(dateStr.trim(), DATE_FORMATTER);
        } catch (DateTimeParseException e) {
            return null; // Ignore header rows or malformed text
        }
    }

    public static class ParseResult {
        public List<PortafoglioMovimento> movimenti = new ArrayList<>();
        public List<PatrimonioGiornaliero> patrimoni = new ArrayList<>();
    }
}
