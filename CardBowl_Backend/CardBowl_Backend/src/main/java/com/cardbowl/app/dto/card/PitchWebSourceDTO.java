package com.cardbowl.app.dto.card;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class PitchWebSourceDTO implements Serializable {

    private String title;

    private String url;
}
