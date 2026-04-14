package com.cardbowl.app.dto.profile;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class ProfileImportRequestDTO implements Serializable {

    @NotBlank(message = "Front image is required")
    private String frontImageData;

    private String backImageData;

    private String mimeType;
}
