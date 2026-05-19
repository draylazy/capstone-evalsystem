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

    @Query("SELECT t FROM Team t WHERE t.schoolClass.teacher.id = :teacherId")
    List<Team> findBySchoolClassTeacherId(@Param("teacherId") Long teacherId);

    @Query("SELECT t FROM Team t JOIN t.advisers a WHERE a.id = :adviserId")
    List<Team> findByAdvisersId(@Param("adviserId") Long adviserId);
}