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

    private static final String ADMIN_EMAIL = "admin@system.com";
    private static final String ADMIN_PASSWORD = "Admin@123";

    @Override
    public void run(String... args) throws Exception {
        seedAdminAccount();
    }

    private void seedAdminAccount() {
        if (!userRepository.existsByEmail(ADMIN_EMAIL)) {
            User admin = new User();
            admin.setFirstName("System");
            admin.setLastName("Admin");
            admin.setEmail(ADMIN_EMAIL);
            admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
            admin.setRole(User.UserRole.ADMIN);
            admin.setIsActive(true);
            admin.setIsGoogleLinked(false);
            userRepository.save(admin);
            System.out.println("=== Default admin account created: " + ADMIN_EMAIL + " / " + ADMIN_PASSWORD + " ===");
        }

        // Ensure admin email is in allowed_users too
        if (!allowedUserRepository.existsByEmail(ADMIN_EMAIL)) {
            AllowedUser allowedAdmin = new AllowedUser();
            allowedAdmin.setEmail(ADMIN_EMAIL);
            allowedAdmin.setAssignedRole(User.UserRole.ADMIN);
            allowedAdmin.setIsRegistered(true);
            allowedUserRepository.save(allowedAdmin);
        }
    }
}
