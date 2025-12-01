package group9.advisor_eval_system.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(nullable = false)
    private String firstName;
    
    @NotBlank
    @Column(nullable = false)
    private String lastName;
    
    @Email
    @NotBlank
    @Column(nullable = false, unique = true)
    private String email;
    
    @NotBlank
    @Column(nullable = false)
    private String password; // Encrypted
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role; // TEACHER or ADVISER
    
    @Column(nullable = true)
    private String phoneNumber;
    
    @Column(nullable = true)
    private String department;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // Relationships
    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL)
    private Set<SchoolClass> createdClasses = new HashSet<>();
    
    @ManyToMany(mappedBy = "advisers")
    private Set<Team> advisedTeams = new HashSet<>();
    
    public enum UserRole {
        TEACHER,
        ADVISER
    }
}