package com.pagareader.service;

import com.pagareader.entity.Cedolino;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PdfParserService {

    public Cedolino parsePdf(MultipartFile file) throws IOException {
        String text;
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            text = stripper.getText(document);
        }

        Cedolino cedolino = new Cedolino();
        
        // 1. Month and Year (e.g. Settembre 2026)
        Pattern datePattern = Pattern.compile("(?i)(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\\s+(20[2-9]\\d)");
        Matcher mDate = datePattern.matcher(text);
        if (mDate.find()) {
            cedolino.setMese(monthStringToInt(mDate.group(1)));
            cedolino.setAnno(Integer.parseInt(mDate.group(2)));
        } else {
            cedolino.setMese(1);
            cedolino.setAnno(2025);
        }

        // 2. Competenze Fisse (Paga base, ecc.)
        // Nei PDF Zucchetti le voci "PAGA BASE", "CONTING." appaiono su una riga e il valore esatto in quella successiva
        cedolino.setPagaBase(extractValueFromNextLine(text, "^PAGA BASE.*"));
        cedolino.setContingenza(extractValueFromNextLine(text, "^CONTING\\..*"));
        cedolino.setSuperminimo(extractValueFromNextLine(text, "^SUP\\.ASS\\..*"));
        cedolino.setTerzoElemento(extractValueFromNextLine(text, "^3'ELEMEN\\..*"));
        cedolino.setStraordinarioForfetizzato(extractValueFromNextLine(text, "^Str\\.Forf\\..*"));
        cedolino.setEdr(extractValueFromNextLine(text, "^E\\.d\\.r\\..*"));

        // 2.5 Totali Mensili (Totale Competenze, Totale Trattenute)
        // Nel layout Zucchetti i totali vengono stampati spesso subito prima della riga "Residuo AP Goduto Saldo Maturato"
        // in due righe separate: prima le trattenute, poi le competenze.
        // Esempio:
        // 1.195,56
        // 4.418,37 Residuo AP
        Matcher mTot = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s*\\n\\s*([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s+Residuo AP", Pattern.CASE_INSENSITIVE).matcher(text);
        if (mTot.find()) {
            cedolino.setTotaleTrattenute(parseItalianNumber(mTot.group(1)));
            cedolino.setTotaleCompetenze(parseItalianNumber(mTot.group(2)));
        }

        // 3. Imponibili del MESE e IRPEF netta (Sulla stessa riga)
        // Evitiamo i progressivi di fine pagina (Imp. INPS, Imp. IRPEF) puntando alle voci esplicite mensili.
        // Cerca: "* Z00000 Contributo IVS 2.154,00 %9,19000 197,96" -> 2.154,00
        cedolino.setImponibileInps(extractValue(text, "Contributo IVS\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        // Cerca: "F02000 Imponibile IRPEF 1.798,16"
        cedolino.setImponibileIrpef(extractValue(text, "Imponibile IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        // Cerca: "F03020 Ritenute IRPEF 152,25"
        cedolino.setIrpefNetta(extractValue(text, "Ritenute IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        
        // 4. Ferie, Ex-Fest e ROL
        // L'ultima colonna prima della dicitura "ORE" rappresenta sempre il Saldo Attuale
        String[] allLines = text.split("\n");
        for (String line : allLines) {
            String lowerLine = line.trim().toLowerCase();
            if (lowerLine.startsWith("ferie")) {
                Matcher m = Pattern.compile("([\\d\\.,]+)\\s+ORE", Pattern.CASE_INSENSITIVE).matcher(line);
                if (m.find()) cedolino.setFerieSaldo(parseItalianNumber(m.group(1)));
            } else if (lowerLine.startsWith("ex-fest")) {
                Matcher m = Pattern.compile("([\\d\\.,]+)\\s+ORE", Pattern.CASE_INSENSITIVE).matcher(line);
                if (m.find()) cedolino.setExFestSaldo(parseItalianNumber(m.group(1)));
            } else if (lowerLine.startsWith("r.o.l.")) {
                Matcher m = Pattern.compile("([\\d\\.,]+)\\s+ORE", Pattern.CASE_INSENSITIVE).matcher(line);
                if (m.find()) cedolino.setRolSaldo(parseItalianNumber(m.group(1)));
            } else if (lowerLine.contains("fonte su retr.tfr")) {
                // Estrazione Fondo Pensione Complementare FONTE
                Matcher m = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})$").matcher(line.trim());
                if (m.find()) {
                    if (lowerLine.contains("c/ditta")) {
                        cedolino.setFonteAzienda(parseItalianNumber(m.group(1)));
                    } else {
                        cedolino.setFonteDipendente(parseItalianNumber(m.group(1)));
                    }
                }
            }
        }
        
        // 5. Netto Mese
        // Isoliamo il Netto come l'ultimo numero a due decimali in fondo al documento
        Double netto = 0.0;
        String[] lines = text.split("\n");
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            // Match exact Italian currency format: e.g. 3.223,00 or 1.697,00
            if (line.matches("^\\d{1,3}(\\.\\d{3})*,\\d{2}$")) {
                double val = parseItalianNumber(line);
                if (val > 100) { // Ignore small rounding numbers like 0,19
                    netto = val;
                    break;
                }
            }
            // Sometimes it's appended with a trailing char or currency sign
            else if (line.matches("^\\d{1,3}(\\.\\d{3})*,\\d{2}.*")) {
                Matcher m = Pattern.compile("^(\\d{1,3}(\\.\\d{3})*,\\d{2})").matcher(line);
                if (m.find()) {
                    double val = parseItalianNumber(m.group(1));
                    if (val > 100) {
                        netto = val;
                        break;
                    }
                }
            }
        }
        
        cedolino.setNettoMese(netto);

        return cedolino;
    }

    private Double extractValueFromNextLine(String fullText, String keywordRegex) {
        String[] lines = fullText.split("\n");
        for (int i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim().matches("(?i)" + keywordRegex)) {
                String nextLine = lines[i+1].trim();
                // Extract just the number starting the line
                Matcher m = Pattern.compile("^([\\d\\.,]+)").matcher(nextLine);
                if (m.find()) {
                    return parseItalianNumber(m.group(1));
                }
            }
        }
        return 0.0;
    }

    private Double extractValue(String text, String regex) {
        Matcher matcher = Pattern.compile(regex, Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return parseItalianNumber(matcher.group(1));
        }
        return 0.0;
    }

    private Double parseItalianNumber(String textVal) {
        if (textVal == null || textVal.isEmpty()) return 0.0;
        String cleanVal = textVal.replaceAll("[^\\d\\.,\\-]", "");
        
        if (cleanVal.contains(".") && cleanVal.contains(",")) {
            cleanVal = cleanVal.replace(".", "").replace(",", ".");
        } else if (cleanVal.contains(",")) {
            cleanVal = cleanVal.replace(",", ".");
        }
        
        try {
            return Double.parseDouble(cleanVal);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private int monthStringToInt(String month) {
        return switch (month.toLowerCase()) {
            case "gennaio" -> 1;
            case "febbraio" -> 2;
            case "marzo" -> 3;
            case "aprile" -> 4;
            case "maggio" -> 5;
            case "giugno" -> 6;
            case "luglio" -> 7;
            case "agosto" -> 8;
            case "settembre" -> 9;
            case "ottobre" -> 10;
            case "novembre" -> 11;
            case "dicembre" -> 12;
            default -> 1;
        };
    }
}
