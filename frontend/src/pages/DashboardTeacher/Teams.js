import React from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import "./Teacher.css";

const Teams = () => {
  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Teams</h1>
        <div className="section">
          <h2>Your Teams</h2>
          <table className="class-table">
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Members</th>
                <th>Projects</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alpha</td>
                <td>6</td>
                <td>Capstone Project</td>
                <td><button className="btn">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Teams;

