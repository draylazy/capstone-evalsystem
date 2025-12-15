package group9.advisor_eval_system.controller;

import group9.advisor_eval_system.dto.AssignQuestionnaireRequest;
import group9.advisor_eval_system.dto.CreateQuestionnaireRequest;
import group9.advisor_eval_system.dto.QuestionnaireResponse;
import group9.advisor_eval_system.entity.Questionnaire;
import group9.advisor_eval_system.entity.QuestionnaireItem;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.UserRepository;
import group9.advisor_eval_system.service.QuestionnaireService;
import group9.advisor_eval_system.util.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/questionnaires")
@RequiredArgsConstructor
@Slf4j
public class QuestionnaireController {

    private final QuestionnaireService questionnaireService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Create a new questionnaire (Teacher only)
     */
    @PostMapping
    public ResponseEntity<?> createQuestionnaire(
            @Valid @RequestBody CreateQuestionnaireRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User user = getUserFromToken(authHeader);

            if (user.getRole() != User.UserRole.TEACHER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only teachers can create questionnaires"));
            }

            List<QuestionnaireItem> questions = request.getQuestions() != null
                    ? request.getQuestions().stream()
                            .map(CreateQuestionnaireRequest.QuestionnaireItemDto::toEntity)
                            .collect(Collectors.toList())
                    : List.of();

            log.info("Creating questionnaire with {} questions", questions.size());
            if (!questions.isEmpty()) {
                questions.forEach(q -> log.info("Question: {} - Type: {}", q.getQuestionText(), q.getQuestionType()));
            }

            Questionnaire questionnaire = questionnaireService.createQuestionnaire(
                    user.getId(),
                    request.getTitle(),
                    request.getDescription(),
                    questions
            );

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(QuestionnaireResponse.fromEntity(questionnaire));

        } catch (Exception e) {
            log.error("Error creating questionnaire", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Get all questionnaires for the current user
     * - Teachers: Get questionnaires they created
     * - Advisers: Get questionnaires assigned to their teams' classes
     */
    @GetMapping
    public ResponseEntity<?> getQuestionnaires(@RequestHeader("Authorization") String authHeader) {
        try {
            User user = getUserFromToken(authHeader);
            
            log.info("Fetching questionnaires for user {} with role {}", user.getId(), user.getRole());

            List<Questionnaire> questionnaires;
            if (user.getRole() == User.UserRole.TEACHER) {
                questionnaires = questionnaireService.getQuestionnairesByTeacher(user.getId());
            } else {
                questionnaires = questionnaireService.getQuestionnairesForAdviser(user.getId());
            }
            
            log.info("Found {} questionnaires", questionnaires.size());

            List<QuestionnaireResponse> responses = questionnaires.stream()
                    .map(QuestionnaireResponse::fromEntity)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            log.error("Error fetching questionnaires: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Get a specific questionnaire by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getQuestionnaireById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            getUserFromToken(authHeader);

            Questionnaire questionnaire = questionnaireService.getQuestionnaireById(id);
            return ResponseEntity.ok(QuestionnaireResponse.fromEntity(questionnaire));

        } catch (Exception e) {
            log.error("Error fetching questionnaire", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Get questionnaires for a specific class
     */
    @GetMapping("/class/{classId}")
    public ResponseEntity<?> getQuestionnairesByClass(
            @PathVariable Long classId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            getUserFromToken(authHeader);

            List<Questionnaire> questionnaires = questionnaireService.getQuestionnairesByClass(classId);
            List<QuestionnaireResponse> responses = questionnaires.stream()
                    .map(QuestionnaireResponse::fromEntity)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            log.error("Error fetching questionnaires for class", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Assign questionnaire to classes (Teacher only)
     */
    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assignToClasses(
            @PathVariable Long id,
            @Valid @RequestBody AssignQuestionnaireRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User user = getUserFromToken(authHeader);

            if (user.getRole() != User.UserRole.TEACHER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only teachers can assign questionnaires"));
            }

            Questionnaire questionnaire = questionnaireService.assignToClasses(
                    id,
                    request.getClassIds(),
                    user.getId()
            );

            return ResponseEntity.ok(QuestionnaireResponse.fromEntity(questionnaire));

        } catch (Exception e) {
            log.error("Error assigning questionnaire to classes", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Remove questionnaire from classes (Teacher only)
     */
    @PostMapping("/{id}/unassign")
    public ResponseEntity<?> removeFromClasses(
            @PathVariable Long id,
            @Valid @RequestBody AssignQuestionnaireRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User user = getUserFromToken(authHeader);

            if (user.getRole() != User.UserRole.TEACHER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only teachers can unassign questionnaires"));
            }

            Questionnaire questionnaire = questionnaireService.removeFromClasses(
                    id,
                    request.getClassIds(),
                    user.getId()
            );

            return ResponseEntity.ok(QuestionnaireResponse.fromEntity(questionnaire));

        } catch (Exception e) {
            log.error("Error removing questionnaire from classes", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Update questionnaire details (Teacher only)
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateQuestionnaire(
            @PathVariable Long id,
            @Valid @RequestBody CreateQuestionnaireRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User user = getUserFromToken(authHeader);

            if (user.getRole() != User.UserRole.TEACHER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only teachers can update questionnaires"));
            }

            Questionnaire questionnaire = questionnaireService.updateQuestionnaire(
                    id,
                    request.getTitle(),
                    request.getDescription(),
                    user.getId()
            );

            return ResponseEntity.ok(QuestionnaireResponse.fromEntity(questionnaire));

        } catch (Exception e) {
            log.error("Error updating questionnaire", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Delete questionnaire (Teacher only)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuestionnaire(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            User user = getUserFromToken(authHeader);

            if (user.getRole() != User.UserRole.TEACHER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new ErrorResponse("Only teachers can delete questionnaires"));
            }

            questionnaireService.deleteQuestionnaire(id, user.getId());

            return ResponseEntity.ok(new SuccessResponse("Questionnaire deleted successfully"));

        } catch (Exception e) {
            log.error("Error deleting questionnaire", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Extract user from JWT token
     */
    private User getUserFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Invalid or missing Authorization header");
        }

        String token = authHeader.substring(7);

        if (!jwtTokenProvider.validateToken(token)) {
            throw new RuntimeException("Invalid or expired token");
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(token);

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

    public static class SuccessResponse {
        private String message;

        public SuccessResponse(String message) {
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
