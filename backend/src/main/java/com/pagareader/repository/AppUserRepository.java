package com.pagareader.repository;

import com.pagareader.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    @Query("""
        SELECT u FROM AppUser u
        WHERE LOWER(u.email) = LOWER(:email)
    """)
    Optional<AppUser> findByEmail(@Param("email") String email);
}
