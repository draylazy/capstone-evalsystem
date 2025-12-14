package group9.advisor_eval_system.service;

import group9.advisor_eval_system.entity.SchoolClass;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.SchoolClassRepository;
import group9.advisor_eval_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SchoolClassService {
    
    @Autowired
    private SchoolClassRepository schoolClassRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    public List<SchoolClass> getAllClasses() {
        return schoolClassRepository.findAll();
    }
    
    public List<SchoolClass> getClassesByTeacher(Long teacherId) {
        return schoolClassRepository.findByTeacherId(teacherId);
    }
    
    public List<SchoolClass> getActiveClasses() {
        return schoolClassRepository.findByIsActiveTrue();
    }
    
    public SchoolClass getClassById(Long id) {
        return schoolClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Class not found with id: " + id));
    }
    
    public SchoolClass createClass(SchoolClass schoolClass) {
        // For session-based auth with frontend localStorage approach:
        // The teacher should be set by the controller from the frontend request
        // or we fallback to finding any teacher
        
        if (schoolClass.getTeacher() == null || schoolClass.getTeacher().getId() == null) {
            // Fallback: use first available teacher
            User teacher = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == User.UserRole.TEACHER)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No teacher users found in database"));
            schoolClass.setTeacher(teacher);
        } else {
            // Teacher ID was provided from frontend, fetch the full user object
            User teacher = userRepository.findById(schoolClass.getTeacher().getId())
                    .orElseThrow(() -> new RuntimeException("Teacher not found with id: " + schoolClass.getTeacher().getId()));
            
            // Verify it's actually a teacher
            if (teacher.getRole() != User.UserRole.TEACHER) {
                throw new RuntimeException("Only teachers can create classes");
            }
            
            schoolClass.setTeacher(teacher);
        }
        
        return schoolClassRepository.save(schoolClass);
    }
    
    public SchoolClass updateClass(Long id, SchoolClass classDetails) {
        SchoolClass schoolClass = getClassById(id);
        
        schoolClass.setName(classDetails.getName());
        schoolClass.setSection(classDetails.getSection());
        schoolClass.setSchoolYear(classDetails.getSchoolYear());
        schoolClass.setDescription(classDetails.getDescription());
        schoolClass.setIsActive(classDetails.getIsActive());
        
        return schoolClassRepository.save(schoolClass);
    }
    
    public void deleteClass(Long id) {
        SchoolClass schoolClass = getClassById(id);
        schoolClassRepository.delete(schoolClass);
    }
}
