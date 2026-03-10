import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import TeacherSidebar from '../../components/Sidebar/TeacherSidebar';
import AdviserSidebar from '../../components/Sidebar/AdviserSidebar';
import './Profile.css';

const Profile = () => {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      toast.error('Error fetching user profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="profile-container">Loading...</div>;
  }

  return (
    <div className="profile-container">
      {user?.role === 'TEACHER' ? <TeacherSidebar /> : <AdviserSidebar />}
      
      <div className="profile-content">
        <div className="profile-header">
          <h1>My Profile</h1>
        </div>

        {/* User Information Section */}
        <div className="profile-section">
          <h2>Account Information</h2>
          <div className="profile-info">
            <div className="info-row">
              <label>Name:</label>
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="info-row">
              <label>Email:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-row">
              <label>Role:</label>
              <span>{user?.role}</span>
            </div>
            {user?.department && (
              <div className="info-row">
                <label>Department:</label>
                <span>{user.department}</span>
              </div>
            )}
            {user?.phoneNumber && (
              <div className="info-row">
                <label>Phone:</label>
                <span>{user.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
