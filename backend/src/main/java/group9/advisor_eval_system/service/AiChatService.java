package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.SchoolClass;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.QuestionnaireRepository;
import group9.advisor_eval_system.repository.SchoolClassRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private final GeminiClient geminiClient;
    private final SchoolClassRepository schoolClassRepository;
    private final QuestionnaireRepository questionnaireRepository;

    public String chat(User user, String message) {
        log.info("Building AI context for userId={}", user.getId());
        String context = buildTeacherContext(user);

        String systemInstruction = String.join("\n",
                "You are an AI assistant for a capstone Adviser Evaluation System.",
                "You help TEACHERS draft questionnaires and improve questions.",
                "Rules:",
                "- Do not request or reveal secrets (API keys, passwords, tokens).",
                "- Do not include or ask for student PII.",
                "- Be concise and actionable.",
                "- If information is missing, ask 1-2 clarifying questions.");

        String userPrompt = String.join("\n\n",
                "Teacher context (read-only):",
                context,
                "User message:",
                message);

        return geminiClient.generateText(systemInstruction, userPrompt);
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
        String section = (c.getSection() == null || c.getSection().isBlank()) ? "" : (" (" + c.getSection() + ")");
        return c.getName() + section + " - " + c.getSchoolYear();
    }
}
