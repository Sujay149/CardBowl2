package com.cardbowl.app.model.sql;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

@MappedSuperclass
@Getter
@Setter
public abstract class BaseEntityWithUniqueKey extends BaseEntity {

    @Column(name = "unique_key", length = 15, unique = true)
    private String uniqueKey;
}
