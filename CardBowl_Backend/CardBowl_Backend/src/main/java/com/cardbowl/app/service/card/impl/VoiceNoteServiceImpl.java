package com.cardbowl.app.service.card.impl;

import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.dto.card.VoiceNoteDTO;
import com.cardbowl.app.exception.InvalidRequestException;
import com.cardbowl.app.exception.ResourceNotFoundException;
import com.cardbowl.app.mapper.card.VoiceNoteMapper;
import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.model.sql.card.VoiceNote;
import com.cardbowl.app.repository.sql.card.BusinessCardRepository;
import com.cardbowl.app.repository.sql.card.VoiceNoteRepository;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.card.VoiceNoteService;
import com.cardbowl.app.service.core.AuditService;
import com.cardbowl.app.service.core.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class VoiceNoteServiceImpl implements VoiceNoteService {

    private final VoiceNoteRepository voiceNoteRepository;
    private final BusinessCardRepository businessCardRepository;
    private final FileStorageService fileStorageService;
    private final AuthService authService;
    private final AuditService auditService;

    @Override
    public VoiceNoteDTO upload(String cardKey, MultipartFile file, String label) {
        log.info("Uploading voice note for card: {}", cardKey);

        BusinessCard card = businessCardRepository.findByUniqueKey(cardKey)
                .orElseThrow(() -> new ResourceNotFoundException("Business card not found: " + cardKey));

        // Verify ownership
        Long currentUserId = authService.getCurrentUserId();
        if (!card.getUser().getId().equals(currentUserId)) {
            throw new InvalidRequestException("You are not authorized to add voice notes to this business card");
        }

        // Store file
        String fileUrl = fileStorageService.storeFile(file, "voice-notes");

        // Create voice note entity
        VoiceNote voiceNote = new VoiceNote();
        voiceNote.setBusinessCard(card);
        voiceNote.setFileUrl(fileUrl);
        voiceNote.setLabel(label);
        voiceNote.setDurationSeconds(null); // Duration is sent separately by the client
        voiceNote.setIsActive(true);
        auditService.setAuditFields(voiceNote);
        voiceNote = voiceNoteRepository.saveWithUniqueKey(voiceNote);

        VoiceNoteDTO dto = new VoiceNoteDTO();
        VoiceNoteMapper.toDTO(voiceNote, dto);

        log.info("Voice note uploaded with key: {}", dto.getUniqueKey());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoiceNoteDTO> getByCardKey(String cardKey) {
        log.info("Retrieving voice notes for card: {}", cardKey);

        BusinessCard card = businessCardRepository.findByUniqueKey(cardKey)
                .orElseThrow(() -> new ResourceNotFoundException("Business card not found: " + cardKey));

        List<VoiceNote> voiceNotes = voiceNoteRepository.findByBusinessCardIdAndIsActive(card.getId(), true);

        List<VoiceNoteDTO> dtos = voiceNotes.stream().map(vn -> {
            VoiceNoteDTO dto = new VoiceNoteDTO();
            VoiceNoteMapper.toDTO(vn, dto);
            return dto;
        }).collect(Collectors.toList());

        log.info("Retrieved {} voice notes for card: {}", dtos.size(), cardKey);
        return dtos;
    }

    @Override
    public void delete(String voiceNoteKey) {
        log.info("Deleting voice note: {}", voiceNoteKey);

        VoiceNote voiceNote = voiceNoteRepository.findByUniqueKey(voiceNoteKey)
                .orElseThrow(() -> new ResourceNotFoundException("Voice note not found: " + voiceNoteKey));

        // Soft delete
        voiceNote.setIsActive(false);
        voiceNote.setDeactivatedDate(CommonUtil.getCurrentDateTimeInIST());
        auditService.setAuditFields(voiceNote);
        voiceNoteRepository.save(voiceNote);

        // Try to delete the actual file
        try {
            fileStorageService.deleteFile(voiceNote.getFileUrl());
        } catch (Exception e) {
            log.warn("Failed to delete voice note file: {}. Error: {}", voiceNote.getFileUrl(), e.getMessage());
        }

        log.info("Voice note deleted: {}", voiceNoteKey);
    }
}
