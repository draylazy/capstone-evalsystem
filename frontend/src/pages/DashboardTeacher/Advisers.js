import React from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import "./Teacher.css";

const Advisers = () => {
  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Advisers</h1>
        <div className="section">
          <h2>Adviser List</h2>
          <table className="class-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Teams</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Juan Dela Cruz</td>
                <td>juan@example.com</td>
                <td>Alpha, Beta</td>
                <td><button className="btn">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Advisers;

