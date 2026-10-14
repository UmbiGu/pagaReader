package com.pagareader.repository.margine;

import com.pagareader.entity.margine.MargineMese;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MargineMeseRepository extends JpaRepository<MargineMese, Long> {

    @Query("""
        SELECT m FROM MargineMese m
        WHERE m.user.id = :userId
        ORDER BY m.anno ASC, m.mese ASC
    """)
    List<MargineMese> findByUserIdOrderByPeriodo(@Param("userId") Long userId);

    @Query("""
        SELECT m FROM MargineMese m
        WHERE m.user.id = :userId
          AND m.anno = :anno
          AND m.mese = :mese
    """)
    Optional<MargineMese> findByUserAndPeriodo(
        @Param("userId") Long userId,
        @Param("anno") Integer anno,
        @Param("mese") Integer mese
    );

    @Modifying
    @Query("""
        DELETE FROM MargineMese m
        WHERE m.user.id = :userId
    """)
    void deleteByUserId(@Param("userId") Long userId);
}
