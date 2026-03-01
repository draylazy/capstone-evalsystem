import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import AdminSidebar from '../../components/Sidebar/AdminSidebar';
import SummaryCard from '../../components/Cards/SummaryCard';
import '../DashboardTeacher/Teacher.css';

function Admin() {
  const toast = useToast();

  const [allowedUsers, setAllowedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterRole, setFilterRole] = useState('ALL');

  useEffect(() => {
    fetchAllowedUsers();
  }, []);

  const fetchAllowedUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getAllowedUsers();
      setAllowedUsers(data);
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Remove ${email} from the allowed list?`)) return;
    try {
      await adminAPI.deleteAllowedUser(id);
      toast.success(`${email} removed`);
      fetchAllowedUsers();
    } catch (err) {
      toast.error('Failed to remove: ' + err.message);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError('Please select a file'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await adminAPI.uploadRoleSheet(formData);
      toast.success(res.message || 'Upload successful');
      setShowUploadModal(false);
      setUploadFile(null);
      fetchAllowedUsers();
    } catch (err) {
      setUploadError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterRole === 'ALL'
    ? allowedUsers
    : allowedUsers.filter(u => u.assignedRole === filterRole);

  const counts = {
    total: allowedUsers.length,
    teacher: allowedUsers.filter(u => u.assignedRole === 'TEACHER').length,
    adviser: allowedUsers.filter(u => u.assignedRole === 'ADVISER').length,
    registered: allowedUsers.filter(u => u.isRegistered).length,
  };

  return (
    <div className="teacher-container">
      <AdminSidebar />

      <div className="teacher-content">
        <h1>Admin Dashboard</h1>

        {/* Summary Cards */}
        <div className="summary-row">
          <SummaryCard title="Total Allowed Users" value={loading ? '-' : String(counts.total)} />
          <SummaryCard title="Teachers" value={loading ? '-' : String(counts.teacher)} />
          <SummaryCard title="Advisers" value={loading ? '-' : String(counts.adviser)} />
          <SummaryCard title="Registered" value={loading ? '-' : String(counts.registered)} />
        </div>

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Allowed Users</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {['ALL', 'ADMIN', 'TEACHER', 'ADVISER'].map(role => (
                <button
                  key={role}
                  className={filterRole === role ? 'btn' : 'btn-secondary'}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => setFilterRole(role)}
                >
                  {role}
                </button>
              ))}
              <button className="btn" onClick={() => setShowUploadModal(true)}>
                Upload Role Sheet
              </button>
            </div>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
              <p>No users found. Upload a role sheet to get started.</p>
              <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                Create an Excel or CSV with columns: <strong>Email</strong>, <strong>Role</strong>
                &nbsp;(valid roles: TEACHER, ADVISER, ADMIN)
              </p>
            </div>
          ) : (
            <table className="class-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th>Added On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr key={u.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{u.email}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: u.assignedRole === 'TEACHER' ? '#d4edda' : u.assignedRole === 'ADVISER' ? '#cce5ff' : '#fdecea',
                        color: u.assignedRole === 'TEACHER' ? '#155724' : u.assignedRole === 'ADVISER' ? '#004085' : '#8a151f',
                      }}>
                        {u.assignedRole}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: u.isRegistered ? '#d4edda' : '#fff3cd',
                        color: u.isRegistered ? '#155724' : '#856404',
                      }}>
                        {u.isRegistered ? 'Registered' : 'Pending'}
                      </span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      {u.email !== 'admin@system.com' && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '12px', color: '#dc3545', borderColor: '#dc3545' }}
                          onClick={() => handleDelete(u.id, u.email)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Upload Role Assignment Sheet</h2>
            {uploadError && <div className="error-message">{uploadError}</div>}
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
              Upload an Excel (.xlsx / .xls) or CSV file. First row is the header, columns must be:
            </p>
            <table className="class-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr><th>Email</th><th>Role</th></tr>
              </thead>
              <tbody>
                <tr><td>teacher1@cit.edu</td><td>TEACHER</td></tr>
                <tr><td>adviser1@cit.edu</td><td>ADVISER</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              Valid roles: <strong>TEACHER</strong>, <strong>ADVISER</strong>, <strong>ADMIN</strong>
            </p>
            <form onSubmit={handleUploadSubmit}>
              <div className="form-group">
                <label>Select File (.xlsx, .xls, or .csv) *</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => { setUploadFile(e.target.files[0]); setUploadError(''); }}
                  required
                />
                {uploadFile && (
                  <p style={{ fontSize: '12px', color: '#28a745', marginTop: '6px' }}>
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload & Save'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadError(''); }}
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
