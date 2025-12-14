package group9.advisor_eval_system.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Student {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(nullable = false)
    private String studentId; // School ID number
    
    @NotBlank
    @Column(nullable = false)
    private String firstName;
    
    @NotBlank
    @Column(nullable = false)
    private String lastName;
    
    @Email
    @Column(nullable = true)
    private String email;
    
    @Column(nullable = true)
    private String phoneNumber;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // Expose class IDs without exposing full class objects
    @JsonProperty("classIds")
    public List<Long> getClassIds() {
        return classes != null ? classes.stream()
                .map(SchoolClass::getId)
                .collect(Collectors.toList()) : new ArrayList<>();
    }
    
    // Allow setting classes by IDs during deserialization
    @JsonProperty("classIds")
    public void setClassIds(List<Long> classIds) {
        if (classIds != null && !classIds.isEmpty()) {
            this.classes = classIds.stream()
                    .map(id -> {
                        SchoolClass tempClass = new SchoolClass();
                        tempClass.setId(id);
                        return tempClass;
                    })
                    .collect(Collectors.toList());
        } else {
            this.classes = new ArrayList<>();
        }
    }
    
    // Expose team ID without exposing full team object
    @JsonProperty("teamId")
    public Long getTeamId() {
        return team != null ? team.getId() : null;
    }
    
    // Allow setting team by ID during deserialization
    @JsonProperty("teamId")
    public void setTeamId(Long teamId) {
        if (teamId != null) {
            Team tempTeam = new Team();
            tempTeam.setId(teamId);
            this.team = tempTeam;
        } else {
            this.team = null;
        }
    }
    
    // Relationships
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "student_classes",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "class_id")
    )
    @JsonIgnore
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private List<SchoolClass> classes = new ArrayList<>();
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = true)
    @JsonIgnore
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Team team;
}