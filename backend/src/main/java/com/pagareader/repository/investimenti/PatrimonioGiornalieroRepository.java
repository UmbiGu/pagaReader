package com.pagareader.repository.investimenti;

import com.pagareader.entity.investimenti.PatrimonioGiornaliero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PatrimonioGiornalieroRepository extends JpaRepository<PatrimonioGiornaliero, Long> {

    @Query("""
        SELECT p FROM PatrimonioGiornaliero p
        WHERE p.user.id = :userId
        ORDER BY p.dataValuta ASC
    """)
    List<PatrimonioGiornaliero> findByUserIdOrderByDataValutaAsc(@Param("userId") Long userId);

    @Query("""
        SELECT p FROM PatrimonioGiornaliero p
        WHERE p.user.id = :userId
          AND p.dataValuta = :dataValuta
    """)
    Optional<PatrimonioGiornaliero> findByUserIdAndDataValuta(
        @Param("userId") Long userId,
        @Param("dataValuta") LocalDate dataValuta
    );

    @Query("""
        SELECT p.dataValuta FROM PatrimonioGiornaliero p
        WHERE p.user.id = :userId
    """)
    Set<LocalDate> findDatesByUserId(@Param("userId") Long userId);

    @Query("""
        SELECT COUNT(p) FROM PatrimonioGiornaliero p
        WHERE p.user.id = :userId
    """)
    long countByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("""
        DELETE FROM PatrimonioGiornaliero p
        WHERE p.user.id = :userId
    """)
    void deleteByUserId(@Param("userId") Long userId);
}
