package com.cardbowl.app.model.sql.core;

import com.cardbowl.app.model.sql.BaseEntityWithUniqueKey;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "lookup")
@Getter
@Setter
public class Lookup extends BaseEntityWithUniqueKey {

    private String category;
    private String lookupValue;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
