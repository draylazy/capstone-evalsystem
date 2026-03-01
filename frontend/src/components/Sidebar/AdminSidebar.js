import React from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import "./Sidebar.css";

const AdminSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <h2>Admin Panel</h2>
      <ul>
        <li onClick={() => navigate('/admin/dashboard')}>User Management</li>
        <li onClick={handleLogout}>Logout</li>
      </ul>
    </div>
  );
};

export default AdminSidebar;
