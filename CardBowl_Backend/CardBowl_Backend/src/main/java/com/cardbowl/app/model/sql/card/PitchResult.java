package com.cardbowl.app.model.sql.card;

import com.cardbowl.app.model.sql.BaseEntityWithUniqueKey;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pitch_result")
@Getter
@Setter
public class PitchResult extends BaseEntityWithUniqueKey {

    @ManyToOne
    @JoinColumn(name = "business_card_id", nullable = false)
    private BusinessCard businessCard;

    private String pitchType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String pitchText;

    @Column(columnDefinition = "TEXT")
    private String briefExplanation;

    private BigDecimal grade;
    private String gradeLabel;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    @Column(columnDefinition = "TEXT")
    private String webInfo;

    private LocalDateTime generatedDate;
    private String source;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
