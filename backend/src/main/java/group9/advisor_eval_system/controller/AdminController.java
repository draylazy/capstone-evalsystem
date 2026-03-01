package group9.advisor_eval_system.controller;

import group9.advisor_eval_system.entity.AllowedUser;
import group9.advisor_eval_system.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/allowed-users")
    public ResponseEntity<List<AllowedUser>> getAllowedUsers() {
        return ResponseEntity.ok(adminService.getAllAllowedUsers());
    }

    @DeleteMapping("/allowed-users/{id}")
    public ResponseEntity<?> deleteAllowedUser(@PathVariable Long id) {
        try {
            adminService.deleteAllowedUser(id);
            return ResponseEntity.ok(new MessageResponse("User removed from allowed list"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping(value = "/upload-roles", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadRoleSheet(@RequestParam("file") MultipartFile file) {
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
            AdminService.UploadResult result = adminService.uploadRoleSheet(file);
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

    public static class MessageResponse {
        private String message;
        public MessageResponse(String message) { this.message = message; }
        public String getMessage() { return message; }
    }

    public static class UploadResponse {
        private String message;
        private AdminService.UploadResult result;
        public UploadResponse(String message, AdminService.UploadResult result) {
            this.message = message;
            this.result = result;
        }
        public String getMessage() { return message; }
        public AdminService.UploadResult getResult() { return result; }
    }
}
