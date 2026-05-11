import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { performanceAPI } from "../../services/api";
import "./Teacher.css";

const TARGET_LABELS = {
  STUDENT: "Peer",
  ADVISER_STUDENT: "Adviser-Student",
  ADVISER: "Adviser",
};

const TARGET_BADGE_CLASSES = {
  STUDENT: "perf-badge--mid",
  ADVISER_STUDENT: "perf-badge--high",
  ADVISER: "perf-badge--low",
};

const TeamFormsPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [questionnaires, setQuestionnaires] = useState([]);
  const [teamName, setTeamName] = useState("Team");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [teamData, formsData] = await Promise.all([
          performanceAPI.getTeamStudents(teamId),
          performanceAPI.getTeamQuestionnaires(teamId),
        ]);
        setTeamName(teamData?.teamName || "Team");
        setQuestionnaires(Array.isArray(formsData) ? formsData : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

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
              navigate(`/teacher/performance/team/${teamId}`)
            }
          >
            <ChevronLeft size={14} style={{ marginRight: 4 }} />
            Back
          </button>
          <h1 style={{ margin: 0 }}>
            Forms — <span style={{ color: "var(--dtm-muted)" }}>{teamName}</span>
          </h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="section">
          <div className="section-header-row">
            <h2>Questionnaire Responses</h2>
            {!loading && (
              <span className="perf-count-badge">
                {questionnaires.length}{" "}
                {questionnaires.length === 1 ? "form" : "forms"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="perf-skeleton-grid">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="perf-team-card perf-team-card--skeleton"
                />
              ))}
            </div>
          ) : questionnaires.length === 0 ? (
            <div className="perf-empty-state">
              <FileText size={40} className="perf-empty-icon" />
              <p>No questionnaire responses found.</p>
              <span>
                Students need to submit evaluations before they appear here.
              </span>
            </div>
          ) : (
            <div className="perf-team-grid">
              {questionnaires.map((q) => (
                <button
                  key={q.questionnaireId}
                  type="button"
                  className="perf-team-card"
                  onClick={() =>
                    navigate(
                      `/teacher/performance/team/${teamId}/forms/${q.questionnaireId}`
                    )
                  }
                >
                  <div className="perf-team-card-top">
                    <span className="perf-team-name">{q.title}</span>
                    {q.target && (
                      <span
                        className={`perf-badge ${
                          TARGET_BADGE_CLASSES[q.target] || "perf-badge--low"
                        }`}
                      >
                        {TARGET_LABELS[q.target] || q.target}
                      </span>
                    )}
                  </div>

                  {q.description && (
                    <span
                      className="perf-team-class"
                      style={{ WebkitLineClamp: 2 }}
                    >
                      {q.description}
                    </span>
                  )}

                  <div className="perf-team-meta">
                    <span className="perf-team-meta-item">
                      <FileText size={13} />
                      {q.submissionCount} submission
                      {q.submissionCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="perf-team-card-arrow">
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamFormsPage;
