package group9.advisor_eval_system.controller;

import group9.advisor_eval_system.entity.Evaluation;
import group9.advisor_eval_system.entity.Questionnaire;
import group9.advisor_eval_system.entity.Team;
import group9.advisor_eval_system.repository.EvaluationRepository;
import group9.advisor_eval_system.service.EvaluationService;
import group9.advisor_eval_system.service.QuestionnaireService;
import group9.advisor_eval_system.service.TeamService;
import group9.advisor_eval_system.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/adviser")
@RequiredArgsConstructor
public class AdviserEvaluationController {

    private final EvaluationService evaluationService;
    private final TeamService teamService;
    private final QuestionnaireService questionnaireService;
    private final JwtUtil jwtUtil;
    private final EvaluationRepository evaluationRepository;

    private Long getAdviserId(HttpServletRequest request) {
        return jwtUtil.extractUserId(request.getHeader("Authorization").substring(7));
    }

    @GetMapping("/teams")
    public List<Team> getMyTeams(HttpServletRequest request) {
        Long adviserId = getAdviserId(request);
        return teamService.getAllTeams().stream()
                .filter(t -> t.getAdvisers().stream().anyMatch(a -> a.getId().equals(adviserId)))
                .toList();
    }

    @GetMapping("/teams/{teamId}/questionnaires")
    public List<Questionnaire> getTeamQuestionnaires(
            @PathVariable Long teamId,
            HttpServletRequest request
    ) {
        Long adviserId = getAdviserId(request);
        Team team = teamService.getTeamById(teamId);

        if (team.getAdvisers().stream().noneMatch(a -> a.getId().equals(adviserId))) {
            throw new RuntimeException("Unauthorized");
        }

        return questionnaireService.getQuestionnairesByClass(team.getSchoolClass().getId());
    }

    @GetMapping("/evaluation/{teamId}/{questionnaireId}")
    public Evaluation getOrCreateEvaluation(
            @PathVariable Long teamId,
            @PathVariable Long questionnaireId,
            HttpServletRequest request
    ) {
        Long adviserId = getAdviserId(request);
        return evaluationService.getOrCreateEvaluation(adviserId, teamId, questionnaireId);
    }

    @PostMapping("/evaluation/save")
    public Evaluation saveEvaluation(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Long adviserId = getAdviserId(request);

        Long evaluationId = Long.valueOf(payload.get("evaluationId").toString());
        String generalComments = (String) payload.get("generalComments");
        Map<Long, Object> answers = (Map<Long, Object>) payload.get("answers");

        return evaluationService.saveEvaluation(adviserId, evaluationId, answers, generalComments);
    }

    @PostMapping("/evaluation/submit/{evaluationId}")
    public Evaluation submitEvaluation(
            @PathVariable Long evaluationId,
            HttpServletRequest request
    ) {
        Long adviserId = getAdviserId(request);
        return evaluationService.submitEvaluation(adviserId, evaluationId);
    }

    @GetMapping("/evaluations/completed")
    public List<Evaluation> getCompletedEvaluations(HttpServletRequest request) {
        Long adviserId = getAdviserId(request);

        return evaluationRepository.findByAdviserId(adviserId).stream()
                .filter(e -> e.getStatus() == Evaluation.EvaluationStatus.SUBMITTED)
                .toList();
    }
}
