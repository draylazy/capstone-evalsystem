import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  UserCircle2,
} from "lucide-react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { performanceAPI } from "../../services/api";
import "./Teacher.css";

const TeamFormResponsesPage = () => {
  const { teamId, questionnaireId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStudents, setExpandedStudents] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await performanceAPI.getTeamQuestionnaireResponses(
          teamId,
          questionnaireId
        );
        setData(result);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId, questionnaireId]);

  const toggleStudent = (studentId) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const renderEvaluations = (evaluations) => {
    if (!evaluations?.length) {
      return (
        <p style={{ color: "var(--dtm-muted)", fontSize: 13, margin: 0 }}>
          No responses submitted for this questionnaire.
        </p>
      );
    }

    return evaluations.map((ev, idx) => {
      const scores = ev.scores || [];
      return (
        <div
          key={idx}
          style={
            idx < evaluations.length - 1
              ? { marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }
              : {}
          }
        >
          {/* Evaluation meta row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--dtm-muted)" }}>
              {ev.adviserName
                ? `Evaluated by Adviser: ${ev.adviserName}`
                : ev.evaluatorName
                ? `Evaluator: ${ev.evaluatorName}`
                : "Submitted evaluation"}
              {ev.submittedAt
                ? ` · ${new Date(ev.submittedAt).toLocaleDateString()}`
                : ""}
            </span>
            {ev.scoresSummary?.totalScore !== null &&
              ev.scoresSummary?.totalScore !== undefined && (
                <span className="evaluation-modal-count">
                  {ev.scoresSummary.totalScore}
                  {ev.scoresSummary.maxPossible
                    ? ` / ${ev.scoresSummary.maxPossible}`
                    : ""}
                  {ev.scoresSummary.percentage !== null
                    ? ` (${Number(ev.scoresSummary.percentage).toFixed(1)}%)`
                    : ""}
                </span>
              )}
          </div>

          {/* Q&A rows */}
          {scores.map((score, si) => {
            const prevSection =
              si > 0 ? scores[si - 1].sectionTitle : null;
            const showSection =
              score.sectionTitle && score.sectionTitle !== prevSection;

            return (
              <div key={si}>
                {showSection && (
                  <div
                    style={{ marginTop: si > 0 ? 14 : 0, marginBottom: 6 }}
                  >
                    <span className="evaluation-response-section">
                      {score.sectionTitle}
                    </span>
                  </div>
                )}
                <div
                  className="qa-question-row"
                  style={{
                    padding: "10px 0",
                    borderBottom:
                      si < scores.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                  }}
                >
                  <div className="qa-question-top">
                    <span className="qa-question-num">Q{si + 1}</span>
                    <span className="qa-question-text">
                      {score.questionText}
                    </span>
                  </div>
                  <div
                    className={`qa-answer-block${
                      score.numericScore === null &&
                      score.numericScore === undefined &&
                      !score.textResponse
                        ? " is-empty"
                        : ""
                    }`}
                  >
                    {score.numericScore !== null &&
                    score.numericScore !== undefined
                      ? `${score.numericScore}${
                          score.maxScore ? ` / ${score.maxScore}` : ""
                        }`
                      : score.textResponse || "Not answered"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-secondary btn-sm"
            onClick={() =>
              navigate(`/teacher/performance/team/${teamId}/forms`)
            }
          >
            <ChevronLeft size={14} style={{ marginRight: 4 }} />
            Back
          </button>
          <h1 style={{ margin: 0 }}>
            {data?.questionnaireTitle || "Questionnaire Responses"}
          </h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="section">
            <p style={{ color: "var(--dtm-muted)" }}>Loading responses…</p>
          </div>
        ) : !data?.students?.length ? (
          <div className="section">
            <div className="perf-empty-state">
              <UserCircle2 size={40} className="perf-empty-icon" />
              <p>No student data found.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {data.students.map((student) => {
              const isExpanded = expandedStudents[student.studentId];
              const hasEvals = student.evaluations?.length > 0;
              const initials = student.studentName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={student.studentId}
                  className="section"
                  style={{ padding: 0, overflow: "hidden" }}
                >
                  {/* Collapsible header */}
                  <button
                    type="button"
                    onClick={() => toggleStudent(student.studentId)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--dtm-text)",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "rgba(138,21,31,0.5)",
                          border: "1px solid rgba(242,201,76,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "var(--dtm-gold)",
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                          {student.studentName}
                        </div>
                        <div
                          style={{ fontSize: 12, color: "var(--dtm-muted)" }}
                        >
                          {hasEvals
                            ? `${student.evaluations.length} response${
                                student.evaluations.length !== 1 ? "s" : ""
                              }`
                            : "No responses"}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp
                        size={16}
                        style={{ color: "var(--dtm-muted)", flexShrink: 0 }}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        style={{ color: "var(--dtm-muted)", flexShrink: 0 }}
                      />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "0 20px 20px",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ paddingTop: 16 }}>
                        {renderEvaluations(student.evaluations)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamFormResponsesPage;
