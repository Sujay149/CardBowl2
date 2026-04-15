package com.cardbowl.app.controller.auth;

import com.cardbowl.app.common.ApiResponse;
import com.cardbowl.app.controller.BaseController;
import com.cardbowl.app.dto.auth.AuthResponseDTO;
import com.cardbowl.app.dto.auth.LoginRequestDTO;
import com.cardbowl.app.dto.auth.RefreshTokenRequestDTO;
import com.cardbowl.app.dto.auth.RegisterRequestDTO;
import com.cardbowl.app.dto.auth.ResetPasswordRequestDTO;
import com.cardbowl.app.repository.sql.auth.UserInfoRepository;
import com.cardbowl.app.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController extends BaseController {

    private final AuthService authService;
    private final UserInfoRepository userInfoRepository;

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

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Object>> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request) {
        AuthResponseDTO response = authService.resetPassword(request);
        return buildSuccessResponse(HttpStatus.OK, "Password reset successfully", response);
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Object>> getAuthStats() {
        Map<String, Object> stats = Map.of("totalUsers", userInfoRepository.count());
        return buildSuccessResponse(HttpStatus.OK, "Auth stats fetched", stats);
    }
}
