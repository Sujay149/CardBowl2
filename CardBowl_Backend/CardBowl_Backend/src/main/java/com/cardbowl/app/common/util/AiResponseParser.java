package com.cardbowl.app.common.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses AI model responses that may contain JSON embedded in prose,
 * markdown code blocks, or other non-JSON wrappers.
 */
@Slf4j
public class AiResponseParser {

    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```");
    private static final Pattern KEY_VALUE_LINE_PATTERN = Pattern.compile("(?im)^\\s*([A-Za-z][A-Za-z0-9 _-]{1,40})\\s*:\\s*(.+)$");

    private AiResponseParser() {
    }

    /**
     * Attempt to extract a valid JSON object from an AI response string.
     * Tries in order: direct parse, code-block extraction, balanced-brace extraction.
     *
     * @param raw            the raw AI model response text
     * @param objectMapper   Jackson ObjectMapper for parsing
     * @return parsed JsonNode, or null if no valid JSON found
     */
    public static JsonNode parseJsonFromResponse(String raw, ObjectMapper objectMapper) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String cleaned = raw.trim();

        // 1. Try direct parse
        JsonNode direct = tryParse(cleaned, objectMapper);
        if (direct != null && direct.isObject()) {
            return direct;
        }

        // 2. Try extracting from markdown code blocks
        Matcher matcher = CODE_BLOCK_PATTERN.matcher(cleaned);
        while (matcher.find()) {
            JsonNode parsed = tryParse(matcher.group(1).trim(), objectMapper);
            if (parsed != null && parsed.isObject()) {
                return parsed;
            }
        }

        // 3. Try extracting balanced JSON objects from mixed prose
        List<String> candidates = extractBalancedJsonObjects(cleaned);
        for (String candidate : candidates) {
            JsonNode parsed = tryParse(candidate, objectMapper);
            if (parsed != null && parsed.isObject()) {
                return parsed;
            }
        }

        // 4. Last resort: parse loose "Field: Value" responses into JSON.
        JsonNode loose = parseLooseKeyValueObject(cleaned, objectMapper);
        if (loose != null) {
            return loose;
        }

        log.warn("Could not extract JSON from AI response (length={})", raw.length());
        return null;
    }

    /**
     * Convenience: parse and return a specific string field from the AI response JSON.
     */
    public static String getStringField(JsonNode node, String... fieldNames) {
        if (node == null) return null;
        for (String name : fieldNames) {
            JsonNode field = node.get(name);
            if (field != null && field.isTextual() && !field.asText().isBlank()) {
                return field.asText().trim();
            }
        }
        return null;
    }

    /**
     * Convenience: parse and return a string list field from the AI response JSON.
     */
    public static List<String> getStringListField(JsonNode node, String... fieldNames) {
        if (node == null) return List.of();
        for (String name : fieldNames) {
            JsonNode field = node.get(name);
            if (field != null && field.isArray()) {
                List<String> result = new ArrayList<>();
                for (JsonNode item : field) {
                    String text = item.asText("").trim();
                    if (!text.isEmpty()) {
                        result.add(text);
                    }
                }
                if (!result.isEmpty()) return result;
            }
        }
        return List.of();
    }

    /**
     * Convenience: parse and return a numeric field as a double.
     */
    public static Double getNumberField(JsonNode node, String... fieldNames) {
        if (node == null) return null;
        for (String name : fieldNames) {
            JsonNode field = node.get(name);
            if (field != null && field.isNumber()) {
                return field.asDouble();
            }
        }
        return null;
    }

    private static JsonNode tryParse(String value, ObjectMapper objectMapper) {
        try {
            return objectMapper.readTree(value);
        } catch (Exception e) {
            return null;
        }
    }

    private static List<String> extractBalancedJsonObjects(String input) {
        List<String> results = new ArrayList<>();
        int start = -1;
        int depth = 0;

        for (int i = 0; i < input.length(); i++) {
            char ch = input.charAt(i);
            if (ch == '{') {
                if (depth == 0) start = i;
                depth++;
            } else if (ch == '}') {
                if (depth > 0) depth--;
                if (depth == 0 && start >= 0) {
                    results.add(input.substring(start, i + 1));
                    start = -1;
                }
            }
        }
        return results;
    }

    private static JsonNode parseLooseKeyValueObject(String text, ObjectMapper objectMapper) {
        Matcher matcher = KEY_VALUE_LINE_PATTERN.matcher(text);
        ObjectNode result = objectMapper.createObjectNode();

        while (matcher.find()) {
            String rawKey = matcher.group(1).trim();
            String value = matcher.group(2).trim();
            if (value.isEmpty()) {
                continue;
            }

            String key = normalizeKey(rawKey);
            if ("keywords".equals(key) || "tags".equals(key)) {
                ArrayNode arr = objectMapper.createArrayNode();
                for (String item : value.split(",")) {
                    String token = item.trim();
                    if (!token.isEmpty()) {
                        arr.add(token);
                    }
                }
                if (!arr.isEmpty()) {
                    result.set("keywords", arr);
                }
                continue;
            }

            result.put(key, value);
        }

        return result.size() >= 2 ? result : null;
    }

    private static String normalizeKey(String rawKey) {
        String compact = rawKey.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
        return switch (compact) {
            case "full name", "name" -> "name";
            case "job title", "title", "designation" -> "title";
            case "company", "organization", "company name" -> "company";
            case "email", "email address" -> "email";
            case "phone", "phone number", "mobile", "telephone" -> "phone";
            case "website", "url", "site" -> "website";
            case "address", "location", "office address" -> "address";
            case "linkedin", "linked in" -> "linkedin";
            case "twitter", "x", "x handle" -> "twitter";
            case "instagram" -> "instagram";
            case "facebook" -> "facebook";
            case "bio", "about" -> "bio";
            case "products" -> "products";
            case "services" -> "services";
            case "keywords", "tags" -> "keywords";
            case "qr content", "qr" -> "qrContent";
            default -> compact.replace(" ", "");
        };
    }
}
