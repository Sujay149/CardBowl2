package com.cardbowl.app.model.sql.connection;

import com.cardbowl.app.model.sql.BaseEntityWithUniqueKey;
import com.cardbowl.app.model.sql.auth.UserInfo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_connection")
@Getter
@Setter
public class UserConnection extends BaseEntityWithUniqueKey {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserInfo user;

    @ManyToOne
    @JoinColumn(name = "peer_user_id", nullable = false)
    private UserInfo peerUser;

    private String peerName;
    private LocalDateTime connectedDate;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
