import React from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import "./Teacher.css";

const Classes = () => {
  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Classes</h1>
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

export default Classes;

