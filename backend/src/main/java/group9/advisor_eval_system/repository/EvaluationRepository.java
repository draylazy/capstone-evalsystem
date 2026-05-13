package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.Evaluation;
import group9.advisor_eval_system.entity.Team;
import group9.advisor_eval_system.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
        List<Evaluation> findByAdviser(User adviser);

        List<Evaluation> findByAdviserId(Long adviserId);

        List<Evaluation> findByTeam(Team team);

        List<Evaluation> findByTeamId(Long teamId);

        Optional<Evaluation> findByTeamIdAndAdviserId(Long teamId, Long adviserId);

        Optional<Evaluation> findByTeamIdAndAdviserIdAndQuestionnaireId(Long teamId, Long adviserId,
                        Long questionnaireId);

        List<Evaluation> findByStatus(Evaluation.EvaluationStatus status);

        List<Evaluation> findByQuestionnaireId(Long questionnaireId);

        @Query("SELECT DISTINCT e FROM Evaluation e " +
                        "LEFT JOIN FETCH e.team t " +
                        "LEFT JOIN FETCH t.schoolClass " +
                        "LEFT JOIN FETCH e.questionnaire " +
                        "WHERE e.adviser.id = :adviserId")
        List<Evaluation> findByAdviserIdWithDetails(@Param("adviserId") Long adviserId);

        @Query("SELECT DISTINCT e FROM Evaluation e " +
                        "LEFT JOIN FETCH e.questionnaire q " +
                        "LEFT JOIN FETCH q.items " +
                        "LEFT JOIN FETCH q.sections qs " +
                        "LEFT JOIN FETCH qs.items " +
                        "LEFT JOIN FETCH e.scores " +
                        "WHERE e.adviser.id = :adviserId AND e.team.id = :teamId")
        List<Evaluation> findByAdviserIdAndTeamIdWithProgress(
                        @Param("adviserId") Long adviserId,
                        @Param("teamId") Long teamId);

        @Query("SELECT DISTINCT e FROM Evaluation e " +
                        "JOIN e.questionnaire q " +
                        "JOIN e.team t " +
                        "JOIN t.schoolClass sc " +
                        "WHERE sc.teacher.id = :teacherId " +
                        "AND q.target = 'ADVISER' " +
                        "AND q.isActive = true " +
                        "AND e.status NOT IN ('SUBMITTED', 'REVIEWED')")
        List<Evaluation> findPendingEvaluationsByTeacherId(@Param("teacherId") Long teacherId);

        @Query("SELECT DISTINCT e FROM Evaluation e " +
                        "LEFT JOIN FETCH e.team t " +
                        "LEFT JOIN FETCH t.schoolClass sc " +
                        "LEFT JOIN FETCH e.questionnaire q " +
                        "LEFT JOIN FETCH q.items " +
                        "LEFT JOIN FETCH q.sections qs " +
                        "LEFT JOIN FETCH qs.items " +
                        "LEFT JOIN FETCH e.scores s " +
                        "LEFT JOIN FETCH s.questionnaireItem " +
                        "LEFT JOIN FETCH e.adviser " +
                        "WHERE sc.teacher.id = :teacherId " +
                        "AND e.status = 'SUBMITTED'")
        List<Evaluation> findSubmittedByTeacherId(@Param("teacherId") Long teacherId);

        @Query("SELECT DISTINCT e FROM Evaluation e " +
                        "LEFT JOIN FETCH e.team t " +
                        "LEFT JOIN FETCH t.schoolClass sc " +
                        "LEFT JOIN FETCH e.questionnaire q " +
                        "LEFT JOIN FETCH q.items " +
                        "LEFT JOIN FETCH q.sections qs " +
                        "LEFT JOIN FETCH qs.items " +
                        "LEFT JOIN FETCH e.scores s " +
                        "LEFT JOIN FETCH s.questionnaireItem " +
                        "LEFT JOIN FETCH e.adviser " +
                        "WHERE e.id = :id")
        Optional<Evaluation> findByIdWithFullDetails(@Param("id") Long id);

        @Query(value = 
                "SELECT DISTINCT a.id as adviser_id, t.id as team_id, q.id as questionnaire_id " +
                "FROM teams t " +
                "JOIN team_advisers ta ON t.id = ta.team_id " +
                "JOIN users a ON ta.adviser_id = a.id " +
                "JOIN classes c ON t.class_id = c.id " +
                "JOIN class_questionnaires cq ON c.id = cq.class_id " +
                "JOIN questionnaires q ON cq.questionnaire_id = q.id " +
                "WHERE c.teacher_id = :teacherId " +
                "AND q.target = 'ADVISER' " +
                "AND q.is_active = true " +
                "AND NOT EXISTS (" +
                "  SELECT 1 FROM evaluations e " +
                "  WHERE e.adviser_id = a.id " +
                "  AND e.team_id = t.id " +
                "  AND e.questionnaire_id = q.id " +
                "  AND e.status IN ('SUBMITTED', 'REVIEWED')" +
                ")", 
                nativeQuery = true)
        List<Object[]> findAllPendingEvaluationCombinationsByTeacherId(@Param("teacherId") Long teacherId);

        @Query("SELECT e FROM Evaluation e " +
                "JOIN e.questionnaire q " +
                "JOIN e.team t " +
                "JOIN t.schoolClass sc " +
                "WHERE sc.teacher.id = :teacherId " +
                "AND e.status = 'SUBMITTED' " +
                "ORDER BY e.submittedAt DESC")
        List<Evaluation> findRecentSubmittedByTeacherId(@Param("teacherId") Long teacherId);
}