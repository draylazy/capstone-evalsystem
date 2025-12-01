package group9.advisor_eval_system.repository;

import group9.advisor_eval_system.entity.Questionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionnaireRepository extends JpaRepository<Questionnaire, Long> {
    Optional<Questionnaire> findByGoogleFormId(String googleFormId);
    List<Questionnaire> findByIsActiveTrue();
}