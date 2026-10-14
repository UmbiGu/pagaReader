package com.pagareader.repository.investimenti;

import com.pagareader.entity.investimenti.PortafoglioMovimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortafoglioMovimentoRepository extends JpaRepository<PortafoglioMovimento, Long> {

    @Query("""
        SELECT m FROM PortafoglioMovimento m
        WHERE m.user.id = :userId
        ORDER BY m.dataValuta ASC
    """)
    List<PortafoglioMovimento> findByUserIdOrderByDataValutaAsc(@Param("userId") Long userId);

    @Modifying
    @Query("""
        DELETE FROM PortafoglioMovimento m
        WHERE m.user.id = :userId
    """)
    void deleteByUserId(@Param("userId") Long userId);
}
