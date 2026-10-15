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
@Table(name = "investimenti_movimenti")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortafoglioMovimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private AppUser user;

    private LocalDate dataValuta;
    private String descrizione;

    @Builder.Default
    private Double valore = 0.0;

    private String descrizioneTitolo;
    private String isin;
    private String ticker;
    private String notaMovimento;
}
