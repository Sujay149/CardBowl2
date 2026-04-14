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
@Table(name = "voice_note")
@Getter
@Setter
public class VoiceNote extends BaseEntityWithUniqueKey {

    @ManyToOne
    @JoinColumn(name = "business_card_id", nullable = false)
    private BusinessCard businessCard;

    @Column(nullable = false)
    private String fileUrl;

    private BigDecimal durationSeconds;
    private String label;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
