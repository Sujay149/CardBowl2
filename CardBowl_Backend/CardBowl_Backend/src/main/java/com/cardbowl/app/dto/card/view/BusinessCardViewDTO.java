package com.cardbowl.app.dto.card.view;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;

@Getter
@Setter
public class BusinessCardViewDTO implements Serializable {

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

    private Instant savedDate;

    private Boolean isConnectedCard;

    private String userKey;

    private String ownerName;

    private Instant createdOn;

    private String searchText;
}
