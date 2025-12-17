import React from "react";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import "./Adviser.css";

const Completed = () => {
  return (
    <div className="adviser-container">
      <AdviserSidebar />
      <div className="adviser-content">
        <h1>Completed Evaluations</h1>
        <div className="section">
          <h2>Completed Teams</h2>
          <table className="class-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Members</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Delta</td>
                <td>5</td>
                <td>2025-12-17</td>
                <td><button className="btn-secondary">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Completed;

