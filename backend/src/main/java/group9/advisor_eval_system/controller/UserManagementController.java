package group9.advisor_eval_system.controller;

import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.service.UserManagementService;
import group9.advisor_eval_system.service.GoogleSheetsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user-management")
public class UserManagementController {

    @Autowired
    private UserManagementService userManagementService;

    @Autowired
    private GoogleSheetsService googleSheetsService;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(userManagementService.getAllUsers());
    }

    @GetMapping("/export")
    public ResponseEntity<List<Map<String, String>>> getExportData(
            @RequestParam(name = "type", defaultValue = "STUDENT") String type) {
        return ResponseEntity.ok(userManagementService.getExportRows(type));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userManagementService.deleteUser(id);
            return ResponseEntity.ok(new MessageResponse("User removed successfully"));
        } catch (RuntimeException e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Unknown error occurred";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new MessageResponse(errorMsg));
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new MessageResponse("Error: " + errorMsg));
        }
    }

    @PostMapping(value = "/upload-students", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadStudentSheet(@RequestParam("file") MultipartFile file, Authentication authentication) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("File is empty"));
        }

        String filename = file.getOriginalFilename();
        if (filename == null ||
                (!filename.toLowerCase().endsWith(".xlsx") &&
                 !filename.toLowerCase().endsWith(".xls") &&
                 !filename.toLowerCase().endsWith(".csv"))) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("File must be .xlsx, .xls, or .csv"));
        }

        try {
            String teacherEmail = (authentication != null) ? (String) authentication.getPrincipal() : null;
            UserManagementService.UploadResult result = userManagementService.uploadStudentSheet(file, teacherEmail);
            String message = "Added: " + result.getAdded()
                    + ", Updated: " + result.getUpdated()
                    + ", Skipped: " + result.getSkipped();
            if (!result.getErrors().isEmpty()) {
                message += ". Errors: " + String.join("; ", result.getErrors());
            }
            return ResponseEntity.ok(new UploadResponse(message, result));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error reading file: " + e.getMessage()));
        }
    }

    @PostMapping(value = "/upload-advisers", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadAdviserSheet(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("File is empty"));
        }

        String filename = file.getOriginalFilename();
        if (filename == null ||
                (!filename.toLowerCase().endsWith(".xlsx") &&
                 !filename.toLowerCase().endsWith(".xls") &&
                 !filename.toLowerCase().endsWith(".csv"))) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("File must be .xlsx, .xls, or .csv"));
        }

        try {
            UserManagementService.UploadResult result = userManagementService.uploadAdviserSheet(file);
            String message = "Added: " + result.getAdded()
                    + ", Updated: " + result.getUpdated()
                    + ", Skipped: " + result.getSkipped();
            if (!result.getErrors().isEmpty()) {
                message += ". Errors: " + String.join("; ", result.getErrors());
            }
            return ResponseEntity.ok(new UploadResponse(message, result));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error reading file: " + e.getMessage()));
        }
    }

    @PostMapping("/google-sheets/url")
    public ResponseEntity<?> setGoogleSheetsUrl(
            @RequestBody GoogleSheetsUrlRequest request,
            Authentication authentication) {
        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("User not authenticated"));
            }

            Long userId = (Long) authentication.getPrincipal();
            User teacher = userManagementService.findById(userId);
            if (teacher == null || !teacher.getRole().equals(User.UserRole.TEACHER)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("Only teachers can configure Google Sheets"));
            }

            if (!teacher.getIsGoogleLinked()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new MessageResponse("Please link your Google account first"));
            }

            // Validate the URL
            if (!googleSheetsService.validateSheetsUrl(teacher, request.getGoogleSheetsUrl())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Invalid Google Sheets URL or insufficient permissions"));
            }

            teacher.setGoogleSheetsUrl(request.getGoogleSheetsUrl());
            userManagementService.saveUser(teacher);

            return ResponseEntity.ok(new MessageResponse("Google Sheets URL saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error saving Google Sheets URL: " + e.getMessage()));
        }
    }

    @GetMapping("/google-sheets/url")
    public ResponseEntity<?> getGoogleSheetsUrl(Authentication authentication) {
        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("User not authenticated"));
            }

            Long userId = (Long) authentication.getPrincipal();
            User teacher = userManagementService.findById(userId);
            if (teacher == null || !teacher.getRole().equals(User.UserRole.TEACHER)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("Only teachers can access Google Sheets settings"));
            }

            return ResponseEntity.ok(new GoogleSheetsUrlResponse(teacher.getGoogleSheetsUrl()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Error retrieving Google Sheets URL: " + e.getMessage()));
        }
    }

    public static class MessageResponse {
        private String message;
        public MessageResponse(String message) { this.message = message; }
        public String getMessage() { return message; }
    }

    public static class UploadResponse {
        private String message;
        private UserManagementService.UploadResult result;
        public UploadResponse(String message, UserManagementService.UploadResult result) {
            this.message = message;
            this.result = result;
        }
        public String getMessage() { return message; }
        public UserManagementService.UploadResult getResult() { return result; }
    }

    public static class GoogleSheetsUrlRequest {
        private String googleSheetsUrl;
        public GoogleSheetsUrlRequest() {}
        public String getGoogleSheetsUrl() { return googleSheetsUrl; }
        public void setGoogleSheetsUrl(String googleSheetsUrl) { this.googleSheetsUrl = googleSheetsUrl; }
    }

    public static class GoogleSheetsUrlResponse {
        private String googleSheetsUrl;
        public GoogleSheetsUrlResponse(String googleSheetsUrl) { this.googleSheetsUrl = googleSheetsUrl; }
        public String getGoogleSheetsUrl() { return googleSheetsUrl; }
    }
}
