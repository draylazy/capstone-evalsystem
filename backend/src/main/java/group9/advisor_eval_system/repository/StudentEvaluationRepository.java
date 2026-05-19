package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.StudentEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentEvaluationRepository extends JpaRepository<StudentEvaluation, Long> {

        // --- Existing peer-to-peer queries ---

        Optional<StudentEvaluation> findByStudentIdAndQuestionnaireIdAndEvaluateeId(
                        Long studentId, Long questionnaireId, Long evaluateeId);

        Optional<StudentEvaluation> findByStudentIdAndQuestionnaireIdAndEvaluateeIsNull(
                        Long studentId, Long questionnaireId);

        @Query("SELECT e FROM StudentEvaluation e LEFT JOIN FETCH e.scores WHERE e.student.id = :studentId")
        List<StudentEvaluation> findByStudentIdWithScores(@Param("studentId") Long studentId);

        List<StudentEvaluation> findByQuestionnaireId(Long questionnaireId);

        List<StudentEvaluation> findByQuestionnaireIdAndEvaluateeId(Long questionnaireId, Long evaluateeId);

        List<StudentEvaluation> findByEvaluateeIdAndStatus(Long evaluateeId, StudentEvaluation.EvaluationStatus status);

        @Query("""
                        SELECT DISTINCT e FROM StudentEvaluation e
                        LEFT JOIN FETCH e.scores s
                        LEFT JOIN FETCH s.questionnaireItem
                        LEFT JOIN FETCH e.questionnaire q
                        LEFT JOIN FETCH q.items
                        LEFT JOIN FETCH q.sections qs
                        LEFT JOIN FETCH qs.items
                        LEFT JOIN FETCH e.student
                        LEFT JOIN FETCH e.evaluatee
                        WHERE e.evaluatee.id = :evaluateeId AND e.status = :status
                        """)
        List<StudentEvaluation> findByEvaluateeIdAndStatusWithDetails(
                        @Param("evaluateeId") Long evaluateeId,
                        @Param("status") StudentEvaluation.EvaluationStatus status);

        @Query("""
                        SELECT DISTINCT e FROM StudentEvaluation e
                        LEFT JOIN FETCH e.scores s
                        LEFT JOIN FETCH s.questionnaireItem qi
                        LEFT JOIN FETCH e.questionnaire q
                        LEFT JOIN FETCH q.items qi2
                        LEFT JOIN FETCH q.sections qs
                        LEFT JOIN FETCH qs.items qsi
                        LEFT JOIN FETCH e.student st
                        LEFT JOIN FETCH st.teamStudents ts
                        LEFT JOIN FETCH ts.team t
                        LEFT JOIN FETCH e.evaluatee ev
                        WHERE e.id = :id
                        """)
        Optional<StudentEvaluation> findByIdWithDetails(@Param("id") Long id);

        // --- New adviser-student eval queries ---

        Optional<StudentEvaluation> findByAdviserIdAndEvaluateeIdAndQuestionnaireIdAndTeamId(
                        Long adviserId, Long evaluateeId, Long questionnaireId, Long teamId);

        List<StudentEvaluation> findByAdviserIdAndTeamId(Long adviserId, Long teamId);

        @Query("""
                        SELECT DISTINCT se FROM StudentEvaluation se
                        LEFT JOIN FETCH se.scores s
                        LEFT JOIN FETCH s.questionnaireItem
                        LEFT JOIN FETCH se.evaluatee
                        WHERE se.adviser.id = :adviserId
                        AND se.team.id = :teamId
                        AND se.questionnaire.id = :questionnaireId
                        """)
        List<StudentEvaluation> findByAdviserIdAndTeamIdAndQuestionnaireIdWithScores(
                        @Param("adviserId") Long adviserId,
                        @Param("teamId") Long teamId,
                        @Param("questionnaireId") Long questionnaireId);

        List<StudentEvaluation> findByAdviserIdAndEvaluateeId(Long adviserId, Long evaluateeId);

        List<StudentEvaluation> findByAdviserIdAndStatus(Long adviserId, StudentEvaluation.EvaluationStatus status);

        // ─── Performance page queries ──────────────────────────────────────────────

        // Returns [teamId, count] for SUBMITTED adviser-student evals in teacher's classes
        @Query("SELECT se.team.id, COUNT(se) FROM StudentEvaluation se " +
                        "JOIN se.team t JOIN t.schoolClass sc " +
                        "WHERE sc.teacher.id = :teacherId AND se.adviser IS NOT NULL " +
                        "AND se.status = 'SUBMITTED' GROUP BY se.team.id")
        List<Object[]> countAdviserStudentEvalsByTeamForTeacher(@Param("teacherId") Long teacherId);

        // Returns [teamId, count] for SUBMITTED peer evals in teacher's classes (via evaluatee's team)
        @Query("SELECT ts.team.id, COUNT(se) FROM StudentEvaluation se " +
                        "JOIN se.evaluatee ev JOIN ev.teamStudents ts " +
                        "JOIN ts.team t JOIN t.schoolClass sc " +
                        "WHERE sc.teacher.id = :teacherId AND se.student IS NOT NULL " +
                        "AND se.student.id != se.evaluatee.id AND se.status = 'SUBMITTED' " +
                        "GROUP BY ts.team.id")
        List<Object[]> countPeerEvalsByTeamForTeacher(@Param("teacherId") Long teacherId);

        // Count SUBMITTED adviser-student evals received by a specific evaluatee
        @Query("SELECT COUNT(e) FROM StudentEvaluation e WHERE e.evaluatee.id = :evaluateeId " +
                        "AND e.adviser IS NOT NULL AND e.status = 'SUBMITTED'")
        long countAdviserStudentEvalsByEvaluateeId(@Param("evaluateeId") Long evaluateeId);

        // Count SUBMITTED peer evals received by a specific evaluatee (excluding self-evals)
        @Query("SELECT COUNT(e) FROM StudentEvaluation e WHERE e.evaluatee.id = :evaluateeId " +
                        "AND e.student IS NOT NULL AND e.student.id != e.evaluatee.id AND e.status = 'SUBMITTED'")
        long countPeerEvalsByEvaluateeId(@Param("evaluateeId") Long evaluateeId);

        // Full details for SUBMITTED adviser-student evals for a specific evaluatee
        @Query("""
                        SELECT DISTINCT e FROM StudentEvaluation e
                        LEFT JOIN FETCH e.scores s
                        LEFT JOIN FETCH s.questionnaireItem
                        LEFT JOIN FETCH e.questionnaire q
                        LEFT JOIN FETCH q.items
                        LEFT JOIN FETCH q.sections qs
                        LEFT JOIN FETCH qs.items
                        LEFT JOIN FETCH e.adviser
                        LEFT JOIN FETCH e.evaluatee
                        LEFT JOIN FETCH e.student
                        LEFT JOIN FETCH e.team
                        WHERE e.evaluatee.id = :evaluateeId
                        AND e.adviser IS NOT NULL
                        AND e.status = 'SUBMITTED'
                        """)
        List<StudentEvaluation> findAdviserStudentByEvaluateeWithDetails(@Param("evaluateeId") Long evaluateeId);

        @Query("SELECT e FROM StudentEvaluation e " +
                "JOIN e.questionnaire q " +
                "LEFT JOIN e.student s " +
                "LEFT JOIN e.adviser a " +
                "WHERE q.createdByTeacher.id = :teacherId " +
                "AND e.status = 'SUBMITTED' " +
                "ORDER BY e.submittedAt DESC")
        List<StudentEvaluation> findRecentSubmittedByTeacherId(@Param("teacherId") Long teacherId, Pageable pageable);

        @Query(value = 
                "SELECT DISTINCT s.id as student_id, t.id as team_id, q.id as questionnaire_id " +
                "FROM students s " +
                "JOIN student_teams ts ON s.id = ts.student_id " +
                "JOIN teams t ON ts.team_id = t.id " +
                "JOIN classes c ON t.class_id = c.id " +
                "JOIN class_questionnaires cq ON c.id = cq.class_id " +
                "JOIN questionnaires q ON cq.questionnaire_id = q.id " +
                "WHERE c.teacher_id = :teacherId " +
                "AND q.target = 'STUDENT' " +
                "AND q.is_active = true " +
                "AND EXISTS (" +
                "  SELECT 1 FROM student_teams ts2 " +
                "  WHERE ts2.team_id = t.id " +
                "  AND NOT EXISTS (" +
                "    SELECT 1 FROM student_evaluations se " +
                "    WHERE se.student_id = s.id " +
                "    AND se.questionnaire_id = q.id " +
                "    AND se.evaluatee_id = ts2.student_id " +
                "    AND se.status = 'SUBMITTED'" +
                "  )" +
                ")", 
                nativeQuery = true)
        List<Object[]> findAllPendingEvaluationCombinationsByTeacherId(@Param("teacherId") Long teacherId);

        @Query(value = 
                "SELECT DISTINCT a.id as adviser_id, t.id as team_id, q.id as questionnaire_id " +
                "FROM teams t " +
                "JOIN team_advisers ta ON t.id = ta.team_id " +
                "JOIN users a ON ta.adviser_id = a.id " +
                "JOIN classes c ON t.class_id = c.id " +
                "JOIN class_questionnaires cq ON c.id = cq.class_id " +
                "JOIN questionnaires q ON cq.questionnaire_id = q.id " +
                "WHERE c.teacher_id = :teacherId " +
                "AND q.target = 'ADVISER_STUDENT' " +
                "AND q.is_active = true " +
                "AND EXISTS (" +
                "  SELECT 1 FROM student_teams st " +
                "  WHERE st.team_id = t.id " +
                "  AND NOT EXISTS (" +
                "    SELECT 1 FROM student_evaluations se " +
                "    WHERE se.adviser_id = a.id " +
                "    AND se.team_id = t.id " +
                "    AND se.questionnaire_id = q.id " +
                "    AND se.evaluatee_id = st.student_id " +
                "    AND se.status = 'SUBMITTED'" +
                "  )" +
                ")", 
                nativeQuery = true)
        List<Object[]> findAllPendingAdviserStudentCombinationsByTeacherId(@Param("teacherId") Long teacherId);

        @Query("SELECT COUNT(e) FROM StudentEvaluation e WHERE e.student.id = :studentId " +
                "AND e.questionnaire.id = :questionnaireId " +
                "AND (e.status = 'SUBMITTED' OR EXISTS (SELECT 1 FROM StudentEvaluationScore s WHERE s.studentEvaluation = e))")
        long countAnsweredByStudentAndQuestionnaire(@Param("studentId") Long studentId, @Param("questionnaireId") Long questionnaireId);
}