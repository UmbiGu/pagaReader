package com.pagareader.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "voci_cedolino")
public class VoceCedolino {

    public enum TipoVoce {
        COMPETENZA, TRATTENUTA, FIGURATIVO, CARICO_DITTA, INFORMATIVO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cedolino_id")
    @JsonIgnore
    private Cedolino cedolino;

    private String codiceVoce;
    private String descrizione;
    private Double importoBase = 0.0;
    private String riferimento;
    private Double importo = 0.0;

    @Enumerated(EnumType.STRING)
    private TipoVoce tipo;

    // --- GETTERS & SETTERS ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Cedolino getCedolino() { return cedolino; }
    public void setCedolino(Cedolino cedolino) { this.cedolino = cedolino; }
    
    public String getCodiceVoce() { return codiceVoce; }
    public void setCodiceVoce(String codiceVoce) { this.codiceVoce = codiceVoce; }
    
    public String getDescrizione() { return descrizione; }
    public void setDescrizione(String descrizione) { this.descrizione = descrizione; }
    
    public Double getImportoBase() { return importoBase; }
    public void setImportoBase(Double importoBase) { this.importoBase = importoBase; }
    
    public String getRiferimento() { return riferimento; }
    public void setRiferimento(String riferimento) { this.riferimento = riferimento; }
    
    public Double getImporto() { return importo; }
    public void setImporto(Double importo) { this.importo = importo; }
    
    public TipoVoce getTipo() { return tipo; }
    public void setTipo(TipoVoce tipo) { this.tipo = tipo; }
}
