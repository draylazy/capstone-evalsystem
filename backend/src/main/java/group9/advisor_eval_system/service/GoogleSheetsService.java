package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class GoogleSheetsService {

    private static final String SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";
    private static final String SHEET_NAME = "Sheet1";
    
    private final GoogleAuthService googleAuthService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GoogleSheetsService(GoogleAuthService googleAuthService, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.googleAuthService = googleAuthService;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Extract Google Sheets ID from a URL
     * Supports: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
     */
    public String extractSheetIdFromUrl(String sheetsUrl) {
        if (sheetsUrl == null || sheetsUrl.isEmpty()) {
            throw new IllegalArgumentException("Google Sheets URL cannot be null or empty");
        }

        Pattern pattern = Pattern.compile("/spreadsheets/d/([a-zA-Z0-9-_]+)");
        Matcher matcher = pattern.matcher(sheetsUrl);

        if (matcher.find()) {
            return matcher.group(1);
        }

        throw new IllegalArgumentException("Invalid Google Sheets URL format");
    }

    /**
     * Write data to Google Sheets using REST API
     */
    public void writeDataToSheet(User teacher, List<String> headers, List<List<String>> rows) {
        try {
            validateTeacherAndSavedSheet(teacher);
            String accessToken = googleAuthService.getValidAccessToken(teacher.getId());

            String sheetId = extractSheetIdFromUrl(teacher.getGoogleSheetsUrl());

            // Prepare data with headers
            List<List<Object>> data = new ArrayList<>();
            data.add(new ArrayList<>(headers));
            for (List<String> row : rows) {
                data.add(new ArrayList<>(row));
            }

            // Build request body
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode valuesArray = objectMapper.createArrayNode();
            for (List<Object> row : data) {
                ArrayNode rowArray = objectMapper.createArrayNode();
                for (Object cell : row) {
                    rowArray.add(cell != null ? cell.toString() : "");
                }
                valuesArray.add(rowArray);
            }
            requestBody.set("values", valuesArray);

            // Make API call to update sheet
            String url = String.format("%s/%s/values/%s!A1?valueInputOption=RAW", 
                    SHEETS_API_URL, sheetId, SHEET_NAME);
            
                callSheetsApi(accessToken, url, HttpMethod.PUT, requestBody.toString());
            log.info("Successfully wrote {} rows to Google Sheet", rows.size());

        } catch (Exception e) {
            log.error("Error writing to Google Sheets", e);
            throw new RuntimeException("Failed to write to Google Sheets: " + e.getMessage(), e);
        }
    }

    /**
     * Append data to Google Sheets using REST API
     */
    public void appendDataToSheet(User teacher, List<String> headers, List<List<String>> rowsToAppend) {
        try {
            validateTeacherAndSavedSheet(teacher);
            String accessToken = googleAuthService.getValidAccessToken(teacher.getId());

            String sheetId = extractSheetIdFromUrl(teacher.getGoogleSheetsUrl());

            // Prepare data to append
            List<List<Object>> data = new ArrayList<>();
            for (List<String> row : rowsToAppend) {
                data.add(new ArrayList<>(row));
            }

            // Build request body
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode valuesArray = objectMapper.createArrayNode();
            for (List<Object> row : data) {
                ArrayNode rowArray = objectMapper.createArrayNode();
                for (Object cell : row) {
                    rowArray.add(cell != null ? cell.toString() : "");
                }
                valuesArray.add(rowArray);
            }
            requestBody.set("values", valuesArray);

            // Make API call to append to sheet
            String url = String.format("%s/%s/values/%s!A1:append?valueInputOption=RAW", 
                    SHEETS_API_URL, sheetId, SHEET_NAME);
            
                callSheetsApi(accessToken, url, HttpMethod.POST, requestBody.toString());
            log.info("Successfully appended {} rows to Google Sheet", rowsToAppend.size());

        } catch (Exception e) {
            log.error("Error appending to Google Sheets", e);
            throw new RuntimeException("Failed to append to Google Sheets: " + e.getMessage(), e);
        }
    }

    /**
     * Validate that a Google Sheets URL is accessible using REST API
     */
    public boolean validateSheetsUrl(User teacher, String sheetsUrl) {
        try {
            if (sheetsUrl == null || sheetsUrl.isEmpty()) {
                return false;
            }

            validateTeacherHasGoogleAccess(teacher);
            String accessToken = googleAuthService.getValidAccessToken(teacher.getId());
            String sheetId = extractSheetIdFromUrl(sheetsUrl);

            // Try to get basic sheet info
            String url = String.format("%s/%s?fields=spreadsheetId,properties.title", 
                    SHEETS_API_URL, sheetId);
            
                String response = callSheetsApi(accessToken, url, HttpMethod.GET, null);
            JsonNode jsonNode = objectMapper.readTree(response);
            return jsonNode.has("spreadsheetId") && !jsonNode.get("spreadsheetId").asText().isEmpty();

        } catch (Exception e) {
            log.warn("Invalid or inaccessible Google Sheets URL: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Make HTTP call to Google Sheets API with OAuth token
     */
    private String callSheetsApi(String accessToken, String url, HttpMethod method, String body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            headers.set("Content-Type", "application/json");

            HttpEntity<String> entity = new HttpEntity<>(body, headers);
            
            var response = restTemplate.exchange(url, method, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            } else {
                throw new RuntimeException("Google Sheets API returned status: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Error calling Google Sheets API: {}", e.getMessage());
            throw new RuntimeException("Failed to call Google Sheets API: " + e.getMessage(), e);
        }
    }

    /**
     * Validate teacher has required Google account and saved sheet URL
     */
    private void validateTeacherAndSavedSheet(User teacher) {
        validateTeacherHasGoogleAccess(teacher);

        if (teacher.getGoogleSheetsUrl() == null || teacher.getGoogleSheetsUrl().isEmpty()) {
            throw new IllegalStateException("Google Sheets URL not configured for this teacher");
        }
    }

    /**
     * Validate teacher has required Google linkage and token
     */
    private void validateTeacherHasGoogleAccess(User teacher) {
        if (!teacher.getIsGoogleLinked() || teacher.getGoogleAccessToken() == null) {
            throw new IllegalStateException("Google account not linked. Please link your Google account first.");
        }
    }
}
