package group9.advisor_eval_system.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import group9.advisor_eval_system.dto.AuthResponse;
import group9.advisor_eval_system.entity.User;
import group9.advisor_eval_system.repository.UserRepository;
import group9.advisor_eval_system.util.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@Slf4j
public class GoogleLoginService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${google.client.id}")
    private String googleClientId;

    public GoogleLoginService(
            UserRepository userRepository,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
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

        // Check if user exists in system (imported by TEACHER)
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException(
                        "This email is not authorized to access the system. Please contact your administrator."
                ));

        // Check if user is active
        if (user.getIsActive() == null || !user.getIsActive()) {
            throw new RuntimeException("Account is inactive");
        }

        // Update names from Google if they're null or placeholder
        String given = (String) payload.get("given_name");
        String family = (String) payload.get("family_name");
        String googleId = payload.getSubject();
        boolean needsUpdate = false;

        if (user.getFirstName() == null || user.getFirstName().isBlank() || 
            user.getFirstName().equals("Pending") || user.getFirstName().equals("To Be Provided")) {
            if (given != null && !given.isBlank()) {
                user.setFirstName(given);
                needsUpdate = true;
            }
        }

        if (user.getLastName() == null || user.getLastName().isBlank() || 
            user.getLastName().equals("Pending") || user.getLastName().equals("Login")) {
            if (family != null && !family.isBlank()) {
                user.setLastName(family);
                needsUpdate = true;
            }
        }

        // Link Google account if not already linked
        if (user.getIsGoogleLinked() == null || !user.getIsGoogleLinked()) {
            user.setIsGoogleLinked(true);
            user.setGoogleId(googleId);
            user.setGoogleEmail(email);
            needsUpdate = true;
        }

        if (needsUpdate) {
            userRepository.save(user);
        }

        // Issue JWT token
        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getId(), user.getRole().toString());

        return new AuthResponse(user, token, "Login successful");
    }

    private GoogleIdToken.Payload verifyIdToken(String idTokenString) {
        try {
            log.info("Verifying Google token with Client ID: {}", googleClientId);
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                log.error("Token verification returned null - invalid token");
                throw new RuntimeException("Invalid Google ID token");
            }
            log.info("Token verified successfully for email: {}", idToken.getPayload().getEmail());
            return idToken.getPayload();
        } catch (Exception e) {
            log.error("Token verification failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to verify Google token: " + e.getMessage(), e);
        }
    }
}