package com.cardbowl.app.dto.card;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class EnrichRequestDTO implements Serializable {

    private String name;

    private String company;

    private String title;

    private String website;

    private String email;
}
