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
public class OpenAiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String model;
    private final boolean configured;

    public OpenAiClient(@Value("${app.ai.openai.api-key:}") String apiKey,
                        @Value("${app.ai.openai.model:gpt-4o}") String model,
                @Value("${app.ai.request.connect-timeout-ms:10000}") int connectTimeoutMs,
                @Value("${app.ai.request.read-timeout-ms:90000}") int readTimeoutMs,
                        ObjectMapper objectMapper) {
        this.model = model;
        this.objectMapper = objectMapper;
        this.configured = apiKey != null && !apiKey.isBlank();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
            .requestFactory(requestFactory)
                .defaultHeader("Content-Type", "application/json");

        if (this.configured) {
            builder.defaultHeader("Authorization", "Bearer " + apiKey);
        }

        this.restClient = builder.build();
    }

    public boolean isConfigured() {
        return configured;
    }

    /**
     * Send a vision request (image + text prompt) to GPT-4o.
     *
     * @param prompt     the text instruction
     * @param base64Image base64-encoded image data (without the data URI prefix)
     * @param mimeType   e.g. "image/jpeg" or "image/png"
     * @return the raw text content from the model's response
     */
    public String chatWithVision(String prompt, String base64Image, String mimeType) {
        log.info("Calling OpenAI vision API with model: {}", model);

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "user", "content", List.of(
                                Map.of("type", "text", "text", prompt),
                                Map.of("type", "image_url", "image_url",
                                        Map.of("url", "data:" + mimeType + ";base64," + base64Image,
                                        "detail", "auto"))
                        ))
                ),
                        "max_tokens", 900,
                "temperature", 0
        );

        String responseBody = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        return extractContent(responseBody);
    }

    /**
     * Send a text-only chat request to GPT-4o.
     *
     * @param systemPrompt optional system message (pass null to skip)
     * @param userPrompt   the user message
     * @return the raw text content from the model's response
     */
    public String chat(String systemPrompt, String userPrompt) {
        log.info("Calling OpenAI chat API with model: {}", model);

        List<Map<String, Object>> messages = new java.util.ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userPrompt));

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", messages,
                "max_tokens", 2000,
                "temperature", 0
        );

        String responseBody = restClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        return extractContent(responseBody);
    }

    private String extractContent(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0).path("message").path("content").asText("");
            }
            log.warn("OpenAI response had no choices: {}", responseBody);
            return "";
        } catch (Exception e) {
            log.error("Failed to parse OpenAI response: {}", e.getMessage());
            return responseBody != null ? responseBody : "";
        }
    }
}
