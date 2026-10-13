package com.pagareader.repository;

import com.pagareader.entity.Cedolino;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CedolinoRepository extends JpaRepository<Cedolino, Long> {
    // Basic CRUD operations are automatically provided.
}
