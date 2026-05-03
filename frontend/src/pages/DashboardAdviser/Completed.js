import React, { useEffect, useState } from "react";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import { adviserAPI } from "../../services/api";
import "./Adviser.css";

const Completed = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [completedStudents, setCompletedStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("team");

  useEffect(() => {
    const loadCompleted = async () => {
      try {
        setLoading(true);
        const [teamData, studentData] = await Promise.all([
          adviserAPI.getCompletedEvaluations(),
          adviserAPI.getCompletedStudentEvaluations(),
        ]);
        setCompleted(teamData || []);
        setCompletedStudents(studentData || []);
      } catch (e) {
        setError(e.message || "Failed to fetch evaluations");
      } finally {
        setLoading(false);
      }
    };

    loadCompleted();
  }, []);

  return (
    <div className="adviser-container">
      <AdviserSidebar />

      <div className="adviser-content">
        <h1>Completed Evaluations</h1>

        <section className="adviser-hero adviser-hero-tight">
          <div>
            <p className="adviser-hero-kicker">Submission Archive</p>
            <h2 className="adviser-hero-title">Completed Evaluation Records</h2>
            <p className="adviser-hero-text">
              Review all submitted evaluations — both team-level and individual student evaluations.
            </p>
          </div>
        </section>

        <section className="completed-kpi-row" aria-label="completed evaluation summary">
          <article className="completed-kpi-card">
            <span className="completed-kpi-label">Team Evaluations</span>
            <span className="completed-kpi-value">{completed.length}</span>
          </article>
          <article className="completed-kpi-card">
            <span className="completed-kpi-label">Student Evaluations</span>
            <span className="completed-kpi-value">{completedStudents.length}</span>
          </article>
          <article className="completed-kpi-card">
            <span className="completed-kpi-label">Total Submitted</span>
            <span className="completed-kpi-value">{completed.length + completedStudents.length}</span>
          </article>
        </section>

        {error && <div className="error-message">{error}</div>}

        {/* Tab switcher */}
        <div className="adviser-status-tabs" style={{ marginTop: "16px" }}>
          <button
            className={`adviser-status-tab ${activeTab === "team" ? "is-active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            Team Evaluations
            <span className="adviser-status-tab-count">{completed.length}</span>
          </button>
          <button
            className={`adviser-status-tab ${activeTab === "student" ? "is-active" : ""}`}
            onClick={() => setActiveTab("student")}
          >
            Individual Student Evaluations
            <span className="adviser-status-tab-count">{completedStudents.length}</span>
          </button>
        </div>

        {/* Team Evaluations Tab */}
        {activeTab === "team" && (
          <div className="section">
            <div className="section-header-row">
              <h2>Submitted Team Evaluations</h2>
              <span className="section-helper-text">Team-level evaluation submissions</span>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : completed.length === 0 ? (
              <p style={{ color: "var(--dtm-muted)" }}>No completed team evaluations.</p>
            ) : (
              <table className="class-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Class</th>
                    <th>Questionnaire</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((e, index) => (
                    <tr key={e.id}>
                      <td>{index + 1}</td>
                      <td><strong>{e.teamName || e.team?.name || `Team #${e.teamId || "N/A"}`}</strong></td>
                      <td>{e.className || "N/A"}</td>
                      <td>{e.questionnaire?.title || "N/A"}</td>
                      <td>
                        <span className="status-badge status-active">Submitted</span>
                      </td>
                      <td>
                        {e.submittedAt
                          ? new Date(e.submittedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Individual Student Evaluations Tab */}
        {activeTab === "student" && (
          <div className="section">
            <div className="section-header-row">
              <h2>Submitted Individual Student Evaluations</h2>
              <span className="section-helper-text">Per-student evaluation submissions</span>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : completedStudents.length === 0 ? (
              <p style={{ color: "var(--dtm-muted)" }}>No completed individual student evaluations.</p>
            ) : (
              <table className="class-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Number</th>
                    <th>Student Name</th>
                    <th>Team</th>
                    <th>Questionnaire</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {completedStudents.map((e, index) => (
                    <tr key={e.id}>
                      <td>{index + 1}</td>
                      <td>{e.studentNumber || "N/A"}</td>
                      <td>
                        <strong>{e.evaluateeFirstName} {e.evaluateeLastName}</strong>
                      </td>
                      <td>{e.teamName || "N/A"}</td>
                      <td>{e.questionnaire || "N/A"}</td>
                      <td>
                        <span className="status-badge status-active">Submitted</span>
                      </td>
                      <td>
                        {e.submittedAt
                          ? new Date(e.submittedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Completed;