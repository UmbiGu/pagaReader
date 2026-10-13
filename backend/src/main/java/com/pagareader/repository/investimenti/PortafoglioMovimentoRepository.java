package com.pagareader.repository.investimenti;

import com.pagareader.entity.investimenti.PortafoglioMovimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PortafoglioMovimentoRepository extends JpaRepository<PortafoglioMovimento, Long> {
    List<PortafoglioMovimento> findByUserIdOrderByDataValutaAsc(Long userId);
    void deleteByUserId(Long userId);
}
