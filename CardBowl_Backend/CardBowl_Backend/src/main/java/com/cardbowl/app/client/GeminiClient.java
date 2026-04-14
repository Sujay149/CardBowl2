package com.cardbowl.app.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class GeminiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final boolean configured;

    public GeminiClient(@Value("${app.ai.gemini.api-key:}") String apiKey,
                        @Value("${app.ai.gemini.model:gemini-2.5-flash}") String model,
                        @Value("${app.ai.request.connect-timeout-ms:10000}") int connectTimeoutMs,
                        @Value("${app.ai.request.read-timeout-ms:90000}") int readTimeoutMs,
                        ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
        this.configured = apiKey != null && !apiKey.isBlank();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .requestFactory(requestFactory)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    public boolean isConfigured() {
        return configured;
    }

    /**
     * Send a vision request (image + text prompt) to Gemini.
     *
     * @param prompt      the text instruction
     * @param base64Image base64-encoded image data
     * @param mimeType    e.g. "image/jpeg" or "image/png"
     * @return the raw text content from the model's response
     */
    public String chatWithVision(String prompt, String base64Image, String mimeType) {
        log.info("Calling Gemini vision API with model: {}", model);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt),
                                Map.of("inline_data", Map.of(
                                        "mime_type", mimeType,
                                        "data", base64Image
                                ))
                        ))
                ),
                "generationConfig", Map.of(
                        "temperature", 0,
                        "maxOutputTokens", 1000,
                        "responseMimeType", "application/json"
                )
        );

        String responseBody = restClient.post()
                .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        return extractContent(responseBody);
    }

    /**
     * Send a text-only chat request to Gemini.
     *
     * @param prompt the text instruction
     * @return the raw text content from the model's response
     */
    public String chat(String prompt) {
        log.info("Calling Gemini chat API with model: {}", model);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "temperature", 0,
                        "maxOutputTokens", 1000,
                        "responseMimeType", "application/json"
                )
        );

        String responseBody = restClient.post()
                .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        return extractContent(responseBody);
    }

    private String extractContent(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText("");
                }
            }
            log.warn("Gemini response had no candidates: {}", responseBody);
            return "";
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            return responseBody != null ? responseBody : "";
        }
    }
}
