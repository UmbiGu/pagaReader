package com.pagareader.entity.investimenti;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pagareader.entity.AppUser;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "investimenti_patrimonio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Builder.Default
    private Double liquidita = 0.0;

    @Builder.Default
    private Double finanziamentoLong = 0.0;

    @Builder.Default
    private Double garanziaShort = 0.0;

    @Builder.Default
    private Double portafoglio = 0.0;

    @Builder.Default
    private Double patrimonio = 0.0;

    private String notaMovimento;
}
