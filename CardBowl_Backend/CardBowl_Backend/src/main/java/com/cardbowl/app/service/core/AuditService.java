package com.cardbowl.app.service.core;

import com.cardbowl.app.model.sql.BaseEntity;

public interface AuditService {
    void setAuditFields(BaseEntity entity);
}
