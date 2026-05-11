import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import logo from '../Logo/LOGO test.png';
import { LayoutDashboard, Users, Menu, X } from "lucide-react";
import "./Sidebar.css";

const StudentSidebar = ({ onBeforeNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (onBeforeNavigate) {
      const shouldBlock = onBeforeNavigate('/login');
      if (shouldBlock) return;
    }
    if (authAPI && authAPI.logout) {
      authAPI.logout();
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    navigate('/login');
  };

  const handleNavigate = (path) => {
    if (onBeforeNavigate) {
      const shouldBlock = onBeforeNavigate(path);
      if (shouldBlock) return;
    }
    setIsOpen(false);
    navigate(path);
  };

  const getInitials = () => {
    if (!user) return '?';
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
    { label: "My Team", icon: Users, path: "/student/team" }
  ];

  const isEvaluatePage = location.pathname.includes('/student/evaluate');

  return (
    <>
      {!isEvaluatePage && (
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}

      <div className={`sidebar sidebar--student ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={logo} alt="Logo" style={{ width: '50px', height: '50px', marginBottom: '8px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--dtm-gold)' }}>Student Panel</h2>
        </div>
      <ul>
        {menuItems.map((item) => (
          <li
            key={item.path}
            className={location.pathname.startsWith(item.path) ? "is-active" : ""}
            onClick={() => handleNavigate(item.path)}
          >
            <item.icon size={18} className="nav-icon" aria-hidden="true" />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      <div className="sidebar-profile" ref={menuRef}>
        <div className="profile-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)}>
          <span className="avatar-initials">{getInitials()}</span>
          {user && <span className="avatar-name">{user.firstName} {user.lastName}</span>}
        </div>
        {showProfileMenu && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-header">
              <span className="dropdown-email">{user?.email}</span>
            </div>
            <div className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
              Logout
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default StudentSidebar;
