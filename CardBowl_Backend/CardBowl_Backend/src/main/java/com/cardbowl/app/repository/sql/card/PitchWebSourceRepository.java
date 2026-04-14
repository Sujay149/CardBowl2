package com.cardbowl.app.repository.sql.card;

import com.cardbowl.app.model.sql.card.PitchWebSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PitchWebSourceRepository extends JpaRepository<PitchWebSource, Long> {

    List<PitchWebSource> findByPitchResultId(Long pitchResultId);

    void deleteByPitchResultId(Long pitchResultId);
}
