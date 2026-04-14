package com.cardbowl.app.service.ai.impl;

import com.cardbowl.app.client.GeminiClient;
import com.cardbowl.app.client.OpenAiClient;
import com.cardbowl.app.common.util.AiResponseParser;
import com.cardbowl.app.common.util.CommonUtil;
import com.cardbowl.app.dto.card.BusinessCardDTO;
import com.cardbowl.app.dto.card.EnrichRequestDTO;
import com.cardbowl.app.dto.card.OcrRequestDTO;
import com.cardbowl.app.dto.card.PitchResultDTO;
import com.cardbowl.app.dto.card.PitchWebSourceDTO;
import com.cardbowl.app.dto.profile.ProfileImportRequestDTO;
import com.cardbowl.app.dto.profile.UserProfileDTO;
import com.cardbowl.app.exception.InvalidRequestException;
import com.cardbowl.app.exception.ResourceNotFoundException;
import com.cardbowl.app.mapper.card.PitchResultMapper;
import com.cardbowl.app.model.sql.card.BusinessCard;
import com.cardbowl.app.model.sql.card.PitchResult;
import com.cardbowl.app.model.sql.card.PitchWebSource;
import com.cardbowl.app.model.sql.profile.UserProfile;
import com.cardbowl.app.repository.sql.card.BusinessCardRepository;
import com.cardbowl.app.repository.sql.card.PitchResultRepository;
import com.cardbowl.app.repository.sql.card.PitchWebSourceRepository;
import com.cardbowl.app.repository.sql.profile.UserProfileRepository;
import com.cardbowl.app.service.ai.AiService;
import com.cardbowl.app.service.auth.AuthService;
import com.cardbowl.app.service.core.AuditService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final BusinessCardRepository businessCardRepository;
    private final UserProfileRepository userProfileRepository;
    private final PitchResultRepository pitchResultRepository;
    private final PitchWebSourceRepository pitchWebSourceRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final OpenAiClient openAiClient;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    // ── Prompts ─────────────────────────────────────────────────────────────

    private static final String OCR_PROMPT = """
            You are an expert OCR system for business cards. Extract ALL information from this business card image and return a JSON object with these fields:
            - name: full name of the person
            - title: job title or role
            - company: company or organization name
            - email: email address
            - phone: phone number (include country code if visible)
            - website: website URL
            - address: physical/mailing address
            - linkedin: LinkedIn profile URL or username
            - twitter: Twitter/X handle or URL
            - instagram: Instagram handle or URL
            - facebook: Facebook page/profile URL
            - keywords: array of industry keywords or specializations visible on the card

            Return ONLY valid JSON. If a field is not found, omit it entirely. Do not guess or fabricate information. Extract exactly what is visible on the card.""";

    private static final String OCR_PROMPT_GEMINI = """
            Analyze this business card image. Focus on TWO tasks:

            1. If there is a QR code visible on the card, describe what information it likely encodes (URL, vCard, contact info). If you can read any URL or text from/near the QR code, extract it.

            2. Extract ALL text and contact information visible on the card.

            Return a JSON object with these fields:
            - name: full name
            - title: job title
            - company: company name
            - email: email address
            - phone: phone number
            - website: website URL (especially if found via QR code context)
            - address: physical address
            - linkedin: LinkedIn URL or username
            - twitter: Twitter/X handle
            - instagram: Instagram handle
            - facebook: Facebook page URL
            - keywords: array of industry keywords
            - qrContent: what the QR code contains or links to (if detected)

            Return ONLY valid JSON. If a field is not found, omit it. Do not fabricate information.""";

    private static final String ENRICH_SYSTEM_PROMPT = """
            You are a business intelligence analyst. Given basic business card information, research and provide enriched metadata about the person and their organization. Base your response on commonly known information about the company and industry. If uncertain about specific details, provide your best assessment and note it.""";

    private static final String PITCH_SYSTEM_PROMPT = """
            You are a business pitch expert and sales strategist. You craft compelling, personalized pitches that highlight synergies between two businesses. Your pitches are specific, actionable, and grounded in real business value — not generic marketing speak. You also grade the pitch quality honestly.""";

    // ── OCR ──────────────────────────────────────────────────────────────────

    @Override
    public BusinessCardDTO ocrCard(OcrRequestDTO request) {
        long startMs = System.currentTimeMillis();
        log.info("Processing OCR request (image ~{} KB)", approximateBase64Kb(request.getImageData()));

        requireAtLeastOneAiClient();

        String mimeType = request.getMimeType() != null ? request.getMimeType() : "image/jpeg";
        String imageData = request.getImageData();

        JsonNode openAiResult = null;
        JsonNode geminiResult = null;

        // Run available models in parallel
        CompletableFuture<JsonNode> openAiFuture = null;
        CompletableFuture<JsonNode> geminiFuture = null;

        if (openAiClient.isConfigured()) {
            openAiFuture = CompletableFuture.supplyAsync(() -> runOpenAiOcr(imageData, mimeType, "ocr"));
        }

        if (geminiClient.isConfigured()) {
            geminiFuture = CompletableFuture.supplyAsync(() -> runGeminiOcr(imageData, mimeType, "ocr"));
        }

        if (openAiFuture != null) openAiResult = openAiFuture.join();
        if (geminiFuture != null) geminiResult = geminiFuture.join();

        if (openAiResult == null && geminiResult == null) {
            throw new InvalidRequestException("Both OpenAI and Gemini OCR failed. Check backend terminal logs for details.");
        }

        // Merge results: prefer OpenAI, fall back to Gemini
        BusinessCardDTO result = new BusinessCardDTO();
        mapOcrResultToDto(result, openAiResult, geminiResult);

        log.info("OCR processing complete in {} ms — extracted name: {}", System.currentTimeMillis() - startMs, result.getName());
        return result;
    }

    // ── Enrichment ──────────────────────────────────────────────────────────

    @Override
    public BusinessCardDTO enrichCard(EnrichRequestDTO request) {
        log.info("Enriching card metadata for: {}", request.getName());

        requireAtLeastOneAiClient();

        String userPrompt = buildEnrichPrompt(request);
        String rawResponse;

        if (openAiClient.isConfigured()) {
            rawResponse = openAiClient.chat(ENRICH_SYSTEM_PROMPT, userPrompt);
        } else {
            rawResponse = geminiClient.chat(ENRICH_SYSTEM_PROMPT + "\n\n" + userPrompt);
        }

        JsonNode json = AiResponseParser.parseJsonFromResponse(rawResponse, objectMapper);

        BusinessCardDTO result = new BusinessCardDTO();
        result.setName(request.getName());
        result.setCompany(request.getCompany());
        result.setTitle(request.getTitle());
        result.setWebsite(request.getWebsite());
        result.setEmail(request.getEmail());

        if (json != null) {
            result.setKeywords(AiResponseParser.getStringListField(json, "keywords", "tags"));
            result.setCategory(AiResponseParser.getStringField(json, "category", "industry"));
            result.setOrgDescription(AiResponseParser.getStringField(json, "orgDescription", "companyDescription", "description"));
            result.setDecisionMakers(AiResponseParser.getStringListField(json, "decisionMakers", "keyPeople", "leadership"));
            result.setOrgLocation(AiResponseParser.getStringField(json, "orgLocation", "headquarters", "location"));
            result.setWebContext(AiResponseParser.getStringField(json, "webContext", "context", "summary"));
        }

        log.info("Card enrichment complete for: {}", request.getName());
        return result;
    }

    // ── Pitch Generation ────────────────────────────────────────────────────

    @Override
    public PitchResultDTO generatePitch(String cardKey, String pitchType) {
        log.info("Generating {} pitch for card: {}", pitchType, cardKey);

        requireAtLeastOneAiClient();

        BusinessCard card = businessCardRepository.findByUniqueKey(cardKey)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardKey));

        UserProfile userProfile = userProfileRepository.findByUserIdAndIsActive(
                authService.getCurrentUserId(), true).orElse(null);

        // Build and send pitch prompt
        String userPrompt = buildPitchPrompt(card, userProfile, pitchType);
        String rawResponse;

        if (openAiClient.isConfigured()) {
            rawResponse = openAiClient.chat(PITCH_SYSTEM_PROMPT, userPrompt);
        } else {
            rawResponse = geminiClient.chat(PITCH_SYSTEM_PROMPT + "\n\n" + userPrompt);
        }

        JsonNode json = AiResponseParser.parseJsonFromResponse(rawResponse, objectMapper);

        // Deactivate old pitch of same type
        pitchResultRepository.findByBusinessCardIdAndPitchTypeAndIsActive(
                card.getId(), pitchType, true)
                .ifPresent(old -> {
                    old.setIsActive(false);
                    old.setDeactivatedDate(CommonUtil.getCurrentDateTimeInIST());
                    pitchResultRepository.save(old);
                });

        // Create new pitch result
        PitchResult pitch = new PitchResult();
        pitch.setBusinessCard(card);
        pitch.setPitchType(pitchType);
        pitch.setIsActive(true);
        pitch.setGeneratedDate(CommonUtil.getCurrentDateTimeInIST());

        if (json != null) {
            pitch.setPitchText(defaultIfBlank(
                    AiResponseParser.getStringField(json, "text", "pitch", "pitchText"),
                    rawResponse));
            pitch.setBriefExplanation(AiResponseParser.getStringField(json, "briefExplanation", "explanation", "brief"));
            pitch.setReasoning(AiResponseParser.getStringField(json, "reasoning", "reason"));
            pitch.setWebInfo(AiResponseParser.getStringField(json, "webInfo", "webContext", "context"));
            pitch.setSource("ai");

            Double gradeValue = AiResponseParser.getNumberField(json, "grade", "score");
            if (gradeValue != null) {
                pitch.setGrade(BigDecimal.valueOf(gradeValue).setScale(2, RoundingMode.HALF_UP));
            }
            pitch.setGradeLabel(AiResponseParser.getStringField(json, "gradeLabel", "grade_label", "letterGrade"));

            // Derive grade label if not provided but grade is
            if (pitch.getGradeLabel() == null && pitch.getGrade() != null) {
                pitch.setGradeLabel(deriveGradeLabel(pitch.getGrade()));
            }
        } else {
            // Fallback: use the raw response as pitch text
            pitch.setPitchText(defaultIfBlank(rawResponse, "Pitch generation produced no structured output."));
            pitch.setGrade(new BigDecimal("50.00"));
            pitch.setGradeLabel("C");
            pitch.setReasoning("Could not parse structured pitch response.");
            pitch.setSource("ai-fallback");
        }

        auditService.setAuditFields(pitch);
        pitch = pitchResultRepository.saveWithUniqueKey(pitch);

        // Save web sources
        List<PitchWebSourceDTO> webSourceDTOs = new ArrayList<>();
        if (json != null) {
            JsonNode sourcesNode = json.get("webSources");
            if (sourcesNode == null) sourcesNode = json.get("sources");
            if (sourcesNode != null && sourcesNode.isArray()) {
                for (JsonNode srcNode : sourcesNode) {
                    String title = srcNode.has("title") ? srcNode.get("title").asText("") : "";
                    String url = srcNode.has("url") ? srcNode.get("url").asText("") : "";
                    if (!title.isBlank() || !url.isBlank()) {
                        PitchWebSource webSource = new PitchWebSource();
                        webSource.setPitchResult(pitch);
                        webSource.setTitle(title);
                        webSource.setSourceUrl(url);
                        auditService.setAuditFields(webSource);
                        pitchWebSourceRepository.save(webSource);

                        PitchWebSourceDTO wsDto = new PitchWebSourceDTO();
                        wsDto.setTitle(title);
                        wsDto.setUrl(url);
                        webSourceDTOs.add(wsDto);
                    }
                }
            }
        }

        PitchResultDTO dto = new PitchResultDTO();
        PitchResultMapper.toDTO(pitch, dto);
        dto.setWebSources(webSourceDTOs);

        log.info("Pitch generated with key: {}", dto.getUniqueKey());
        return dto;
    }

    // ── Profile Import ──────────────────────────────────────────────────────

    @Override
    public UserProfileDTO extractProfileFromCard(ProfileImportRequestDTO request) {
        long startMs = System.currentTimeMillis();
        log.info(
            "Extracting profile from card images (front ~{} KB, back ~{} KB)",
            approximateBase64Kb(request.getFrontImageData()),
            approximateBase64Kb(request.getBackImageData())
        );

        requireAtLeastOneAiClient();

        String mimeType = request.getMimeType() != null ? request.getMimeType() : "image/jpeg";

        // Process front image with both models in parallel
        JsonNode frontOpenAi = null;
        JsonNode frontGemini = null;

        CompletableFuture<JsonNode> frontOpenAiFuture = null;
        CompletableFuture<JsonNode> frontGeminiFuture = null;

        if (openAiClient.isConfigured()) {
            frontOpenAiFuture = CompletableFuture.supplyAsync(
                    () -> runOpenAiOcr(request.getFrontImageData(), mimeType, "profile-front")
            );
        }

        if (geminiClient.isConfigured()) {
            frontGeminiFuture = CompletableFuture.supplyAsync(
                    () -> runGeminiOcr(request.getFrontImageData(), mimeType, "profile-front")
            );
        }

        if (frontOpenAiFuture != null) frontOpenAi = frontOpenAiFuture.join();
        if (frontGeminiFuture != null) frontGemini = frontGeminiFuture.join();

        // Process back image if provided
        JsonNode backOpenAi = null;
        JsonNode backGemini = null;

        if (request.getBackImageData() != null && !request.getBackImageData().isBlank()) {
            CompletableFuture<JsonNode> backOpenAiFuture = null;
            CompletableFuture<JsonNode> backGeminiFuture = null;

            if (openAiClient.isConfigured()) {
                backOpenAiFuture = CompletableFuture.supplyAsync(
                        () -> runOpenAiOcr(request.getBackImageData(), mimeType, "profile-back")
                );
            }

            if (geminiClient.isConfigured()) {
                backGeminiFuture = CompletableFuture.supplyAsync(
                        () -> runGeminiOcr(request.getBackImageData(), mimeType, "profile-back")
                );
            }

            if (backOpenAiFuture != null) backOpenAi = backOpenAiFuture.join();
            if (backGeminiFuture != null) backGemini = backGeminiFuture.join();
        }

        if (frontOpenAi == null && frontGemini == null && backOpenAi == null && backGemini == null) {
            throw new InvalidRequestException("AI extraction failed for both models. Check backend terminal logs for root cause.");
        }

        // Merge all results into a UserProfileDTO
        UserProfileDTO result = new UserProfileDTO();
        mapProfileExtractionToDto(result, frontOpenAi, frontGemini, backOpenAi, backGemini);

        log.info("Profile extraction complete in {} ms — extracted name: {}", System.currentTimeMillis() - startMs, result.getName());
        return result;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private void requireAtLeastOneAiClient() {
        if (!openAiClient.isConfigured() && !geminiClient.isConfigured()) {
            throw new InvalidRequestException(
                    "No AI API keys configured. Set OPENAI_API_KEY and/or GEMINI_API_KEY environment variables.");
        }
    }

    private JsonNode runOpenAiOcr(String imageData, String mimeType, String stage) {
        long startMs = System.currentTimeMillis();
        try {
            log.info("OpenAI {} OCR started (image ~{} KB)", stage, approximateBase64Kb(imageData));
            String raw = openAiClient.chatWithVision(OCR_PROMPT, imageData, mimeType);
            JsonNode parsed = AiResponseParser.parseJsonFromResponse(raw, objectMapper);
            log.info("OpenAI {} OCR finished in {} ms", stage, System.currentTimeMillis() - startMs);
            return parsed;
        } catch (Exception e) {
            log.warn("OpenAI {} OCR failed after {} ms: {}", stage, System.currentTimeMillis() - startMs, e.getMessage());
            return null;
        }
    }

    private JsonNode runGeminiOcr(String imageData, String mimeType, String stage) {
        long startMs = System.currentTimeMillis();
        try {
            log.info("Gemini {} OCR started (image ~{} KB)", stage, approximateBase64Kb(imageData));
            String raw = geminiClient.chatWithVision(OCR_PROMPT_GEMINI, imageData, mimeType);
            JsonNode parsed = AiResponseParser.parseJsonFromResponse(raw, objectMapper);
            log.info("Gemini {} OCR finished in {} ms", stage, System.currentTimeMillis() - startMs);
            return parsed;
        } catch (Exception e) {
            log.warn("Gemini {} OCR failed after {} ms: {}", stage, System.currentTimeMillis() - startMs, e.getMessage());
            return null;
        }
    }

    private int approximateBase64Kb(String base64) {
        if (base64 == null || base64.isBlank()) {
            return 0;
        }
        int bytes = (base64.length() * 3) / 4;
        return Math.max(1, bytes / 1024);
    }

    /**
     * Merge OCR results from OpenAI and Gemini into a BusinessCardDTO.
     * Prefers OpenAI for text fields; uses Gemini as fallback.
     * Uses Gemini's QR code detection to fill website/linkedin if missing.
     */
    private void mapOcrResultToDto(BusinessCardDTO dto, JsonNode openAi, JsonNode gemini) {
        dto.setName(pickString(openAi, gemini, "name", "fullName", "full_name"));
        dto.setTitle(pickString(openAi, gemini, "title", "jobTitle", "job_title", "designation"));
        dto.setCompany(pickString(openAi, gemini, "company", "organization", "companyName"));
        dto.setEmail(pickString(openAi, gemini, "email", "emailAddress"));
        dto.setPhone(pickString(openAi, gemini, "phone", "phoneNumber", "mobile", "telephone"));
        dto.setWebsite(pickString(openAi, gemini, "website", "url", "site"));
        dto.setAddress(pickString(openAi, gemini, "address", "location", "officeAddress"));
        dto.setLinkedin(pickString(openAi, gemini, "linkedin", "linkedIn"));
        dto.setTwitter(pickString(openAi, gemini, "twitter", "x", "xHandle"));
        dto.setInstagram(pickString(openAi, gemini, "instagram"));
        dto.setFacebook(pickString(openAi, gemini, "facebook"));

        // Merge keywords from both sources, deduplicate
        List<String> keywords = new ArrayList<>();
        keywords.addAll(AiResponseParser.getStringListField(openAi, "keywords", "tags"));
        keywords.addAll(AiResponseParser.getStringListField(gemini, "keywords", "tags"));
        dto.setKeywords(keywords.stream().distinct().collect(Collectors.toList()));

        // Gemini QR code detection: fill website/linkedin if missing
        if (gemini != null) {
            String qrContent = AiResponseParser.getStringField(gemini, "qrContent", "qr", "qr_code");
            if (qrContent != null) {
                if (dto.getWebsite() == null && (qrContent.startsWith("http://") || qrContent.startsWith("https://"))) {
                    dto.setWebsite(qrContent);
                }
                if (dto.getLinkedin() == null && qrContent.toLowerCase().contains("linkedin.com")) {
                    dto.setLinkedin(qrContent);
                }
            }
        }
    }

    /**
     * Merge profile extraction results from up to 4 AI calls (front/back × OpenAI/Gemini).
     */
    private void mapProfileExtractionToDto(UserProfileDTO dto,
                                           JsonNode frontOpenAi, JsonNode frontGemini,
                                           JsonNode backOpenAi, JsonNode backGemini) {
        // Priority: frontOpenAi > frontGemini > backOpenAi > backGemini
        dto.setName(pickStringMulti("name", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setTitle(pickStringMulti("title", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setCompany(pickStringMulti("company", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setEmail(pickStringMulti("email", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setPhone(pickStringMulti("phone", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setWebsite(pickStringMulti("website", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setAddress(pickStringMulti("address", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setLinkedin(pickStringMulti("linkedin", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setTwitter(pickStringMulti("twitter", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setBio(pickStringMulti("bio", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setProducts(pickStringMulti("products", frontOpenAi, frontGemini, backOpenAi, backGemini));
        dto.setServices(pickStringMulti("services", frontOpenAi, frontGemini, backOpenAi, backGemini));

        // Merge keywords from all sources
        List<String> keywords = new ArrayList<>();
        for (JsonNode node : new JsonNode[]{frontOpenAi, frontGemini, backOpenAi, backGemini}) {
            keywords.addAll(AiResponseParser.getStringListField(node, "keywords", "tags"));
        }
        dto.setKeywords(keywords.stream().distinct().collect(Collectors.toList()));

        // QR code detection from Gemini results
        for (JsonNode geminiNode : new JsonNode[]{frontGemini, backGemini}) {
            if (geminiNode == null) continue;
            String qrContent = AiResponseParser.getStringField(geminiNode, "qrContent", "qr");
            if (qrContent != null) {
                if (dto.getWebsite() == null && (qrContent.startsWith("http://") || qrContent.startsWith("https://"))) {
                    dto.setWebsite(qrContent);
                }
                if (dto.getLinkedin() == null && qrContent.toLowerCase().contains("linkedin.com")) {
                    dto.setLinkedin(qrContent);
                }
            }
        }
    }

    private String buildEnrichPrompt(EnrichRequestDTO request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Given the following business card information, provide enriched metadata:\n\n");
        if (request.getName() != null) sb.append("Name: ").append(request.getName()).append("\n");
        if (request.getCompany() != null) sb.append("Company: ").append(request.getCompany()).append("\n");
        if (request.getTitle() != null) sb.append("Title: ").append(request.getTitle()).append("\n");
        if (request.getWebsite() != null) sb.append("Website: ").append(request.getWebsite()).append("\n");
        if (request.getEmail() != null) sb.append("Email: ").append(request.getEmail()).append("\n");

        sb.append("""

                Return a JSON object with:
                {
                  "keywords": ["array of 5-10 relevant industry/business keywords"],
                  "category": "primary industry category (e.g., Technology, Finance, Healthcare, Education, Real Estate, Marketing, Legal, Consulting, Manufacturing, Retail, Media, Hospitality)",
                  "orgDescription": "brief description of the company (2-3 sentences based on commonly known information)",
                  "decisionMakers": ["array of likely key roles/decision makers at this type of company"],
                  "orgLocation": "headquarters or primary location of the company if commonly known",
                  "webContext": "brief summary of what is commonly known about this company and industry"
                }

                Return ONLY valid JSON. Base your response on commonly known information. If uncertain about specific details, provide your best assessment.""");

        return sb.toString();
    }

    private String buildPitchPrompt(BusinessCard card, UserProfile profile, String pitchType) {
        StringBuilder sb = new StringBuilder();

        if ("TO_THEM".equals(pitchType)) {
            sb.append("Generate a compelling pitch FROM ME TO THEM.\n\n");
            sb.append("I want to pitch my services/products to this contact. ");
            sb.append("The pitch should highlight how my business can specifically help theirs.\n\n");
        } else {
            sb.append("Generate a pitch FROM THEM TO ME — what would they likely pitch to me?\n\n");
            sb.append("Imagine this contact is pitching their services/products to me. ");
            sb.append("The pitch should highlight how their business can help mine.\n\n");
        }

        sb.append("═══ MY PROFILE ═══\n");
        if (profile != null) {
            appendIfPresent(sb, "Name", profile.getName());
            appendIfPresent(sb, "Title", profile.getTitle());
            appendIfPresent(sb, "Company", profile.getCompany());
            appendIfPresent(sb, "Bio", profile.getBio());
            appendIfPresent(sb, "Products", profile.getProducts());
            appendIfPresent(sb, "Services", profile.getServices());
        } else {
            sb.append("(No profile available)\n");
        }

        sb.append("\n═══ THEIR CARD ═══\n");
        appendIfPresent(sb, "Name", card.getName());
        appendIfPresent(sb, "Title", card.getTitle());
        appendIfPresent(sb, "Company", card.getCompany());
        appendIfPresent(sb, "Category", card.getCategory());
        appendIfPresent(sb, "Org Description", card.getOrgDescription());
        appendIfPresent(sb, "Website", card.getWebsite());
        appendIfPresent(sb, "Web Context", card.getWebContext());

        sb.append("""

                Return a JSON object with:
                {
                  "text": "The main pitch text (3-5 personalized sentences highlighting specific synergies)",
                  "briefExplanation": "Why this pitch works — the key connection point (1-2 sentences)",
                  "grade": <number 0-100 rating the pitch's likely effectiveness>,
                  "gradeLabel": "<letter grade: A+, A, A-, B+, B, B-, C+, C, C-, D, F>",
                  "reasoning": "Detailed reasoning for the grade — what makes this pitch strong or weak",
                  "webInfo": "Any relevant industry context or trends that support the pitch",
                  "webSources": [{"title": "source name", "url": "source URL"}]
                }

                Return ONLY valid JSON. Be specific and avoid generic platitudes. Grade honestly.""");

        return sb.toString();
    }

    private void appendIfPresent(StringBuilder sb, String label, String value) {
        if (value != null && !value.isBlank()) {
            sb.append(label).append(": ").append(value).append("\n");
        }
    }

    /**
     * Pick the first non-blank value for a field from OpenAI then Gemini results.
     */
    private String pickString(JsonNode openAi, JsonNode gemini, String... fieldNames) {
        String value = AiResponseParser.getStringField(openAi, fieldNames);
        if (value != null) return value;
        return AiResponseParser.getStringField(gemini, fieldNames);
    }

    /**
     * Pick the first non-blank value for a single field name across multiple JsonNode sources.
     */
    private String pickStringMulti(String fieldName, JsonNode... sources) {
        for (JsonNode source : sources) {
            String value = AiResponseParser.getStringField(source, fieldName);
            if (value != null) return value;
        }
        return null;
    }

    private String defaultIfBlank(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }

    private String deriveGradeLabel(BigDecimal grade) {
        int g = grade.intValue();
        if (g >= 97) return "A+";
        if (g >= 93) return "A";
        if (g >= 90) return "A-";
        if (g >= 87) return "B+";
        if (g >= 83) return "B";
        if (g >= 80) return "B-";
        if (g >= 77) return "C+";
        if (g >= 73) return "C";
        if (g >= 70) return "C-";
        if (g >= 60) return "D";
        return "F";
    }
}
