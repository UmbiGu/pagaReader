package com.pagareader.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cedolini")
public class Cedolino {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private AppUser user;

    // --- VOCI VARIABILI DEL MESE ---
    @OneToMany(mappedBy = "cedolino", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<VoceCedolino> voci = new java.util.ArrayList<>();

    private Double totaleCompetenzeCalcolato = 0.0;
    private Double totaleTrattenuteCalcolato = 0.0;
    private Double arrotondamento = 0.0;

    public java.util.List<VoceCedolino> getVoci() { return voci; }
    public void setVoci(java.util.List<VoceCedolino> voci) { this.voci = voci; }
    
    public Double getTotaleCompetenzeCalcolato() { return totaleCompetenzeCalcolato; }
    public void setTotaleCompetenzeCalcolato(Double totaleCompetenzeCalcolato) { this.totaleCompetenzeCalcolato = totaleCompetenzeCalcolato; }
    
    public Double getTotaleTrattenuteCalcolato() { return totaleTrattenuteCalcolato; }
    public void setTotaleTrattenuteCalcolato(Double totaleTrattenuteCalcolato) { this.totaleTrattenuteCalcolato = totaleTrattenuteCalcolato; }
    
    public Double getArrotondamento() { return arrotondamento; }
    public void setArrotondamento(Double arrotondamento) { this.arrotondamento = arrotondamento; }

    // --- DATI ANAGRAFICI E AZIENDALI ---
    private String azienda;
    private String nomeDipendente;
    private String codiceFiscale;

    // --- PERIODO ---
    private Integer mese;
    private Integer anno;

    // --- COMPETENZE FISSE ---
    private Double pagaBase = 0.0;
    private Double contingenza = 0.0;
    private Double terzoElemento = 0.0;
    private Double superminimo = 0.0;
    private Double straordinarioForfetizzato = 0.0;
    private Double edr = 0.0;

    // --- IMPONIBILI E TASSE ---
    private Double imponibileInps = 0.0;
    private Double imponibileInail = 0.0;
    private Double imponibileIrpef = 0.0;
    private Double irpefLorda = 0.0;
    private Double irpefNetta = 0.0;
    private Double detrazioni = 0.0;
    private Double ulterioriDetrazioni = 0.0;

    // --- TOTALI ---
    private Double totaleCompetenze = 0.0;
    private Double totaleTrattenute = 0.0;
    private Double nettoMese = 0.0;

    // --- CONTATORI FERIE ---
    private Double ferieResidueAP = 0.0;
    private Double ferieMaturate = 0.0;
    private Double ferieGodute = 0.0;
    private Double ferieSaldo = 0.0;

    // --- CONTATORI EX-FESTIVITA' ---
    private Double exFestResidueAP = 0.0;
    private Double exFestSaldo = 0.0;

    // --- CONTATORI ROL ---
    private Double rolResiduoAP = 0.0;
    private Double rolSaldo = 0.0;

    // --- GETTERS E SETTERS ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public String getAzienda() { return azienda; }
    public void setAzienda(String azienda) { this.azienda = azienda; }
    public String getNomeDipendente() { return nomeDipendente; }
    public void setNomeDipendente(String nomeDipendente) { this.nomeDipendente = nomeDipendente; }
    public String getCodiceFiscale() { return codiceFiscale; }
    public void setCodiceFiscale(String codiceFiscale) { this.codiceFiscale = codiceFiscale; }

    public Integer getMese() { return mese; }
    public void setMese(Integer mese) { this.mese = mese; }
    public Integer getAnno() { return anno; }
    public void setAnno(Integer anno) { this.anno = anno; }

    public Double getPagaBase() { return pagaBase; }
    public void setPagaBase(Double pagaBase) { this.pagaBase = pagaBase; }
    public Double getContingenza() { return contingenza; }
    public void setContingenza(Double contingenza) { this.contingenza = contingenza; }
    public Double getTerzoElemento() { return terzoElemento; }
    public void setTerzoElemento(Double terzoElemento) { this.terzoElemento = terzoElemento; }
    public Double getSuperminimo() { return superminimo; }
    public void setSuperminimo(Double superminimo) { this.superminimo = superminimo; }
    public Double getStraordinarioForfetizzato() { return straordinarioForfetizzato; }
    public void setStraordinarioForfetizzato(Double straordinarioForfetizzato) { this.straordinarioForfetizzato = straordinarioForfetizzato; }
    public Double getEdr() { return edr; }
    public void setEdr(Double edr) { this.edr = edr; }

    public Double getImponibileInps() { return imponibileInps; }
    public void setImponibileInps(Double imponibileInps) { this.imponibileInps = imponibileInps; }
    public Double getImponibileInail() { return imponibileInail; }
    public void setImponibileInail(Double imponibileInail) { this.imponibileInail = imponibileInail; }
    public Double getImponibileIrpef() { return imponibileIrpef; }
    public void setImponibileIrpef(Double imponibileIrpef) { this.imponibileIrpef = imponibileIrpef; }
    public Double getIrpefLorda() { return irpefLorda; }
    public void setIrpefLorda(Double irpefLorda) { this.irpefLorda = irpefLorda; }
    public Double getIrpefNetta() { return irpefNetta; }
    public void setIrpefNetta(Double irpefNetta) { this.irpefNetta = irpefNetta; }
    public Double getDetrazioni() { return detrazioni; }
    public void setDetrazioni(Double detrazioni) { this.detrazioni = detrazioni; }
    public Double getUlterioriDetrazioni() { return ulterioriDetrazioni; }
    public void setUlterioriDetrazioni(Double ulterioriDetrazioni) { this.ulterioriDetrazioni = ulterioriDetrazioni; }

    public Double getTotaleCompetenze() { return totaleCompetenze; }
    public void setTotaleCompetenze(Double totaleCompetenze) { this.totaleCompetenze = totaleCompetenze; }
    public Double getTotaleTrattenute() { return totaleTrattenute; }
    public void setTotaleTrattenute(Double totaleTrattenute) { this.totaleTrattenute = totaleTrattenute; }
    public Double getNettoMese() { return nettoMese; }
    public void setNettoMese(Double nettoMese) { this.nettoMese = nettoMese; }

    public Double getFerieResidueAP() { return ferieResidueAP; }
    public void setFerieResidueAP(Double ferieResidueAP) { this.ferieResidueAP = ferieResidueAP; }
    public Double getFerieMaturate() { return ferieMaturate; }
    public void setFerieMaturate(Double ferieMaturate) { this.ferieMaturate = ferieMaturate; }
    public Double getFerieGodute() { return ferieGodute; }
    public void setFerieGodute(Double ferieGodute) { this.ferieGodute = ferieGodute; }
    public Double getFerieSaldo() { return ferieSaldo; }
    public void setFerieSaldo(Double ferieSaldo) { this.ferieSaldo = ferieSaldo; }

    public Double getExFestResidueAP() { return exFestResidueAP; }
    public void setExFestResidueAP(Double exFestResidueAP) { this.exFestResidueAP = exFestResidueAP; }
    public Double getExFestSaldo() { return exFestSaldo; }
    public void setExFestSaldo(Double exFestSaldo) { this.exFestSaldo = exFestSaldo; }

    public Double getRolResiduoAP() { return rolResiduoAP; }
    public void setRolResiduoAP(Double rolResiduoAP) { this.rolResiduoAP = rolResiduoAP; }
    public Double getRolSaldo() { return rolSaldo; }
    public void setRolSaldo(Double rolSaldo) { this.rolSaldo = rolSaldo; }

    // --- PENSIONE FONTE ---
    private Double fonteDipendente = 0.0;
    private Double fonteAzienda = 0.0;

    public Double getFonteDipendente() { return fonteDipendente; }
    public void setFonteDipendente(Double fonteDipendente) { this.fonteDipendente = fonteDipendente; }
    public Double getFonteAzienda() { return fonteAzienda; }
    public void setFonteAzienda(Double fonteAzienda) { this.fonteAzienda = fonteAzienda; }

    // --- GESTIONE FILE ---
    private String fileName;
    
    @Lob
    private byte[] fileData;

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    
    public byte[] getFileData() { return fileData; }
    public void setFileData(byte[] fileData) { this.fileData = fileData; }
}