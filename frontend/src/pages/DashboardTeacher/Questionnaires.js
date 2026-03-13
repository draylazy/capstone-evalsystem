import React, { useState, useEffect } from "react";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { questionnaireAPI, classAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import "./Teacher.css";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const Questionnaires = () => {
  const toast = useToast();
  const [questionnaires, setQuestionnaires] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [googleLinked, setGoogleLinked] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    questions: []
  });

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionType: "NUMERIC_SCALE",
    minScore: 1,
    maxScore: 5,
    choices: [],
    orderIndex: 0
  });

  const [selectedClasses, setSelectedClasses] = useState([]);

  useEffect(() => {
    fetchQuestionnaires();
    fetchClasses();
    checkGoogleLink();
  }, []);

  const checkGoogleLink = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr)?.token : null;
      if (!token) {
        setGoogleLinked(false);
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/google-auth/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setGoogleLinked(data.isLinked);
      return !!data.isLinked;
    } catch (err) {
      toast.error('Error checking Google link status');
      setGoogleLinked(false);
      return false;
    }
  };

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const data = await questionnaireAPI.getAllQuestionnaires();
      setQuestionnaires(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await classAPI.getAllClasses();
      // Filter classes for this teacher only
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.id) {
        const teacherClasses = data.filter(c => c.teacherId === user.id);
        setClasses(teacherClasses);
      } else {
        setClasses(data);
      }
    } catch (err) {
      toast.error('Error fetching classes');
    }
  };

  const handleCreateQuestionnaire = async (e) => {
    e.preventDefault();
    
    if (!googleLinked) {
      const linkedNow = await checkGoogleLink();
      if (!linkedNow) {
        toast.error('Please link your Google account in the Profile page first.');
        return;
      }
    }

    try {
      toast.info('Creating questionnaire...');
      await questionnaireAPI.createQuestionnaire(formData);
      toast.success('Questionnaire created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchQuestionnaires();
    } catch (err) {
      toast.error('Error creating questionnaire: ' + err.message);
    }
  };

  const handleDeleteQuestionnaire = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Questionnaire",
      message: "Are you sure you want to delete this questionnaire? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await questionnaireAPI.deleteQuestionnaire(id);
          fetchQuestionnaires();
          toast.success('Questionnaire deleted successfully!');
        } catch (err) {
          toast.error('Error deleting questionnaire: ' + err.message);
        }
      }
    });
  };

  const handleToggleQuestionnaireStatus = (questionnaire) => {
    const nextActive = !questionnaire.isActive;
    setConfirmModal({
      isOpen: true,
      title: nextActive ? "Activate Questionnaire" : "Deactivate Questionnaire",
      message: nextActive
        ? "Activate this questionnaire? It will become available to advisers again."
        : "Deactivate this questionnaire? It will stay assigned to classes but advisers will no longer be able to use it.",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await questionnaireAPI.updateQuestionnaireStatus(questionnaire.id, nextActive);
          await fetchQuestionnaires();
          toast.success(nextActive ? 'Questionnaire activated successfully!' : 'Questionnaire deactivated successfully!');
        } catch (err) {
          toast.error('Error updating questionnaire status: ' + err.message);
        }
      }
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.questionText.trim()) {
      alert('Please enter a question text');
      return;
    }

    // Validate multiple choice questions have at least 2 choices
    if (newQuestion.questionType === 'MULTIPLE_CHOICE') {
      if (!newQuestion.choices || newQuestion.choices.length < 2) {
        alert('Multiple choice questions must have at least 2 choices');
        return;
      }
    }

    setFormData({
      ...formData,
      questions: [...formData.questions, { ...newQuestion, orderIndex: formData.questions.length }]
    });

    setNewQuestion({
      questionText: "",
      questionType: "NUMERIC_SCALE",
      minScore: 1,
      maxScore: 5,
      choices: [],
      orderIndex: 0
    });
  };

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleAssignToClasses = async () => {
    try {
      const existingClassIds = selectedQuestionnaire?.assignedClassIds || [];
      const toAdd = selectedClasses.filter(id => !existingClassIds.includes(id));
      const toRemove = existingClassIds.filter(id => !selectedClasses.includes(id));

      if (toAdd.length > 0) {
        await questionnaireAPI.assignToClasses(selectedQuestionnaire.id, toAdd);
      }

      if (toRemove.length > 0) {
        await questionnaireAPI.unassignFromClasses(selectedQuestionnaire.id, toRemove);
      }

      toast.success('Class assignments updated successfully!');
      setShowAssignModal(false);
      setSelectedClasses([]);
      await fetchQuestionnaires();
    } catch (err) {
      toast.error('Error updating class assignments: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      questions: []
    });
    setNewQuestion({
      questionText: "",
      questionType: "NUMERIC_SCALE",
      minScore: 1,
      maxScore: 5,
      choices: [],
      orderIndex: 0
    });
  };

  const openAssignModal = (questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setSelectedClasses(questionnaire.assignedClassIds || []);
    setShowAssignModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Questionnaires</h1>
          <button className="btn" onClick={() => setShowCreateModal(true)}>
            + Create New Questionnaire
          </button>
        </div>

        {!googleLinked && (
          <div className="alert-warning">
            <strong>⚠️ Google Account Not Linked</strong>
            <p>Please link your Google account in the Profile page to create questionnaires.</p>
          </div>
        )}

        {error && (
          <div className="alert-danger">
            {error}
          </div>
        )}

        <div className="section">
          <h2>Your Questionnaires</h2>
          {loading ? (
            <p>Loading questionnaires...</p>
          ) : questionnaires.length === 0 ? (
            <p>No questionnaires created yet. Click "Create New Questionnaire" to get started.</p>
          ) : (
            <table className="class-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Questions</th>
                  <th>Assigned Classes</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionnaires.map((q) => (
                  <tr key={q.id}>
                    <td>{q.title}</td>
                    <td>{q.description || 'N/A'}</td>
                    <td>{q.questionCount}</td>
                    <td>
                      {q.assignedClassNames && q.assignedClassNames.length > 0
                        ? q.assignedClassNames.join(', ')
                        : 'Not assigned'}
                    </td>
                    <td>{formatDate(q.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`status-badge status-toggle ${q.isActive ? 'status-active' : 'status-inactive'}`}
                        onClick={() => handleToggleQuestionnaireStatus(q)}
                        title={q.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {q.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm" 
                          onClick={() => window.open(q.googleFormUrl, '_blank')}
                        >
                          View Form
                        </button>
                        <button 
                          className="btn btn-sm btn-assign" 
                          onClick={() => openAssignModal(q)}
                          title="Assign to classes"
                        >
                          Assign
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={() => handleDeleteQuestionnaire(q.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Questionnaire Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
              <h2>Create New Questionnaire</h2>
              <form onSubmit={handleCreateQuestionnaire}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <h3>Questions ({formData.questions.length} added)</h3>
                  
                  {formData.questions.length > 0 && (
                    <div className="questions-success-hint">
                      <small>
                        ✅ Questions added below. Click "Create Questionnaire" when done adding all questions.
                      </small>
                    </div>
                  )}
                  
                  {formData.questions.map((q, index) => (
                    <div key={index} className="question-card">
                      <div className="question-card-inner">
                        <div className="question-card-text">
                          <strong>Q{index + 1}:</strong> {q.questionText}
                          <br />
                          <small>Type: {q.questionType}</small>
                          {(q.questionType === 'NUMERIC_SCALE' || q.questionType === 'RATING') && (
                            <small> | Range: {q.minScore} - {q.maxScore}</small>
                          )}
                          {q.questionType === 'MULTIPLE_CHOICE' && q.choices && q.choices.length > 0 && (
                            <div style={{ marginTop: '5px' }}>
                              <small>Choices: {q.choices.join(', ')}</small>
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveQuestion(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="add-question-box">
                    <h4>Add New Question</h4>
                    <div className="form-group">
                      <label>Question Text *</label>
                      <input
                        type="text"
                        value={newQuestion.questionText}
                        onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Question Type</label>
                      <select
                        value={newQuestion.questionType}
                        onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                      >
                        <option value="NUMERIC_SCALE">Numeric Scale</option>
                        <option value="RATING">Rating</option>
                        <option value="TEXT">Text Response</option>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      </select>
                    </div>

                    {(newQuestion.questionType === 'NUMERIC_SCALE' || newQuestion.questionType === 'RATING') && (
                      <div className="score-range-row">
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Min Score</label>
                          <input
                            type="number"
                            value={newQuestion.minScore}
                            onChange={(e) => setNewQuestion({ ...newQuestion, minScore: parseInt(e.target.value) })}
                            min="0"
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Max Score</label>
                          <input
                            type="number"
                            value={newQuestion.maxScore}
                            onChange={(e) => setNewQuestion({ ...newQuestion, maxScore: parseInt(e.target.value) })}
                            min="1"
                          />
                        </div>
                      </div>
                    )}

                    {newQuestion.questionType === 'MULTIPLE_CHOICE' && (
                      <div className="form-group">
                        <label>Choices</label>
                        {newQuestion.choices.map((choice, index) => (
                          <div key={index} className="choice-row">
                            <span className="choice-label">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <input
                              type="text"
                              value={choice}
                              onChange={(e) => {
                                const updatedChoices = [...newQuestion.choices];
                                updatedChoices[index] = e.target.value;
                                setNewQuestion({ ...newQuestion, choices: updatedChoices });
                              }}
                              placeholder={`Choice ${index + 1}`}
                              className="choice-input"
                            />
                            {newQuestion.choices.length > 2 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  const updatedChoices = newQuestion.choices.filter((_, i) => i !== index);
                                  setNewQuestion({ ...newQuestion, choices: updatedChoices });
                                }}
                                title="Remove choice"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          className="btn btn-sm btn-assign"
                          onClick={() => {
                            setNewQuestion({ 
                              ...newQuestion, 
                              choices: [...newQuestion.choices, ''] 
                            });
                          }}
                          style={{ marginTop: '5px' }}
                        >
                          + Add Choice
                        </button>
                        
                        <small className="choice-hint">
                          Minimum 2 choices required. Click "+ Add Choice" for more options.
                        </small>
                      </div>
                    )}

                    <button type="button" onClick={handleAddQuestion} className="btn" style={{ marginTop: '12px' }}>
                      + Add Question
                    </button>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Create Questionnaire</button>
                  <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign to Classes Modal */}
        {showAssignModal && selectedQuestionnaire && (
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="assign-modal-title">Assign Questionnaire to Classes</h2>
              <p className="assign-modal-subtitle"><strong>{selectedQuestionnaire.title}</strong></p>
              
              <div className="form-group">
                <div className="assign-toolbar">
                  <label>Select Classes</label>
                  <div className="assign-toolbar-actions">
                    <span className="selection-count">{selectedClasses.length} selected</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelectedClasses(classes.map((c) => c.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelectedClasses([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {classes.length === 0 ? (
                  <p>No classes available. Please create classes first.</p>
                ) : (
                  <div className="class-checklist">
                    {classes.map((cls) => (
                      <div key={cls.id} className="class-check-item">
                        <label className="class-check-label">
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(cls.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClasses([...selectedClasses, cls.id]);
                              } else {
                                setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                              }
                            }}
                            className="class-checkbox"
                          />
                          <span className="class-check-text">
                            <span className="class-check-name">{cls.name} {cls.section ? `- ${cls.section}` : ''}</span>
                            <span className="class-check-meta">School Year: {cls.schoolYear}</span>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button onClick={handleAssignToClasses} className="btn btn-primary">Save Class Assignments</button>
                <button onClick={() => { setShowAssignModal(false); setSelectedClasses([]); }} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
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

export default Questionnaires;

