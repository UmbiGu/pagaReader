package com.pagareader.entity.margine;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pagareader.entity.AppUser;
import jakarta.persistence.*;

@Entity
@Table(name = "margine_mesi")
public class MargineMese {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    private String sheetName;
    private Integer anno;
    private Integer mese;
    private Double totaleSpese = 0.0;
    private Double entrate = 0.0;
    private Double risparmiati = 0.0;
    private Double speseCasa = 0.0;
    private String note;

    public MargineMese() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public String getSheetName() { return sheetName; }
    public void setSheetName(String sheetName) { this.sheetName = sheetName; }

    public Integer getAnno() { return anno; }
    public void setAnno(Integer anno) { this.anno = anno; }

    public Integer getMese() { return mese; }
    public void setMese(Integer mese) { this.mese = mese; }

    public Double getTotaleSpese() { return totaleSpese; }
    public void setTotaleSpese(Double totaleSpese) { this.totaleSpese = totaleSpese; }

    public Double getEntrate() { return entrate; }
    public void setEntrate(Double entrate) { this.entrate = entrate; }

    public Double getRisparmiati() { return risparmiati; }
    public void setRisparmiati(Double risparmiati) { this.risparmiati = risparmiati; }

    public Double getSpeseCasa() { return speseCasa; }
    public void setSpeseCasa(Double speseCasa) { this.speseCasa = speseCasa; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
