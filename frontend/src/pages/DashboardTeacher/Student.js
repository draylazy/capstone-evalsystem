import React, { useState, useEffect } from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { studentAPI, classAPI } from "../../services/api";
import "./Teacher.css";

const Student = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStudent, setCurrentStudent] = useState({
    id: null,
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    schoolClass: { id: '' }
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentAPI.getAllStudents();
      setStudents(data);
    } catch (err) {
      setError('Failed to load students: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAllClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'classId') {
      setCurrentStudent({
        ...currentStudent,
        schoolClass: { id: value }
      });
    } else {
      setCurrentStudent({
        ...currentStudent,
        [name]: value
      });
    }
  };

  const handleAddNew = () => {
    setEditMode(false);
    setCurrentStudent({
      id: null,
      studentId: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      schoolClass: { id: '' }
    });
    setShowModal(true);
  };

  const handleEdit = (student) => {
    setEditMode(true);
    setCurrentStudent(student);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.deleteStudent(id);
        await fetchStudents();
        alert('Student deleted successfully');
      } catch (err) {
        alert('Failed to delete student: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editMode) {
        await studentAPI.updateStudent(currentStudent.id, currentStudent);
        alert('Student updated successfully');
      } else {
        await studentAPI.createStudent(currentStudent);
        alert('Student added successfully');
      }
      setShowModal(false);
      await fetchStudents();
    } catch (err) {
      setError('Failed to save student: ' + err.message);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setError('');
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Students</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>All Students</h2>
            <button className="btn" onClick={handleAddNew}>Add New Student</button>
          </div>

          {loading ? (
            <p>Loading students...</p>
          ) : (
            <table className="class-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Class</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No students found</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.studentId}</td>
                      <td>{student.firstName}</td>
                      <td>{student.lastName}</td>
                      <td>{student.schoolClass?.name || 'N/A'}</td>
                      <td>{student.email || 'N/A'}</td>
                      <td>{student.phoneNumber || 'N/A'}</td>
                      <td>
                        <button className="btn" onClick={() => handleEdit(student)} style={{ marginRight: '5px' }}>
                          Edit
                        </button>
                        <button className="btn-secondary" onClick={() => handleDelete(student.id)}>
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

        {/* Modal for Add/Edit */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{editMode ? 'Edit Student' : 'Add New Student'}</h2>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Class *</label>
                  <select
                    name="classId"
                    value={currentStudent.schoolClass?.id || ''}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `- ${cls.section}` : ''} ({cls.schoolYear})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Student ID *</label>
                  <input
                    type="text"
                    name="studentId"
                    value={currentStudent.studentId}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 2021-12345"
                  />
                </div>
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={currentStudent.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={currentStudent.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter last name"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={currentStudent.email}
                    onChange={handleInputChange}
                    placeholder="student@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={currentStudent.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn">
                    {editMode ? 'Update' : 'Add'} Student
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Student;