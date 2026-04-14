package com.cardbowl.app.repository.sql.card;

import com.cardbowl.app.model.sql.card.CardKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardKeywordRepository extends JpaRepository<CardKeyword, Long> {

    List<CardKeyword> findByBusinessCardId(Long businessCardId);

    void deleteByBusinessCardId(Long businessCardId);
}
