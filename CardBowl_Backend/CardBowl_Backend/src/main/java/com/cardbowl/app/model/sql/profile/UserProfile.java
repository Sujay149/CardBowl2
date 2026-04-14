package com.cardbowl.app.model.sql.profile;

import com.cardbowl.app.model.sql.BaseEntityWithUniqueKey;
import com.cardbowl.app.model.sql.auth.UserInfo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_profile")
@Getter
@Setter
public class UserProfile extends BaseEntityWithUniqueKey {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserInfo user;

    private String name;
    private String title;
    private String company;
    private String companyLogoUrl;
    private String email;
    private String phone;
    private String website;
    private String linkedin;
    private String twitter;
    private String address;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String products;

    @Column(columnDefinition = "TEXT")
    private String services;

    private String cardImageFrontUrl;
    private String cardImageBackUrl;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
