package com.cardbowl.app.dto.connection;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class ConnectRequestDTO implements Serializable {

    @NotBlank(message = "Peer user key is required")
    private String peerUserKey;

    private String peerName;
}
