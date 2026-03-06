package group9.advisor_eval_system.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import group9.advisor_eval_system.dto.AuthResponse;
import group9.advisor_eval_system.entity.AllowedUser;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.AllowedUserRepository;
import group9.advisor_eval_system.repository.UserRepository;
import group9.advisor_eval_system.util.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
public class GoogleLoginService {

    private final UserRepository userRepository;
    private final AllowedUserRepository allowedUserRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${google.client.id}")
    private String googleClientId;

    public GoogleLoginService(
            UserRepository userRepository,
            AllowedUserRepository allowedUserRepository,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.allowedUserRepository = allowedUserRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public AuthResponse loginWithGoogleIdToken(String idTokenString) {
        GoogleIdToken.Payload payload = verifyIdToken(idTokenString);

        String rawEmail = payload.getEmail();
        Boolean emailVerified = payload.getEmailVerified();

        if (rawEmail == null || rawEmail.isBlank()) {
            throw new RuntimeException("Google email not found in token");
        }
        if (emailVerified == null || !emailVerified) {
            throw new RuntimeException("Google email is not verified");
        }

        final String email = rawEmail.toLowerCase().trim();

        // 1) Check allowlist + get assigned role
        AllowedUser allowed = allowedUserRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException(
                        "This email is not authorized to access the system. Please contact your administrator."
                ));

        // 2) Find or create local system user
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();

            // Your User entity requires these to be NOT NULL
            String given = (String) payload.get("given_name");
            String family = (String) payload.get("family_name");

            u.setFirstName((given != null && !given.isBlank()) ? given : "Google");
            u.setLastName((family != null && !family.isBlank()) ? family : "User");

            u.setEmail(email);

            // Password is @NotBlank; but manual login is disabled.
            // Store a non-guessable placeholder.
            u.setPassword("{GOOGLE_ONLY}");

            u.setRole(allowed.getAssignedRole());
            u.setIsActive(true);

            return userRepository.save(u);
        });

        // 3) Active check
        if (user.getIsActive() == null || !user.getIsActive()) {
            throw new RuntimeException("Account is inactive");
        }

        // 4) Enforce role from allowlist (source of truth)
        if (user.getRole() != allowed.getAssignedRole()) {
            user.setRole(allowed.getAssignedRole());
            userRepository.save(user);
        }

        // 5) Mark allowlist record as registered
        if (allowed.getIsRegistered() == null || !allowed.getIsRegistered()) {
            allowed.setIsRegistered(true);
            allowedUserRepository.save(allowed);
        }

        // 6) Issue your existing JWT
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getId(), user.getRole().toString());

        return new AuthResponse(user, token, "Login successful");
    }

    private GoogleIdToken.Payload verifyIdToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new RuntimeException("Invalid Google ID token");
            }
            return idToken.getPayload();
        } catch (Exception e) {
            throw new RuntimeException("Failed to verify Google token: " + e.getMessage(), e);
        }
    }
}