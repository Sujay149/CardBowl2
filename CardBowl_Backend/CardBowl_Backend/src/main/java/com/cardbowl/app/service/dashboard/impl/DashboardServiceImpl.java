package com.cardbowl.app.service.dashboard.impl;

import com.cardbowl.app.dto.dashboard.DashboardSummaryDTO;
import com.cardbowl.app.model.sql.auth.UserInfo;
import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.model.sql.card.CardKeyword;
import com.cardbowl.app.model.sql.card.PitchResult;
import com.cardbowl.app.repository.sql.card.BusinessCardRepository;
import com.cardbowl.app.repository.sql.card.CardKeywordRepository;
import com.cardbowl.app.repository.sql.card.PitchResultRepository;
import com.cardbowl.app.repository.sql.card.VoiceNoteRepository;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.dashboard.DashboardService;
import com.cardbowl.app.type.PitchType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@Slf4j
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final BusinessCardRepository businessCardRepository;
    private final PitchResultRepository pitchResultRepository;
    private final VoiceNoteRepository voiceNoteRepository;
    private final CardKeywordRepository cardKeywordRepository;
    private final AuthService authService;

    @Override
    public DashboardSummaryDTO getSummary() {
        log.info("Fetching dashboard summary for current user");

        UserInfo currentUser = authService.getCurrentUser();
        Long userId = currentUser.getId();

        List<BusinessCard> allCards = businessCardRepository.findByUserIdAndIsActive(userId, true);

        DashboardSummaryDTO summary = new DashboardSummaryDTO();

        // Total cards
        summary.setTotalCards(allCards.size());

        // Cards this week
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
        List<BusinessCard> recentCards = businessCardRepository.findRecentByUserId(userId, oneWeekAgo);
        summary.setCardsThisWeek(recentCards.size());

        // Cards with pitch and average pitch grade
        long cardsWithPitch = 0;
        BigDecimal totalGrade = BigDecimal.ZERO;
        long toThemPitchCount = 0;

        for (BusinessCard card : allCards) {
            List<PitchResult> pitchResults = pitchResultRepository.findByBusinessCardIdAndIsActive(card.getId(), true);
            if (!pitchResults.isEmpty()) {
                cardsWithPitch++;
            }
            for (PitchResult pr : pitchResults) {
                if (PitchType.TO_THEM.name().equals(pr.getPitchType()) && pr.getGrade() != null) {
                    totalGrade = totalGrade.add(pr.getGrade());
                    toThemPitchCount++;
                }
            }
        }
        summary.setCardsWithPitch(cardsWithPitch);

        if (toThemPitchCount > 0) {
            summary.setAveragePitchGrade(totalGrade.divide(BigDecimal.valueOf(toThemPitchCount), 2, RoundingMode.HALF_UP));
        } else {
            summary.setAveragePitchGrade(BigDecimal.ZERO);
        }

        // Total voice notes
        long totalVoiceNotes = 0;
        for (BusinessCard card : allCards) {
            totalVoiceNotes += voiceNoteRepository.countByBusinessCardIdAndIsActive(card.getId(), true);
        }
        summary.setTotalVoiceNotes(totalVoiceNotes);

        // Category breakdown and top category
        Map<String, Long> categoryBreakdown = new LinkedHashMap<>();
        for (BusinessCard card : allCards) {
            String category = card.getCategory();
            if (category != null && !category.isBlank()) {
                categoryBreakdown.merge(category, 1L, Long::sum);
            }
        }
        summary.setCategoryBreakdown(categoryBreakdown);

        String topCategory = categoryBreakdown.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
        summary.setTopCategory(topCategory);

        // Top 8 keywords by frequency
        Map<String, Long> keywordFrequency = new HashMap<>();
        for (BusinessCard card : allCards) {
            List<CardKeyword> keywords = cardKeywordRepository.findByBusinessCardId(card.getId());
            for (CardKeyword kw : keywords) {
                if (kw.getKeyword() != null && !kw.getKeyword().isBlank()) {
                    keywordFrequency.merge(kw.getKeyword(), 1L, Long::sum);
                }
            }
        }

        List<String> topKeywords = keywordFrequency.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(8)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        summary.setTopKeywords(topKeywords);

        log.info("Dashboard summary fetched successfully for user id: {}", userId);
        return summary;
    }
}
