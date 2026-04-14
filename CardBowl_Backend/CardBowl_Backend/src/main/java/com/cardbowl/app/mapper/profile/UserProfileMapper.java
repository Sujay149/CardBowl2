package com.cardbowl.app.mapper.profile;

import com.cardbowl.app.common.util.DateTimeMapperUtil;
import com.cardbowl.app.dto.profile.UserProfileDTO;
import com.cardbowl.app.model.sql.profile.UserProfile;
import org.springframework.beans.BeanUtils;

public class UserProfileMapper {

    private UserProfileMapper() {
    }

    public static void toDTO(UserProfile entity, UserProfileDTO dto) {
        BeanUtils.copyProperties(entity, dto, "user");
        DateTimeMapperUtil.convertToInstant(entity, dto);
        if (entity.getUser() != null) {
            dto.setUserKey(entity.getUser().getUniqueKey());
        }
    }

    public static void toEntity(UserProfileDTO dto, UserProfile entity) {
        BeanUtils.copyProperties(dto, entity, "id", "user", "keywords",
                "companyLogoUrl", "cardImageFrontUrl", "cardImageBackUrl");
        DateTimeMapperUtil.convertToLocalDateTime(dto, entity);
    }
}
