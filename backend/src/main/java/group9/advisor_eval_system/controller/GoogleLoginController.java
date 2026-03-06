package group9.advisor_eval_system.controller;

import group9.advisor_eval_system.dto.AuthResponse;
import group9.advisor_eval_system.dto.GoogleIdTokenRequest;
import group9.advisor_eval_system.service.GoogleLoginService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/google")
@RequiredArgsConstructor
public class GoogleLoginController {

    private final GoogleLoginService googleLoginService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody GoogleIdTokenRequest request) {
        try {
            if (request.getIdToken() == null || request.getIdToken().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ErrorResponse("Missing idToken"));
            }

            AuthResponse response = googleLoginService.loginWithGoogleIdToken(request.getIdToken());
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    public static class ErrorResponse {
        private String message;
        public ErrorResponse(String message) { this.message = message; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}