package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.QuestionnaireItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionnaireItemRepository extends JpaRepository<QuestionnaireItem, Long> {
    
    @Query("SELECT COUNT(qi) FROM QuestionnaireItem qi WHERE qi.questionnaire.id = :questionnaireId")
    long countByQuestionnaireId(@Param("questionnaireId") Long questionnaireId);
}