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
  const [peerScores, setPeerScores] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStudents, setExpandedStudents] = useState({});

  const toggleExpand = (studentId) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

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
        const [teamData, scoresData, peerScoresData] = await Promise.all([
          performanceAPI.getTeamStudents(teamId),
          performanceAPI.getTeamIndividualScores(teamId),
          performanceAPI.getTeamPeerScores(teamId),
        ]);
        setTeamName(teamData?.teamName || "Team");
        setStudents(Array.isArray(teamData?.students) ? teamData.students : []);
        setIndividualScores(Array.isArray(scoresData) ? scoresData : []);
        setPeerScores(Array.isArray(peerScoresData) ? peerScoresData : []);
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

  const getPeerScoreForStudent = useCallback(
    (studentId) =>
      peerScores.find((s) => s.studentId === studentId) || null,
    [peerScores]
  );

  const fetchTeamAiSummary = useCallback(async () => {
    if (!token || (individualScores.length === 0 && peerScores.length === 0)) return;
    setLoadingTeamAi(true);

    // Build a context block listing every student with their scores
    const studentLines = students.map((student) => {
      const sd = getScoreForStudent(student.id);
      const psd = getPeerScoreForStudent(student.id);
      const name = `${student.firstName} ${student.lastName}`;
      
      let lines = `  - ${name}:\n`;
      
      // Adviser section
      if (sd && sd.evalCount > 0) {
        const scoreLine = sd.totalScore !== null
          ? `${sd.totalScore}${sd.maxPossible ? ` / ${sd.maxPossible}` : ""}${
              sd.percentage !== null
                ? ` (${sd.percentage.toFixed(1)}%)`
                : ""
            }, ${sd.evalCount} eval${sd.evalCount !== 1 ? "s" : ""}`
          : "No numeric score";
        
        const breakdown = (sd.questionnaires || [])
          .map(q => `      • ${q.title}: ${q.score}${q.maxScore ? ` / ${q.maxScore}` : ""}${q.percentage !== null ? ` (${q.percentage.toFixed(1)}%)` : ""}`)
          .join("\n");
          
        lines += `    * Adviser Rating: ${scoreLine}\n${breakdown}\n`;
      } else {
        lines += `    * Adviser Rating: No individual evaluation data\n`;
      }
      
      // Peer section
      if (psd && psd.evalCount > 0) {
        const scoreLine = psd.totalScore !== null
          ? `${psd.totalScore}${psd.maxPossible ? ` / ${psd.maxPossible}` : ""}${
              psd.percentage !== null
                ? ` (${psd.percentage.toFixed(1)}%)`
                : ""
            }, ${psd.evalCount} eval${psd.evalCount !== 1 ? "s" : ""}`
          : "No numeric score";
          
        const breakdown = (psd.questionnaires || [])
          .map(q => `      • ${q.title}: ${q.score}${q.maxScore ? ` / ${q.maxScore}` : ""}${q.percentage !== null ? ` (${q.percentage.toFixed(1)}%)` : ""}`)
          .join("\n");
          
        lines += `    * Peer Rating: ${scoreLine}\n${breakdown}`;
      } else {
        lines += `    * Peer Rating: No peer evaluation data`;
      }

      return lines;
    });

    const contextLines = [
      `Team: ${teamName}`,
      `Total students: ${students.length}`,
      "",
      "Student Performance Data (showing both Adviser Evaluations and Peer-to-Peer Evaluations):",
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
            "Write a concise team performance summary (3-5 sentences). Compare and contrast the adviser ratings and peer-to-peer ratings for each student. Identify who scored highest and lowest in both adviser and peer ratings, highlight any notable perception gaps (e.g. where a student scored highly from peers but poorly from the adviser, or vice-versa), and assess the overall team dynamic.",
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
  }, [token, students, individualScores, peerScores, teamName, getScoreForStudent, getPeerScoreForStudent]);

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
                const peerScoreData = getPeerScoreForStudent(student.id);
                const hasIndividualData = scoreData && scoreData.evalCount > 0;
                const hasPeerData = peerScoreData && peerScoreData.evalCount > 0;

                return (
                  <div
                    key={student.id}
                    className="section perf-student-card-interactive"
                    style={{ padding: 20 }}
                    onClick={() => navigate(`/teacher/performance/student/${student.id}?from=${teamId}`)}
                  >
                    {/* Student header row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
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

                      {/* Side-by-Side Score badges */}
                      <div style={{ display: "flex", gap: 24, textAlign: "right", flexShrink: 0 }}>
                        {/* Adviser Score */}
                        <div style={{ minWidth: 100 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--dtm-gold)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: 2,
                            }}
                          >
                            Adviser Rating
                          </div>
                          {hasIndividualData && scoreData.totalScore !== null ? (
                            <>
                              <div
                                style={{
                                  fontSize: 20,
                                  fontWeight: 800,
                                  color: "var(--dtm-gold)",
                                  lineHeight: 1.1,
                                }}
                              >
                                {scoreData.totalScore}
                                {scoreData.maxPossible ? `/${scoreData.maxPossible}` : ""}
                              </div>
                              {scoreData.percentage !== null && (
                                <div style={{ fontSize: 11, color: "var(--dtm-muted)", marginTop: 2 }}>
                                  {scoreData.percentage.toFixed(1)}% ({scoreData.evalCount} eval{scoreData.evalCount !== 1 ? "s" : ""})
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dtm-muted)", fontStyle: "italic", marginTop: 2 }}>
                              No Data
                            </div>
                          )}
                        </div>

                        {/* Peer Score */}
                        <div style={{ minWidth: 100 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#8eceff",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: 2,
                            }}
                          >
                            Peer Rating
                          </div>
                          {hasPeerData && peerScoreData.totalScore !== null ? (
                            <>
                              <div
                                style={{
                                  fontSize: 20,
                                  fontWeight: 800,
                                  color: "#8eceff",
                                  lineHeight: 1.1,
                                }}
                              >
                                {peerScoreData.totalScore}
                                {peerScoreData.maxPossible ? `/${peerScoreData.maxPossible}` : ""}
                              </div>
                              {peerScoreData.percentage !== null && (
                                <div style={{ fontSize: 11, color: "var(--dtm-muted)", marginTop: 2 }}>
                                  {peerScoreData.percentage.toFixed(1)}% ({peerScoreData.evalCount} eval{peerScoreData.evalCount !== 1 ? "s" : ""})
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dtm-muted)", fontStyle: "italic", marginTop: 2 }}>
                              No Data
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Questionnaire breakdown chips */}
                    {(() => {
                      const adviserChips = hasIndividualData
                        ? (scoreData.questionnaires || []).map((q, i) => ({
                            key: `adv-${i}`,
                            title: q.title,
                            score: q.score,
                            maxScore: q.maxScore,
                            percentage: q.percentage,
                            color: "var(--dtm-gold)",
                            dotColor: "var(--dtm-gold)",
                            background: "rgba(242, 201, 76, 0.04)",
                            border: "1px solid rgba(242, 201, 76, 0.15)",
                          }))
                        : [];

                      const peerChips = hasPeerData
                        ? (peerScoreData.questionnaires || []).map((q, i) => ({
                            key: `peer-${i}`,
                            title: q.title,
                            score: q.score,
                            maxScore: q.maxScore,
                            percentage: q.percentage,
                            color: "#8eceff",
                            dotColor: "#8eceff",
                            background: "rgba(142, 206, 255, 0.04)",
                            border: "1px solid rgba(142, 206, 255, 0.18)",
                          }))
                        : [];

                      const allChips = [...adviserChips, ...peerChips];
                      if (allChips.length === 0) return null;

                      const isExpanded = !!expandedStudents[student.id];
                      const displayedChips =
                        allChips.length > 3 && !isExpanded
                          ? allChips.slice(0, 3)
                          : allChips;

                      return (
                        <div
                          style={{
                            marginTop: 16,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {displayedChips.map((chip) => (
                            <div
                              key={chip.key}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                background: chip.background,
                                border: chip.border,
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: chip.dotColor,
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ color: "var(--dtm-muted)" }}>
                                {chip.title}:{" "}
                              </span>
                              <span
                                style={{
                                  color: chip.color,
                                  fontWeight: 700,
                                }}
                              >
                                {chip.score}
                                {chip.maxScore ? `/${chip.maxScore}` : ""}
                                {chip.percentage !== null
                                  ? ` (${chip.percentage.toFixed(0)}%)`
                                  : ""}
                              </span>
                            </div>
                          ))}

                          {allChips.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(student.id);
                              }}
                              className="perf-see-more-btn"
                            >
                              {isExpanded
                                ? "See less"
                                : `See more (${allChips.length - 3} more)`}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* No data message */}
                    {!hasIndividualData && !hasPeerData && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          color: "var(--dtm-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        No evaluation data available for this student.
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
