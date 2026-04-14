package com.cardbowl.app.dto.dashboard;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class DashboardSummaryDTO implements Serializable {

    private long totalCards;

    private long cardsThisWeek;

    private long cardsWithPitch;

    private long totalVoiceNotes;

    private BigDecimal averagePitchGrade;

    private String topCategory;

    private Map<String, Long> categoryBreakdown;

    private List<String> topKeywords;
}
