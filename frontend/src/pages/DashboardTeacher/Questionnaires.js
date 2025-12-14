import React from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import "./Teacher.css";

const Questionnaires = () => {
  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Questionnaires</h1>
        <div className="section">
          <h2>Your Questionnaires</h2>
          <table className="class-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Final Term Evaluation</td>
                <td>2025-12-12</td>
                <td>Active</td>
                <td><button className="btn">Manage</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Questionnaires;

