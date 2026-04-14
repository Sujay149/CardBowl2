package com.cardbowl.app.repository.sql.card;

import com.cardbowl.app.model.sql.card.PitchResult;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PitchResultRepository extends BaseUniqueKeyRepository<PitchResult>, JpaSpecificationExecutor<PitchResult> {

    Optional<PitchResult> findByBusinessCardIdAndPitchTypeAndIsActive(Long businessCardId, String pitchType, Boolean isActive);

    List<PitchResult> findByBusinessCardIdAndIsActive(Long businessCardId, Boolean isActive);
}
