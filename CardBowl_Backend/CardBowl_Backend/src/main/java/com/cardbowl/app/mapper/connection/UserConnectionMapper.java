package com.cardbowl.app.mapper.connection;

import com.cardbowl.app.common.util.DateTimeMapperUtil;
import com.cardbowl.app.dto.connection.UserConnectionDTO;
import com.cardbowl.app.model.sql.connection.UserConnection;
import org.springframework.beans.BeanUtils;

import java.time.ZoneId;

public class UserConnectionMapper {

    private UserConnectionMapper() {
    }

    public static void toDTO(UserConnection entity, UserConnectionDTO dto) {
        BeanUtils.copyProperties(entity, dto, "user", "peerUser");
        DateTimeMapperUtil.convertToInstant(entity, dto);
        if (entity.getUser() != null) {
            dto.setUserKey(entity.getUser().getUniqueKey());
        }
        if (entity.getPeerUser() != null) {
            dto.setPeerUserKey(entity.getPeerUser().getUniqueKey());
        }
        if (entity.getConnectedDate() != null) {
            dto.setConnectedDate(entity.getConnectedDate().atZone(ZoneId.of("Asia/Kolkata")).toInstant());
        }
    }

    public static void toEntity(UserConnectionDTO dto, UserConnection entity) {
        BeanUtils.copyProperties(dto, entity, "id", "uniqueKey", "user", "peerUser",
                "connectedDate", "userKey", "peerUserKey");
    }
}
