package com.cardbowl.app.model.sql.auth;

import com.cardbowl.app.model.sql.BaseEntityWithUniqueKey;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
public class UserInfo extends BaseEntityWithUniqueKey {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private String mobileNo;
    private String firstName;
    private String lastName;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
