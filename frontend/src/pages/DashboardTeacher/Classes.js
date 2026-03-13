import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { classAPI, studentAPI, questionnaireAPI, teamAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import "./Teacher.css";

const Classes = () => {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [classQuestionnaires, setClassQuestionnaires] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classTeams, setClassTeams] = useState([]);
  const [classQuestionnairesList, setClassQuestionnairesList] = useState([]);
  
  // Form states
  const [newClass, setNewClass] = useState({
    name: "",
    section: "",
    schoolYear: "",
    description: ""
  });
  
  // Confirm modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  // Load classes on component mount
  useEffect(() => {
    loadClasses();
    loadStudents();
    loadTeams();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      // Get logged-in teacher's ID
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) {
        setError("User not logged in");
        setLoading(false);
        return;
      }
      
      // Fetch only this teacher's classes
      const data = await classAPI.getAllClasses();
      // Filter classes for this teacher only
      const teacherClasses = data.filter(c => c.teacherId === user.id);
      setClasses(teacherClasses);
      
      // Fetch questionnaires for each class
      const classQuestionnaireMap = {};
      for (const classItem of teacherClasses) {
        const classQuestionnaires = await loadClassQuestionnaires(classItem.id);
        classQuestionnaireMap[classItem.id] = classQuestionnaires;
      }
      setClassQuestionnaires(classQuestionnaireMap);
      
      setError(null);
    } catch (err) {
      setError("Failed to load classes: " + err.message);
      toast.error("Failed to load classes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await studentAPI.getAllStudents();
      setStudents(data);
    } catch (err) {
      toast.error("Failed to load students");
    }
  };

  const loadTeams = async () => {
    try {
      const data = await teamAPI.getAllTeams();
      setTeams(data);
    } catch (err) {
      toast.error("Failed to load teams");
    }
  };

  const loadClassQuestionnaires = async (classId) => {
    try {
      const data = await questionnaireAPI.getQuestionnairesByClassForTeacher(classId);
      return data;
    } catch (err) {
      return [];
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      toast.info("Creating class...");
      
      // Get the logged-in teacher's ID from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      const classData = {
        ...newClass,
        teacherId: user?.id
      };
      
      await classAPI.createClass(classData);
      setShowCreateModal(false);
      setNewClass({
        name: "",
        section: "",
        schoolYear: "",
        description: ""
      });
      loadClasses();
      toast.success("Class created successfully!");
    } catch (err) {
      toast.error("Failed to create class: " + err.message);
    }
  };

  const handleDeleteClass = (classId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Class",
      message: "Are you sure you want to delete this class? This will remove all associated students and teams.",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await classAPI.deleteClass(classId);
          setShowManageModal(false);
          setSelectedClass(null);
          loadClasses();
          loadTeams();
          toast.success("Class deleted successfully!");
        } catch (err) {
          toast.error("Failed to delete class: " + err.message);
        }
      }
    });
  };

  const handleManageClass = (classItem) => {
    setSelectedClass(classItem);
    const filteredStudents = students.filter(s => s.classIds && s.classIds.includes(classItem.id));
    const filteredTeams = teams.filter(team => team.classId === classItem.id);
    const classQuestionnairesData = classQuestionnaires[classItem.id] || [];
    setClassStudents(filteredStudents);
    setClassTeams(filteredTeams);
    setClassQuestionnairesList(classQuestionnairesData);
    setShowManageModal(true);
  };

  const getTeamNameForStudent = (student) => {
    if (!student?.teamIds || student.teamIds.length === 0) {
      return "No Team";
    }

    const matchingTeams = classTeams.filter(team =>
      student.teamIds.includes(team.id)
    );

    if (matchingTeams.length === 0) {
      return "No Team";
    }

    return matchingTeams.map(team => team.name).join(", ");
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <h1>Classes</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Your Classes</h2>
            <button className="btn" onClick={() => setShowCreateModal(true)}>Create New Class</button>
          </div>
          {loading ? (
            <p>Loading classes...</p>
          ) : classes.length === 0 ? (
            <p>No classes found. Create your first class to get started.</p>
          ) : (
            <table className="class-table">
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Section</th>
                  <th>School Year</th>
                  <th>Students</th>
                  <th>Teams</th>
                  <th>Questionnaires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classItem) => {
                  const attachedQuestionnaires = classQuestionnaires[classItem.id] || [];
                  return (
                  <tr key={classItem.id}>
                    <td>{classItem.name}</td>
                    <td>{classItem.section || "N/A"}</td>
                    <td>{classItem.schoolYear}</td>
                    <td>{students.filter(s => s.classIds && s.classIds.includes(classItem.id)).length} Students</td>
                    <td>{classItem.teamIds?.length || 0} Teams</td>
                    <td>
                      {attachedQuestionnaires.length === 0 ? (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                          0 Questionnaires
                        </span>
                      ) : (
                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                          {attachedQuestionnaires.length} {attachedQuestionnaires.length === 1 ? 'Questionnaire' : 'Questionnaires'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleManageClass(classItem)}
                      > Manage
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDeleteClass(classItem.id)}
                      >
                        Delete
                      </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && createPortal((
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label>Class Name *</label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="e.g., IT 3310"
                  required
                />
              </div>
              <div className="form-group">
                <label>Section</label>
                <input
                  type="text"
                  value={newClass.section}
                  onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  placeholder="e.g., A"
                />
              </div>
              <div className="form-group">
                <label>School Year *</label>
                <input
                  type="text"
                  value={newClass.schoolYear}
                  onChange={(e) => setNewClass({ ...newClass, schoolYear: e.target.value })}
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  placeholder="Class description..."
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Manage Class Modal */}
      {showManageModal && selectedClass && createPortal((
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Manage Class: {selectedClass.name} {selectedClass.section}</h2>
            <div className="class-overview-panel">
              <p><strong>Name:</strong> {selectedClass.name}</p>
              <p><strong>Section:</strong> {selectedClass.section || "N/A"}</p>
              <p><strong>School Year:</strong> {selectedClass.schoolYear}</p>
              <p><strong>Students:</strong> {classStudents.length}</p>
              <p><strong>Teams:</strong> {classTeams.length}</p>
              <p><strong>Description:</strong> {selectedClass.description || "No description provided."}</p>
            </div>

            <div className="team-section" style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>Teams ({classTeams.length})</h3>
              </div>

              {classTeams.length === 0 ? (
                <p>No teams in this class yet.</p>
              ) : (
                <table className="class-table" style={{ marginTop: "10px" }}>
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Description</th>
                      <th>Members</th>
                      <th>Advisers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classTeams.map((team) => (
                      <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>{team.description || "N/A"}</td>
                        <td>{team.memberIds?.length || 0}</td>
                        <td>{team.adviserIds?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="team-section" style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>Students ({classStudents.length})</h3>
              </div>
              
              {classStudents.length === 0 ? (
                <p>No students in this class yet.</p>
              ) : (
                <table className="class-table" style={{ marginTop: "10px" }}>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.studentId}</td>
                        <td>{student.firstName} {student.lastName}</td>
                        <td>{student.email || "N/A"}</td>
                        <td>{student.phoneNumber || "N/A"}</td>
                        <td>{getTeamNameForStudent(student)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="team-section" style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>Questionnaires ({classQuestionnairesList.length})</h3>
              </div>

              {classQuestionnairesList.length === 0 ? (
                <p>No questionnaires assigned to this class yet.</p>
              ) : (
                <table className="class-table" style={{ marginTop: "10px" }}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Questions</th>
                      <th>Status</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classQuestionnairesList.map((questionnaire) => (
                      <tr key={questionnaire.id}>
                        <td>{questionnaire.title}</td>
                        <td>{questionnaire.description || "N/A"}</td>
                        <td>{questionnaire.questionCount}</td>
                        <td>{questionnaire.isActive ? "Active" : "Inactive"}</td>
                        <td>{new Date(questionnaire.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={() => setShowManageModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

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
  );
};

export default Classes;

