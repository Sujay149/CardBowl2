package com.cardbowl.app.service.connection;

import com.cardbowl.app.dto.connection.ConnectRequestDTO;
import com.cardbowl.app.dto.connection.UserConnectionDTO;

import java.util.List;

public interface UserConnectionService {

    UserConnectionDTO connect(ConnectRequestDTO request);

    List<UserConnectionDTO> getMyConnections();

    void deactivate(String connectionKey);
}
