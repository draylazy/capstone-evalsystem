package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.SchoolClass;
import group9.advisor_eval_system.entity.Student;
import group9.advisor_eval_system.entity.Team;
import group9.advisor_eval_system.repository.SchoolClassRepository;
import group9.advisor_eval_system.repository.StudentRepository;
import group9.advisor_eval_system.repository.TeamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class StudentService {
    
    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private SchoolClassRepository schoolClassRepository;
    
    @Autowired
    private TeamRepository teamRepository;
    
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }
    
    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));
    }
    
    public Student createStudent(Student student) {
        // Check if student ID already exists
        if (studentRepository.existsByStudentId(student.getStudentId())) {
            throw new RuntimeException("Student ID already exists: " + student.getStudentId());
        }
        return studentRepository.save(student);
    }
    
    public Student updateStudent(Long id, Student studentDetails) {
        Student student = getStudentById(id);
        
        // Check if updating to a different student ID that already exists
        if (!student.getStudentId().equals(studentDetails.getStudentId()) 
                && studentRepository.existsByStudentId(studentDetails.getStudentId())) {
            throw new RuntimeException("Student ID already exists: " + studentDetails.getStudentId());
        }
        
        student.setStudentId(studentDetails.getStudentId());
        student.setFirstName(studentDetails.getFirstName());
        student.setLastName(studentDetails.getLastName());
        student.setEmail(studentDetails.getEmail());
        student.setPhoneNumber(studentDetails.getPhoneNumber());
        
        // Handle classes assignment (many-to-many)
        if (studentDetails.getClasses() != null && !studentDetails.getClasses().isEmpty()) {
            List<SchoolClass> classes = new ArrayList<>();
            for (SchoolClass cls : studentDetails.getClasses()) {
                if (cls.getId() != null) {
                    SchoolClass schoolClass = schoolClassRepository.findById(cls.getId())
                        .orElseThrow(() -> new RuntimeException("Class not found with id: " + cls.getId()));
                    classes.add(schoolClass);
                }
            }
            student.setClasses(classes);
        } else if (studentDetails.getClasses() != null && studentDetails.getClasses().isEmpty()) {
            student.setClasses(new ArrayList<>());
        }
        
        // Handle team assignment
        if (studentDetails.getTeam() != null && studentDetails.getTeam().getId() != null) {
            Team team = teamRepository.findById(studentDetails.getTeam().getId())
                .orElseThrow(() -> new RuntimeException("Team not found with id: " + studentDetails.getTeam().getId()));
            student.setTeam(team);
        } else if (studentDetails.getTeam() == null) {
            student.setTeam(null);
        }
        
        return studentRepository.save(student);
    }
    
    public void deleteStudent(Long id) {
        Student student = getStudentById(id);
        studentRepository.delete(student);
    }
}
