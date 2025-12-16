import React, { useEffect, useState } from "react";
import AdviserSidebar from "../../components/Sidebar/AdviserSidebar";
import { authAPI } from "../../services/api";
import "./Adviser.css";

const Account = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Load user data from localStorage (same as DashboardAdviser and Profile)
      const currentUser = authAPI.getCurrentUser();
      setUser(currentUser);
    } catch (e) {
      setError("Could not load profile data.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="adviser-container">
      <AdviserSidebar />
      <div className="adviser-content">
        <h1>Account</h1>
        <div className="section">
          <h2>Profile Information</h2>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: 'red'}}>{error}</p>
          ) : (
            <table className="team-table">
              <tbody>
                <tr>
                  <td>Name:</td>
                  <td>{user?.firstName} {user?.lastName}</td>
                </tr>
                <tr>
                  <td>Email:</td>
                  <td>{user?.email}</td>
                </tr>
                <tr>
                  <td>Role:</td>
                  <td>{user?.role || 'Adviser'}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;

