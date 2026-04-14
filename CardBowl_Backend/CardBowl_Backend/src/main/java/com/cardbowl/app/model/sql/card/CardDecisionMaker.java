package com.cardbowl.app.model.sql.card;

import com.cardbowl.app.model.sql.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "card_decision_maker")
@Getter
@Setter
public class CardDecisionMaker extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "business_card_id", nullable = false)
    private BusinessCard businessCard;

    @Column(nullable = false)
    private String name;
}
