package com.pagareader.entity.margine;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.pagareader.entity.AppUser;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "margine_mesi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Builder.Default
    private Double totaleSpese = 0.0;

    @Builder.Default
    private Double entrate = 0.0;

    @Builder.Default
    private Double risparmiati = 0.0;

    @Builder.Default
    private Double speseCasa = 0.0;

    private String note;
}
