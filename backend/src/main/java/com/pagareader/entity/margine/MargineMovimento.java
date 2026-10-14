package com.pagareader.entity.margine;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pagareader.entity.AppUser;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "margine_movimenti")
public class MargineMovimento {

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
    private LocalDate data;
    private String conto;
    private String descrizione;
    private Double uscite = 0.0;
    private String note;
    private Boolean pagato = true;
    private String categoria;

    public MargineMovimento() {}

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

    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }

    public String getConto() { return conto; }
    public void setConto(String conto) { this.conto = conto; }

    public String getDescrizione() { return descrizione; }
    public void setDescrizione(String descrizione) { this.descrizione = descrizione; }

    public Double getUscite() { return uscite; }
    public void setUscite(Double uscite) { this.uscite = uscite; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Boolean getPagato() { return pagato != null && pagato; }
    public void setPagato(Boolean pagato) { this.pagato = pagato; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
}
