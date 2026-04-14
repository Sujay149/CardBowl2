package com.cardbowl.app.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class RefreshTokenRequestDTO implements Serializable {

    @NotBlank(message = "Refresh token is required")
    private String refreshToken;
}
