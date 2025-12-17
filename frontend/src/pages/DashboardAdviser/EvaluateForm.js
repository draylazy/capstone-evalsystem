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

  useEffect(() => {
    const load = async () => {
      try {
        const evalData = await adviserAPI.getEvaluation(
          teamId,
          questionnaireId
        );

        setEvaluation(evalData);

        const existing = {};
        (evalData.scores || []).forEach((s) => {
          existing[s.questionnaireItem.id] =
            s.numericScore ?? s.textResponse;
        });

        setAnswers(existing);
        setComments(evalData.generalComments || "");
      } catch (e) {
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
    await adviserAPI.saveEvaluation({
      evaluationId: evaluation.id,
      answers,
      generalComments: comments,
    });
    alert("Draft saved");
  };

  const submit = async () => {
    await adviserAPI.saveEvaluation({
      evaluationId: evaluation.id,
      answers,
      generalComments: comments,
    });
    await adviserAPI.submitEvaluation(evaluation.id);
    navigate("/adviser/completed");
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="adviser-container">
      <AdviserSidebar />

      <div className="adviser-content">
        <h1>{evaluation.questionnaire.title}</h1>

        {evaluation.questionnaire.items.map((item) => (
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
              <input
                type="number"
                min={item.minScore}
                max={item.maxScore}
                value={answers[item.id] || ""}
                onChange={(e) =>
                  handleChange(item.id, e.target.value)
                }
              />
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

        <div className="actions">
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
