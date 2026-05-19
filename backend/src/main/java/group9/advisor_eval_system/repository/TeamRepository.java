package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.Team;
import group9.advisor_eval_system.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findBySchoolClass(SchoolClass schoolClass);
    List<Team> findBySchoolClassId(Long classId);
    List<Team> findByIsActiveTrue();

    @Query("SELECT DISTINCT t FROM Team t " +
           "LEFT JOIN FETCH t.schoolClass sc " +
           "LEFT JOIN FETCH t.advisers " +
           "LEFT JOIN FETCH t.teamStudents ts " +
           "LEFT JOIN FETCH ts.student " +
           "WHERE sc.teacher.id = :teacherId")
    List<Team> findBySchoolClassTeacherId(@Param("teacherId") Long teacherId);

    @Query("SELECT DISTINCT t FROM Team t " +
           "LEFT JOIN FETCH t.schoolClass sc " +
           "LEFT JOIN FETCH t.advisers a " +
           "LEFT JOIN FETCH t.teamStudents ts " +
           "LEFT JOIN FETCH ts.student " +
           "WHERE a.id = :adviserId")
    List<Team> findByAdvisersId(@Param("adviserId") Long adviserId);

    @Query("SELECT t FROM Team t JOIN FETCH t.schoolClass WHERE t.id IN :ids")
    List<Team> findAllByIdsWithClass(@Param("ids") java.util.Collection<Long> ids);

    @Query("SELECT DISTINCT t FROM Team t " +
           "LEFT JOIN FETCH t.schoolClass sc " +
           "LEFT JOIN FETCH t.advisers " +
           "LEFT JOIN FETCH t.teamStudents ts " +
           "LEFT JOIN FETCH ts.student")
    List<Team> findAllWithDetails();
}