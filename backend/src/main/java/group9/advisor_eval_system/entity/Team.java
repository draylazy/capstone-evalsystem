package group9.advisor_eval_system.entity;

import jakarta.persistence.*;
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
@Table(name = "teams")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Team {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(nullable = false)
    private String name;
    
    @Column(length = 1000)
    private String description;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private SchoolClass schoolClass;
    
    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL)
    private Set<Student> members = new HashSet<>();
    
    @ManyToMany
    @JoinTable(
        name = "team_advisers",
        joinColumns = @JoinColumn(name = "team_id"),
        inverseJoinColumns = @JoinColumn(name = "adviser_id")
    )
    private Set<User> advisers = new HashSet<>();
    
    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL)
    private Set<Evaluation> evaluations = new HashSet<>();
    
    @ManyToMany
    @JoinTable(
        name = "team_questionnaires",
        joinColumns = @JoinColumn(name = "team_id"),
        inverseJoinColumns = @JoinColumn(name = "questionnaire_id")
    )
    private Set<Questionnaire> questionnaires = new HashSet<>();
}