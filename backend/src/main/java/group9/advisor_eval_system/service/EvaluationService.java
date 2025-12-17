package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.*;
import group9.advisor_eval_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final EvaluationScoreRepository evaluationScoreRepository;
    private final QuestionnaireRepository questionnaireRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    /**
     * Get or create an evaluation for adviser + team + questionnaire
     */
    @Transactional
    public Evaluation getOrCreateEvaluation(Long adviserId, Long teamId, Long questionnaireId) {

        User adviser = userRepository.findById(adviserId)
                .orElseThrow(() -> new RuntimeException("Adviser not found"));

        if (adviser.getRole() != User.UserRole.ADVISER) {
            throw new RuntimeException("Only advisers can evaluate");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));

        // Security: adviser must belong to team
        if (team.getAdvisers().stream().noneMatch(a -> a.getId().equals(adviserId))) {
            throw new RuntimeException("Adviser not assigned to this team");
        }

        Questionnaire questionnaire = questionnaireRepository.findById(questionnaireId)
                .orElseThrow(() -> new RuntimeException("Questionnaire not found"));

        return evaluationRepository
                .findByTeamIdAndAdviserId(teamId, adviserId)
                .orElseGet(() -> {
                    Evaluation eval = new Evaluation();
                    eval.setAdviser(adviser);
                    eval.setTeam(team);
                    eval.setQuestionnaire(questionnaire);
                    eval.setStatus(Evaluation.EvaluationStatus.IN_PROGRESS);
                    eval.setAllowEdit(true);
                    return evaluationRepository.save(eval);
                });
    }

    /**
     * Save draft answers
     */
    @Transactional
    public Evaluation saveEvaluation(
            Long adviserId,
            Long evaluationId,
            Map<Long, Object> answers,
            String generalComments
    ) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        if (!evaluation.getAdviser().getId().equals(adviserId)) {
            throw new RuntimeException("Unauthorized evaluation access");
        }

        if (!evaluation.getAllowEdit()) {
            throw new RuntimeException("Evaluation editing is locked");
        }

        // Clear previous scores
        evaluationScoreRepository.deleteAll(evaluation.getScores());
        evaluation.getScores().clear();

        for (Map.Entry<Long, Object> entry : answers.entrySet()) {
            Long itemId = entry.getKey();

            QuestionnaireItem item = evaluation.getQuestionnaire().getItems().stream()
                    .filter(q -> q.getId().equals(itemId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Invalid questionnaire item"));

            EvaluationScore score = new EvaluationScore();
            score.setEvaluation(evaluation);
            score.setQuestionnaireItem(item);

            if (item.getQuestionType() == QuestionnaireItem.QuestionType.TEXT
                    || item.getQuestionType() == QuestionnaireItem.QuestionType.MULTIPLE_CHOICE) {
                score.setTextResponse(String.valueOf(entry.getValue()));
            } else {
                score.setNumericScore(Double.valueOf(entry.getValue().toString()));
            }

            evaluation.getScores().add(score);
        }

        evaluation.setGeneralComments(generalComments);
        return evaluationRepository.save(evaluation);
    }

    /**
     * Submit evaluation (final)
     */
    @Transactional
    public Evaluation submitEvaluation(Long adviserId, Long evaluationId) {

        Evaluation evaluation = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        if (!evaluation.getAdviser().getId().equals(adviserId)) {
            throw new RuntimeException("Unauthorized evaluation submission");
        }

        evaluation.setStatus(Evaluation.EvaluationStatus.SUBMITTED);
        evaluation.setSubmittedAt(LocalDateTime.now());
        evaluation.setAllowEdit(false);

        return evaluationRepository.save(evaluation);
    }
}
