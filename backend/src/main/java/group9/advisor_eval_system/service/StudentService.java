package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.Student;
import group9.advisor_eval_system.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {
    
    @Autowired
    private StudentRepository studentRepository;
    
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
        
        return studentRepository.save(student);
    }
    
    public void deleteStudent(Long id) {
        Student student = getStudentById(id);
        studentRepository.delete(student);
    }
}
