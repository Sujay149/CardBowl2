package com.cardbowl.app.dto.card;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class EnrichRequestDTO implements Serializable {

    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotBlank(message = "Company is required for enrichment")
    @Size(max = 255, message = "Company must not exceed 255 characters")
    private String company;

    @Size(max = 100, message = "Title must not exceed 100 characters")
    private String title;

    @Size(max = 500, message = "Website must not exceed 500 characters")
    private String website;

    private String email;
}
