package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.StudentEvaluationScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentEvaluationScoreRepository extends JpaRepository<StudentEvaluationScore, Long> {
    List<StudentEvaluationScore> findByStudentEvaluationId(Long studentEvaluationId);
    void deleteByStudentEvaluationId(Long studentEvaluationId);
    
    @Query("""
        SELECT s FROM StudentEvaluationScore s 
        WHERE s.questionnaireItem.questionnaire.id = :questionnaireId
    """)
    List<StudentEvaluationScore> findByQuestionnaireId(@Param("questionnaireId") Long questionnaireId);

    @Query("SELECT COUNT(s) FROM StudentEvaluationScore s " +
           "WHERE s.studentEvaluation.student.id = :studentId " +
           "AND s.studentEvaluation.questionnaire.id = :questionnaireId")
    long countByStudentIdAndQuestionnaireId(@Param("studentId") Long studentId, @Param("questionnaireId") Long questionnaireId);
}
