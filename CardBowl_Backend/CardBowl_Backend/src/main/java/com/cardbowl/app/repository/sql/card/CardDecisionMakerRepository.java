package com.cardbowl.app.repository.sql.card;

import com.cardbowl.app.model.sql.card.CardDecisionMaker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardDecisionMakerRepository extends JpaRepository<CardDecisionMaker, Long> {

    List<CardDecisionMaker> findByBusinessCardId(Long businessCardId);

    void deleteByBusinessCardId(Long businessCardId);
}
