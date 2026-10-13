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
        
        // 0. Nome Dipendente
        Matcher mName = Pattern.compile("^[0-9]{6,7}\\s+([A-Z\\s']+)\\s+[A-Z0-9]{16}", Pattern.MULTILINE).matcher(text);
        if (mName.find()) {
            cedolino.setNomeDipendente(mName.group(1).trim());
        }

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
        cedolino.setPagaBase(extractValueFromNextLine(text, "(?i)^PAGA BASE.*"));
        cedolino.setContingenza(extractValueFromNextLine(text, "(?i)^CONTING\\..*"));
        cedolino.setSuperminimo(extractValueFromNextLine(text, "(?i)^SUP\\.ASS\\..*"));
        cedolino.setTerzoElemento(extractValueFromNextLine(text, "(?i)^3'ELEMEN\\..*"));
        cedolino.setStraordinarioForfetizzato(extractValueFromNextLine(text, "(?i)^Str\\.Forf\\..*"));
        cedolino.setEdr(extractValueFromNextLine(text, "(?i)^E\\.d\\.r\\..*"));

        // 2.5 Totali Mensili Stampati
        Matcher mTot = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s*\\n\\s*([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s+Residuo AP", Pattern.CASE_INSENSITIVE).matcher(text);
        if (mTot.find()) {
            cedolino.setTotaleTrattenute(parseItalianNumber(mTot.group(1)));
            cedolino.setTotaleCompetenze(parseItalianNumber(mTot.group(2)));
        }

        // 3. Imponibili del MESE e IRPEF netta (Sulla stessa riga)
        cedolino.setImponibileInps(extractValue(text, "(?i)Contributo IVS\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setImponibileIrpef(extractValue(text, "(?i)Imponibile IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setIrpefNetta(extractValue(text, "(?i)Ritenute IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setImponibileInail(extractValue(text, "(?i)Imp\\.\\s*INAIL\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})\\s+Voce Tariffa"));

        // 4. Analisi Granulare "VOCI VARIABILI DEL MESE"
        List<VoceCedolino> voci = new ArrayList<>();
        String[] lines = text.split("\n");
        for (String line : lines) {
            String trimmedLine = line.trim();
            String lowerLine = trimmedLine.toLowerCase();

            // Filtra solo le righe che sembrano contenere dati finanziari tabellari o codici
            if (!trimmedLine.matches("^[\\*\\s]*[A-Z0-9]{5,6}.*") && !lowerLine.startsWith("quota t.f.r.")) {
                continue; 
            }

            // CRITICAL FIX: Ignore bottom-page cumulative counters so they don't explode the "Competenze" sum
            if (lowerLine.startsWith("imp.") || lowerLine.startsWith("irpef pagata") || lowerLine.contains("residuo ap")) {
                continue;
            }

            // Estrazione del valore finale della riga
            Matcher mValue = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})$").matcher(trimmedLine);
            if (!mValue.find()) continue;

            Double importo = parseItalianNumber(mValue.group(1));
            String rawLine = trimmedLine.replace(mValue.group(1), "").trim();

            VoceCedolino voce = new VoceCedolino();
            voce.setCedolino(cedolino);
            voce.setImporto(importo);

            // Assegnazione Tipo Voce
            if (lowerLine.contains("( )") || lowerLine.contains("c/ditta") || lowerLine.contains("ticket") || lowerLine.contains("buon")) {
                if (lowerLine.contains("c/ditta")) voce.setTipo(VoceCedolino.TipoVoce.CARICO_DITTA);
                else voce.setTipo(VoceCedolino.TipoVoce.FIGURATIVO);
            } 
            else if (trimmedLine.matches("^[\\*\\s]*F0[12][0-9]{3}.*") || trimmedLine.matches("^[\\*\\s]*F0332[0-1].*") || 
                     lowerLine.contains("t.f.r.") || lowerLine.contains("deducib") || lowerLine.contains("imponibile")) {
                voce.setTipo(VoceCedolino.TipoVoce.INFORMATIVO);
                if (lowerLine.contains("detrazioni lav.dip")) cedolino.setDetrazioni(importo);
                if (lowerLine.contains("ulteriore detrazione")) cedolino.setUlterioriDetrazioni(importo);
                if (lowerLine.contains("irpef lorda")) cedolino.setIrpefLorda(importo);
            }
            else if (trimmedLine.matches("^[\\*\\s]*F03[0-9]{3}.*") || trimmedLine.matches("^[\\*\\s]*F09[0-9]{3}.*") ||
                     lowerLine.contains("trattenut") || lowerLine.contains("contribut") || lowerLine.contains("cigs") || 
                     lowerLine.contains("fis d.lgs") || lowerLine.contains("ritenut") || lowerLine.contains("addizional") || 
                     lowerLine.contains("imposta") || lowerLine.contains("arrotond") || lowerLine.contains("recuper")) {
                voce.setTipo(VoceCedolino.TipoVoce.TRATTENUTA);
            }
            else {
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
            if (v.getDescrizione().toLowerCase().contains("arrotond")) arrotondamento = v.getImporto();
        }

        cedolino.setTotaleCompetenzeCalcolato(totComp);
        cedolino.setTotaleTrattenuteCalcolato(totTrat);
        cedolino.setArrotondamento(arrotondamento);

        cedolino.setTotaleCompetenze(totComp);
        cedolino.setTotaleTrattenute(totTrat);

        // 5. Contatori Dettagliati (Ferie, Ex-Fest e ROL) e FONTE
        for (String line : lines) {
            String lowerLine = line.trim().toLowerCase();

            // Format 4 numbers: Residuo AP | Maturato | Goduto | Saldo
            if (lowerLine.startsWith("ferie")) {
                Matcher m = Pattern.compile("(?i)Ferie\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+ORE").matcher(line);
                if (m.find()) {
                    cedolino.setFerieResidueAP(parseItalianNumber(m.group(1)));
                    cedolino.setFerieMaturate(parseItalianNumber(m.group(2)));
                    cedolino.setFerieGodute(parseItalianNumber(m.group(3)));
                    cedolino.setFerieSaldo(parseItalianNumber(m.group(4)));
                } else {
                    // Fallback to simple extraction
                    Matcher mSingle = Pattern.compile("([\\d\\.,]+)\\s+ORE", Pattern.CASE_INSENSITIVE).matcher(line);
                    if (mSingle.find()) cedolino.setFerieSaldo(parseItalianNumber(mSingle.group(1)));
                }
            } else if (lowerLine.startsWith("ex-fest")) {
                Matcher m = Pattern.compile("(?i)Ex-Fest\\.?\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+ORE").matcher(line);
                if (m.find()) {
                    cedolino.setExFestResidueAP(parseItalianNumber(m.group(1)));
                    // We map group 2/3 generally; Zucchetti sometimes has less columns for ExFest, fallback handles that
                    cedolino.setExFestSaldo(parseItalianNumber(m.group(4)));
                } else {
                    Matcher mSingle = Pattern.compile("([\\d\\.,]+)\\s+ORE", Pattern.CASE_INSENSITIVE).matcher(line);
                    if (mSingle.find()) cedolino.setExFestSaldo(parseItalianNumber(mSingle.group(1)));
                }
            } else if (lowerLine.startsWith("r.o.l.")) {
                Matcher m = Pattern.compile("(?i)R\\.O\\.L\\.?\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+ORE").matcher(line);
                if (m.find()) {
                    cedolino.setRolResiduoAP(parseItalianNumber(m.group(1)));
                    cedolino.setRolSaldo(parseItalianNumber(m.group(4)));
                } else {
                    // Try 2 numbers
                    Matcher mTwo = Pattern.compile("(?i)R\\.O\\.L\\.?\\s+([\\d\\.,]+)\\s+([\\d\\.,]+)\\s+ORE").matcher(line);
                    if (mTwo.find()) {
                        cedolino.setRolResiduoAP(parseItalianNumber(mTwo.group(1)));
                        cedolino.setRolSaldo(parseItalianNumber(mTwo.group(2)));
                    } else {
                        Matcher mSingle = Pattern.compile("([\\d\\.,]+)\\s+ORE", Pattern.CASE_INSENSITIVE).matcher(line);
                        if (mSingle.find()) cedolino.setRolSaldo(parseItalianNumber(mSingle.group(1)));
                    }
                }
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
