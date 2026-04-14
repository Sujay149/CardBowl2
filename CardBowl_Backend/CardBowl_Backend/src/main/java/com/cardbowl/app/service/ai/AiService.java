package com.cardbowl.app.service.ai;

import com.cardbowl.app.dto.card.BusinessCardDTO;
import com.cardbowl.app.dto.card.EnrichRequestDTO;
import com.cardbowl.app.dto.card.OcrRequestDTO;
import com.cardbowl.app.dto.card.PitchGenerateRequestDTO;
import com.cardbowl.app.dto.card.PitchResultDTO;
import com.cardbowl.app.dto.profile.ProfileImportRequestDTO;
import com.cardbowl.app.dto.profile.UserProfileDTO;

public interface AiService {

    BusinessCardDTO ocrCard(OcrRequestDTO request);

    BusinessCardDTO enrichCard(EnrichRequestDTO request);

    PitchResultDTO generatePitch(String cardKey, String pitchType);

    PitchResultDTO generatePitch(PitchGenerateRequestDTO request, String pitchType);

    UserProfileDTO extractProfileFromCard(ProfileImportRequestDTO request);
}
