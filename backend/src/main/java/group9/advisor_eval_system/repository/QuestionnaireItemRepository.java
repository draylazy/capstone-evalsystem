package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.QuestionnaireItem;
import group9.advisor_eval_system.entity.Questionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionnaireItemRepository extends JpaRepository<QuestionnaireItem, Long> {
    List<QuestionnaireItem> findByQuestionnaire(Questionnaire questionnaire);
    List<QuestionnaireItem> findByQuestionnaireIdOrderByOrderIndexAsc(Long questionnaireId);
}