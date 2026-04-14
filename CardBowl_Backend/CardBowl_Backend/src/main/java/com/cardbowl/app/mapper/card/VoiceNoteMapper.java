package com.cardbowl.app.mapper.card;

import com.cardbowl.app.common.util.DateTimeMapperUtil;
import com.cardbowl.app.dto.card.VoiceNoteDTO;
import com.cardbowl.app.model.sql.card.VoiceNote;
import org.springframework.beans.BeanUtils;

import java.time.ZoneId;

public class VoiceNoteMapper {

    private VoiceNoteMapper() {
    }

    public static void toDTO(VoiceNote entity, VoiceNoteDTO dto) {
        BeanUtils.copyProperties(entity, dto, "businessCard");
        DateTimeMapperUtil.convertToInstant(entity, dto);
        if (entity.getCreatedOn() != null) {
            dto.setCreatedDate(entity.getCreatedOn().atZone(ZoneId.of("Asia/Kolkata")).toInstant());
        }
    }

    public static void toEntity(VoiceNoteDTO dto, VoiceNote entity) {
        BeanUtils.copyProperties(dto, entity, "id", "businessCard", "createdDate");
    }
}
