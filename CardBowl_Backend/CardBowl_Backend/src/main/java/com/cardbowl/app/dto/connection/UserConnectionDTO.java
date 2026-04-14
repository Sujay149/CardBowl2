package com.cardbowl.app.dto.connection;

import com.cardbowl.app.dto.BaseEntityDTO;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class UserConnectionDTO extends BaseEntityDTO {

    private String userKey;

    private String peerUserKey;

    private String peerName;

    private Instant connectedDate;
}
