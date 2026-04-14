package com.cardbowl.app.repository.sql.card;

import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessCardRepository extends BaseUniqueKeyRepository<BusinessCard>, JpaSpecificationExecutor<BusinessCard> {

    List<BusinessCard> findByUserIdAndIsActive(Long userId, Boolean isActive);

    Optional<BusinessCard> findByUniqueKeyAndUserId(String uniqueKey, Long userId);

    long countByUserIdAndIsActive(Long userId, Boolean isActive);

    @Query("SELECT bc FROM BusinessCard bc WHERE bc.user.id = :userId AND bc.isActive = true AND bc.createdOn >= :since")
    List<BusinessCard> findRecentByUserId(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
