package com.cardbowl.app.model.sql.card;

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
@Table(name = "business_card")
@Getter
@Setter
public class BusinessCard extends BaseEntityWithUniqueKey {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserInfo user;

    private String name;
    private String title;
    private String company;
    private String email;
    private String phone;
    private String website;
    private String address;
    private String linkedin;
    private String twitter;
    private String instagram;
    private String facebook;
    private String imageFrontUrl;
    private String imageBackUrl;
    private String category;

    @Column(columnDefinition = "TEXT")
    private String orgDescription;

    private String orgLocation;

    @Column(columnDefinition = "TEXT")
    private String webContext;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String scanLatitude;
    private String scanLongitude;
    private String scanAddress;
    private LocalDateTime savedDate;

    @Column(name = "is_connected_card")
    private Boolean isConnectedCard;

    @ManyToOne
    @JoinColumn(name = "connected_user_id")
    private UserInfo connectedUser;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
