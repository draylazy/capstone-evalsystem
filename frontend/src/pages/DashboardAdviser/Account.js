import React from "react";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import "./Adviser.css";

const Account = () => {
  return (
    <div className="adviser-container">
      <AdviserSidebar />
      <div className="adviser-content">
        <h1>Account</h1>
        <div className="section">
          <h2>Profile Information</h2>
          <table className="team-table">
            <tbody>
              <tr>
                <td>Name:</td>
                <td>Dr. Jane Smith</td>
              </tr>
              <tr>
                <td>Email:</td>
                <td>jane@university.edu</td>
              </tr>
              <tr>
                <td>Role:</td>
                <td>Adviser</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Account;

