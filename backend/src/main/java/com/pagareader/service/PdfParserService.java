package com.pagareader.service;

import com.pagareader.entity.Cedolino;
import com.pagareader.entity.VoceCedolino;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
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
        
        // 1. Month and Year
        Pattern datePattern = Pattern.compile("(?i)(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\\s+(20[2-9]\\d)");
        Matcher mDate = datePattern.matcher(text);
        if (mDate.find()) {
            cedolino.setMese(monthStringToInt(mDate.group(1)));
            cedolino.setAnno(Integer.parseInt(mDate.group(2)));
        } else {
            cedolino.setMese(1);
            cedolino.setAnno(2025);
        }

        // 2. Competenze Fisse
        cedolino.setPagaBase(extractValueFromNextLine(text, "^PAGA BASE.*"));
        cedolino.setContingenza(extractValueFromNextLine(text, "^CONTING\\..*"));
        cedolino.setSuperminimo(extractValueFromNextLine(text, "^SUP\\.ASS\\..*"));
        cedolino.setTerzoElemento(extractValueFromNextLine(text, "^3'ELEMEN\\..*"));
        cedolino.setStraordinarioForfetizzato(extractValueFromNextLine(text, "^Str\\.Forf\\..*"));
        cedolino.setEdr(extractValueFromNextLine(text, "^E\\.d\\.r\\..*"));

        // 2.5 Totali Mensili Stampati
        Matcher mTot = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s*\\n\\s*([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s+Residuo AP", Pattern.CASE_INSENSITIVE).matcher(text);
        if (mTot.find()) {
            cedolino.setTotaleTrattenute(parseItalianNumber(mTot.group(1)));
            cedolino.setTotaleCompetenze(parseItalianNumber(mTot.group(2)));
        }

        // 3. Imponibili del MESE e IRPEF netta (Sulla stessa riga)
        cedolino.setImponibileInps(extractValue(text, "Contributo IVS\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setImponibileIrpef(extractValue(text, "Imponibile IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setIrpefNetta(extractValue(text, "Ritenute IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        
        // 4. Analisi Granulare "VOCI VARIABILI DEL MESE"
        List<VoceCedolino> voci = new ArrayList<>();
        String[] lines = text.split("\n");
        for (String line : lines) {
            String trimmedLine = line.trim();
            
            // Filtra solo le righe che sembrano contenere dati finanziari tabellari o codici
            if (!trimmedLine.matches("^[\\*\\s]*[A-Z0-9]{5,6}.*") && !trimmedLine.matches("^Quota T\\.F\\.R\\..*")) {
                continue; // Non è una riga voce variabile
            }
            
            // Estrazione del valore finale della riga (sia esso competenza, trattenuta o figurativo)
            Matcher mValue = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})$").matcher(trimmedLine);
            if (!mValue.find()) continue;
            
            Double importo = parseItalianNumber(mValue.group(1));
            String rawLine = trimmedLine.replace(mValue.group(1), "").trim();
            
            VoceCedolino voce = new VoceCedolino();
            voce.setCedolino(cedolino);
            voce.setImporto(importo);
            
            // Assegnazione Tipo Voce logica avanzata
            if (trimmedLine.contains("( )") || trimmedLine.contains("C/Ditta") || trimmedLine.contains("Ticket Restaurant")) {
                if (trimmedLine.contains("C/Ditta")) voce.setTipo(VoceCedolino.TipoVoce.CARICO_DITTA);
                else voce.setTipo(VoceCedolino.TipoVoce.FIGURATIVO);
            } 
            else if (trimmedLine.matches("^[\\*\\s]*F02[0-9]{3}.*") || trimmedLine.matches("^[\\*\\s]*F0332[0-1].*") || trimmedLine.contains("Quota T.F.R.") || trimmedLine.contains("Ctr.prev.compl.deducib")) {
                voce.setTipo(VoceCedolino.TipoVoce.INFORMATIVO);
                if (trimmedLine.contains("Detrazioni lav.dip")) cedolino.setDetrazioni(importo);
                if (trimmedLine.contains("Ulteriore detrazione")) cedolino.setUlterioriDetrazioni(importo);
                if (trimmedLine.contains("IRPEF lorda")) cedolino.setIrpefLorda(importo);
            }
            else if (trimmedLine.contains("Contributo IVS") || trimmedLine.contains("CIGS") || trimmedLine.contains("FIS D.Lgs") || 
                     trimmedLine.contains("Ritenute IRPEF") || trimmedLine.contains("Addizionale") || trimmedLine.contains("Imposta sostitutiva") ||
                     trimmedLine.contains("Contributo EST") || trimmedLine.contains("Arrotond") || trimmedLine.contains("Contr. base  FONTE")) {
                voce.setTipo(VoceCedolino.TipoVoce.TRATTENUTA);
            }
            else {
                // Il resto, se non rientra, è considerata una competenza (es. Z00001 Retribuzione, Straordinari)
                voce.setTipo(VoceCedolino.TipoVoce.COMPETENZA);
            }
            
            voce.setDescrizione(rawLine);
            voci.add(voce);
        }
        
        cedolino.setVoci(voci);
        
        // Ricalcolo Totali Granulari
        Double totComp = 0.0;
        Double totTrat = 0.0;
        Double arrotondamento = 0.0;

        for(VoceCedolino v : voci) {
            if (v.getTipo() == VoceCedolino.TipoVoce.COMPETENZA) totComp += v.getImporto();
            if (v.getTipo() == VoceCedolino.TipoVoce.TRATTENUTA) totTrat += v.getImporto();
            if (v.getDescrizione().contains("Arrotond")) arrotondamento = v.getImporto();
        }

        cedolino.setTotaleCompetenzeCalcolato(totComp);
        cedolino.setTotaleTrattenuteCalcolato(totTrat);
        cedolino.setArrotondamento(arrotondamento);

        // Assegna i totali principali alla versione calcolata (è la più affidabile)
        cedolino.setTotaleCompetenze(totComp);
        cedolino.setTotaleTrattenute(totTrat);

        // 5. Contatori Ferie, Ex-Fest e ROL e FONTE
        for (String line : lines) {
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
        
        // 6. Netto Mese Definitivo
        // Use mathematical formula: Totale Competenze - Totale Trattenute
        // We still fall back to PDF extraction if the calculation is too far off.
        Double calcNetto = totComp - totTrat;
        
        Double extractedNetto = 0.0;
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            if (line.matches("^\\d{1,3}(\\.\\d{3})*,\\d{2}$")) {
                double val = parseItalianNumber(line);
                if (val > 100) { 
                    extractedNetto = val;
                    break;
                }
            } else if (line.matches("^\\d{1,3}(\\.\\d{3})*,\\d{2}.*")) {
                Matcher m = Pattern.compile("^(\\d{1,3}(\\.\\d{3})*,\\d{2})").matcher(line);
                if (m.find()) {
                    double val = parseItalianNumber(m.group(1));
                    if (val > 100) {
                        extractedNetto = val;
                        break;
                    }
                }
            }
        }
        
        // Always prefer the exact calculation if it's within a reasonable rounding margin
        if (Math.abs(calcNetto - extractedNetto) <= 2.0) {
             cedolino.setNettoMese(calcNetto);
        } else {
             cedolino.setNettoMese(extractedNetto); // Fallback to raw parsed text
        }

        return cedolino;
    }

    private Double extractValueFromNextLine(String fullText, String keywordRegex) {
        String[] lines = fullText.split("\n");
        for (int i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim().matches("(?i)" + keywordRegex)) {
                String nextLine = lines[i+1].trim();
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
