package com.cardbowl.app.dto.card;

import com.cardbowl.app.dto.profile.UserProfileDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class PitchGenerateRequestDTO implements Serializable {

    @Valid
    @NotNull(message = "Card data is required")
    private BusinessCardDTO card;

    @Valid
    private UserProfileDTO userProfile;
}
