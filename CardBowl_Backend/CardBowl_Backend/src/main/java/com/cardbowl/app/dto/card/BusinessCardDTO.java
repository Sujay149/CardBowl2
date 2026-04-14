package com.cardbowl.app.dto.card;

import com.cardbowl.app.dto.BaseEntityDTO;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
public class BusinessCardDTO extends BaseEntityDTO {

    private String userKey;

    private String name;

    private String title;

    private String company;

    @Email
    private String email;

    private String phone;

    private String website;

    @Size(max = 500)
    private String address;

    private String linkedin;

    private String twitter;

    private String instagram;

    private String facebook;

    private String imageFrontUrl;

    private String imageBackUrl;

    private String category;

    private String orgDescription;

    private String orgLocation;

    private String webContext;

    private String notes;

    private String scanLatitude;

    private String scanLongitude;

    private String scanAddress;

    private Instant savedDate;

    private Boolean isConnectedCard;

    private String connectedUserKey;

    private List<String> keywords;

    private List<String> decisionMakers;

    private List<VoiceNoteDTO> voiceNotes;

    private PitchResultDTO pitchToThem;

    private PitchResultDTO pitchFromThem;
}
