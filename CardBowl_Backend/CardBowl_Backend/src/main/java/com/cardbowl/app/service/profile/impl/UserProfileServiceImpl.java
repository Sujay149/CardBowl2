package com.cardbowl.app.service.profile.impl;

import com.cardbowl.app.dto.profile.UserProfileDTO;
import com.cardbowl.app.exception.ResourceNotFoundException;
import com.cardbowl.app.mapper.profile.UserProfileMapper;
import com.cardbowl.app.model.sql.auth.UserInfo;
import com.cardbowl.app.model.sql.profile.ProfileKeyword;
import com.cardbowl.app.model.sql.profile.UserProfile;
import com.cardbowl.app.repository.sql.profile.ProfileKeywordRepository;
import com.cardbowl.app.repository.sql.profile.UserProfileRepository;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.core.AuditService;
import com.cardbowl.app.service.core.FileStorageService;
import com.cardbowl.app.service.profile.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final ProfileKeywordRepository profileKeywordRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional(readOnly = true)
    public UserProfileDTO getMyProfile() {
        log.info("Fetching profile for current user");

        UserInfo currentUser = authService.getCurrentUser();
        Optional<UserProfile> profileOpt = userProfileRepository.findByUserIdAndIsActive(currentUser.getId(), true);

        if (profileOpt.isEmpty()) {
            log.info("No profile found for user id: {}, returning empty DTO", currentUser.getId());
            return new UserProfileDTO();
        }

        UserProfile profile = profileOpt.get();
        UserProfileDTO dto = mapToDto(profile);

        log.info("Profile fetched successfully for user id: {}", currentUser.getId());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileDTO getByKey(String profileKey) {
        log.info("Fetching profile by key: {}", profileKey);

        UserProfile profile = userProfileRepository.findByUniqueKey(profileKey)
                .orElseThrow(() -> {
                    log.error("Profile not found with key: {}", profileKey);
                    return new ResourceNotFoundException("Profile not found with key: " + profileKey);
                });

        UserProfileDTO dto = mapToDto(profile);

        log.info("Profile fetched successfully by key: {}", profileKey);
        return dto;
    }

    @Override
    public UserProfileDTO createOrUpdate(UserProfileDTO request) {
        log.info("Creating or updating profile for current user");

        UserInfo currentUser = authService.getCurrentUser();
        Optional<UserProfile> existingOpt = userProfileRepository.findByUserIdAndIsActive(currentUser.getId(), true);

        UserProfile profile;

        if (existingOpt.isPresent()) {
            log.info("Updating existing profile for user id: {}", currentUser.getId());
            profile = existingOpt.get();
            UserProfileMapper.toEntity(request, profile);

            profileKeywordRepository.deleteByUserProfileId(profile.getId());
            saveKeywords(profile, request.getKeywords());

            auditService.setAuditFields(profile);
            profile = userProfileRepository.save(profile);
        } else {
            log.info("Creating new profile for user id: {}", currentUser.getId());
            profile = new UserProfile();
            UserProfileMapper.toEntity(request, profile);
            profile.setUser(currentUser);
            profile.setIsActive(true);

            auditService.setAuditFields(profile);
            profile = userProfileRepository.saveWithUniqueKey(profile);

            saveKeywords(profile, request.getKeywords());
        }

        UserProfileDTO dto = mapToDto(profile);

        log.info("Profile created/updated successfully for user id: {}", currentUser.getId());
        return dto;
    }

    @Override
    public void uploadCompanyLogo(MultipartFile file) {
        log.info("Uploading company logo for current user");

        UserInfo currentUser = authService.getCurrentUser();
        UserProfile profile = userProfileRepository.findByUserIdAndIsActive(currentUser.getId(), true)
                .orElseThrow(() -> {
                    log.error("Profile not found for user id: {}", currentUser.getId());
                    return new ResourceNotFoundException("Profile not found for current user");
                });

        String fileUrl = fileStorageService.storeFile(file, "logos");
        profile.setCompanyLogoUrl(fileUrl);
        auditService.setAuditFields(profile);
        userProfileRepository.save(profile);

        log.info("Company logo uploaded successfully for user id: {}", currentUser.getId());
    }

    @Override
    public void uploadCardImages(MultipartFile front, MultipartFile back) {
        log.info("Uploading card images for current user");

        UserInfo currentUser = authService.getCurrentUser();
        UserProfile profile = userProfileRepository.findByUserIdAndIsActive(currentUser.getId(), true)
                .orElseThrow(() -> {
                    log.error("Profile not found for user id: {}", currentUser.getId());
                    return new ResourceNotFoundException("Profile not found for current user");
                });

        String frontUrl = fileStorageService.storeFile(front, "card-images");
        profile.setCardImageFrontUrl(frontUrl);

        if (back != null) {
            String backUrl = fileStorageService.storeFile(back, "card-images");
            profile.setCardImageBackUrl(backUrl);
        }

        auditService.setAuditFields(profile);
        userProfileRepository.save(profile);

        log.info("Card images uploaded successfully for user id: {}", currentUser.getId());
    }

    private UserProfileDTO mapToDto(UserProfile profile) {
        UserProfileDTO dto = new UserProfileDTO();
        UserProfileMapper.toDTO(profile, dto);

        List<ProfileKeyword> keywords = profileKeywordRepository.findByUserProfileId(profile.getId());
        dto.setKeywords(keywords.stream()
                .map(ProfileKeyword::getKeyword)
                .collect(Collectors.toList()));

        return dto;
    }

    private void saveKeywords(UserProfile profile, List<String> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            return;
        }

        List<ProfileKeyword> keywordEntities = new ArrayList<>();
        for (String keyword : keywords) {
            ProfileKeyword pk = new ProfileKeyword();
            pk.setUserProfile(profile);
            pk.setKeyword(keyword);
            auditService.setAuditFields(pk);
            keywordEntities.add(pk);
        }
        profileKeywordRepository.saveAll(keywordEntities);
    }
}
