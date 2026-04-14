package com.cardbowl.app.model.sql.card.view;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_card_view")
@Getter
@Setter
public class BusinessCardView {

    @Id
    private Long id;

    private String cardKey;
    private String name;
    private String title;
    private String company;
    private String email;
    private String phone;
    private String website;
    private String category;
    private String orgLocation;
    private String scanAddress;
    private LocalDateTime savedDate;

    @Column(name = "is_connected_card")
    private Boolean isConnectedCard;

    @Column(name = "is_active")
    private Boolean isActive;

    private Long userId;
    private String userKey;
    private String ownerName;
    private LocalDateTime createdOn;
    private String searchText;
}
