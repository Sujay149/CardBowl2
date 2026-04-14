package com.cardbowl.app.controller.auth;

import com.cardbowl.app.common.ApiResponse;
import com.cardbowl.app.controller.BaseController;
import com.cardbowl.app.dto.auth.AuthResponseDTO;
import com.cardbowl.app.dto.auth.LoginRequestDTO;
import com.cardbowl.app.dto.auth.RefreshTokenRequestDTO;
import com.cardbowl.app.dto.auth.RegisterRequestDTO;
import com.cardbowl.app.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController extends BaseController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Object>> register(@Valid @RequestBody RegisterRequestDTO request) {
        AuthResponseDTO response = authService.register(request);
        return buildSuccessResponse(HttpStatus.CREATED, "User registered successfully", response);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Object>> login(@Valid @RequestBody LoginRequestDTO request) {
        AuthResponseDTO response = authService.login(request);
        return buildSuccessResponse(HttpStatus.OK, "Login successful", response);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<Object>> refreshToken(@Valid @RequestBody RefreshTokenRequestDTO request) {
        AuthResponseDTO response = authService.refreshToken(request);
        return buildSuccessResponse(HttpStatus.OK, "Token refreshed successfully", response);
    }
}
