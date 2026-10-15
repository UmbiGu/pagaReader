package com.pagareader.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cedolini")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cedolino {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    // --- VOCI VARIABILI DEL MESE ---
    @OneToMany(mappedBy = "cedolino", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VoceCedolino> voci = new ArrayList<>();

    @Builder.Default
    private Double totaleCompetenzeCalcolato = 0.0;
    @Builder.Default
    private Double totaleTrattenuteCalcolato = 0.0;
    @Builder.Default
    private Double arrotondamento = 0.0;

    // --- DATI ANAGRAFICI E AZIENDALI ---
    private String azienda;
    private String nomeDipendente;
    private String codiceFiscale;
    private String matricola;
    private String qualifica;
    private String livello;
    private String mansione;
    private String ccnl;
    private String cnel;
    private String dataAssunzione;
    private String dataNascita;
    private String scattiAnzianita;

    // --- PROGRESSIVI ANNUI E TFR ---
    @Builder.Default
    private Double imponibileInpsProgressivo = 0.0;
    @Builder.Default
    private Double imponibileInailProgressivo = 0.0;
    @Builder.Default
    private Double imponibileIrpefProgressivo = 0.0;
    @Builder.Default
    private Double irpefPagataProgressiva = 0.0;
    @Builder.Default
    private Double tfrMese = 0.0;

    // --- PERIODO ---
    private Integer mese;
    private Integer anno;
    @Builder.Default
    private Boolean aggiuntiva = false;

    public Boolean getAggiuntiva() {
        return aggiuntiva != null && aggiuntiva;
    }

    // --- COMPETENZE FISSE ---
    @Builder.Default
    private Double pagaBase = 0.0;
    @Builder.Default
    private Double contingenza = 0.0;
    @Builder.Default
    private Double terzoElemento = 0.0;
    @Builder.Default
    private Double superminimo = 0.0;
    @Builder.Default
    private Double straordinarioForfetizzato = 0.0;
    @Builder.Default
    private Double edr = 0.0;

    // --- IMPONIBILI E TASSE ---
    @Builder.Default
    private Double imponibileInps = 0.0;
    @Builder.Default
    private Double imponibileInail = 0.0;
    @Builder.Default
    private Double imponibileIrpef = 0.0;
    @Builder.Default
    private Double irpefLorda = 0.0;
    @Builder.Default
    private Double irpefNetta = 0.0;
    @Builder.Default
    private Double detrazioni = 0.0;
    @Builder.Default
    private Double ulterioriDetrazioni = 0.0;

    // --- TOTALI ---
    @Builder.Default
    private Double totaleCompetenze = 0.0;
    @Builder.Default
    private Double totaleTrattenute = 0.0;
    @Builder.Default
    private Double nettoMese = 0.0;

    // --- CONTATORI FERIE ---
    @Builder.Default
    private Double ferieResidueAP = 0.0;
    @Builder.Default
    private Double ferieMaturate = 0.0;
    @Builder.Default
    private Double ferieGodute = 0.0;
    @Builder.Default
    private Double ferieSaldo = 0.0;

    // --- CONTATORI EX-FESTIVITA' ---
    @Builder.Default
    private Double exFestResidueAP = 0.0;
    @Builder.Default
    private Double exFestMaturate = 0.0;
    @Builder.Default
    private Double exFestGodute = 0.0;
    @Builder.Default
    private Double exFestSaldo = 0.0;

    // --- CONTATORI ROL ---
    @Builder.Default
    private Double rolResiduoAP = 0.0;
    @Builder.Default
    private Double rolMaturate = 0.0;
    @Builder.Default
    private Double rolGodute = 0.0;
    @Builder.Default
    private Double rolSaldo = 0.0;

    // --- PENSIONE FONTE ---
    @Builder.Default
    private Double fonteDipendente = 0.0;
    @Builder.Default
    private Double fonteAzienda = 0.0;

    // --- GESTIONE FILE ---
    private String fileName;

    @Lob
    private byte[] fileData;
}
