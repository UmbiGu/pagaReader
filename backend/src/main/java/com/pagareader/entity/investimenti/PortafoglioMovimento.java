package com.pagareader.entity.investimenti;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pagareader.entity.AppUser;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "investimenti_movimenti")
public class PortafoglioMovimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(nullable = false)
    private LocalDate dataValuta;

    private String descrizione;
    
    private Double valore = 0.0;
    
    private String descrizioneTitolo;
    private String isin;
    private String ticker;
    
    private String notaMovimento;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public LocalDate getDataValuta() { return dataValuta; }
    public void setDataValuta(LocalDate dataValuta) { this.dataValuta = dataValuta; }

    public String getDescrizione() { return descrizione; }
    public void setDescrizione(String descrizione) { this.descrizione = descrizione; }

    public Double getValore() { return valore; }
    public void setValore(Double valore) { this.valore = valore; }

    public String getDescrizioneTitolo() { return descrizioneTitolo; }
    public void setDescrizioneTitolo(String descrizioneTitolo) { this.descrizioneTitolo = descrizioneTitolo; }

    public String getIsin() { return isin; }
    public void setIsin(String isin) { this.isin = isin; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getNotaMovimento() { return notaMovimento; }
    public void setNotaMovimento(String notaMovimento) { this.notaMovimento = notaMovimento; }
}
