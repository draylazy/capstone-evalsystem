import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, BarChart3 } from "lucide-react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { performanceAPI } from "../../services/api";
import "./Teacher.css";

const Performance = () => {
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTeams(true);
        const data = await performanceAPI.getTeams();
        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        setTeamsError("Failed to load teams: " + err.message);
      } finally {
        setLoadingTeams(false);
      }
    };
    load();
  }, []);

  const getPerformanceBadge = (count) => {
    if (count >= 3) return { label: "High Activity", cls: "perf-badge--high" };
    if (count >= 1) return { label: "Active", cls: "perf-badge--mid" };
    return { label: "Minimal", cls: "perf-badge--low" };
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Performance</h1>

        <div className="section">
          <div className="section-header-row">
            <h2>Teams with Completed Evaluations</h2>
            {!loadingTeams && (
              <span className="perf-count-badge">{teams.length} teams</span>
            )}
          </div>

          {loadingTeams && (
            <div className="perf-skeleton-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="perf-team-card perf-team-card--skeleton" />
              ))}
            </div>
          )}

          {!loadingTeams && teamsError && (
            <div className="error-message">{teamsError}</div>
          )}

          {!loadingTeams && !teamsError && teams.length === 0 && (
            <div className="perf-empty-state">
              <BarChart3 size={40} className="perf-empty-icon" />
              <p>No teams with completed evaluations yet.</p>
              <span>Evaluations need to be submitted before they appear here.</span>
            </div>
          )}

          {!loadingTeams && !teamsError && teams.length > 0 && (
            <div className="perf-team-grid">
              {teams.map((team) => {
                const badge = getPerformanceBadge(team.completedEvalCount);
                return (
                  <button
                    key={team.id}
                    type="button"
                    className="perf-team-card"
                    onClick={() => navigate(`/teacher/performance/team/${team.id}`)}
                  >
                    <div className="perf-team-card-top">
                      <span className="perf-team-name">{team.name}</span>
                      <span className={`perf-badge ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="perf-team-class">{team.className}</span>
                    <div className="perf-team-meta">
                      <span className="perf-team-meta-item">
                        <Users size={13} />
                        {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                      </span>
                      <span className="perf-team-meta-item">
                        <BarChart3 size={13} />
                        {team.completedEvalCount} eval{team.completedEvalCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="perf-team-card-arrow">
                      <ChevronRight size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Performance;
