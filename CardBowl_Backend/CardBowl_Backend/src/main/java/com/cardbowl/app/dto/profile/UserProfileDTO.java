package com.cardbowl.app.dto.profile;

import com.cardbowl.app.dto.BaseEntityDTO;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UserProfileDTO extends BaseEntityDTO {

    private String userKey;

    private String name;

    @Size(max = 100)
    private String title;

    @Size(max = 255)
    private String company;

    private String companyLogoUrl;

    @Email
    private String email;

    private String phone;

    private String website;

    private String linkedin;

    private String twitter;

    @Size(max = 500)
    private String address;

    private String bio;

    private String products;

    private String services;

    private List<String> keywords;

    private String cardImageFrontUrl;

    private String cardImageBackUrl;
}
