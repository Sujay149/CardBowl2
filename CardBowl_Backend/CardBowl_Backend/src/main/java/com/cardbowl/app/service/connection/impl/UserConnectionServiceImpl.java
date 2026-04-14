package com.cardbowl.app.service.connection.impl;

import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.dto.connection.ConnectRequestDTO;
import com.cardbowl.app.dto.connection.UserConnectionDTO;
import com.cardbowl.app.exception.DuplicateResourceException;
import com.cardbowl.app.exception.ResourceNotFoundException;
import com.cardbowl.app.mapper.connection.UserConnectionMapper;
import com.cardbowl.app.model.sql.auth.UserInfo;
import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.model.sql.connection.UserConnection;
import com.cardbowl.app.model.sql.profile.UserProfile;
import com.cardbowl.app.repository.sql.auth.UserInfoRepository;
import com.cardbowl.app.repository.sql.card.BusinessCardRepository;
import com.cardbowl.app.repository.sql.connection.UserConnectionRepository;
import com.cardbowl.app.repository.sql.profile.UserProfileRepository;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.connection.UserConnectionService;
import com.cardbowl.app.service.core.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserConnectionServiceImpl implements UserConnectionService {

    private final UserConnectionRepository userConnectionRepository;
    private final UserInfoRepository userInfoRepository;
    private final UserProfileRepository userProfileRepository;
    private final BusinessCardRepository businessCardRepository;
    private final AuthService authService;
    private final AuditService auditService;

    @Override
    public UserConnectionDTO connect(ConnectRequestDTO request) {
        log.info("Creating connection with peer user key: {}", request.getPeerUserKey());

        UserInfo currentUser = authService.getCurrentUser();

        UserInfo peerUser = userInfoRepository.findByUniqueKey(request.getPeerUserKey())
                .orElseThrow(() -> {
                    log.error("Peer user not found with key: {}", request.getPeerUserKey());
                    return new ResourceNotFoundException("Peer user not found with key: " + request.getPeerUserKey());
                });

        if (userConnectionRepository.existsByUserIdAndPeerUserId(currentUser.getId(), peerUser.getId())) {
            log.error("Connection already exists between user {} and peer {}", currentUser.getId(), peerUser.getId());
            throw new DuplicateResourceException("Connection already exists with this user");
        }

        UserConnection connection = new UserConnection();
        connection.setUser(currentUser);
        connection.setPeerUser(peerUser);
        connection.setPeerName(resolvePeerName(request, peerUser));
        connection.setConnectedDate(CommonUtil.getCurrentDateTimeInIST());
        connection.setIsActive(true);

        auditService.setAuditFields(connection);
        connection = userConnectionRepository.saveWithUniqueKey(connection);

        createConnectedBusinessCard(currentUser, peerUser);

        UserConnectionDTO dto = new UserConnectionDTO();
        UserConnectionMapper.toDTO(connection, dto);

        log.info("Connection created successfully with key: {}", connection.getUniqueKey());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserConnectionDTO> getMyConnections() {
        log.info("Fetching connections for current user");

        UserInfo currentUser = authService.getCurrentUser();
        List<UserConnection> connections = userConnectionRepository.findByUserIdAndIsActive(currentUser.getId(), true);

        List<UserConnectionDTO> dtos = connections.stream()
                .map(conn -> {
                    UserConnectionDTO dto = new UserConnectionDTO();
                    UserConnectionMapper.toDTO(conn, dto);
                    return dto;
                })
                .collect(Collectors.toList());

        log.info("Fetched {} connections for user id: {}", dtos.size(), currentUser.getId());
        return dtos;
    }

    @Override
    public void deactivate(String connectionKey) {
        log.info("Deactivating connection with key: {}", connectionKey);

        UserConnection connection = userConnectionRepository.findByUniqueKey(connectionKey)
                .orElseThrow(() -> {
                    log.error("Connection not found with key: {}", connectionKey);
                    return new ResourceNotFoundException("Connection not found with key: " + connectionKey);
                });

        connection.setIsActive(false);
        connection.setDeactivatedDate(CommonUtil.getCurrentDateTimeInIST());
        auditService.setAuditFields(connection);
        userConnectionRepository.save(connection);

        log.info("Connection deactivated successfully with key: {}", connectionKey);
    }

    private String resolvePeerName(ConnectRequestDTO request, UserInfo peerUser) {
        if (request.getPeerName() != null && !request.getPeerName().isBlank()) {
            return request.getPeerName();
        }
        if (peerUser.getFirstName() != null) {
            String name = peerUser.getFirstName();
            if (peerUser.getLastName() != null) {
                name += " " + peerUser.getLastName();
            }
            return name;
        }
        return peerUser.getEmail();
    }

    private void createConnectedBusinessCard(UserInfo currentUser, UserInfo peerUser) {
        log.info("Creating connected business card for peer user id: {}", peerUser.getId());

        BusinessCard card = new BusinessCard();
        card.setUser(currentUser);
        card.setIsConnectedCard(true);
        card.setConnectedUser(peerUser);
        card.setSavedDate(CommonUtil.getCurrentDateTimeInIST());
        card.setIsActive(true);

        Optional<UserProfile> peerProfileOpt = userProfileRepository.findByUserIdAndIsActive(peerUser.getId(), true);
        if (peerProfileOpt.isPresent()) {
            UserProfile peerProfile = peerProfileOpt.get();
            card.setName(peerProfile.getName());
            card.setTitle(peerProfile.getTitle());
            card.setCompany(peerProfile.getCompany());
            card.setEmail(peerProfile.getEmail());
            card.setPhone(peerProfile.getPhone());
            card.setWebsite(peerProfile.getWebsite());
            card.setAddress(peerProfile.getAddress());
            card.setLinkedin(peerProfile.getLinkedin());
            card.setTwitter(peerProfile.getTwitter());
        } else {
            card.setName(resolvePeerName(new ConnectRequestDTO(), peerUser));
            card.setEmail(peerUser.getEmail());
        }

        auditService.setAuditFields(card);
        businessCardRepository.saveWithUniqueKey(card);

        log.info("Connected business card created for peer user id: {}", peerUser.getId());
    }
}
