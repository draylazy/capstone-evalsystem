import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { questionnaireAPI, classAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import QuestionnaireDetailModal from "./QuestionnaireDetailModal";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../../components/Pagination/Pagination";
import "./Teacher.css";

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

const Questionnaires = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [questionnaires, setQuestionnaires] = useState([]);

  const token = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || null;
    } catch {
      return null;
    }
  }, []);

  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI Assistant. I can help you design your questionnaires, suggest questions, refine wording, or explain how to target peer evaluations. How can I help you today?" },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const aiMessagesEndRef = useRef(null);

  useEffect(() => {
    if (isAiOpen) {
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiLoading, isAiOpen]);

  const sendAiMessage = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed) return;

    if (trimmed.length > 2000) {
      toast.error('Message is too long (max 2000 characters).');
      return;
    }

    if (!token) {
      toast.error('You are not authenticated. Please log in again.');
      return;
    }

    const history = aiMessages.slice(-12);

    const questionnaireContext = (() => {
      const titles = questionnaires.slice(0, 20).map((q) => `${q.title} (${q.target})`).join(', ');
      return [
        `Teacher questionnaires list`,
        `Total questionnaires: ${questionnaires.length}`,
        titles ? `Existing questionnaire titles (up to 20): ${titles}` : '',
        `User is browsing their list of questionnaires.`,
      ]
        .filter(Boolean)
        .join('\n');
    })();

    setAiMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history,
          context: questionnaireContext,
          contextType: 'questionnaire-list',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `AI request failed (HTTP ${res.status})`);
      }

      setAiMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (e) {
      toast.error(e.message || 'AI request failed');
      setAiMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry—something went wrong calling the AI.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const onAiKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!aiLoading) sendAiMessage();
    }
  };
  const [classes, setClasses] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });
  const [googleLinked, setGoogleLinked] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const { currentPage, totalPages, paginatedData, goToPage } = usePagination(questionnaires, 10);

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

      const response = await fetchWithLocalFallback('/api/google-auth/status', {
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
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.id) {
        const teacherClasses = data.filter(c => String(c.teacherId) === String(user.id));
        setClasses(teacherClasses);
      } else {
        setClasses(data);
      }
    } catch (err) {
      toast.error('Error fetching classes');
    }
  };

  const handleDeleteQuestionnaire = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Questionnaire",
      message: "Are you sure you want to delete this questionnaire? This will also delete all associated responses from advisers and students. This action cannot be undone.",
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

  const openAssignModal = (questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    setSelectedClasses(questionnaire.assignedClassIds || []);
    setShowAssignModal(true);
  };

  const handleDuplicateQuestionnaire = async (questionnaire) => {
    try {
      setDuplicatingId(questionnaire.id);
      toast.info('Duplicating questionnaire...');
      await questionnaireAPI.duplicateQuestionnaire(questionnaire.id);
      toast.success('Questionnaire duplicated successfully!');
      await fetchQuestionnaires();
    } catch (err) {
      toast.error('Error duplicating questionnaire: ' + err.message);
    } finally {
      setDuplicatingId(null);
    }
  };

  const openDetailsModal = (id) => {
    setSelectedQuestionnaireId(id);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDeadline = (dateTimeString) => {
    if (!dateTimeString) return 'No deadline';
    return new Date(dateTimeString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content questionnaires-page">
        <div className="questionnaires-page-header">
          <div className="questionnaires-page-title-row">
            <h1>Questionnaires</h1>
          </div>
          <button type="button" className="btn questionnaires-create-btn" onClick={() => navigate('/teacher/questionnaires/create')}>
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

        <div className="section questionnaires-section">
          <h2>Your Questionnaires</h2>
          {loading ? (
            <p>Loading questionnaires...</p>
          ) : questionnaires.length === 0 ? (
            <p>No questionnaires created yet. Click "Create New Questionnaire" to get started.</p>
          ) : (
            <>
            <div className="questionnaires-list-wrap">
            <table className="class-table questionnaire-list-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Target</th>
                  <th>Created</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((q) => (
                  <tr key={q.id} className="questionnaire-list-row">
                    <td data-label="Title" className="q-cell-title">
                      <span className="q-card-title">{q.title}</span>
                    </td>
                    <td data-label="Target" className="q-cell-target">
                      <span className={`q-target-badge q-target-badge--${(q.target || "ADVISER").toLowerCase()}`}>
                        {q.target === "ADVISER" ? "Adviser" : "Student"}
                      </span>
                    </td>
                    <td data-label="Created">{formatDate(q.createdAt)}</td>
                    <td data-label="Deadline" className={!q.deadlineAt ? "q-cell-muted" : ""}>
                      {formatDeadline(q.deadlineAt)}
                    </td>
                    <td data-label="Status" className="q-cell-status">
                      <button
                        type="button"
                        className={`status-badge status-toggle ${q.isActive ? 'status-active' : 'status-inactive'}`}
                        onClick={() => handleToggleQuestionnaireStatus(q)}
                        title={q.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {q.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td data-label="Actions" className="q-cell-actions">
                      <div className="action-buttons questionnaire-action-buttons">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => openDetailsModal(q.id)}
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDuplicateQuestionnaire(q)}
                          disabled={duplicatingId !== null}
                          style={{ opacity: duplicatingId !== null ? 0.5 : 1, cursor: duplicatingId !== null ? 'not-allowed' : 'pointer' }}
                        >
                          {duplicatingId === q.id ? 'Duplicating...' : 'Duplicate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteQuestionnaire(q.id)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
            </>
          )}
        </div>

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

        {/* Questionnaire Details & Edit Modal */}
        <QuestionnaireDetailModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          questionnaireId={selectedQuestionnaireId}
          onUpdate={fetchQuestionnaires}
        />

        <button
          className="ai-fab"
          onClick={() => setIsAiOpen((prev) => !prev)}
          aria-label="Open AI assistant"
          title="AI Assistant"
        >
          AI
        </button>

        {isAiOpen && (
          <div className="ai-fab-panel" role="dialog" aria-label="AI assistant chat">
            <div className="ai-fab-header">
              <div>
                <strong>AI Assistant</strong>
                <p>Ask for suggestions, templates, and general help.</p>
              </div>
              <button className="btn-secondary" onClick={() => setIsAiOpen(false)}>
                Close
              </button>
            </div>

            <div className="ai-chat ai-chat-fab">
              <div className="ai-chat-messages">
                {aiMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`ai-chat-row ${m.role === 'user' ? 'is-user' : 'is-assistant'}`}
                  >
                    <div className="ai-chat-bubble">
                      <div className="ai-chat-meta">{m.role === 'user' ? 'You' : 'AI'}</div>
                      <div className="ai-chat-text">{m.text}</div>
                    </div>
                  </div>
                ))}

                {aiLoading && (
                  <div className="ai-chat-row is-assistant ai-chat-typing">
                    <div className="ai-chat-bubble">
                      <div className="ai-chat-meta">AI</div>
                      <div className="ai-typing-dots" aria-label="AI is typing" role="status">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={aiMessagesEndRef}></div>
              </div>

              <div className="ai-chat-composer">
                <textarea
                  className="form-input ai-chat-input"
                  rows={2}
                  placeholder="Ask for suggestions, question drafting, etc..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={onAiKeyDown}
                  disabled={aiLoading}
                />
                <button className="btn btn-primary ai-chat-send" onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()}>
                  {aiLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default Questionnaires;

