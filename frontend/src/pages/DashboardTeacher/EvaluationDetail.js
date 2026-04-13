import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { teacherReportAPI } from "../../services/api";
import "./Teacher.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

const isLikelySectionTitle = (line) => {
  if (!line) return false;
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 80) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  const noPunctuationTail = !/[.:]$/.test(trimmed);
  return trimmed === trimmed.toUpperCase() && noPunctuationTail;
};

const parseAiFeedbackSections = (feedbackText) => {
  if (!feedbackText || !feedbackText.trim()) {
    return [];
  }

  const lines = feedbackText.split("\n").map((line) => line.trim());
  const sections = [];
  let current = null;

  const ensureCurrent = () => {
    if (!current) {
      current = { title: "AI Insight", paragraphs: [], bullets: [] };
      sections.push(current);
    }
  };

  lines.forEach((line) => {
    if (!line) {
      return;
    }

    if (isLikelySectionTitle(line)) {
      current = { title: line, paragraphs: [], bullets: [] };
      sections.push(current);
      return;
    }

    ensureCurrent();

    if (line.startsWith("- ") || line.startsWith("• ")) {
      current.bullets.push(line.substring(2).trim());
    } else {
      current.paragraphs.push(line);
    }
  });

  return sections;
};

const EvaluationDetail = () => {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [aiFeedbackError, setAiFeedbackError] = useState(null);

  const token = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      return user?.token || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    loadEvaluation();
  }, [evaluationId]);

  useEffect(() => {
    if (evaluation && token) {
      generateAiFeedback(evaluation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation, token]);

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const data = await teacherReportAPI.getEvaluationDetails(evaluationId);
      setEvaluation(data);
    } catch (err) {
      setError("Failed to load evaluation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildAiContext = (evalData) => {
    const scores = Array.isArray(evalData?.scores) ? evalData.scores : [];
    const questionLines = scores.map((score, index) => {
      const answer = score.numericScore !== null
        ? score.numericScore
        : (score.textResponse || "Not answered");
      return `${index + 1}. Question: ${score.questionText || "Untitled question"}\n   Answer: ${String(answer)}`;
    });

    const submitted = evalData?.submittedAt
      ? new Date(evalData.submittedAt).toLocaleString()
      : "Not submitted";

    return [
      `Questionnaire: ${evalData?.questionnaire?.title || "N/A"}`,
      `Team: ${evalData?.teamName || "N/A"}`,
      `Adviser: ${evalData?.adviserName || "N/A"}`,
      `Status: ${evalData?.status || "N/A"}`,
      `Submitted: ${submitted}`,
      `General Comments: ${evalData?.generalComments || "None"}`,
      "Responses:",
      questionLines.length ? questionLines.join("\n") : "No responses recorded.",
    ].join("\n\n");
  };

  const generateAiFeedback = async (evalData) => {
    if (!token || !evalData) {
      return;
    }

    setAiFeedbackLoading(true);
    setAiFeedbackError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "Analyze this adviser evaluation and provide a concise feedback report with exactly these sections: Overall Quality, Strengths, Risks or Gaps, General Comment Interpretation, and Recommended Next Actions for Teacher.",
          contextType: "response_summary",
          context: buildAiContext(evalData),
          history: [],
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Failed to generate AI feedback (HTTP ${res.status})`);
      }

      setAiFeedback(data?.reply || "AI feedback is currently unavailable.");
    } catch (err) {
      setAiFeedbackError(err.message || "Failed to generate AI feedback");
      setAiFeedback("");
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="teacher-container">
        <TeacherSidebar />
        <div className="teacher-content">
          <p>Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="teacher-container">
        <TeacherSidebar />
        <div className="teacher-content">
          <div className="error-message">{error || "Evaluation not found"}</div>
          <button className="btn-secondary" onClick={() => navigate("/teacher/reports")}>
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const aiFeedbackSections = parseAiFeedbackSections(aiFeedback);

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <div style={{ marginBottom: "20px" }}>
          <button className="btn-secondary" onClick={() => navigate("/teacher/reports")}>
            ← Back to Reports
          </button>
        </div>

        <h1>Evaluation Details</h1>

        <div className="section">
          <h2>Evaluation Information</h2>
          <div style={{ marginBottom: "20px" }}>
            <p><strong>Questionnaire:</strong> {evaluation.questionnaire.title}</p>
            <p><strong>Team:</strong> {evaluation.teamName}</p>
            <p><strong>Adviser:</strong> {evaluation.adviserName}</p>
            <p><strong>Status:</strong> <span className={evaluation.status === "SUBMITTED" ? "completed" : "pending"}>
              {evaluation.status}
            </span></p>
            <p><strong>Submitted:</strong> {evaluation.submittedAt 
              ? new Date(evaluation.submittedAt).toLocaleString()
              : "Not submitted"}</p>
          </div>
        </div>

        <div className="section">
          <div className="evaluation-ai-panel">
            <div className="evaluation-feedback-header">
              <div>
                <h2>AI Feedback on Adviser Evaluation</h2>
                <div className="evaluation-feedback-subtitle">
                  Auto-analyzed from question responses and general comments.
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => generateAiFeedback(evaluation)}
                disabled={aiFeedbackLoading || !token}
              >
                {aiFeedbackLoading ? "Analyzing..." : "Regenerate"}
              </button>
            </div>

            <div className="evaluation-feedback-chip-row">
              <span className="evaluation-feedback-chip">Responses</span>
              <span className="evaluation-feedback-chip">Topics</span>
              <span className="evaluation-feedback-chip">General Comments</span>
            </div>

            {!token && (
              <p className="pending">AI feedback requires a valid login session.</p>
            )}

            {aiFeedbackError && (
              <div className="error-message">{aiFeedbackError}</div>
            )}

            {aiFeedbackLoading ? (
              <div className="evaluation-ai-feedback-box">
                Generating feedback from adviser responses, topics, and comments...
              </div>
            ) : aiFeedback ? (
              <div className="evaluation-ai-feedback-box">
                {aiFeedbackSections.length > 0 ? (
                  <div className="ai-feedback-sections">
                    {aiFeedbackSections.map((section, idx) => (
                      <div key={`${section.title}-${idx}`} className="ai-feedback-section-card">
                        <h3 className="ai-feedback-section-title">{section.title}</h3>

                        {section.paragraphs.map((paragraph, pIdx) => (
                          <p key={pIdx} className="ai-feedback-paragraph">{paragraph}</p>
                        ))}

                        {section.bullets.length > 0 && (
                          <ul className="ai-feedback-list">
                            {section.bullets.map((bullet, bIdx) => (
                              <li key={bIdx}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  aiFeedback
                )}
              </div>
            ) : (
              <div className="evaluation-ai-feedback-box">
                No AI feedback yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDetail;
