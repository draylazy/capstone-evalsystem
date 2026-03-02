package group9.advisor_eval_system.config;

import group9.advisor_eval_system.entity.AllowedUser;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.AllowedUserRepository;
import group9.advisor_eval_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AllowedUserRepository allowedUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String TEACHER_ADMIN_EMAIL = "teacher@system.com";
    private static final String TEACHER_ADMIN_PASSWORD = "Teacher@123";

    @Override
    public void run(String... args) throws Exception {
        seedTeacherAdminAccount();
    }

    private void seedTeacherAdminAccount() {
        if (!userRepository.existsByEmail(TEACHER_ADMIN_EMAIL)) {
            User teacherAdmin = new User();
            teacherAdmin.setFirstName("System");
            teacherAdmin.setLastName("Teacher");
            teacherAdmin.setEmail(TEACHER_ADMIN_EMAIL);
            teacherAdmin.setPassword(passwordEncoder.encode(TEACHER_ADMIN_PASSWORD));
            teacherAdmin.setRole(User.UserRole.TEACHER);
            teacherAdmin.setIsActive(true);
            teacherAdmin.setIsGoogleLinked(false);
            userRepository.save(teacherAdmin);
            System.out.println("=== Default teacher admin account created: " + TEACHER_ADMIN_EMAIL + " / " + TEACHER_ADMIN_PASSWORD + " ===");
        }

        // Ensure teacher admin email is in allowed_users too
        if (!allowedUserRepository.existsByEmail(TEACHER_ADMIN_EMAIL)) {
            AllowedUser allowedTeacherAdmin = new AllowedUser();
            allowedTeacherAdmin.setEmail(TEACHER_ADMIN_EMAIL);
            allowedTeacherAdmin.setAssignedRole(User.UserRole.TEACHER);
            allowedTeacherAdmin.setIsRegistered(true);
            allowedUserRepository.save(allowedTeacherAdmin);
        }
    }
}
