package com.pagareader.service;

import com.pagareader.entity.Cedolino;
import com.pagareader.entity.VoceCedolino;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PdfParserService {

    private static final Logger log = LoggerFactory.getLogger(PdfParserService.class);

    @FunctionalInterface
    private interface OrariConsumer {
        void accept(double ap, double mat, double god, double sal);
    }

    public Cedolino parsePdf(MultipartFile file) throws IOException {
        log.info("Parsing payslip PDF: '{}'", file.getOriginalFilename());
        String text;
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            text = stripper.getText(document);
        }

        Cedolino cedolino = new Cedolino();

        // 0. Dati Aziendali
        Matcher mAzienda = Pattern.compile("^[A-Z0-9]{4}\\s+([A-Z0-9\\s\\.,&'-]+(?:S\\.P\\.A\\.|S\\.R\\.L\\.|SPA|SRL))", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE).matcher(text);
        if (mAzienda.find()) {
            cedolino.setAzienda(mAzienda.group(1).trim());
        } else {
            cedolino.setAzienda("CALZEDONIA S.P.A.");
        }

        // 0.1 Matricola, Nome Dipendente e Codice Fiscale
        Matcher mDip = Pattern.compile("^([0-9]{6,7})\\s+([A-Z\\s']+)\\s+([A-Z0-9]{16})", Pattern.MULTILINE).matcher(text);
        if (mDip.find()) {
            cedolino.setMatricola(mDip.group(1).trim());
            cedolino.setNomeDipendente(mDip.group(2).trim());
            cedolino.setCodiceFiscale(mDip.group(3).trim());
        }

        // 0.2 Date Anagrafiche e Assunzione
        Matcher mDateAss = Pattern.compile("(\\d{2}-\\d{2}-\\d{4})\\s+(\\d{2}-\\d{2}-\\d{4})").matcher(text);
        if (mDateAss.find()) {
            cedolino.setDataNascita(mDateAss.group(1));
            cedolino.setDataAssunzione(mDateAss.group(2));
        }

        // 0.3 Inquadramento Contrattuale: Qualifica, Livello, Mansione, CCNL
        Matcher mLiv = Pattern.compile("(?i)(Impiegato|Operaio|Quadro|Dirigente)\\s+(Livello\\s+[0-9A-Z]+)").matcher(text);
        if (mLiv.find()) {
            cedolino.setQualifica(mLiv.group(1).trim());
            cedolino.setLivello(mLiv.group(2).trim());
        }

        Matcher mMansione = Pattern.compile("(?i)(?:Livello\\s+[0-9A-Z]+)\\s*\\n\\s*([A-Z0-9_\\s-]{3,30})\\s*\\n\\s*CNEL", Pattern.MULTILINE).matcher(text);
        if (mMansione.find()) {
            cedolino.setMansione(mMansione.group(1).trim());
        }

        Matcher mCnel = Pattern.compile("CNEL\\s+([A-Z0-9]+)", Pattern.CASE_INSENSITIVE).matcher(text);
        if (mCnel.find()) {
            cedolino.setCnel(mCnel.group(1).trim());
            if (mCnel.group(1).trim().equalsIgnoreCase("H011")) {
                cedolino.setCcnl("CCNL Terziario, Distribuzione e Servizi (Confcommercio)");
            } else {
                cedolino.setCcnl("CCNL " + mCnel.group(1).trim());
            }
        }

        Matcher mScatto = Pattern.compile("(\\d{1,2}-20[2-3]\\d)").matcher(text);
        if (mScatto.find()) {
            cedolino.setScattiAnzianita(mScatto.group(1));
        }

        // 1. Month and Year
        Pattern datePattern = Pattern.compile("(?i)(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\\s+(20[2-9]\\d)(?:\\s+AGG\\.?)?");
        Matcher mDate = datePattern.matcher(text);
        if (mDate.find()) {
            cedolino.setMese(monthStringToInt(mDate.group(1)));
            cedolino.setAnno(Integer.parseInt(mDate.group(2)));
        } else {
            cedolino.setMese(1);
            cedolino.setAnno(2025);
        }

        // Detection of Mensilità Aggiuntiva (13ma / 14ma)
        boolean isAggiuntiva = Pattern.compile("(?i)(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\\s+(20[2-9]\\d)\\s+AGG").matcher(text).find()
                || Pattern.compile("(?i)(13ma|14ma|tredicesima|quattordicesima)\\s+mensilit").matcher(text).find()
                || text.toLowerCase().contains("13ma mensilita")
                || text.toLowerCase().contains("14ma mensilita");
        cedolino.setAggiuntiva(isAggiuntiva);

        // 2. Competenze Fisse
        cedolino.setPagaBase(extractValueFromNextLine(text, "(?i)^PAGA BASE.*"));
        cedolino.setContingenza(extractValueFromNextLine(text, "(?i)^CONTING\\..*"));
        cedolino.setSuperminimo(extractValueFromNextLine(text, "(?i)^SUP\\.ASS\\..*"));
        cedolino.setTerzoElemento(extractValueFromNextLine(text, "(?i)^3'ELEMEN\\..*"));
        cedolino.setStraordinarioForfetizzato(extractValueFromNextLine(text, "(?i)^Str\\.Forf\\..*"));
        cedolino.setEdr(extractValueFromNextLine(text, "(?i)^E\\.d\\.r\\..*"));

        // 2.5 Totali Mensili Stampati
        Matcher mTot = Pattern.compile("(-?[\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s*\\n?\\s*([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})\\s*Residuo AP", Pattern.CASE_INSENSITIVE).matcher(text);
        Double printedTrat = 0.0;
        Double printedComp = 0.0;
        if (mTot.find()) {
            printedTrat = parseItalianNumber(mTot.group(1));
            printedComp = parseItalianNumber(mTot.group(2));
            cedolino.setTotaleTrattenute(printedTrat);
            cedolino.setTotaleCompetenze(printedComp);
        }

        // 3. Imponibili del MESE e IRPEF netta
        cedolino.setImponibileInps(extractValue(text, "(?i)Contributo IVS\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setImponibileIrpef(extractValue(text, "(?i)Imponibile IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setIrpefNetta(extractValue(text, "(?i)Ritenute IRPEF\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})"));
        cedolino.setImponibileInail(extractValue(text, "(?i)Imp\\.\\s*INAIL\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2,5})\\s+Voce Tariffa"));
        cedolino.setTfrMese(extractValue(text, "(?i)Quota\\s+T\\.F\\.R\\.(?:\\s+a\\s+Fondi)?\\s+([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})"));

        // 3.1 Progressivi Annui
        cedolino.setImponibileInpsProgressivo(extractValueFromNextLine(text, "(?i)^Imp\\.\\s*INPS.*"));
        cedolino.setImponibileInailProgressivo(extractValueFromNextLine(text, "(?i)^Imp\\.\\s*INAIL.*"));
        cedolino.setImponibileIrpefProgressivo(extractValueFromNextLine(text, "(?i)^Imp\\.\\s*IRPEF.*"));
        cedolino.setIrpefPagataProgressiva(extractValueFromNextLine(text, "(?i)^IRPEF\\s+pagata.*"));

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

            // Ignora i contatori cumulativi a fine pagina
            if (lowerLine.startsWith("imp.") || lowerLine.startsWith("irpef pagata") || lowerLine.contains("residuo ap")) {
                continue;
            }

            // Estrazione del valore finale della riga
            Matcher mValue = Pattern.compile("(-?[\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})$").matcher(trimmedLine);
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
            // Trattenute (IRPEF, ritenute fiscali, contributi IVS/CIGS/FIS, FONTE dipendente, addizionali, arrotondamenti)
            else if (trimmedLine.matches("^[\\*\\s]*F03[0-9]{3}.*") || 
                     trimmedLine.matches("^[\\*\\s]*F0602[0-9].*") ||
                     trimmedLine.matches("^[\\*\\s]*F09[0-9]{3}.*") ||
                     lowerLine.contains("trattenut") || lowerLine.contains("ritenut") || lowerLine.contains("contribut") || 
                     lowerLine.contains("contr.") || lowerLine.contains("cigs") || lowerLine.contains("fis d.lgs") || 
                     lowerLine.contains("addizional") || lowerLine.contains("imposta") || lowerLine.contains("arrotond") || 
                     lowerLine.contains("recuper") || (lowerLine.contains("fonte") && !lowerLine.contains("c/ditta"))) {
                voce.setTipo(VoceCedolino.TipoVoce.TRATTENUTA);
            }
            // Voci Informative (TUTTI i codici fiscali F0... non trattenute, es: F01, F02, F06, F07, F08, TFR, Detrazioni)
            else if (trimmedLine.matches("^[\\*\\s]*F0[0-9]{4}.*") || 
                     lowerLine.contains("t.f.r.") || lowerLine.contains("deducib") || lowerLine.contains("imponibile") || 
                     lowerLine.contains("lorda") || lowerLine.contains("detrazion") || lowerLine.contains("redd.rif") || 
                     lowerLine.contains("cong.") || lowerLine.contains("conguaglio")) {
                voce.setTipo(VoceCedolino.TipoVoce.INFORMATIVO);
                if (lowerLine.contains("detrazioni lav.dip")) cedolino.setDetrazioni(importo);
                if (lowerLine.contains("ulteriore detrazione")) cedolino.setUlterioriDetrazioni(importo);
                if (lowerLine.contains("irpef lorda")) cedolino.setIrpefLorda(importo);
            }
            // Competenze effettive del mese
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

        for (VoceCedolino v : voci) {
            if (v.getTipo() == VoceCedolino.TipoVoce.COMPETENZA) totComp += v.getImporto();
            if (v.getTipo() == VoceCedolino.TipoVoce.TRATTENUTA) totTrat += v.getImporto();
            if (v.getDescrizione().toLowerCase().contains("arrotond")) arrotondamento = v.getImporto();
        }

        cedolino.setTotaleCompetenzeCalcolato(totComp);
        cedolino.setTotaleTrattenuteCalcolato(totTrat);
        cedolino.setArrotondamento(arrotondamento);

        // Usa i totali stampati ufficiali del cedolino se presenti e congruenti, altrimenti il calcolato
        if (printedComp > 0 && Math.abs(totComp - printedComp) <= 150.0) {
            cedolino.setTotaleCompetenze(printedComp);
        } else {
            cedolino.setTotaleCompetenze(totComp);
        }

        if (printedTrat != 0.0 && Math.abs(totTrat - printedTrat) <= 150.0) {
            cedolino.setTotaleTrattenute(printedTrat);
        } else {
            cedolino.setTotaleTrattenute(totTrat);
        }

        // 5. Contatori Dettagliati Orari (Ferie, Ex-Fest e ROL) e FONTE
        for (String line : lines) {
            String lowerLine = line.trim().toLowerCase();

            if (lowerLine.startsWith("ferie")) {
                parseOrariLine(line, (ap, mat, god, sal) -> {
                    cedolino.setFerieResidueAP(ap);
                    cedolino.setFerieMaturate(mat);
                    cedolino.setFerieGodute(god);
                    cedolino.setFerieSaldo(sal);
                });
            } else if (lowerLine.startsWith("ex-fest")) {
                parseOrariLine(line, (ap, mat, god, sal) -> {
                    cedolino.setExFestResidueAP(ap);
                    cedolino.setExFestMaturate(mat);
                    cedolino.setExFestGodute(god);
                    cedolino.setExFestSaldo(sal);
                });
            } else if (lowerLine.startsWith("r.o.l.")) {
                parseOrariLine(line, (ap, mat, god, sal) -> {
                    cedolino.setRolResiduoAP(ap);
                    cedolino.setRolMaturate(mat);
                    cedolino.setRolGodute(god);
                    cedolino.setRolSaldo(sal);
                });
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
        Double calcNetto = cedolino.getTotaleCompetenze() - cedolino.getTotaleTrattenute() + cedolino.getArrotondamento();
        
        Double extractedNetto = 0.0;
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            if (line.matches("^\\d{1,3}(\\.\\d{3})*,\\d{2}\\s*€?$")) {
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
        
        if (extractedNetto > 0 && Math.abs(calcNetto - extractedNetto) <= 5.0) {
            cedolino.setNettoMese(extractedNetto);
        } else if (extractedNetto > 0) {
            cedolino.setNettoMese(extractedNetto);
        } else {
            cedolino.setNettoMese(calcNetto);
        }

        return cedolino;
    }

    private void parseOrariLine(String line, OrariConsumer consumer) {
        Matcher m = Pattern.compile("([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{1,5})").matcher(line);
        List<Double> nums = new ArrayList<>();
        while (m.find()) {
            nums.add(parseItalianNumber(m.group(1)));
        }
        if (nums.isEmpty()) return;

        double ap = 0.0, mat = 0.0, god = 0.0, sal = 0.0;
        if (nums.size() >= 4) {
            ap = nums.get(0);
            mat = nums.get(1);
            god = nums.get(2);
            sal = nums.get(3);
        } else if (nums.size() == 3) {
            mat = nums.get(0);
            god = nums.get(1);
            sal = nums.get(2);
            double calcAp = sal - mat + god;
            if (calcAp > 0) ap = calcAp;
        } else if (nums.size() == 2) {
            mat = nums.get(0);
            sal = nums.get(1);
        } else {
            sal = nums.get(0);
        }
        consumer.accept(ap, mat, god, sal);
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
