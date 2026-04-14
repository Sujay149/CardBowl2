package com.cardbowl.app.mapper.card;

import com.cardbowl.app.common.util.DateTimeMapperUtil;
import com.cardbowl.app.dto.card.PitchResultDTO;
import com.cardbowl.app.model.sql.card.PitchResult;

import java.time.LocalDateTime;
import java.time.ZoneId;

public class PitchResultMapper {

    private PitchResultMapper() {
    }

    public static void toDTO(PitchResult entity, PitchResultDTO dto) {
        dto.setUniqueKey(entity.getUniqueKey());
        dto.setPitchType(entity.getPitchType());
        dto.setText(entity.getPitchText());
        dto.setBriefExplanation(entity.getBriefExplanation());
        dto.setGrade(entity.getGrade());
        dto.setGradeLabel(entity.getGradeLabel());
        dto.setReasoning(entity.getReasoning());
        dto.setWebInfo(entity.getWebInfo());
        dto.setSource(entity.getSource());
        if (entity.getGeneratedDate() != null) {
            dto.setGeneratedAt(entity.getGeneratedDate().atZone(ZoneId.of("Asia/Kolkata")).toInstant());
        }
        DateTimeMapperUtil.convertToInstant(entity, dto);
    }

    public static void toEntity(PitchResultDTO dto, PitchResult entity) {
        entity.setPitchType(dto.getPitchType());
        entity.setPitchText(dto.getText());
        entity.setBriefExplanation(dto.getBriefExplanation());
        entity.setGrade(dto.getGrade());
        entity.setGradeLabel(dto.getGradeLabel());
        entity.setReasoning(dto.getReasoning());
        entity.setWebInfo(dto.getWebInfo());
        entity.setSource(dto.getSource());
        if (dto.getGeneratedAt() != null) {
            entity.setGeneratedDate(LocalDateTime.ofInstant(dto.getGeneratedAt(), ZoneId.of("Asia/Kolkata")));
        }
    }
}
