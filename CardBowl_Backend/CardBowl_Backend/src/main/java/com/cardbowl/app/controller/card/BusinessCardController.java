package com.cardbowl.app.controller.card;

import com.cardbowl.app.common.ApiResponse;
import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.common.util.FilterCriteriaUtil;
import com.cardbowl.app.controller.BaseController;
import com.cardbowl.app.dto.FilterCriteria;
import com.cardbowl.app.dto.card.BusinessCardDTO;
import com.cardbowl.app.dto.card.EnrichRequestDTO;
import com.cardbowl.app.dto.card.OcrRequestDTO;
import com.cardbowl.app.dto.card.PitchGenerateRequestDTO;
import com.cardbowl.app.dto.card.PitchResultDTO;
import com.cardbowl.app.dto.card.VoiceNoteDTO;
import com.cardbowl.app.dto.card.view.BusinessCardViewDTO;
import com.cardbowl.app.dto.profile.ProfileImportRequestDTO;
import com.cardbowl.app.dto.profile.UserProfileDTO;
import com.cardbowl.app.service.ai.AiService;
import com.cardbowl.app.service.card.BusinessCardService;
import com.cardbowl.app.service.card.VoiceNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/business-cards")
@RequiredArgsConstructor
public class BusinessCardController extends BaseController {

    private final BusinessCardService businessCardService;
    private final VoiceNoteService voiceNoteService;
    private final AiService aiService;

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> create(@Valid @RequestBody BusinessCardDTO request) {
        BusinessCardDTO card = businessCardService.create(request);
        return buildSuccessResponse(HttpStatus.CREATED, "Business card created successfully", card);
    }

    @GetMapping("/{cardKey}")
    public ResponseEntity<ApiResponse<Object>> getByKey(@PathVariable String cardKey) {
        BusinessCardDTO card = businessCardService.getByKey(cardKey);
        return buildSuccessResponse(HttpStatus.OK, "Business card retrieved successfully", card);
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Object>> update(@Valid @RequestBody BusinessCardDTO request) {
        BusinessCardDTO card = businessCardService.update(request);
        return buildSuccessResponse(HttpStatus.OK, "Business card updated successfully", card);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @RequestParam Map<String, String> allParams,
            @PageableDefault(size = CommonUtil.DEFAULT_PAGE_SIZE) Pageable pageable) {
        List<FilterCriteria> filters = FilterCriteriaUtil.buildFilterCriteriaList(allParams);
        Page<BusinessCardViewDTO> cards = businessCardService.list(filters, pageable);
        return buildSuccessResponse(HttpStatus.OK, "Business cards retrieved successfully", cards);
    }

    @PutMapping("/{cardKey}/deactivate")
    public ResponseEntity<ApiResponse<Object>> deactivate(@PathVariable String cardKey) {
        businessCardService.deactivate(cardKey);
        return buildSuccessResponse(HttpStatus.OK, "Business card deactivated successfully", null);
    }

    @PutMapping("/{cardKey}/activate")
    public ResponseEntity<ApiResponse<Object>> activate(@PathVariable String cardKey) {
        businessCardService.activate(cardKey);
        return buildSuccessResponse(HttpStatus.OK, "Business card activated successfully", null);
    }

    // Voice Note endpoints

    @PostMapping("/{cardKey}/voice-notes")
    public ResponseEntity<ApiResponse<Object>> uploadVoiceNote(
            @PathVariable String cardKey,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "label", required = false) String label) {
        VoiceNoteDTO voiceNote = voiceNoteService.upload(cardKey, file, label);
        return buildSuccessResponse(HttpStatus.CREATED, "Voice note uploaded successfully", voiceNote);
    }

    @GetMapping("/{cardKey}/voice-notes")
    public ResponseEntity<ApiResponse<Object>> getVoiceNotes(@PathVariable String cardKey) {
        List<VoiceNoteDTO> voiceNotes = voiceNoteService.getByCardKey(cardKey);
        return buildSuccessResponse(HttpStatus.OK, "Voice notes retrieved successfully", voiceNotes);
    }

    @PutMapping("/voice-notes/{voiceNoteKey}/deactivate")
    public ResponseEntity<ApiResponse<Object>> deleteVoiceNote(@PathVariable String voiceNoteKey) {
        voiceNoteService.delete(voiceNoteKey);
        return buildSuccessResponse(HttpStatus.OK, "Voice note deleted successfully", null);
    }

    // AI endpoints

    @PostMapping("/ocr")
    public ResponseEntity<ApiResponse<Object>> ocrCard(@Valid @RequestBody OcrRequestDTO request) {
        BusinessCardDTO result = aiService.ocrCard(request);
        return buildSuccessResponse(HttpStatus.OK, "Card OCR processed successfully", result);
    }

    @PostMapping("/enrich")
    public ResponseEntity<ApiResponse<Object>> enrichCard(@Valid @RequestBody EnrichRequestDTO request) {
        BusinessCardDTO result = aiService.enrichCard(request);
        return buildSuccessResponse(HttpStatus.OK, "Card enriched successfully", result);
    }

    @PostMapping("/{cardKey}/pitch/to-them")
    public ResponseEntity<ApiResponse<Object>> generatePitchToThem(@PathVariable String cardKey) {
        PitchResultDTO result = aiService.generatePitch(cardKey, "TO_THEM");
        return buildSuccessResponse(HttpStatus.OK, "Pitch generated successfully", result);
    }

    @PostMapping("/pitch/to-them")
    public ResponseEntity<ApiResponse<Object>> generatePitchToThemFromPayload(@Valid @RequestBody PitchGenerateRequestDTO request) {
        PitchResultDTO result = aiService.generatePitch(request, "TO_THEM");
        return buildSuccessResponse(HttpStatus.OK, "Pitch generated successfully", result);
    }

    @PostMapping("/{cardKey}/pitch/from-them")
    public ResponseEntity<ApiResponse<Object>> generatePitchFromThem(@PathVariable String cardKey) {
        PitchResultDTO result = aiService.generatePitch(cardKey, "FROM_THEM");
        return buildSuccessResponse(HttpStatus.OK, "Pitch generated successfully", result);
    }

    @PostMapping("/pitch/from-them")
    public ResponseEntity<ApiResponse<Object>> generatePitchFromThemFromPayload(@Valid @RequestBody PitchGenerateRequestDTO request) {
        PitchResultDTO result = aiService.generatePitch(request, "FROM_THEM");
        return buildSuccessResponse(HttpStatus.OK, "Pitch generated successfully", result);
    }

    @PostMapping("/import-profile")
    public ResponseEntity<ApiResponse<Object>> importProfile(@Valid @RequestBody ProfileImportRequestDTO request) {
        UserProfileDTO result = aiService.extractProfileFromCard(request);
        return buildSuccessResponse(HttpStatus.OK, "Profile extracted successfully", result);
    }
}
