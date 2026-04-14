package com.cardbowl.app.dto.card;

import com.cardbowl.app.dto.BaseEntityDTO;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter
@Setter
public class PitchResultDTO extends BaseEntityDTO {

    private String pitchType;

    private String text;

    private String briefExplanation;

    private BigDecimal grade;

    private String gradeLabel;

    private String reasoning;

    private String webInfo;

    private List<PitchWebSourceDTO> webSources;

    private Instant generatedAt;

    private String source;
}
