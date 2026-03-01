package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.AllowedUser;
import group9.advisor_eval_system.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AllowedUserRepository extends JpaRepository<AllowedUser, Long> {
    Optional<AllowedUser> findByEmail(String email);
    boolean existsByEmail(String email);
    List<AllowedUser> findByAssignedRole(User.UserRole role);
    List<AllowedUser> findByIsRegistered(Boolean isRegistered);
}
