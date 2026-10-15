package com.pagareader.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "voci_cedolino")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Builder.Default
    private Double importoBase = 0.0;

    private String riferimento;

    @Builder.Default
    private Double importo = 0.0;

    @Enumerated(EnumType.STRING)
    private TipoVoce tipo;
}
