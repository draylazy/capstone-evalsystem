import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import TeacherSidebar from '../../components/Sidebar/TeacherSidebar';
import AdviserSidebar from '../../components/Sidebar/AdviserSidebar';
import './Profile.css';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const LOCAL_API_BASE_URL = 'http://localhost:8080';

const fetchWithLocalFallback = async (path, options = {}) => {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (API_BASE_URL === LOCAL_API_BASE_URL) {
      throw error;
    }
    return fetch(`${LOCAL_API_BASE_URL}${path}`, options);
  }
};

const Profile = () => {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [sheetsUrlLoading, setSheetsUrlLoading] = useState(false);
  const [sheetsUrlEditing, setSheetsUrlEditing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user?.role === 'TEACHER') {
      fetchGoogleSheetsUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

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

  const getToken = () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      return currentUser?.token || null;
    } catch {
      return null;
    }
  };

  const fetchGoogleSheetsUrl = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/user-management/google-sheets/url`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.googleSheetsUrl) {
        setGoogleSheetsUrl(data.googleSheetsUrl);
      }
    } catch (e) {
      // Silent fail for now, user can still input URL
    }
  };

  const handleSaveGoogleSheetsUrl = async () => {
    const token = getToken();
    if (!token) {
      toast.error('You are not authenticated');
      return;
    }

    if (!googleSheetsUrl.trim()) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }

    try {
      setSheetsUrlLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/user-management/google-sheets/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ googleSheetsUrl: googleSheetsUrl.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to save Google Sheets URL');
      }

      setSheetsUrlEditing(false);
      toast.success('Google Sheets URL saved successfully');
    } catch (e) {
      toast.error(e.message || 'Failed to save Google Sheets URL');
    } finally {
      setSheetsUrlLoading(false);
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
          </div>
        </div>

        {user?.role === 'TEACHER' && (
          <div className="profile-section google-section">
            <h2>Google Sheets Auto-Export</h2>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
              Configure a Google Sheet to automatically receive updates whenever student data changes (new students, evaluations, etc.)
            </p>

            {sheetsUrlEditing ? (
              <div className="form-group">
                <label>Google Sheets URL *</label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                  value={googleSheetsUrl}
                  onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                  style={{ marginBottom: '12px' }}
                />
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
                  Share the spreadsheet with your Google account (the one you logged in with) before entering the link
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn" 
                    onClick={handleSaveGoogleSheetsUrl} 
                    disabled={sheetsUrlLoading}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    {sheetsUrlLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSheetsUrlEditing(false)}
                    disabled={sheetsUrlLoading}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {googleSheetsUrl ? (
                  <div className="linked-email" style={{ marginBottom: '12px' }}>
                    <label>Connected Sheet</label>
                    <span style={{ wordBreak: 'break-all' }}>{googleSheetsUrl}</span>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                    No Google Sheet configured yet
                  </p>
                )}
                <button 
                  className="btn" 
                  onClick={() => setSheetsUrlEditing(true)}
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  {googleSheetsUrl ? 'Update' : 'Configure'} Sheet
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
