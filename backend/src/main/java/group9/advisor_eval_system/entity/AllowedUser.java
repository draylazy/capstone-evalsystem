package group9.advisor_eval_system.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "allowed_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AllowedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private User.UserRole assignedRole;

    @Column(nullable = false)
    private Boolean isRegistered = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
