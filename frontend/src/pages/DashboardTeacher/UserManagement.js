import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAdviserModal, setShowAdviserModal] = useState(false);
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

  const handleStudentUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError('Please select a file'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await userManagementAPI.uploadStudentSheet(formData);
      toast.success(res.message || 'Student upload successful');
      setShowStudentModal(false);
      setUploadFile(null);
      fetchUsers();
    } catch (err) {
      setUploadError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAdviserUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError('Please select a file'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await userManagementAPI.uploadAdviserSheet(formData);
      toast.success(res.message || 'Adviser upload successful');
      setShowAdviserModal(false);
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
              <button className="btn" onClick={() => setShowStudentModal(true)}>
                Upload Students
              </button>
              <button className="btn" onClick={() => setShowAdviserModal(true)}>
                Upload Advisers
              </button>
            </div>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
              <p>No users found. Upload student or adviser sheets to get started.</p>
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

      {/* Student Upload Modal */}
      {showStudentModal && createPortal((
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Student Data Sheet</h2>
            {uploadError && <div className="error-message">{uploadError}</div>}
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
              Upload an Excel (.xlsx / .xls) or CSV file. First row is the header, columns must be (in order):
            </p>
            <table className="class-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr><th>CLASS</th><th>TEAMCODE</th><th>MEMBER#</th><th>STUDENTID</th><th>LASTNAME</th><th>FIRSTNAME</th><th>EMAIL</th><th>ADVISERID</th></tr>
              </thead>
              <tbody>
                <tr><td>2B</td><td>T001</td><td>1</td><td>202301</td><td>Doe</td><td>John</td><td>john.doe@cit.edu</td><td>ADV001</td></tr>
                <tr><td>2B</td><td>T001</td><td>2</td><td>202302</td><td>Smith</td><td>Jane</td><td>jane.smith@cit.edu</td><td>ADV001</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              Required: <strong>CLASS, TEAMCODE, MEMBER#, STUDENTID, LASTNAME, FIRSTNAME, EMAIL, ADVISERID</strong>
            </p>
            <form onSubmit={handleStudentUpload}>
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
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowStudentModal(false); setUploadFile(null); setUploadError(''); }}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Adviser Upload Modal */}
      {showAdviserModal && createPortal((
        <div className="modal-overlay" onClick={() => setShowAdviserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Adviser Data Sheet</h2>
            {uploadError && <div className="error-message">{uploadError}</div>}
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
              Upload an Excel (.xlsx / .xls) or CSV file. First row is the header, columns must be (in order):
            </p>
            <table className="class-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr><th>ADVISERID</th><th>LASTNAME</th><th>FIRSTNAME</th><th>EMAIL</th></tr>
              </thead>
              <tbody>
                <tr><td>ADV001</td><td>Johnson</td><td>Robert</td><td>robert.johnson@cit.edu</td></tr>
                <tr><td>ADV002</td><td>Williams</td><td>Sarah</td><td>sarah.williams@cit.edu</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              Required: <strong>ADVISERID, LASTNAME, FIRSTNAME, EMAIL</strong>
            </p>
            <form onSubmit={handleAdviserUpload}>
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
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowAdviserModal(false); setUploadFile(null); setUploadError(''); }}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

export default UserManagement;
