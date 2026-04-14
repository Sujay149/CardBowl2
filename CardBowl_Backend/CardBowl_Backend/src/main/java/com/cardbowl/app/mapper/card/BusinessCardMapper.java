package com.cardbowl.app.mapper.card;

import com.cardbowl.app.common.util.DateTimeMapperUtil;
import com.cardbowl.app.dto.card.BusinessCardDTO;
import com.cardbowl.app.dto.card.view.BusinessCardViewDTO;
import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.model.sql.card.view.BusinessCardView;
import org.springframework.beans.BeanUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;

public class BusinessCardMapper {

    private BusinessCardMapper() {
    }

    public static void toDTO(BusinessCard entity, BusinessCardDTO dto) {
        BeanUtils.copyProperties(entity, dto, "user", "connectedUser");
        DateTimeMapperUtil.convertToInstant(entity, dto);
        if (entity.getUser() != null) {
            dto.setUserKey(entity.getUser().getUniqueKey());
        }
        if (entity.getConnectedUser() != null) {
            dto.setConnectedUserKey(entity.getConnectedUser().getUniqueKey());
        }
        // savedDate conversion
        if (entity.getSavedDate() != null) {
            dto.setSavedDate(entity.getSavedDate().atZone(ZoneId.of("Asia/Kolkata")).toInstant());
        }
    }

    public static void toEntity(BusinessCardDTO dto, BusinessCard entity) {
        BeanUtils.copyProperties(dto, entity, "id", "uniqueKey", "user", "connectedUser",
                "keywords", "decisionMakers", "voiceNotes", "pitchToThem", "pitchFromThem",
                "savedDate", "userKey", "connectedUserKey",
                "imageFrontUrl", "imageBackUrl");
        DateTimeMapperUtil.convertToLocalDateTime(dto, entity);
        // savedDate conversion
        if (dto.getSavedDate() != null) {
            entity.setSavedDate(LocalDateTime.ofInstant(dto.getSavedDate(), ZoneId.of("Asia/Kolkata")));
        }
    }

    public static void toViewDTO(BusinessCardView view, BusinessCardViewDTO dto) {
        BeanUtils.copyProperties(view, dto);
        if (view.getSavedDate() != null) {
            dto.setSavedDate(view.getSavedDate().atZone(ZoneId.of("Asia/Kolkata")).toInstant());
        }
        if (view.getCreatedOn() != null) {
            dto.setCreatedOn(view.getCreatedOn().atZone(ZoneId.of("Asia/Kolkata")).toInstant());
        }
    }
}
