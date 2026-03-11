package group9.advisor_eval_system.controller;

import group9.advisor_eval_system.dto.AiChatRequest;
import group9.advisor_eval_system.dto.AiChatResponse;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.UserRepository;
import group9.advisor_eval_system.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiController {

    private final AiChatService aiChatService;
    private final UserRepository userRepository;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication) {

        User user = getUserFromAuthentication(authentication);

        log.info("AI chat request userId={} role={} messageLength={}", user.getId(), user.getRole(),
                request.getMessage() == null ? 0 : request.getMessage().length());

        if (user.getRole() != User.UserRole.TEACHER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Only teachers can use the AI assistant"));
        }

        String reply = aiChatService.chat(user, request.getMessage());
        return ResponseEntity.ok(new AiChatResponse(reply));
    }

    private User getUserFromAuthentication(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("Unauthenticated");
        }

        Object principal = authentication.getPrincipal();
        Long userId;

        if (principal instanceof Long) {
            userId = (Long) principal;
        } else if (principal instanceof Integer) {
            userId = ((Integer) principal).longValue();
        } else {
            userId = Long.parseLong(principal.toString());
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public static class ErrorResponse {
        private String message;

        public ErrorResponse(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
