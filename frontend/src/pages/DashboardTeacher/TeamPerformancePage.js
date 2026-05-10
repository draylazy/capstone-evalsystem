import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, FileText, Users, Sparkles } from "lucide-react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { performanceAPI } from "../../services/api";
import "./Teacher.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";

const TeamPerformancePage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [individualScores, setIndividualScores] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single team-wide AI summary
  const [teamAiSummary, setTeamAiSummary] = useState(null);
  const [loadingTeamAi, setLoadingTeamAi] = useState(false);

  const token = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.token || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [teamData, scoresData] = await Promise.all([
          performanceAPI.getTeamStudents(teamId),
          performanceAPI.getTeamIndividualScores(teamId),
        ]);
        setTeamName(teamData?.teamName || "Team");
        setStudents(Array.isArray(teamData?.students) ? teamData.students : []);
        setIndividualScores(Array.isArray(scoresData) ? scoresData : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

  const getScoreForStudent = useCallback(
    (studentId) =>
      individualScores.find((s) => s.studentId === studentId) || null,
    [individualScores]
  );

  const fetchTeamAiSummary = useCallback(async () => {
    if (!token || individualScores.length === 0) return;
    setLoadingTeamAi(true);

    // Build a context block listing every student with their scores
    const studentLines = students.map((student) => {
      const sd = getScoreForStudent(student.id);
      const name = `${student.firstName} ${student.lastName}`;
      if (!sd || sd.evalCount === 0) {
        return `  - ${name}: No individual evaluation data`;
      }
      const scoreLine =
        sd.totalScore !== null
          ? `${sd.totalScore}${sd.maxPossible ? ` / ${sd.maxPossible}` : ""}${
              sd.percentage !== null
                ? ` (${sd.percentage.toFixed(1)}%)`
                : ""
            }, ${sd.evalCount} eval${sd.evalCount !== 1 ? "s" : ""}`
          : "No numeric score";

      const breakdownLines = (sd.questionnaires || [])
        .map(
          (q) =>
            `      • ${q.title}: ${q.score}${q.maxScore ? ` / ${q.maxScore}` : ""}${
              q.percentage !== null ? ` (${q.percentage.toFixed(1)}%)` : ""
            }`
        )
        .join("\n");

      return `  - ${name}: ${scoreLine}\n${breakdownLines}`;
    });

    const contextLines = [
      `Team: ${teamName}`,
      `Total students: ${students.length}`,
      "",
      "Student performance (individual evaluation sections only):",
      ...studentLines,
    ].join("\n");

    try {
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message:
            "Write a concise team performance summary (3-5 sentences). Compare each student's scores, name who scored highest and lowest, highlight any notable gaps or consistent strengths, and give an overall team performance level assessment.",
          context: contextLines,
          contextType: "team_performance",
        }),
      });
      const data = await res.json().catch(() => null);
      setTeamAiSummary(
        res.ok && data?.reply ? data.reply : "AI analysis unavailable."
      );
    } catch {
      setTeamAiSummary("AI analysis unavailable.");
    } finally {
      setLoadingTeamAi(false);
    }
  }, [token, students, individualScores, teamName, getScoreForStudent]);

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn-secondary btn-sm"
              onClick={() => navigate("/teacher/performance")}
            >
              <ChevronLeft size={14} style={{ marginRight: 4 }} />
              Back
            </button>
            <h1 style={{ margin: 0 }}>{teamName}</h1>
          </div>
          <button
            className="btn"
            onClick={() =>
              navigate(`/teacher/performance/team/${teamId}/forms`)
            }
          >
            <FileText size={15} style={{ marginRight: 6 }} />
            Forms
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="section">
            <p style={{ color: "var(--dtm-muted)" }}>Loading students…</p>
          </div>
        ) : students.length === 0 ? (
          <div className="section">
            <div className="perf-empty-state">
              <Users size={40} className="perf-empty-icon" />
              <p>No students found in this team.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable student list — capped at ~2.5 cards height */}
            <div
              style={{
                maxHeight: 480,
                overflowY: "auto",
                display: "grid",
                gap: 16,
                paddingRight: 4,
                marginBottom: 20,
              }}
            >
              {students.map((student) => {
                const scoreData = getScoreForStudent(student.id);
                const hasIndividualData = scoreData && scoreData.evalCount > 0;

                return (
                  <div
                    key={student.id}
                    className="section"
                    style={{ padding: 20 }}
                  >
                    {/* Student header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: "50%",
                            background: "rgba(138,21,31,0.5)",
                            border: "1px solid rgba(242,201,76,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "var(--dtm-gold)",
                            flexShrink: 0,
                          }}
                        >
                          {student.firstName?.[0]?.toUpperCase()}
                          {student.lastName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 16,
                              color: "var(--dtm-text)",
                            }}
                          >
                            {student.firstName} {student.lastName}
                          </div>
                          {student.studentNumber && (
                            <div
                              style={{ fontSize: 12, color: "var(--dtm-muted)" }}
                            >
                              {student.studentNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Score badge */}
                      {hasIndividualData && scoreData.totalScore !== null && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 800,
                              color: "var(--dtm-gold)",
                              lineHeight: 1,
                            }}
                          >
                            {scoreData.totalScore}
                            {scoreData.maxPossible
                              ? ` / ${scoreData.maxPossible}`
                              : ""}
                          </div>
                          {scoreData.percentage !== null && (
                            <div
                              style={{ fontSize: 12, color: "var(--dtm-muted)" }}
                            >
                              {scoreData.percentage.toFixed(1)}% ·{" "}
                              {scoreData.evalCount} eval
                              {scoreData.evalCount !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Questionnaire breakdown chips */}
                    {hasIndividualData &&
                      scoreData.questionnaires?.length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {scoreData.questionnaires.map((q, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                fontSize: 12,
                              }}
                            >
                              <span style={{ color: "var(--dtm-muted)" }}>
                                {q.title}:{" "}
                              </span>
                              <span
                                style={{
                                  color: "var(--dtm-text)",
                                  fontWeight: 700,
                                }}
                              >
                                {q.score}
                                {q.maxScore ? ` / ${q.maxScore}` : ""}
                                {q.percentage !== null
                                  ? ` (${q.percentage.toFixed(1)}%)`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* No data message */}
                    {!hasIndividualData && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          color: "var(--dtm-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        No individual evaluation data available for this student.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Team-wide AI Summary (below students) ── */}
            <div className="evaluation-ai-panel">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: teamAiSummary || loadingTeamAi ? 12 : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={14} style={{ color: "var(--dtm-gold)" }} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--dtm-gold)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    AI Team Summary
                  </span>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={fetchTeamAiSummary}
                  disabled={loadingTeamAi}
                >
                  {loadingTeamAi
                    ? "Thinking…"
                    : teamAiSummary
                    ? "Refresh"
                    : "Generate"}
                </button>
              </div>

              {loadingTeamAi ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="ai-feedback-skeleton-card"
                      style={{ height: 22 }}
                    />
                  ))}
                </div>
              ) : teamAiSummary ? (
                <p
                  style={{
                    margin: 0,
                    color: "var(--dtm-text)",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  {teamAiSummary}
                </p>
              ) : (
                <p style={{ margin: 0, color: "var(--dtm-muted)", fontSize: 13 }}>
                  Click Generate to get an AI summary comparing all students in
                  this team.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamPerformancePage;
