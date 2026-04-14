package com.cardbowl.app.repository.sql.card;

import com.cardbowl.app.model.sql.card.VoiceNote;
import com.cardbowl.app.repository.sql.BaseUniqueKeyRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoiceNoteRepository extends BaseUniqueKeyRepository<VoiceNote>, JpaSpecificationExecutor<VoiceNote> {

    List<VoiceNote> findByBusinessCardIdAndIsActive(Long businessCardId, Boolean isActive);

    long countByBusinessCardIdAndIsActive(Long businessCardId, Boolean isActive);
}
