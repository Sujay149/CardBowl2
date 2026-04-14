package com.cardbowl.app.dto.card;

import com.cardbowl.app.dto.BaseEntityDTO;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
public class VoiceNoteDTO extends BaseEntityDTO {

    private String fileUrl;

    private BigDecimal durationSeconds;

    private String label;

    private Instant createdDate;
}
