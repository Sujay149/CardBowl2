package com.cardbowl.app.repository.sql.card.view;

import com.cardbowl.app.model.sql.card.view.BusinessCardView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface BusinessCardViewRepository extends JpaRepository<BusinessCardView, Long>, JpaSpecificationExecutor<BusinessCardView> {
}
