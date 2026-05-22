package group9.advisor_eval_system;

import group9.advisor_eval_system.controller.AdviserEvaluationController;
import group9.advisor_eval_system.entity.*;
import group9.advisor_eval_system.repository.*;
import group9.advisor_eval_system.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.mockito.Mockito.*;

@SpringBootTest
class AdvisorEvaluationSystemApplicationTests {

	@Autowired
	private QuestionnaireRepository questionnaireRepository;
	@Autowired
	private EvaluationRepository evaluationRepository;
	@Autowired
	private StudentEvaluationRepository studentEvaluationRepository;
	@Autowired
	private EvaluationScoreRepository evaluationScoreRepository;
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private TeamRepository teamRepository;
	@Autowired
	private AdviserEvaluationController adviserEvaluationController;
	@Autowired
	private JwtUtil jwtUtil;

	@Test
	@Transactional
	void testSaveMixedEvaluationMultipleSections() {
		// Find an adviser
		User adviser = userRepository.findAll().stream()
				.filter(u -> u.getRole() == User.UserRole.ADVISER)
				.findFirst()
				.orElseThrow(() -> new RuntimeException("No adviser found"));

		// Find a team
		Team team = teamRepository.findAll().stream()
				.filter(t -> t.getTeamStudents() != null && !t.getTeamStudents().isEmpty())
				.findFirst()
				.orElseThrow(() -> new RuntimeException("No team found"));

		// Find a hybrid questionnaire (has both evaluateIndividuals = true and false)
		Questionnaire questionnaire = questionnaireRepository.findAll().stream()
				.filter(q -> q.getSections() != null && q.getSections().stream().anyMatch(s -> Boolean.TRUE.equals(s.getEvaluateIndividuals()))
						&& q.getSections().stream().anyMatch(s -> !Boolean.TRUE.equals(s.getEvaluateIndividuals())))
				.findFirst()
				.orElseThrow(() -> new RuntimeException("No hybrid questionnaire found"));

		// Ensure questionnaire is active and open
		questionnaire.setIsActive(true);
		questionnaire.setDeadlineAt(LocalDateTime.now().plusDays(1));
		final Questionnaire targetQuestionnaire = questionnaireRepository.save(questionnaire);

		// Delete any existing student evaluations for this adviser, team, and questionnaire to avoid conflicts
		List<StudentEvaluation> existingStudentEvals = studentEvaluationRepository.findByAdviserIdAndTeamId(adviser.getId(), team.getId());
		for (StudentEvaluation se : existingStudentEvals) {
			if (se.getQuestionnaire() != null && se.getQuestionnaire().getId().equals(targetQuestionnaire.getId())) {
				studentEvaluationRepository.delete(se);
			}
		}

		// Delete any existing team evaluations for this adviser, team, and questionnaire to avoid conflicts
		List<Evaluation> existingEvals = evaluationRepository.findAll().stream()
				.filter(e -> e.getAdviser() != null && e.getAdviser().getId().equals(adviser.getId())
						&& e.getTeam() != null && e.getTeam().getId().equals(team.getId())
						&& e.getQuestionnaire() != null && e.getQuestionnaire().getId().equals(targetQuestionnaire.getId()))
				.collect(Collectors.toList());
		evaluationRepository.deleteAll(existingEvals);

		// Create an Evaluation record for the team and questionnaire
		Evaluation evaluation = new Evaluation();
		evaluation.setAdviser(adviser);
		evaluation.setTeam(team);
		evaluation.setQuestionnaire(targetQuestionnaire);
		evaluation.setStatus(Evaluation.EvaluationStatus.IN_PROGRESS);
		evaluation = evaluationRepository.save(evaluation);

		// Prepare sectionData payload
		List<Map<String, Object>> sectionDataList = new ArrayList<>();
		
		// Fill section data dynamically based on sections
		for (QuestionnaireSection section : targetQuestionnaire.getSections()) {
			Map<String, Object> sectionMap = new HashMap<>();
			sectionMap.put("sectionId", section.getId());
			sectionMap.put("evaluateIndividuals", section.getEvaluateIndividuals());

			if (!Boolean.TRUE.equals(section.getEvaluateIndividuals())) {
				// Team-level section: fill answers
				Map<String, Object> answers = new HashMap<>();
				for (QuestionnaireItem item : section.getItems()) {
					if (item.getQuestionType() == QuestionnaireItem.QuestionType.NUMERIC_SCALE || item.getQuestionType() == QuestionnaireItem.QuestionType.RATING) {
						answers.put(item.getId().toString(), 4.0);
					} else {
						answers.put(item.getId().toString(), "text response");
					}
				}
				sectionMap.put("answers", answers);
			} else {
				// Individual section: fill studentAnswers
				Map<String, Object> studentAnswers = new HashMap<>();
				for (TeamStudent ts : team.getTeamStudents()) {
					Map<String, Object> answers = new HashMap<>();
					for (QuestionnaireItem item : section.getItems()) {
						if (item.getQuestionType() == QuestionnaireItem.QuestionType.NUMERIC_SCALE || item.getQuestionType() == QuestionnaireItem.QuestionType.RATING) {
							answers.put(item.getId().toString(), 4.5);
						}
					}
					studentAnswers.put(ts.getStudent().getId().toString(), answers);
				}
				sectionMap.put("studentAnswers", studentAnswers);
				
				List<Long> studentIds = team.getTeamStudents().stream()
						.map(ts -> ts.getStudent().getId())
						.collect(Collectors.toList());
				sectionMap.put("studentIds", studentIds);
			}
			sectionDataList.add(sectionMap);
		}

		// Construct payload
		Map<String, Object> payload = new HashMap<>();
		payload.put("teamId", team.getId());
		payload.put("questionnaireId", targetQuestionnaire.getId());
		payload.put("generalComments", "Great team overall!");
		payload.put("sectionData", sectionDataList);
		payload.put("submit", false);

		// Generate token
		String token = jwtUtil.generateToken(adviser.getId(), adviser.getEmail(), adviser.getRole().name());

		// Mock HttpServletRequest
		HttpServletRequest request = mock(HttpServletRequest.class);
		when(request.getHeader("Authorization")).thenReturn("Bearer " + token);

		// Call controller
		ResponseEntity<?> response = adviserEvaluationController.saveMixedEvaluation(evaluation.getId(), payload, request);
		org.junit.jupiter.api.Assertions.assertEquals(org.springframework.http.HttpStatus.OK, response.getStatusCode());

		// Reload evaluation scores directly from repository to bypass Hibernate L1 cache limitations on the in-memory scores set
		List<EvaluationScore> savedScores = evaluationScoreRepository.findByEvaluationId(evaluation.getId());

		System.out.println("Reloaded Evaluation Scores count: " + savedScores.size());
		for (EvaluationScore score : savedScores) {
			System.out.println("  Item text: " + score.getQuestionnaireItem().getQuestionText() + " -> Score: " + score.getNumericScore() + ", Text: " + score.getTextResponse());
		}

		// Verify that all team-level sections' numeric scores are present
		int expectedNumericScoreCount = 0;
		for (QuestionnaireSection section : targetQuestionnaire.getSections()) {
			if (!Boolean.TRUE.equals(section.getEvaluateIndividuals())) {
				for (QuestionnaireItem item : section.getItems()) {
					if (item.getQuestionType() == QuestionnaireItem.QuestionType.NUMERIC_SCALE || item.getQuestionType() == QuestionnaireItem.QuestionType.RATING) {
						expectedNumericScoreCount++;
					}
				}
			}
		}

		long actualNumericScoreCount = savedScores.stream()
				.filter(score -> score.getNumericScore() != null)
				.count();

		org.junit.jupiter.api.Assertions.assertEquals(expectedNumericScoreCount, actualNumericScoreCount, 
				"All team-level numeric scores should be saved and not deleted by subsequent sections.");
	}
}


