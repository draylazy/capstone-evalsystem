import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { teacherReportAPI } from "../../services/api";
import "./Teacher.css";

const QA_FILTER_OPTIONS = ["all", "withScores", "textAnswers", "unanswered"];

const StudentEvaluationDetail = () => {
  const { evaluationId } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qaFilter, setQaFilter] = useState("all");

  useEffect(() => {
    loadEvaluation();
  }, [evaluationId]);

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const data = await teacherReportAPI.getStudentEvaluationDetails(evaluationId);
      setEvaluation(data);
    } catch (err) {
      setError("Failed to load evaluation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toSortedNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  };

  const formatAnswerValue = (score, item) => {
    if (!score) return "Not answered";
    const parts = [];
    if (score.numericScore !== null && score.numericScore !== undefined) {
      const hasScale = item && item.minScore !== null && item.minScore !== undefined
        && item.maxScore !== null && item.maxScore !== undefined;
      if (hasScale) {
        parts.push(`${score.numericScore} (Scale ${item.minScore}-${item.maxScore})`);
      } else {
        parts.push(String(score.numericScore));
      }
    }
    if (score.textResponse && score.textResponse.trim()) {
      parts.push(score.textResponse.trim());
    }
    return parts.length ? parts.join(" | ") : "Not answered";
  };

  const buildQuestionAnswerRows = (evalData) => {
    if (!evalData) return [];
    const questionnaire = evalData.questionnaire || {};
    const scores = Array.isArray(evalData.scores) ? evalData.scores : [];
    const sections = Array.isArray(questionnaire.sections) ? questionnaire.sections : [];
    const standaloneItems = Array.isArray(questionnaire.items) ? questionnaire.items : [];

    const scoreByItemId = new Map(
      scores
        .filter((score) => score.questionnaireItemId !== null && score.questionnaireItemId !== undefined)
        .map((score) => [score.questionnaireItemId, score])
    );

    const rows = [];
    const renderedScoreIds = new Set();

    sections
      .slice()
      .sort((a, b) => toSortedNumber(a.orderIndex) - toSortedNumber(b.orderIndex))
      .forEach((section) => {
        const sectionItems = Array.isArray(section.items) ? section.items : [];
        sectionItems
          .slice()
          .sort((a, b) => toSortedNumber(a.orderIndex) - toSortedNumber(b.orderIndex))
          .forEach((item) => {
            const score = scoreByItemId.get(item.id);
            if (score?.id) renderedScoreIds.add(score.id);
            const hasNumericAnswer = score?.numericScore !== null && score?.numericScore !== undefined;
            const hasTextAnswer = !!(score?.textResponse && score.textResponse.trim());
            rows.push({
              key: item.id ?? `section-${section.id}-${rows.length}`,
              sectionTitle: section.sectionTitle || null,
              questionText: item.questionText || score?.questionText || "Untitled question",
              answerText: formatAnswerValue(score, item),
              hasNumericAnswer,
              hasTextAnswer,
              isAnswered: hasNumericAnswer || hasTextAnswer,
            });
          });
      });

    standaloneItems
      .slice()
      .sort((a, b) => toSortedNumber(a.orderIndex) - toSortedNumber(b.orderIndex))
      .forEach((item) => {
        const score = scoreByItemId.get(item.id);
        if (score?.id) renderedScoreIds.add(score.id);
        const hasNumericAnswer = score?.numericScore !== null && score?.numericScore !== undefined;
        const hasTextAnswer = !!(score?.textResponse && score.textResponse.trim());
        rows.push({
          key: item.id ?? `item-${rows.length}`,
          sectionTitle: null,
          questionText: item.questionText || score?.questionText || "Untitled question",
          answerText: formatAnswerValue(score, item),
          hasNumericAnswer,
          hasTextAnswer,
          isAnswered: hasNumericAnswer || hasTextAnswer,
        });
      });

    return rows;
  };

  const questionAnswerRows = useMemo(() => buildQuestionAnswerRows(evaluation), [evaluation]);

  const filteredQuestionAnswerRows = useMemo(() => {
    if (qaFilter === "withScores") return questionAnswerRows.filter((row) => row.hasNumericAnswer);
    if (qaFilter === "textAnswers") return questionAnswerRows.filter((row) => row.hasTextAnswer);
    if (qaFilter === "unanswered") return questionAnswerRows.filter((row) => !row.isAnswered);
    return questionAnswerRows;
  }, [questionAnswerRows, qaFilter]);

  if (loading) {
    return (
      <div className="teacher-container">
        <TeacherSidebar />
        <div className="teacher-content">Loading evaluation...</div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="teacher-container">
        <TeacherSidebar />
        <div className="teacher-content">
          <div className="error-message">{error || "Evaluation not found"}</div>
          <button className="btn-secondary" onClick={() => navigate("/teacher/reports")}>Back to Reports</button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <div style={{ marginBottom: "20px" }}>
          <button className="btn-secondary" onClick={() => navigate("/teacher/reports")}>← Back to Reports</button>
        </div>

        <h1>Student Evaluation Detail</h1>

        <div className="section">
          <h2>Evaluation Summary</h2>
          <div className="evaluation-info-grid">
            <div className="evaluation-info-item">
              <span className="evaluation-info-label">Questionnaire</span>
              <span className="evaluation-info-value">{evaluation.questionnaire?.title || "N/A"}</span>
            </div>
            <div className="evaluation-info-item">
              <span className="evaluation-info-label">Team</span>
              <span className="evaluation-info-value">{evaluation.teamName}</span>
            </div>
            <div className="evaluation-info-item">
              <span className="evaluation-info-label">Evaluator</span>
              <span className="evaluation-info-value">{evaluation.evaluatorName}</span>
            </div>
            <div className="evaluation-info-item">
              <span className="evaluation-info-label">Evaluatee</span>
              <span className="evaluation-info-value">
                {evaluation.evaluateeName} {evaluation.isSelf ? "(Self)" : "(Peer)"}
              </span>
            </div>
            <div className="evaluation-info-item">
              <span className="evaluation-info-label">Average Score</span>
              <span className="evaluation-info-value" style={{ color: 'var(--dtm-gold)', fontWeight: 'bold' }}>
                {evaluation.averageScore != null ? evaluation.averageScore.toFixed(2) : "N/A"}
              </span>
            </div>
            <div className="evaluation-info-item">
              <span className="evaluation-info-label">Status</span>
              <span className={`evaluation-info-value ${evaluation.status === "SUBMITTED" ? "completed" : "pending"}`}>
                {evaluation.status}
              </span>
            </div>
          </div>
        </div>

        <div className="section">
          <h2>Questionnaire Responses</h2>
          
          <div className="evaluation-modal-filter-row" style={{ marginBottom: '20px' }}>
            {QA_FILTER_OPTIONS.map((filterKey) => (
              <button
                key={filterKey}
                className={`evaluation-filter-chip ${qaFilter === filterKey ? "is-active" : ""}`}
                onClick={() => setQaFilter(filterKey)}
              >
                {filterKey === "all" ? "All" : filterKey === "withScores" ? "With Scores" : filterKey === "textAnswers" ? "Text Answers" : "Unanswered"}
              </button>
            ))}
          </div>

          <div className="evaluation-response-list">
            {filteredQuestionAnswerRows.length > 0 ? (
              filteredQuestionAnswerRows.map((row, index) => (
                <div key={row.key} className="evaluation-response-item" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '15px' }}>
                  {row.sectionTitle && (
                    <div className="evaluation-response-section">{row.sectionTitle}</div>
                  )}
                  <div className="evaluation-response-question">
                    <strong>Q{index + 1}:</strong> {row.questionText}
                  </div>
                  <div className="evaluation-response-answer">
                    <strong>Answer:</strong> {row.answerText}
                  </div>
                </div>
              ))
            ) : (
              <p className="pending">No responses match this filter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentEvaluationDetail;
