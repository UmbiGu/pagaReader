package com.pagareader.entity.margine;

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
@Table(name = "margine_movimenti")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Builder.Default
    private Double uscite = 0.0;

    private String note;

    @Builder.Default
    private Boolean pagato = true;

    private String categoria;

    public Boolean getPagato() {
        return pagato != null && pagato;
    }
}
