import React from "react";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import SummaryCard from "../../components/Cards/SummaryCard";
import "./Adviser.css";

const Adviser = () => {
  return (
    <div className="adviser-container">
      <AdviserSidebar />

      <div className="adviser-content">
        <h1>Adviser Dashboard</h1>

        <div className="summary-row">
          <SummaryCard title="Teams Assigned" value="5" />
          <SummaryCard title="Completed" value="2" />
          <SummaryCard title="Pending" value="3" />
        </div>

        <div className="section">
          <h2>Assigned Teams</h2>

          <table className="team-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Members</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Team Alpha</td>
                <td>4 Members</td>
                <td className="pending">Pending</td>
                <td><button className="btn">Evaluate</button></td>
              </tr>

              <tr>
                <td>Team Delta</td>
                <td>5 Members</td>
                <td className="completed">Completed</td>
                <td><button className="btn-secondary">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Adviser;
