import React, { useState, useEffect } from 'react';
import { userManagementAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import TeacherSidebar from '../../components/Sidebar/TeacherSidebar';
import SummaryCard from '../../components/Cards/SummaryCard';
import './Teacher.css';

function UserManagement() {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterRole, setFilterRole] = useState('ALL');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userManagementAPI.getUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Remove ${email} from the system?`)) return;
    try {
      await userManagementAPI.deleteUser(id);
      toast.success(`${email} removed`);
      fetchUsers();
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
      const res = await userManagementAPI.uploadUserSheet(formData);
      toast.success(res.message || 'Upload successful');
      setShowUploadModal(false);
      setUploadFile(null);
      fetchUsers();
    } catch (err) {
      setUploadError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterRole === 'ALL'
    ? users
    : users.filter(u => u.role === filterRole);

  const counts = {
    total: users.length,
    teacher: users.filter(u => u.role === 'TEACHER').length,
    adviser: users.filter(u => u.role === 'ADVISER').length,
    student: users.filter(u => u.role === 'STUDENT').length,
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />

      <div className="teacher-content">
        <h1>User Management</h1>

        {/* Summary Cards */}
        <div className="summary-row">
          <SummaryCard title="Total Users" value={loading ? '-' : String(counts.total)} />
          <SummaryCard title="Teachers" value={loading ? '-' : String(counts.teacher)} />
          <SummaryCard title="Advisers" value={loading ? '-' : String(counts.adviser)} />
          <SummaryCard title="Students" value={loading ? '-' : String(counts.student)} />
        </div>

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>System Users</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {['ALL', 'TEACHER', 'ADVISER', 'STUDENT'].map(role => (
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
                Upload Users
              </button>
            </div>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
              <p>No users found. Upload a user sheet to get started.</p>
              <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                Create an Excel or CSV with columns: <strong>Email, FirstName, LastName, Role, PhoneNumber (optional), Department (optional)</strong>
              </p>
            </div>
          ) : (
            <table className="class-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr key={u.id}>
                    <td>{idx + 1}</td>
                    <td>{u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{u.email}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: u.role === 'TEACHER' ? '#d4edda' : u.role === 'ADVISER' ? '#cce5ff' : '#fff3cd',
                        color: u.role === 'TEACHER' ? '#155724' : u.role === 'ADVISER' ? '#004085' : '#856404',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td>
                      {u.email !== 'authortet@gmail.com' && (
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
            <h2>Upload User Data Sheet</h2>
            {uploadError && <div className="error-message">{uploadError}</div>}
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
              Upload an Excel (.xlsx / .xls) or CSV file. First row is the header, columns must be:
            </p>
            <table className="class-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr><th>Email</th><th>FirstName</th><th>LastName</th><th>Role</th><th>PhoneNumber</th><th>Department</th></tr>
              </thead>
              <tbody>
                <tr><td>teacher1@cit.edu</td><td>John</td><td>Doe</td><td>TEACHER</td><td>123-456-7890</td><td>CS</td></tr>
                <tr><td>adviser1@cit.edu</td><td>Jane</td><td>Smith</td><td>ADVISER</td><td></td><td>IT</td></tr>
                <tr><td>student1@cit.edu</td><td>Bob</td><td>Lee</td><td>STUDENT</td><td></td><td></td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              Required: <strong>Email, FirstName, LastName, Role</strong>. Optional: PhoneNumber, Department.<br/>
              Valid roles: <strong>TEACHER</strong>, <strong>ADVISER</strong>, <strong>STUDENT</strong>
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

export default UserManagement;
