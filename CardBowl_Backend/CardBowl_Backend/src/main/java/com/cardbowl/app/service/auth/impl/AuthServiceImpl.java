package com.cardbowl.app.service.auth.impl;

import com.cardbowl.app.dto.auth.AuthResponseDTO;
import com.cardbowl.app.dto.auth.LoginRequestDTO;
import com.cardbowl.app.dto.auth.RefreshTokenRequestDTO;
import com.cardbowl.app.dto.auth.RegisterRequestDTO;
import com.cardbowl.app.common.util.JwtTokenUtil;
import com.cardbowl.app.exception.DuplicateResourceException;
import com.cardbowl.app.exception.ResourceNotFoundException;
import com.cardbowl.app.exception.UnauthorizedException;
import com.cardbowl.app.model.sql.auth.UserInfo;
import com.cardbowl.app.repository.sql.auth.UserInfoRepository;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.core.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserInfoRepository userInfoRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    private final AuditService auditService;

    @Override
    public AuthResponseDTO register(RegisterRequestDTO request) {
        log.info("Registering user with email: {}", request.getEmail());

        if (userInfoRepository.existsByEmail(request.getEmail())) {
            log.error("Registration failed - email already exists: {}", request.getEmail());
            throw new DuplicateResourceException("User with email " + request.getEmail() + " already exists");
        }

        UserInfo userInfo = new UserInfo();
        userInfo.setEmail(request.getEmail());
        userInfo.setPasswordHash(bCryptPasswordEncoder.encode(request.getPassword()));
        userInfo.setFirstName(request.getFirstName());
        userInfo.setLastName(request.getLastName());
        userInfo.setMobileNo(request.getMobileNo());
        userInfo.setIsActive(true);

        auditService.setAuditFields(userInfo);
        UserInfo savedUser = userInfoRepository.saveWithUniqueKey(userInfo);

        String token = jwtTokenUtil.generateToken(savedUser.getEmail());
        String refreshToken = jwtTokenUtil.generateRefreshToken(savedUser.getEmail());

        AuthResponseDTO response = new AuthResponseDTO(
                token,
                refreshToken,
                savedUser.getUniqueKey(),
                savedUser.getEmail(),
                savedUser.getFirstName(),
                savedUser.getLastName()
        );

        log.info("User registered successfully with email: {}", savedUser.getEmail());
        return response;
    }

    @Override
    public AuthResponseDTO login(LoginRequestDTO request) {
        log.info("Login attempt for email: {}", request.getEmail());

        UserInfo userInfo = userInfoRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.error("Login failed - user not found with email: {}", request.getEmail());
                    return new ResourceNotFoundException("User not found with email: " + request.getEmail());
                });

        if (!bCryptPasswordEncoder.matches(request.getPassword(), userInfo.getPasswordHash())) {
            log.error("Login failed - invalid password for email: {}", request.getEmail());
            throw new UnauthorizedException("Invalid credentials");
        }

        String token = jwtTokenUtil.generateToken(userInfo.getEmail());
        String refreshToken = jwtTokenUtil.generateRefreshToken(userInfo.getEmail());

        AuthResponseDTO response = new AuthResponseDTO(
                token,
                refreshToken,
                userInfo.getUniqueKey(),
                userInfo.getEmail(),
                userInfo.getFirstName(),
                userInfo.getLastName()
        );

        log.info("Login successful for email: {}", userInfo.getEmail());
        return response;
    }

    @Override
    public AuthResponseDTO refreshToken(RefreshTokenRequestDTO request) {
        log.info("Refreshing token");

        if (!jwtTokenUtil.validateToken(request.getRefreshToken())) {
            log.error("Token refresh failed - invalid refresh token");
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        String username = jwtTokenUtil.getUsernameFromToken(request.getRefreshToken());

        UserInfo userInfo = userInfoRepository.findByEmail(username)
                .orElseThrow(() -> {
                    log.error("Token refresh failed - user not found for token username: {}", username);
                    return new UnauthorizedException("User not found for refresh token");
                });

        String newToken = jwtTokenUtil.generateToken(username);
        String newRefreshToken = jwtTokenUtil.generateRefreshToken(username);

        AuthResponseDTO response = new AuthResponseDTO(
                newToken,
                newRefreshToken,
                userInfo.getUniqueKey(),
                userInfo.getEmail(),
                userInfo.getFirstName(),
                userInfo.getLastName()
        );

        log.info("Token refreshed successfully for email: {}", username);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public UserInfo getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userInfoRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Current user not found for email: {}", email);
                    return new UnauthorizedException("Current user not found");
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Long getCurrentUserId() {
        return getCurrentUser().getId();
    }
}
