package group9.advisor_eval_system.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import group9.advisor_eval_system.exception.ExternalServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GeminiClient {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.version:v1beta}")
    private String apiVersion;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String model;

    // Cache a discovered model so we don't call listModels on every request.
    private volatile String discoveredModel;

    public String generateText(String systemInstruction, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("Gemini is not configured: missing GEMINI_API_KEY");
        }

        try {
            String version = normalizeApiVersion(apiVersion);
            String modelName = resolveModelName(version);
            String url = buildGenerateContentUrl(version, modelName);

            String body = buildGenerateContentBody(version, systemInstruction, userPrompt);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // If the model/version is not found, try to auto-discover a supported model.
            if (response.statusCode() == 404) {
                String responseBody = response.body() == null ? "" : response.body();

                String originalVersion = version;

                // Some keys/projects work with v1 instead of v1beta.
                boolean mentionsV1beta = responseBody.contains("API version v1beta");
                if (mentionsV1beta && "v1beta".equals(version)) {
                    version = "v1";
                }

                // If we switched API versions, we must rebuild the request body to match
                // the correct request schema (v1 uses snake_case, v1beta uses camelCase).
                if (!version.equals(originalVersion)) {
                    body = buildGenerateContentBody(version, systemInstruction, userPrompt);
                }

                String fallbackModel = discoverModelSupportingGenerateContent(version);
                if (fallbackModel != null && !fallbackModel.equals(modelName)) {
                    String fallbackUrl = buildGenerateContentUrl(version, fallbackModel);

                    HttpRequest fallbackRequest = HttpRequest.newBuilder()
                            .uri(URI.create(fallbackUrl))
                            .timeout(REQUEST_TIMEOUT)
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build();

                    response = httpClient.send(fallbackRequest, HttpResponse.BodyHandlers.ofString());
                    modelName = fallbackModel;
                    url = fallbackUrl;
                }
            }

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String safeUrl = url.replace(apiKey, "***");
                String responseBody = response.body();
                String snippet = responseBody == null ? ""
                        : responseBody.substring(0, Math.min(responseBody.length(), 500));
                throw new ExternalServiceException(
                        "Gemini request failed (HTTP " + response.statusCode() + ") for model '" + modelName + "'. " +
                                "Endpoint=" + safeUrl + ". Body=" + snippet);
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode textNode = root.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            String text = textNode.isTextual() ? textNode.asText() : null;
            if (text == null || text.isBlank()) {
                throw new RuntimeException("Gemini returned an empty response");
            }

            return text.trim();
        } catch (Exception e) {
            if (e instanceof ExternalServiceException) {
                throw (ExternalServiceException) e;
            }
            throw new ExternalServiceException("Gemini error: " + e.getMessage(), e);
        }
    }

    private String buildGenerateContentBody(String version, String systemInstruction, String userPrompt)
            throws Exception {
        Map<String, Object> payload = new HashMap<>();

        // NOTE: The Generative Language API has minor request-shape differences between
        // v1beta (camelCase fields) and v1 (snake_case fields).
        // If we send the wrong shape, Gemini returns: "Unknown name
        // \"systemInstruction\"".
        boolean isV1 = "v1".equals(version);

        if (systemInstruction != null && !systemInstruction.isBlank()) {
            String sysKey = isV1 ? "system_instruction" : "systemInstruction";
            payload.put(sysKey, Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))));
        }

        payload.put("contents", List.of(
                Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userPrompt)))));

        String genCfgKey = isV1 ? "generation_config" : "generationConfig";
        if (isV1) {
            payload.put(genCfgKey, Map.of(
                    "temperature", 0.4,
                    "max_output_tokens", 800));
        } else {
            payload.put(genCfgKey, Map.of(
                    "temperature", 0.4,
                    "maxOutputTokens", 800));
        }

        return objectMapper.writeValueAsString(payload);
    }

    private String normalizeApiVersion(String raw) {
        if (raw == null || raw.isBlank())
            return "v1beta";
        String trimmed = raw.trim();
        if (!trimmed.equals("v1") && !trimmed.equals("v1beta"))
            return "v1beta";
        return trimmed;
    }

    private String resolveModelName(String version) {
        // If user provided a model, use it (after normalization).
        String fromConfig = normalizeModelName(model);
        if (fromConfig != null) {
            return fromConfig;
        }

        // Otherwise, try the cached discovered model.
        if (discoveredModel != null && !discoveredModel.isBlank()) {
            return discoveredModel;
        }

        // Discover an available model dynamically.
        String discovered = discoverModelSupportingGenerateContent(version);
        if (discovered == null) {
            // Last resort guess.
            return "gemini-1.5-flash";
        }
        return discovered;
    }

    private String normalizeModelName(String raw) {
        if (raw == null)
            return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty())
            return null;
        // Accept either "gemini-..." or "models/gemini-...".
        if (trimmed.startsWith("models/")) {
            trimmed = trimmed.substring("models/".length());
        }
        // Some docs/tools use '*-latest' aliases; the v1beta models endpoint expects
        // the base name.
        if (trimmed.endsWith("-latest")) {
            trimmed = trimmed.substring(0, trimmed.length() - "-latest".length());
        }
        return trimmed;
    }

    private String buildGenerateContentUrl(String version, String modelName) {
        return String.format(
                "https://generativelanguage.googleapis.com/%s/models/%s:generateContent?key=%s",
                version,
                modelName,
                apiKey);
    }

    private String buildListModelsUrl(String version) {
        return String.format(
                "https://generativelanguage.googleapis.com/%s/models?key=%s",
                version,
                apiKey);
    }

    private synchronized String discoverModelSupportingGenerateContent(String version) {
        if (discoveredModel != null && !discoveredModel.isBlank()) {
            return discoveredModel;
        }

        try {
            String url = buildListModelsUrl(version);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(REQUEST_TIMEOUT)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode modelsNode = root.path("models");
            if (!modelsNode.isArray()) {
                return null;
            }

            List<String> candidates = new ArrayList<>();
            for (JsonNode m : modelsNode) {
                String name = m.path("name").asText("");
                if (name.isBlank())
                    continue;
                String normalized = normalizeModelName(name);
                if (normalized == null)
                    continue;

                JsonNode methods = m.path("supportedGenerationMethods");
                boolean supportsGenerateContent = false;
                if (methods.isArray()) {
                    for (JsonNode method : methods) {
                        if ("generateContent".equals(method.asText())) {
                            supportsGenerateContent = true;
                            break;
                        }
                    }
                }
                if (!supportsGenerateContent)
                    continue;

                // Heuristic: prefer Gemini text models.
                if (normalized.contains("gemini")) {
                    candidates.add(normalized);
                }
            }

            if (candidates.isEmpty()) {
                return null;
            }

            // Prefer flash if available, otherwise the first candidate.
            String best = candidates.stream().filter(c -> c.contains("flash")).findFirst().orElse(candidates.get(0));
            discoveredModel = best;
            return best;
        } catch (Exception ignored) {
            return null;
        }
    }
}
