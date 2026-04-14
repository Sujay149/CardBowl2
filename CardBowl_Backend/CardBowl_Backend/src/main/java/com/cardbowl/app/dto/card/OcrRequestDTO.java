package com.cardbowl.app.dto.card;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class OcrRequestDTO implements Serializable {

    @NotBlank(message = "Image data is required")
    private String imageData;

    private String mimeType;
}
