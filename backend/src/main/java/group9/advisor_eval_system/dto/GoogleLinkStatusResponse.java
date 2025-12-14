package group9.advisor_eval_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoogleLinkStatusResponse {
    private boolean isLinked;
    private String googleEmail;
    private String message;
}
