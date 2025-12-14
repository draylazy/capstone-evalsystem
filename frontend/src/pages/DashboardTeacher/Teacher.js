import React from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import SummaryCard from "../../components/Cards/SummaryCard";
import "./Teacher.css";

const Teacher = () => {
  return (
    <div className="teacher-container">
      <TeacherSidebar />

      <div className="teacher-content">

        <h1>Teacher Dashboard</h1>

        <div className="summary-row">
          <SummaryCard title="Total Classes" value="4" />
          <SummaryCard title="Total Students" value="120" />
          <SummaryCard title="Total Teams" value="24" />
          <SummaryCard title="Pending Evaluations" value="10" />
        </div>

        <div className="section">
          <h2>Your Classes</h2>

          <table className="class-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>School Year</th>
                <th>Teams</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>IT 3310</td>
                <td>A</td>
                <td>2024–2025</td>
                <td>6 Teams</td>
                <td><button className="btn">Manage</button></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Teacher;
