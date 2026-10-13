package com.pagareader.repository.investimenti;

import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PatrimonioGiornalieroRepository extends JpaRepository<PatrimonioGiornaliero, Long> {
    List<PatrimonioGiornaliero> findByUserIdOrderByDataValutaAsc(Long userId);
    Optional<PatrimonioGiornaliero> findByUserIdAndDataValuta(Long userId, LocalDate dataValuta);
    void deleteByUserId(Long userId);
}
