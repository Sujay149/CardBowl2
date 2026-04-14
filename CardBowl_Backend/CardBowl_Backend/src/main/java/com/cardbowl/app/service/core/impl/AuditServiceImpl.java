package com.cardbowl.app.service.core.impl;

import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.model.sql.BaseEntity;
import com.cardbowl.app.service.core.AuditService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Service
@Slf4j
public class AuditServiceImpl implements AuditService {

    @Override
    public void setAuditFields(BaseEntity entity) {
        Long currentUserId = getCurrentUserId();
        LocalDateTime now = CommonUtil.getCurrentDateTimeInIST();
        String coordinates = getCoordinatesFromRequest();

        if (entity.getId() == null) {
            // New entity
            entity.setCreatedBy(currentUserId);
            entity.setUpdatedBy(currentUserId);
            entity.setCreatedOn(now);
            entity.setUpdatedOn(now);
            entity.setCreatedAt(coordinates);
            entity.setUpdatedAt(coordinates);
        } else {
            // Existing entity
            entity.setUpdatedBy(currentUserId);
            entity.setUpdatedOn(now);
            entity.setUpdatedAt(coordinates);
        }
    }

    private Long getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getPrincipal())) {
                String username = (String) authentication.getPrincipal();
                // TODO: Look up user_info by email to get id once UserInfo entity/repository is created
                return null;
            }
        } catch (Exception e) {
            log.warn("Could not determine current user for audit: {}", e.getMessage());
        }
        return null;
    }

    private String getCoordinatesFromRequest() {
        try {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                return attributes.getRequest().getHeader("X-User-Coordinates");
            }
        } catch (Exception e) {
            log.warn("Could not retrieve coordinates from request: {}", e.getMessage());
        }
        return null;
    }
}
