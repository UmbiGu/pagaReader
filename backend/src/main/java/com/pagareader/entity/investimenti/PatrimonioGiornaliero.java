package com.pagareader.entity.investimenti;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pagareader.entity.AppUser;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "investimenti_patrimonio")
public class PatrimonioGiornaliero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    @Column(nullable = false)
    private LocalDate dataValuta;

    private Double liquidita = 0.0;
    private Double finanziamentoLong = 0.0;
    private Double garanziaShort = 0.0;
    private Double portafoglio = 0.0;
    private Double patrimonio = 0.0;

    // To optionally store the description of the movement on that day (e.g. "Bollo", "Conferimento con bonifico")
    private String notaMovimento;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public LocalDate getDataValuta() { return dataValuta; }
    public void setDataValuta(LocalDate dataValuta) { this.dataValuta = dataValuta; }

    public Double getLiquidita() { return liquidita; }
    public void setLiquidita(Double liquidita) { this.liquidita = liquidita; }

    public Double getFinanziamentoLong() { return finanziamentoLong; }
    public void setFinanziamentoLong(Double finanziamentoLong) { this.finanziamentoLong = finanziamentoLong; }

    public Double getGaranziaShort() { return garanziaShort; }
    public void setGaranziaShort(Double garanziaShort) { this.garanziaShort = garanziaShort; }

    public Double getPortafoglio() { return portafoglio; }
    public void setPortafoglio(Double portafoglio) { this.portafoglio = portafoglio; }

    public Double getPatrimonio() { return patrimonio; }
    public void setPatrimonio(Double patrimonio) { this.patrimonio = patrimonio; }

    public String getNotaMovimento() { return notaMovimento; }
    public void setNotaMovimento(String notaMovimento) { this.notaMovimento = notaMovimento; }
}
