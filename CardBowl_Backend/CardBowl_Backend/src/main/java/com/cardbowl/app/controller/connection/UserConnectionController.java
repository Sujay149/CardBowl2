package com.cardbowl.app.controller.connection;

import com.cardbowl.app.common.ApiResponse;
import com.cardbowl.app.controller.BaseController;
import com.cardbowl.app.dto.connection.ConnectRequestDTO;
import com.cardbowl.app.dto.connection.UserConnectionDTO;
import com.cardbowl.app.service.connection.UserConnectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/connections")
@RequiredArgsConstructor
public class UserConnectionController extends BaseController {

    private final UserConnectionService connectionService;

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> connect(@Valid @RequestBody ConnectRequestDTO request) {
        UserConnectionDTO connection = connectionService.connect(request);
        return buildSuccessResponse(HttpStatus.CREATED, "Connection created successfully", connection);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> getMyConnections() {
        List<UserConnectionDTO> connections = connectionService.getMyConnections();
        return buildSuccessResponse(HttpStatus.OK, "Connections retrieved successfully", connections);
    }

    @PutMapping("/{connectionKey}/deactivate")
    public ResponseEntity<ApiResponse<Object>> deactivate(@PathVariable String connectionKey) {
        connectionService.deactivate(connectionKey);
        return buildSuccessResponse(HttpStatus.OK, "Connection deactivated successfully", null);
    }
}
