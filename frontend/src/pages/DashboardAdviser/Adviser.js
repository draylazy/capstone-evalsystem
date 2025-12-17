import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import SummaryCard from "../../components/Cards/SummaryCard";
import { teamAPI } from "../../services/api";
import "./Adviser.css";

const Adviser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedTeams, setAssignedTeams] = useState([]);

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!currentUser?.id) {
          setError("User not logged in");
          return;
        }

        const allTeams = await teamAPI.getAllTeams();
        const mine = (allTeams || []).filter(
          (t) => Array.isArray(t.adviserIds) && t.adviserIds.includes(currentUser.id)
        );
        setAssignedTeams(mine);
      } catch (e) {
        setError(e?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  return (
    <div className="adviser-container">
      <AdviserSidebar />

      <div className="adviser-content">
        <h1>Adviser Dashboard</h1>

        <div className="summary-row">
          <SummaryCard title="Teams Assigned" value={loading ? "-" : String(assignedTeams.length)} />
          <SummaryCard title="Completed" value={loading ? "-" : "0"} />
          <SummaryCard title="Pending" value={loading ? "-" : "0"} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="section">
          <h2>Assigned Teams</h2>

          {loading ? (
            <p>Loading...</p>
          ) : assignedTeams.length === 0 ? (
            <p>No assigned teams found.</p>
          ) : (

          <table className="class-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Members</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {assignedTeams.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{(t.memberIds?.length || 0)} Members</td>
                  <td>
                    <span className={t.isActive ? "status-active" : "status-inactive"}>
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className="btn" onClick={() => navigate("/adviser/evaluations")}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          )}
        </div>

      </div>
    </div>
  );
};

export default Adviser;
