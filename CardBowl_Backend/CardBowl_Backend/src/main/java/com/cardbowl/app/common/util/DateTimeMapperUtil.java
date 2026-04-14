package com.cardbowl.app.common.util;

import com.cardbowl.app.dto.BaseEntityDTO;
import com.cardbowl.app.model.sql.BaseEntity;

import java.time.LocalDateTime;
import java.time.ZoneId;

public class DateTimeMapperUtil {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    public static void convertToInstant(BaseEntity entity, BaseEntityDTO dto) {
        if (entity.getCreatedOn() != null) {
            dto.setCreatedOn(entity.getCreatedOn().atZone(IST).toInstant());
        }
        if (entity.getUpdatedOn() != null) {
            dto.setUpdatedOn(entity.getUpdatedOn().atZone(IST).toInstant());
        }
    }

    public static void convertToLocalDateTime(BaseEntityDTO dto, BaseEntity entity) {
        if (dto.getCreatedOn() != null) {
            entity.setCreatedOn(LocalDateTime.ofInstant(dto.getCreatedOn(), IST));
        }
        if (dto.getUpdatedOn() != null) {
            entity.setUpdatedOn(LocalDateTime.ofInstant(dto.getUpdatedOn(), IST));
        }
    }
}
