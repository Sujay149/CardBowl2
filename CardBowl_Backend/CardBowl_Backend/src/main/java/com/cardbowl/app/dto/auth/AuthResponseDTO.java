package com.cardbowl.app.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponseDTO implements Serializable {

    private String token;

    private String refreshToken;

    private String userKey;

    private String email;

    private String firstName;

    private String lastName;
}
