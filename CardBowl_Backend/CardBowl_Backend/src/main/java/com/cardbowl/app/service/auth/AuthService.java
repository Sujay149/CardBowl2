package com.cardbowl.app.service.auth;

import com.cardbowl.app.dto.auth.AuthResponseDTO;
import com.cardbowl.app.dto.auth.LoginRequestDTO;
import com.cardbowl.app.dto.auth.RefreshTokenRequestDTO;
import com.cardbowl.app.dto.auth.RegisterRequestDTO;
import com.cardbowl.app.model.sql.auth.UserInfo;

public interface AuthService {

    AuthResponseDTO register(RegisterRequestDTO request);

    AuthResponseDTO login(LoginRequestDTO request);

    AuthResponseDTO refreshToken(RefreshTokenRequestDTO request);

    UserInfo getCurrentUser();

    Long getCurrentUserId();
}
