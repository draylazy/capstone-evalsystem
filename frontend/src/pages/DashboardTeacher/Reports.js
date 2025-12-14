import React from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import "./Teacher.css";

const Reports = () => {
  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Reports</h1>
        <div className="section">
          <h2>Reports List</h2>
          <table className="class-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Class Summary</td>
                <td>2025-12-10</td>
                <td>Complete</td>
                <td><button className="btn">Download</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;

