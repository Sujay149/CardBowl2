package com.cardbowl.app.dto.card;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class PitchRequestDTO implements Serializable {

    @NotBlank(message = "Card key is required")
    private String cardKey;
}
