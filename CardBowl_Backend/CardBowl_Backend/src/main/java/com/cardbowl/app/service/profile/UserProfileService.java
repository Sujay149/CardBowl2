package com.cardbowl.app.service.profile;

import com.cardbowl.app.dto.profile.UserProfileDTO;
import org.springframework.web.multipart.MultipartFile;

public interface UserProfileService {

    UserProfileDTO getMyProfile();

    UserProfileDTO getByKey(String profileKey);

    UserProfileDTO createOrUpdate(UserProfileDTO request);

    void uploadCompanyLogo(MultipartFile file);

    void uploadCardImages(MultipartFile front, MultipartFile back);
}
