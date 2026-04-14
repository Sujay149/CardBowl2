package com.cardbowl.app.mapper.core;

import com.cardbowl.app.common.util.DateTimeMapperUtil;
import com.cardbowl.app.dto.core.LookupDTO;
import com.cardbowl.app.model.sql.core.Lookup;
import org.springframework.beans.BeanUtils;

public class LookupMapper {

    private LookupMapper() {
    }

    public static void toDTO(Lookup entity, LookupDTO dto) {
        BeanUtils.copyProperties(entity, dto);
        DateTimeMapperUtil.convertToInstant(entity, dto);
    }

    public static void toEntity(LookupDTO dto, Lookup entity) {
        BeanUtils.copyProperties(dto, entity, "id", "uniqueKey");
        DateTimeMapperUtil.convertToLocalDateTime(dto, entity);
    }
}
