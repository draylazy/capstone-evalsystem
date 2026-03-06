import React, { useState, useEffect } from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { userManagementAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import "./Teacher.css";

const Advisers = () => {
  const toast = useToast();
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentAdviser, setCurrentAdviser] = useState({
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: ''
  });

  useEffect(() => {
    fetchAdvisers();
  }, []);

  const fetchAdvisers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userManagementAPI.getUsers();
      // Filter only ADVISER role users
      const adviserUsers = data.filter(user => user.role === 'ADVISER');
      setAdvisers(adviserUsers);
    } catch (err) {
      setError('Failed to load advisers: ' + err.message);
      toast.error('Failed to load advisers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentAdviser({
      ...currentAdviser,
      [name]: value
    });
  };

  const handleAddNew = () => {
    setEditMode(false);
    setCurrentAdviser({
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      department: ''
    });
    setShowModal(true);
  };

  const handleEdit = (adviser) => {
    setEditMode(true);
    setCurrentAdviser(adviser);
    setShowModal(true);
  };

  const handleDelete = (id, email) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Adviser",
      message: `Are you sure you want to delete ${email}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await userManagementAPI.deleteUser(id);
          await fetchAdvisers();
          toast.success('Adviser deleted successfully');
        } catch (err) {
          toast.error('Failed to delete adviser: ' + err.message);
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Note: Since we're using userManagementAPI which only handles bulk upload,
    // individual create/update would need backend endpoints for users
    toast.error('Individual adviser add/edit is not yet implemented. Please use the import feature.');
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    setError('');
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setImportError('');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Please select a file');
      return;
    }

    setImportLoading(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await userManagementAPI.uploadUserSheet(formData);
      toast.success(response.message || `Successfully imported advisers`);
      setShowImportModal(false);
      setImportFile(null);
      await fetchAdvisers();
    } catch (err) {
      setImportError('Failed to import advisers: ' + err.message);
      toast.error('Failed to import advisers: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportError('');
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Advisers</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>All Advisers</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={() => setShowImportModal(true)}>Import from Excel</button>
            </div>
          </div>

          {loading ? (
            <p>Loading advisers...</p>
          ) : (
            <table className="class-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {advisers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No advisers found</td>
                  </tr>
                ) : (
                  advisers.map((adviser) => (
                    <tr key={adviser.id}>
                      <td>{adviser.firstName && adviser.lastName ? `${adviser.firstName} ${adviser.lastName}` : '—'}</td>
                      <td>{adviser.email}</td>
                      <td>{adviser.phoneNumber || 'N/A'}</td>
                      <td>{adviser.department || 'N/A'}</td>
                      <td>
                        <button className="btn-secondary" onClick={() => handleDelete(adviser.id, adviser.email)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Import Advisers from Excel</h2>
              {importError && <div className="error-message">{importError}</div>}
              <form onSubmit={handleImportSubmit}>
                <div className="form-group">
                  <label>Select File (.xlsx, .xls, or .csv) *</label>
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    File should contain columns: <strong>Email, FirstName, LastName, Role (ADVISER), PhoneNumber (optional), Department (optional)</strong>
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportFileChange}
                    required
                  />
                  {importFile && (
                    <p style={{ fontSize: '0.9em', color: '#4CAF50', marginTop: '10px' }}>
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn" disabled={importLoading}>
                    {importLoading ? 'Importing...' : 'Import Advisers'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleImportCancel} disabled={importLoading}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          isDanger={true}
        />
      </div>
    </div>
  );
};

export default Advisers;
