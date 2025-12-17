import React from "react";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import "./Adviser.css";

const Evaluations = () => {
  return (
    <div className="adviser-container">
      <AdviserSidebar />
      <div className="adviser-content">
        <h1>Evaluations</h1>
        <div className="section">
          <h2>Pending Evaluations</h2>
          <table className="class-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bravo</td>
                <td>2025-12-20</td>
                <td><span className="pending">Pending</span></td>
                <td><button className="btn">Evaluate</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Evaluations;

