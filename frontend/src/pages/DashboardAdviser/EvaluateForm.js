import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import { adviserAPI } from "../../services/api";
import "./Adviser.css";

const EvaluateForm = () => {
  const { teamId, questionnaireId } = useParams();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState(null);
  const [answers, setAnswers] = useState({});
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const evalData = await adviserAPI.getEvaluation(
          teamId,
          questionnaireId
        );

        console.log("Evaluation data:", evalData);
        console.log("Questionnaire:", evalData?.questionnaire);
        console.log("Items:", evalData?.questionnaire?.items);
        console.log("Scores:", evalData?.scores);

        if (!evalData) {
          setError("Failed to load evaluation: No data returned from server");
          setLoading(false);
          return;
        }

        setEvaluation(evalData);

        const existing = {};
        if (evalData.scores && Array.isArray(evalData.scores)) {
          evalData.scores.forEach((s) => {
            // Handle both nested structure (questionnaireItem.id) and flat structure (questionnaireItemId)
            const itemId = s.questionnaireItem?.id || s.questionnaireItemId;
            if (itemId) {
              existing[itemId] =
                s.numericScore ?? s.textResponse;
            } else {
              console.warn("Score missing item ID:", s);
            }
          });
        }

        setAnswers(existing);
        setComments(evalData.generalComments || "");
      } catch (e) {
        console.error("Error loading evaluation:", e);
        setError(e.message || "Failed to load evaluation");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teamId, questionnaireId]);

  const handleChange = (itemId, value) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const saveDraft = async () => {
    try {
      setSaveError(null);
      await adviserAPI.saveEvaluation({
        evaluationId: evaluation.id,
        answers,
        generalComments: comments,
      });
      alert("Draft saved");
    } catch (e) {
      console.error("Error saving evaluation:", e);
      setSaveError(e.message || "Failed to save evaluation");
    }
  };

  const submit = async () => {
    try {
      setSaveError(null);
      await adviserAPI.saveEvaluation({
        evaluationId: evaluation.id,
        answers,
        generalComments: comments,
      });
      await adviserAPI.submitEvaluation(evaluation.id);
      navigate("/adviser/completed");
    } catch (e) {
      console.error("Error submitting evaluation:", e);
      setSaveError(e.message || "Failed to submit evaluation");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error-message">{error}</p>;
  
  if (!evaluation || !evaluation.questionnaire) {
    return <p className="error-message">Evaluation data is incomplete</p>;
  }

  const items = evaluation.questionnaire.items || [];

  return (
    <div className="adviser-container">
      <AdviserSidebar />

      <div className="adviser-content">
        <h1>{evaluation.questionnaire.title}</h1>

        {items.length === 0 ? (
          <div className="error-message">
            <p>No questions found in this questionnaire.</p>
            <p>Please contact the teacher to add questions to this questionnaire.</p>
          </div>
        ) : null}

        {saveError && (
          <div className="error-message" style={{ marginBottom: "20px" }}>
            <p>{saveError}</p>
            <button onClick={() => setSaveError(null)} style={{ marginTop: "10px" }}>
              Dismiss
            </button>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="form-group">
            <label>{item.questionText}</label>

            {item.questionType === "TEXT" && (
              <textarea
                value={answers[item.id] || ""}
                onChange={(e) =>
                  handleChange(item.id, e.target.value)
                }
              />
            )}

            {(item.questionType === "NUMERIC_SCALE" ||
              item.questionType === "RATING") && (
              <div>
                <input
                  type="number"
                  min={item.minScore}
                  max={item.maxScore}
                  value={answers[item.id] || ""}
                  onChange={(e) =>
                    handleChange(item.id, e.target.value)
                  }
                />
                <small style={{ marginLeft: "10px", color: "#666" }}>
                  ({item.minScore} - {item.maxScore})
                </small>
              </div>
            )}

            {item.questionType === "MULTIPLE_CHOICE" && (
              <div className="radio-group">
                {item.choices && item.choices.length > 0 ? (
                  item.choices.map((choice, index) => (
                    <label key={index} className="radio-label">
                      <input
                        type="radio"
                        name={`question-${item.id}`}
                        value={choice}
                        checked={answers[item.id] === choice}
                        onChange={(e) =>
                          handleChange(item.id, e.target.value)
                        }
                      />
                      <span>{choice}</span>
                    </label>
                  ))
                ) : (
                  <p className="error-message">No choices available for this question</p>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="form-group">
          <label>General Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="btn-secondary" onClick={saveDraft}>
            Save Draft
          </button>
          <button className="btn" onClick={submit}>
            Submit Evaluation
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluateForm;
