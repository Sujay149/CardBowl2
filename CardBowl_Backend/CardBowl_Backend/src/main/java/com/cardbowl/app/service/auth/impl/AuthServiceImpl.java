package com.cardbowl.app.service.auth.impl;

import com.cardbowl.app.dto.auth.AuthResponseDTO;
import com.cardbowl.app.dto.auth.LoginRequestDTO;
import com.cardbowl.app.dto.auth.RefreshTokenRequestDTO;
import com.cardbowl.app.dto.auth.RegisterRequestDTO;
import com.cardbowl.app.dto.auth.ResetPasswordRequestDTO;
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

import java.util.Locale;

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
        String normalizedEmail = normalizeEmail(request.getEmail());
        log.info("Registering user with email: {}", normalizedEmail);

        if (userInfoRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            log.error("Registration failed - email already exists: {}", normalizedEmail);
            throw new DuplicateResourceException("User with email " + normalizedEmail + " already exists");
        }

        UserInfo userInfo = new UserInfo();
        userInfo.setEmail(normalizedEmail);
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
        String normalizedEmail = normalizeEmail(request.getEmail());
        log.info("Login attempt for email: {}", normalizedEmail);

        UserInfo userInfo = userInfoRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> {
                    log.error("Login failed - user not found with email: {}", normalizedEmail);
                    return new ResourceNotFoundException("User not found with email: " + normalizedEmail);
                });

        if (!bCryptPasswordEncoder.matches(request.getPassword(), userInfo.getPasswordHash())) {
            log.error("Login failed - invalid password for email: {}", normalizedEmail);
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

        String username = normalizeEmail(jwtTokenUtil.getUsernameFromToken(request.getRefreshToken()));

        UserInfo userInfo = userInfoRepository.findByEmailIgnoreCase(username)
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
    public AuthResponseDTO resetPassword(ResetPasswordRequestDTO request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        log.info("Password reset requested for email: {}", normalizedEmail);

        UserInfo userInfo = userInfoRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> {
                    log.error("Password reset failed - user not found with email: {}", normalizedEmail);
                    return new ResourceNotFoundException("No account found with email: " + normalizedEmail);
                });

        userInfo.setPasswordHash(bCryptPasswordEncoder.encode(request.getNewPassword()));
        auditService.setAuditFields(userInfo);
        userInfoRepository.save(userInfo);

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

        log.info("Password reset successful for email: {}", normalizedEmail);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public UserInfo getCurrentUser() {
        String email = normalizeEmail(SecurityContextHolder.getContext().getAuthentication().getName());
        return userInfoRepository.findByEmailIgnoreCase(email)
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

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
