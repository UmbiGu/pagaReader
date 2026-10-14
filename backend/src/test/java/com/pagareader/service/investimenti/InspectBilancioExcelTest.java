package com.pagareader.service.investimenti;

import org.apache.poi.ss.usermodel.*;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileInputStream;

public class InspectBilancioExcelTest {

    @Test
    public void inspectBilancio() throws Exception {
        File file = new File("src/main/resources/uploads/Copia di Bilancio 2025-2026.xlsx");
        if (!file.exists()) {
            System.out.println("FILE NOT FOUND: " + file.getAbsolutePath());
            return;
        }

        try (FileInputStream fis = new FileInputStream(file); Workbook wb = WorkbookFactory.create(fis)) {
            System.out.println("====== INSPECTING BILANCIO: " + file.getName() + " ======");
            System.out.println("Total sheets: " + wb.getNumberOfSheets());

            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                System.out.println("\n-----------------------------------------------------------");
                System.out.println("SHEET [" + s + "]: '" + sheet.getSheetName() + "' (physical rows: " + sheet.getPhysicalNumberOfRows() + ")");
                System.out.println("-----------------------------------------------------------");

                int maxRows = Math.min(30, sheet.getLastRowNum() + 1);
                for (int r = 0; r < maxRows; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;

                    StringBuilder sb = new StringBuilder();
                    sb.append(String.format("R%2d: ", r));
                    for (int c = 0; c < Math.min(15, row.getLastCellNum()); c++) {
                        Cell cell = row.getCell(c);
                        if (cell == null) continue;
                        String val = switch (cell.getCellType()) {
                            case STRING -> cell.getStringCellValue().trim();
                            case NUMERIC -> {
                                if (DateUtil.isCellDateFormatted(cell)) {
                                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                                }
                                double num = cell.getNumericCellValue();
                                if (num == Math.floor(num)) yield String.valueOf((long) num);
                                yield String.format("%.2f", num);
                            }
                            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
                            case FORMULA -> {
                                try {
                                    yield String.format("=%.2f", cell.getNumericCellValue());
                                } catch (Exception e) {
                                    yield "=" + cell.getCellFormula();
                                }
                            }
                            default -> "";
                        };
                        if (!val.isEmpty()) {
                            sb.append("[c").append(c).append(":").append(val).append("] ");
                        }
                    }
                    if (sb.length() > 6) {
                        System.out.println(sb.toString());
                    }
                }
            }
        }
    }
}
