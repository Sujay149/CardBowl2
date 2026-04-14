package com.cardbowl.app.service.card.impl;

import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.dto.FilterCriteria;
import com.cardbowl.app.dto.card.BusinessCardDTO;
import com.cardbowl.app.dto.card.PitchResultDTO;
import com.cardbowl.app.dto.card.PitchWebSourceDTO;
import com.cardbowl.app.dto.card.VoiceNoteDTO;
import com.cardbowl.app.dto.card.view.BusinessCardViewDTO;
import com.cardbowl.app.exception.InvalidRequestException;
import com.cardbowl.app.exception.ResourceNotFoundException;
import com.cardbowl.app.mapper.card.BusinessCardMapper;
import com.cardbowl.app.mapper.card.PitchResultMapper;
import com.cardbowl.app.mapper.card.VoiceNoteMapper;
import com.cardbowl.app.model.sql.auth.UserInfo;
import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.model.sql.card.CardDecisionMaker;
import com.cardbowl.app.model.sql.card.CardKeyword;
import com.cardbowl.app.model.sql.card.PitchResult;
import com.cardbowl.app.model.sql.card.PitchWebSource;
import com.cardbowl.app.model.sql.card.VoiceNote;
import com.cardbowl.app.model.sql.card.view.BusinessCardView;
import com.cardbowl.app.repository.sql.card.BusinessCardRepository;
import com.cardbowl.app.repository.sql.card.CardDecisionMakerRepository;
import com.cardbowl.app.repository.sql.card.CardKeywordRepository;
import com.cardbowl.app.repository.sql.card.PitchResultRepository;
import com.cardbowl.app.repository.sql.card.PitchWebSourceRepository;
import com.cardbowl.app.repository.sql.card.VoiceNoteRepository;
import com.cardbowl.app.repository.sql.card.view.BusinessCardViewRepository;
import com.cardbowl.app.repository.sql.specification.DynamicSpecification;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.card.BusinessCardService;
import com.cardbowl.app.service.core.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class BusinessCardServiceImpl implements BusinessCardService {

    private final BusinessCardRepository businessCardRepository;
    private final BusinessCardViewRepository businessCardViewRepository;
    private final CardKeywordRepository cardKeywordRepository;
    private final CardDecisionMakerRepository cardDecisionMakerRepository;
    private final VoiceNoteRepository voiceNoteRepository;
    private final PitchResultRepository pitchResultRepository;
    private final PitchWebSourceRepository pitchWebSourceRepository;
    private final AuthService authService;
    private final AuditService auditService;

    @Override
    public BusinessCardDTO create(BusinessCardDTO request) {
        log.info("Creating business card for name: {}", request.getName());

        UserInfo currentUser = authService.getCurrentUser();

        BusinessCard card = new BusinessCard();
        BusinessCardMapper.toEntity(request, card);
        card.setUser(currentUser);
        card.setSavedDate(CommonUtil.getCurrentDateTimeInIST());
        card.setIsActive(true);
        card.setIsConnectedCard(request.getIsConnectedCard() != null ? request.getIsConnectedCard() : false);
        auditService.setAuditFields(card);
        card = businessCardRepository.saveWithUniqueKey(card);

        // Save keywords
        if (request.getKeywords() != null) {
            for (String keyword : request.getKeywords()) {
                CardKeyword cardKeyword = new CardKeyword();
                cardKeyword.setBusinessCard(card);
                cardKeyword.setKeyword(keyword);
                auditService.setAuditFields(cardKeyword);
                cardKeywordRepository.save(cardKeyword);
            }
        }

        // Save decision makers
        if (request.getDecisionMakers() != null) {
            for (String name : request.getDecisionMakers()) {
                CardDecisionMaker decisionMaker = new CardDecisionMaker();
                decisionMaker.setBusinessCard(card);
                decisionMaker.setName(name);
                auditService.setAuditFields(decisionMaker);
                cardDecisionMakerRepository.save(decisionMaker);
            }
        }

        // Map to DTO
        BusinessCardDTO dto = new BusinessCardDTO();
        BusinessCardMapper.toDTO(card, dto);
        dto.setKeywords(request.getKeywords() != null ? request.getKeywords() : new ArrayList<>());
        dto.setDecisionMakers(request.getDecisionMakers() != null ? request.getDecisionMakers() : new ArrayList<>());
        dto.setVoiceNotes(new ArrayList<>());

        log.info("Business card created with key: {}", dto.getUniqueKey());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public BusinessCardDTO getByKey(String cardKey) {
        log.info("Retrieving business card by key: {}", cardKey);

        BusinessCard card = businessCardRepository.findByUniqueKey(cardKey)
                .orElseThrow(() -> new ResourceNotFoundException("Business card not found: " + cardKey));

        BusinessCardDTO dto = new BusinessCardDTO();
        BusinessCardMapper.toDTO(card, dto);

        // Load keywords
        List<CardKeyword> keywords = cardKeywordRepository.findByBusinessCardId(card.getId());
        dto.setKeywords(keywords.stream().map(CardKeyword::getKeyword).collect(Collectors.toList()));

        // Load decision makers
        List<CardDecisionMaker> decisionMakers = cardDecisionMakerRepository.findByBusinessCardId(card.getId());
        dto.setDecisionMakers(decisionMakers.stream().map(CardDecisionMaker::getName).collect(Collectors.toList()));

        // Load active voice notes
        List<VoiceNote> voiceNotes = voiceNoteRepository.findByBusinessCardIdAndIsActive(card.getId(), true);
        List<VoiceNoteDTO> voiceNoteDTOs = voiceNotes.stream().map(vn -> {
            VoiceNoteDTO vnDto = new VoiceNoteDTO();
            VoiceNoteMapper.toDTO(vn, vnDto);
            return vnDto;
        }).collect(Collectors.toList());
        dto.setVoiceNotes(voiceNoteDTOs);

        // Load active pitch results
        Optional<PitchResult> pitchToThem = pitchResultRepository
                .findByBusinessCardIdAndPitchTypeAndIsActive(card.getId(), "TO_THEM", true);
        pitchToThem.ifPresent(pitch -> {
            PitchResultDTO pitchDto = new PitchResultDTO();
            PitchResultMapper.toDTO(pitch, pitchDto);
            pitchDto.setWebSources(loadWebSources(pitch.getId()));
            dto.setPitchToThem(pitchDto);
        });

        Optional<PitchResult> pitchFromThem = pitchResultRepository
                .findByBusinessCardIdAndPitchTypeAndIsActive(card.getId(), "FROM_THEM", true);
        pitchFromThem.ifPresent(pitch -> {
            PitchResultDTO pitchDto = new PitchResultDTO();
            PitchResultMapper.toDTO(pitch, pitchDto);
            pitchDto.setWebSources(loadWebSources(pitch.getId()));
            dto.setPitchFromThem(pitchDto);
        });

        log.info("Business card retrieved: {}", cardKey);
        return dto;
    }

    @Override
    public BusinessCardDTO update(BusinessCardDTO request) {
        log.info("Updating business card: {}", request.getUniqueKey());

        BusinessCard existingCard = businessCardRepository.findByUniqueKey(request.getUniqueKey())
                .orElseThrow(() -> new ResourceNotFoundException("Business card not found: " + request.getUniqueKey()));

        // Verify ownership
        Long currentUserId = authService.getCurrentUserId();
        if (!existingCard.getUser().getId().equals(currentUserId)) {
            throw new InvalidRequestException("You are not authorized to update this business card");
        }

        BusinessCardMapper.toEntity(request, existingCard);

        // Handle keywords: delete old, create new
        cardKeywordRepository.deleteByBusinessCardId(existingCard.getId());
        if (request.getKeywords() != null) {
            for (String keyword : request.getKeywords()) {
                CardKeyword cardKeyword = new CardKeyword();
                cardKeyword.setBusinessCard(existingCard);
                cardKeyword.setKeyword(keyword);
                auditService.setAuditFields(cardKeyword);
                cardKeywordRepository.save(cardKeyword);
            }
        }

        // Handle decision makers: delete old, create new
        cardDecisionMakerRepository.deleteByBusinessCardId(existingCard.getId());
        if (request.getDecisionMakers() != null) {
            for (String name : request.getDecisionMakers()) {
                CardDecisionMaker decisionMaker = new CardDecisionMaker();
                decisionMaker.setBusinessCard(existingCard);
                decisionMaker.setName(name);
                auditService.setAuditFields(decisionMaker);
                cardDecisionMakerRepository.save(decisionMaker);
            }
        }

        auditService.setAuditFields(existingCard);
        existingCard = businessCardRepository.save(existingCard);

        // Map to DTO with all nested data
        BusinessCardDTO dto = new BusinessCardDTO();
        BusinessCardMapper.toDTO(existingCard, dto);
        dto.setKeywords(request.getKeywords() != null ? request.getKeywords() : new ArrayList<>());
        dto.setDecisionMakers(request.getDecisionMakers() != null ? request.getDecisionMakers() : new ArrayList<>());

        // Load voice notes
        List<VoiceNote> voiceNotes = voiceNoteRepository.findByBusinessCardIdAndIsActive(existingCard.getId(), true);
        dto.setVoiceNotes(voiceNotes.stream().map(vn -> {
            VoiceNoteDTO vnDto = new VoiceNoteDTO();
            VoiceNoteMapper.toDTO(vn, vnDto);
            return vnDto;
        }).collect(Collectors.toList()));

        // Load pitch results
        pitchResultRepository.findByBusinessCardIdAndPitchTypeAndIsActive(existingCard.getId(), "TO_THEM", true)
                .ifPresent(pitch -> {
                    PitchResultDTO pitchDto = new PitchResultDTO();
                    PitchResultMapper.toDTO(pitch, pitchDto);
                    pitchDto.setWebSources(loadWebSources(pitch.getId()));
                    dto.setPitchToThem(pitchDto);
                });

        pitchResultRepository.findByBusinessCardIdAndPitchTypeAndIsActive(existingCard.getId(), "FROM_THEM", true)
                .ifPresent(pitch -> {
                    PitchResultDTO pitchDto = new PitchResultDTO();
                    PitchResultMapper.toDTO(pitch, pitchDto);
                    pitchDto.setWebSources(loadWebSources(pitch.getId()));
                    dto.setPitchFromThem(pitchDto);
                });

        log.info("Business card updated: {}", dto.getUniqueKey());
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BusinessCardViewDTO> list(List<FilterCriteria> filters, Pageable pageable) {
        log.info("Listing business cards with {} filters", filters.size());

        Long currentUserId = authService.getCurrentUserId();
        filters.add(new FilterCriteria("userId", "eq", currentUserId.toString()));
        filters.add(new FilterCriteria("isActive", "eq", "true"));

        DynamicSpecification<BusinessCardView> spec = new DynamicSpecification<>(filters);
        Page<BusinessCardView> page = businessCardViewRepository.findAll(spec, pageable);

        List<BusinessCardViewDTO> dtos = page.getContent().stream().map(view -> {
            BusinessCardViewDTO dto = new BusinessCardViewDTO();
            BusinessCardMapper.toViewDTO(view, dto);
            return dto;
        }).collect(Collectors.toList());

        log.info("Retrieved {} business cards", dtos.size());
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Override
    public void deactivate(String cardKey) {
        log.info("Deactivating business card: {}", cardKey);

        BusinessCard card = businessCardRepository.findByUniqueKey(cardKey)
                .orElseThrow(() -> new ResourceNotFoundException("Business card not found: " + cardKey));

        card.setIsActive(false);
        card.setDeactivatedDate(CommonUtil.getCurrentDateTimeInIST());
        auditService.setAuditFields(card);
        businessCardRepository.save(card);

        log.info("Business card deactivated: {}", cardKey);
    }

    @Override
    public void activate(String cardKey) {
        log.info("Activating business card: {}", cardKey);

        BusinessCard card = businessCardRepository.findByUniqueKey(cardKey)
                .orElseThrow(() -> new ResourceNotFoundException("Business card not found: " + cardKey));

        card.setIsActive(true);
        card.setDeactivatedDate(null);
        auditService.setAuditFields(card);
        businessCardRepository.save(card);

        log.info("Business card activated: {}", cardKey);
    }

    private List<PitchWebSourceDTO> loadWebSources(Long pitchResultId) {
        List<PitchWebSource> sources = pitchWebSourceRepository.findByPitchResultId(pitchResultId);
        return sources.stream().map(source -> {
            PitchWebSourceDTO dto = new PitchWebSourceDTO();
            dto.setTitle(source.getTitle());
            dto.setUrl(source.getSourceUrl());
            return dto;
        }).collect(Collectors.toList());
    }
}
