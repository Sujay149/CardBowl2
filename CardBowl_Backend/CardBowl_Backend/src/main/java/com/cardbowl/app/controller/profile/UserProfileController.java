package com.cardbowl.app.controller.profile;

import com.cardbowl.app.common.ApiResponse;
import com.cardbowl.app.controller.BaseController;
import com.cardbowl.app.dto.profile.UserProfileDTO;
import com.cardbowl.app.service.profile.UserProfileService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/user-profiles")
@RequiredArgsConstructor
public class UserProfileController extends BaseController {

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Object>> getMyProfile() {
        UserProfileDTO profile = userProfileService.getMyProfile();
        return buildSuccessResponse(HttpStatus.OK, "Profile retrieved successfully", profile);
    }

    @GetMapping("/{profileKey}")
    public ResponseEntity<ApiResponse<Object>> getByKey(@PathVariable String profileKey) {
        UserProfileDTO profile = userProfileService.getByKey(profileKey);
        return buildSuccessResponse(HttpStatus.OK, "Profile retrieved successfully", profile);
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Object>> createOrUpdate(@Valid @RequestBody UserProfileDTO request) {
        UserProfileDTO profile = userProfileService.createOrUpdate(request);
        return buildSuccessResponse(HttpStatus.OK, "Profile saved successfully", profile);
    }

    @PostMapping("/logo")
    public ResponseEntity<ApiResponse<Object>> uploadCompanyLogo(@RequestParam("file") MultipartFile file) {
        userProfileService.uploadCompanyLogo(file);
        return buildSuccessResponse(HttpStatus.OK, "Company logo uploaded successfully", null);
    }

    @PostMapping("/card-images")
    public ResponseEntity<ApiResponse<Object>> uploadCardImages(
            @RequestParam("front") MultipartFile front,
            @RequestParam(value = "back", required = false) MultipartFile back) {
        userProfileService.uploadCardImages(front, back);
        return buildSuccessResponse(HttpStatus.OK, "Card images uploaded successfully", null);
    }
}
