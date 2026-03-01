package group9.advisor_eval_system.service;

import group9.advisor_eval_system.dto.AuthResponse;
import group9.advisor_eval_system.dto.LoginRequest;
import group9.advisor_eval_system.dto.RegisterRequest;
import group9.advisor_eval_system.entity.AllowedUser;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.AllowedUserRepository;
import group9.advisor_eval_system.repository.UserRepository;
import group9.advisor_eval_system.util.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AllowedUserRepository allowedUserRepository;
    
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // Check if email is allowed
        AllowedUser allowedUser = allowedUserRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("This email is not authorized to register. Please contact your administrator."));

        // Check if email already exists
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }

        // Create new user with the role assigned by admin
        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(allowedUser.getAssignedRole()); // role from admin assignment, not from request
        user.setPhoneNumber(request.getPhoneNumber());
        user.setDepartment(request.getDepartment());
        user.setIsActive(true);

        User savedUser = userRepository.save(user);

        // Mark as registered in allowed list
        allowedUser.setIsRegistered(true);
        allowedUserRepository.save(allowedUser);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(savedUser.getEmail(), savedUser.getId(), savedUser.getRole().toString());

        return new AuthResponse(savedUser, token, "Registration successful");
    }
    
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // Check if email is allowed
        if (!allowedUserRepository.existsByEmail(email)) {
            throw new RuntimeException("This email is not authorized to access the system. Please contact your administrator.");
        }

        // Find user by email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        // Check if user is active
        if (!user.getIsActive()) {
            throw new RuntimeException("Account is inactive");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getId(), user.getRole().toString());

        return new AuthResponse(user, token, "Login successful");
    }
}
