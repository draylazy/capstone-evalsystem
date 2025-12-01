package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.Student;
import group9.advisor_eval_system.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findBySchoolClass(SchoolClass schoolClass);
    List<Student> findBySchoolClassId(Long classId);
    Optional<Student> findByStudentId(String studentId);
    boolean existsByStudentId(String studentId);
}