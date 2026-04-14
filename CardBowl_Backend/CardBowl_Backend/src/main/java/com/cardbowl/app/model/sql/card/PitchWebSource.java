package com.cardbowl.app.model.sql.card;

import com.cardbowl.app.model.sql.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "pitch_web_source")
@Getter
@Setter
public class PitchWebSource extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "pitch_result_id", nullable = false)
    private PitchResult pitchResult;

    private String title;
    private String sourceUrl;
}
