package com.pagareader.repository.margine;

import com.pagareader.entity.margine.MargineMovimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MargineMovimentoRepository extends JpaRepository<MargineMovimento, Long> {

    @Query("""
        SELECT m FROM MargineMovimento m
        WHERE m.user.id = :userId
        ORDER BY m.anno ASC, m.mese ASC, m.data ASC
    """)
    List<MargineMovimento> findByUserIdOrderByPeriodo(@Param("userId") Long userId);

    @Query("""
        SELECT m FROM MargineMovimento m
        WHERE m.user.id = :userId
          AND m.anno = :anno
          AND m.mese = :mese
        ORDER BY m.data ASC
    """)
    List<MargineMovimento> findByUserIdAndPeriodo(
        @Param("userId") Long userId,
        @Param("anno") Integer anno,
        @Param("mese") Integer mese
    );

    @Modifying
    @Query("""
        DELETE FROM MargineMovimento m
        WHERE m.user.id = :userId
    """)
    void deleteByUserId(@Param("userId") Long userId);
}
