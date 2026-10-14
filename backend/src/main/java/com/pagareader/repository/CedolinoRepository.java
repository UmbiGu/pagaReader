package com.pagareader.repository;

import com.pagareader.entity.Cedolino;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CedolinoRepository extends JpaRepository<Cedolino, Long> {

    @Query("""
        SELECT c FROM Cedolino c
        WHERE c.user.id = :userId
        ORDER BY c.anno ASC, c.mese ASC, c.aggiuntiva ASC
    """)
    List<Cedolino> findByUserIdOrderByPeriodo(@Param("userId") Long userId);

    @Query("""
        SELECT c FROM Cedolino c
        WHERE c.user.id = :userId
          AND c.anno = :anno
          AND c.mese = :mese
          AND (c.aggiuntiva = :aggiuntiva OR (:aggiuntiva = false AND c.aggiuntiva IS NULL))
    """)
    List<Cedolino> findByUserAndPeriodo(
        @Param("userId") Long userId,
        @Param("anno") Integer anno,
        @Param("mese") Integer mese,
        @Param("aggiuntiva") Boolean aggiuntiva
    );
}
