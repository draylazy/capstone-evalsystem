package group9.advisor_eval_system.service;

import group9.advisor_eval_system.dto.AiChatRequest;
import group9.advisor_eval_system.entity.*;
import group9.advisor_eval_system.entity.Evaluation.EvaluationStatus;
import group9.advisor_eval_system.repository.EvaluationRepository;
import group9.advisor_eval_system.repository.QuestionnaireRepository;
import group9.advisor_eval_system.repository.SchoolClassRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

        private final GeminiClient geminiClient;
        private final SchoolClassRepository schoolClassRepository;
        private final QuestionnaireRepository questionnaireRepository;
        private final EvaluationRepository evaluationRepository;

        @Transactional(readOnly = true)
        public String chat(User user, AiChatRequest request) {
                String message = request == null ? null : request.getMessage();
                String contextType = request == null ? null : request.getContextType();
                String extraContext = request == null ? null : request.getContext();

                log.info("Building AI context for userId={}", user.getId());
                String teacherContext = buildTeacherContext(user);
                String evaluationContext = buildEvaluationContext(user);

                AiIntent intent = detectIntent(message, contextType);
                String transcript = formatHistoryTail(request == null ? null : request.getHistory(), 12);

                String systemInstruction = String.join("\n",
                                "You are an AI assistant inside a capstone Adviser Evaluation System used by teachers.",
                                "Default behavior: respond like a normal, helpful conversational assistant.",
                                "Specialized behavior: ONLY switch into these modes when the user clearly asks:",
                                "- REPORT_SUMMARY: summarize/interpret evaluation reports and results.",
                                "- QUESTIONNAIRE_DESIGN: draft/improve questionnaire questions, scales, and wording.",
                                "- QUESTIONNAIRE_RESPONSE: help write example responses or guidance for answering a questionnaire.",
                                "",
                                "Global rules (always follow):",
                                "- Never request or reveal secrets (API keys, passwords, tokens).",
                                "- Do not include or ask for student PII.",
                                "- Do not invent report numbers/results; only use provided context.",
                                "- Keep responses concise and actionable.",
                                "- If required info is missing, ask at most 1-2 clarifying questions.",
                                "",
                                "You will be given:",
                                "- Teacher context (read-only)",
                                "- Evaluation data (read-only) — actual scores, comments, and results from evaluations",
                                "- Optional report/questionnaire context (read-only)",
                                "- Optional conversation history",
                                "- The latest user message",
                                "",
                                "When the user asks about evaluation results, scores, team performance, adviser performance,",
                                "or anything related to evaluations, use the Evaluation data provided below to answer accurately.",
                                "You can summarize, compare, identify trends, calculate averages, and explain the results.",
                                "",
                                "MODE: " + intent.name());

                List<String> promptParts = new ArrayList<>();
                promptParts.add("Teacher context (read-only):\n" + safeBlock(teacherContext));

                if (evaluationContext != null && !evaluationContext.isBlank()) {
                        promptParts.add("Evaluation data (read-only):\n" + safeBlock(evaluationContext));
                }

                if (extraContext != null && !extraContext.isBlank()) {
                        promptParts.add("Additional context (read-only):\n" + safeBlock(extraContext));
                }

                if (transcript != null && !transcript.isBlank()) {
                        promptParts.add("Conversation history (most recent last):\n" + transcript);
                }

                promptParts.add("Latest user message:\n" + (message == null ? "" : message));

                String userPrompt = String.join("\n\n---\n\n", promptParts);

                return geminiClient.generateText(systemInstruction, userPrompt);
        }

        private enum AiIntent {
                GENERAL_CHAT,
                REPORT_SUMMARY,
                QUESTIONNAIRE_DESIGN,
                QUESTIONNAIRE_RESPONSE
        }

        private AiIntent detectIntent(String message, String contextType) {
                String normalized = (message == null ? "" : message).toLowerCase(Locale.ROOT);
                String normalizedCtx = (contextType == null ? "" : contextType).toLowerCase(Locale.ROOT);

                // If the client explicitly tags reports, prefer report mode.
                if (normalizedCtx.contains("report")) {
                        return AiIntent.REPORT_SUMMARY;
                }

                // Reports / evaluation results.
                if (containsAny(normalized,
                                "summarize", "summary", "report", "results", "evaluation report", "interpret",
                                "insight",
                                "trend", "average", "mean", "score", "ratings", "strengths", "weaknesses")) {
                        return AiIntent.REPORT_SUMMARY;
                }

                // Questionnaire design.
                if (containsAny(normalized,
                                "questionnaire", "survey", "form", "questions", "rubric", "likert", "scale",
                                "wording", "rephrase", "improve", "draft", "create", "items")) {
                        return AiIntent.QUESTIONNAIRE_DESIGN;
                }

                // Questionnaire responses / answering.
                if (containsAny(normalized,
                                "answer", "respond", "response", "fill out", "fill in", "sample answers",
                                "example response", "how should i answer")) {
                        return AiIntent.QUESTIONNAIRE_RESPONSE;
                }

                return AiIntent.GENERAL_CHAT;
        }

        private boolean containsAny(String haystack, String... needles) {
                if (haystack == null || haystack.isBlank()) {
                        return false;
                }
                for (String needle : needles) {
                        if (needle != null && !needle.isBlank() && haystack.contains(needle)) {
                                return true;
                        }
                }
                return false;
        }

        private String formatHistoryTail(List<AiChatRequest.ChatMessage> history, int maxItems) {
                if (history == null || history.isEmpty() || maxItems <= 0) {
                        return "";
                }

                int start = Math.max(0, history.size() - maxItems);
                return history.subList(start, history.size()).stream()
                                .filter(m -> m != null && m.getRole() != null && m.getText() != null)
                                .map(m -> {
                                        String role = m.getRole().trim().toLowerCase(Locale.ROOT);
                                        String label = role.equals("user") ? "User"
                                                        : role.equals("assistant") ? "Assistant" : "Other";
                                        return label + ": " + m.getText().trim();
                                })
                                .collect(Collectors.joining("\n"));
        }

        private String safeBlock(String text) {
                if (text == null) {
                        return "";
                }
                // Prevent extremely long blocks from bloating the prompt.
                int maxLen = 12000;
                String trimmed = text.trim();
                if (trimmed.length() <= maxLen) {
                        return trimmed;
                }
                return trimmed.substring(0, maxLen) + "\n...[truncated]";
        }

        private String buildTeacherContext(User user) {
                var classes = schoolClassRepository.findByTeacherId(user.getId());
                var questionnaires = questionnaireRepository.findByCreatedByTeacherIdAndIsActiveTrue(user.getId());

                String classSummary = classes.stream()
                                .limit(10)
                                .map(c -> formatClass(c))
                                .collect(Collectors.joining("; "));

                String questionnaireSummary = questionnaires.stream()
                                .limit(10)
                                .map(q -> q.getTitle())
                                .collect(Collectors.joining("; "));

                return String.join("\n",
                                "teacherId=" + user.getId(),
                                "role=" + user.getRole(),
                                "classes=" + (classSummary.isBlank() ? "(none)" : classSummary),
                                "questionnaires=" + (questionnaireSummary.isBlank() ? "(none)" : questionnaireSummary));
        }

        private String formatClass(SchoolClass c) {
                String section = (c.getSection() == null || c.getSection().isBlank()) ? ""
                                : (" (" + c.getSection() + ")");
                return c.getName() + section + " - " + c.getSchoolYear();
        }

        private String buildEvaluationContext(User teacher) {
                var questionnaires = questionnaireRepository.findByCreatedByTeacherIdAndIsActiveTrue(teacher.getId());
                if (questionnaires.isEmpty()) {
                        return "";
                }

                StringBuilder sb = new StringBuilder();
                int evalCount = 0;
                int maxEvals = 50; // limit total evaluations to keep prompt size manageable

                for (var q : questionnaires) {
                        if (evalCount >= maxEvals)
                                break;

                        List<Evaluation> evaluations = evaluationRepository.findByQuestionnaireId(q.getId());
                        List<Evaluation> submitted = evaluations.stream()
                                        .filter(e -> e.getStatus() == EvaluationStatus.SUBMITTED
                                                        || e.getStatus() == EvaluationStatus.REVIEWED)
                                        .collect(Collectors.toList());

                        if (submitted.isEmpty())
                                continue;

                        sb.append("\n## Questionnaire: ").append(q.getTitle()).append("\n");
                        if (q.getDescription() != null && !q.getDescription().isBlank()) {
                                sb.append("Description: ").append(q.getDescription()).append("\n");
                        }
                        sb.append("Total submitted evaluations: ").append(submitted.size()).append("\n");

                        // Collect all question texts from questionnaire items
                        List<QuestionnaireItem> items = q.getItems() != null
                                        ? q.getItems().stream()
                                                        .sorted(Comparator
                                                                        .comparingInt(QuestionnaireItem::getOrderIndex))
                                                        .collect(Collectors.toList())
                                        : Collections.emptyList();

                        // Build per-evaluation details
                        for (var eval : submitted) {
                                if (evalCount >= maxEvals)
                                        break;
                                evalCount++;

                                String teamName = eval.getTeam() != null ? eval.getTeam().getName() : "Unknown Team";
                                String adviserName = eval.getAdviser() != null
                                                ? eval.getAdviser().getFirstName() + " "
                                                                + eval.getAdviser().getLastName()
                                                : "Unknown Adviser";

                                sb.append("\n### Team: ").append(teamName)
                                                .append(" | Adviser: ").append(adviserName)
                                                .append(" | Status: ").append(eval.getStatus()).append("\n");

                                // Get scores for this evaluation
                                Set<EvaluationScore> scores = eval.getScores();
                                if (scores != null && !scores.isEmpty()) {
                                        for (var score : scores) {
                                                QuestionnaireItem item = score.getQuestionnaireItem();
                                                String question = item != null ? item.getQuestionText()
                                                                : "Unknown Question";
                                                String type = item != null ? item.getQuestionType().name() : "UNKNOWN";

                                                sb.append("  - Q: ").append(question);
                                                sb.append(" [").append(type).append("]");

                                                if (score.getNumericScore() != null) {
                                                        sb.append(" Score: ").append(score.getNumericScore());
                                                        if (item != null && item.getMaxScore() != null) {
                                                                sb.append("/").append(item.getMaxScore());
                                                        }
                                                }
                                                if (score.getTextResponse() != null
                                                                && !score.getTextResponse().isBlank()) {
                                                        sb.append(" Response: \"")
                                                                        .append(score.getTextResponse().trim())
                                                                        .append("\"");
                                                }
                                                sb.append("\n");
                                        }
                                }

                                if (eval.getGeneralComments() != null && !eval.getGeneralComments().isBlank()) {
                                        sb.append("  General Comments: \"").append(eval.getGeneralComments().trim())
                                                        .append("\"\n");
                                }
                        }
                }

                return sb.toString();
        }
}
