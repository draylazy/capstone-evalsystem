import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { questionnaireAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Teacher.css";
import "./QuestionnaireTwoColumn.css";
import CustomSelect from "../../components/CustomSelect/CustomSelect";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const QuestionnaireDetailModal = ({ isOpen, onClose, questionnaireId, onUpdate }) => {
  const toast = useToast();
  const token = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || null;
    } catch {
      return null;
    }
  }, []);

  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI Assistant. I can help you edit this questionnaire, suggest new questions, refine wording, or explain how to target peer evaluations. Ask me for suggestions or advice on questionnaire creation!" },
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

    const questionnaireDraftContext = (() => {
      const qCount = formData.sections.reduce((sum, sec) => sum + (sec.items?.length || 0), 0);
      const sectionsInfo = formData.sections.map((sec, sIdx) => {
        const itemsInfo = (sec.items || []).map((item, qIdx) => `- Q${qIdx + 1}: ${item.questionText} (${item.questionType}, required=${item.required !== false})`).join('\n');
        return `Section ${sIdx + 1}: "${sec.sectionTitle}" (${(sec.items || []).length} questions)\n${itemsInfo}`;
      }).join('\n\n');

      return [
        `User is currently viewing/editing an existing questionnaire in a details modal.`,
        `Questionnaire ID: ${questionnaireId}`,
        `Current Title: ${formData.title || '(No title yet)'}`,
        `Current Target: ${formData.target} (${formData.target === 'STUDENT' ? 'Peer-to-Peer' : 'Team Evaluation'})`,
        `Current Description: ${formData.description || '(No description yet)'}`,
        `Total sections: ${formData.sections.length}`,
        `Total questions: ${qCount}`,
        `Current Sections & Questions:\n${sectionsInfo}`
      ].join('\n');
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
          context: questionnaireDraftContext,
          contextType: 'questionnaire-design',
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
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadlineAt: "",
    sections: [],
    target: "ADVISER"
  });

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionDescription: "",
    questionType: "NUMERIC_SCALE",
    minScore: 1,
    maxScore: 5,
    choices: [],
    correctAnswer: "",
    pointsValue: 1,
    required: true,
  });

  const [initialFormData, setInitialFormData] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");

  useEffect(() => {
    if (isOpen && questionnaireId) {
      fetchQuestionnaireDetails();
    } else {
      setIsEditing(false);
      setQuestionnaire(null);
      setShowConfirmClose(false);
    }
  }, [isOpen, questionnaireId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const fetchQuestionnaireDetails = async () => {
    try {
      setLoading(true);
      const data = await questionnaireAPI.getQuestionnaireById(questionnaireId);
      setQuestionnaire(data);
      let finalSections = data.sections || [];
      if (finalSections.length === 0) {
        finalSections = [{
          sectionTitle: "General",
          sectionDescription: "",
          orderIndex: 0,
          evaluateIndividuals: false,
          items: data.items || []
        }];
      }

      const initialData = {
        title: data.title || "",
        description: data.description || "",
        deadlineAt: data.deadlineAt ? data.deadlineAt.slice(0, 16) : "",
        sections: finalSections,
        target: data.target || "ADVISER"
      };

      setFormData(initialData);
      setInitialFormData(initialData);
      setActiveSectionIndex(0);
    } catch (err) {
      toast.error("Failed to fetch questionnaire details: " + err.message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const totalQuestions = formData.sections.reduce((sum, sec) => sum + (sec.items?.length || 0), 0);
    if (totalQuestions === 0) {
      toast.error("Please add at least one question");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        deadlineAt: formData.deadlineAt || null,
      };
      await questionnaireAPI.updateQuestionnaire(questionnaireId, payload);
      toast.success("Questionnaire updated successfully!");
      setIsEditing(false);
      fetchQuestionnaireDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Error updating questionnaire: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.questionText.trim()) {
      toast.error("Please enter question text");
      return;
    }

    const updatedSections = [...formData.sections];
    if (!updatedSections[activeSectionIndex].items) {
      updatedSections[activeSectionIndex].items = [];
    }
    
    if (editingQuestionIndex !== null) {
      updatedSections[activeSectionIndex].items[editingQuestionIndex] = { ...newQuestion };
      toast.success("Question updated!");
      setEditingQuestionIndex(null);
    } else {
      updatedSections[activeSectionIndex].items.push({ ...newQuestion });
      toast.success("Question added!");
    }
    
    setFormData({ ...formData, sections: updatedSections });

    setNewQuestion({
      questionText: "",
      questionDescription: "",
      questionType: formData.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
      minScore: 1,
      maxScore: formData.target === 'STUDENT' ? 10 : 5,
      choices: [],
      correctAnswer: "",
      pointsValue: 1,
      required: true,
    });
  };

  const handleEditQuestion = (index) => {
    const q = formData.sections[activeSectionIndex].items[index];
    setNewQuestion({ ...q });
    setEditingQuestionIndex(index);
  };

  const handleRemoveQuestion = (index) => {
    const updatedSections = [...formData.sections];
    updatedSections[activeSectionIndex].items = updatedSections[activeSectionIndex].items.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: updatedSections });
  };

  const handleAddSection = () => {
    const newSectionNumber = formData.sections.length + 1;
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          sectionTitle: `Section ${newSectionNumber}`,
          sectionDescription: "",
          orderIndex: formData.sections.length,
          evaluateIndividuals: false,
          items: []
        }
      ]
    });
    setActiveSectionIndex(formData.sections.length);
  };

  const handleRemoveSection = (index) => {
    if (formData.sections.length <= 1) {
      toast.error("Cannot delete the only section");
      return;
    }
    const updatedSections = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: updatedSections });
    if (activeSectionIndex >= updatedSections.length) {
      setActiveSectionIndex(updatedSections.length - 1);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatDeadline = (dateTimeString) => {
    if (!dateTimeString) return "No deadline";
    return new Date(dateTimeString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatQuestionType = (type) => {
    const labels = {
      NUMERIC_SCALE: "Numeric scale",
      RATING: "Rating",
      TEXT: "Text response",
      MULTIPLE_CHOICE: "Multiple choice",
    };
    return labels[type] || type?.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) || "—";
  };

  const checkIsDirty = () => {
    if (!isEditing || !initialFormData) return false;

    // Check if main form data is different
    const currentData = JSON.stringify({
      title: formData.title,
      description: formData.description,
      deadlineAt: formData.deadlineAt,
      sections: formData.sections,
      target: formData.target
    });
    const originalData = JSON.stringify(initialFormData);

    if (currentData !== originalData) return true;

    // Check if newQuestion has any unsaved content
    if (editingQuestionIndex === null) {
      // Adding new: check if question text is entered
      if (newQuestion.questionText.trim() !== "") return true;
    } else {
      // Editing existing: check if modified from what's in the sections
      const originalQuestion = formData.sections[activeSectionIndex].items[editingQuestionIndex];
      if (JSON.stringify(newQuestion) !== JSON.stringify(originalQuestion)) return true;
    }

    return false;
  };

  const handleOpenSaveTemplateModal = () => {
    setTemplateNameInput(`${questionnaire?.title || "Custom"} Template`);
    setShowSaveTemplateModal(true);
  };

  const handleConfirmSaveTemplate = () => {
    if (!templateNameInput || !templateNameInput.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    const templateName = templateNameInput.trim();
    try {
      const stored = localStorage.getItem('custom_templates');
      const templates = stored ? JSON.parse(stored) : [];

      if (templates.some(t => t.label.toLowerCase() === templateName.toLowerCase())) {
        toast.error("A template with this name already exists.");
        return;
      }

      const newTemplate = {
        key: `custom_${Date.now()}`,
        label: templateName,
        target: questionnaire.target,
        data: {
          title: questionnaire.title,
          description: questionnaire.description || "",
          target: questionnaire.target,
          sections: formData.sections.map((sec, sIdx) => ({
            sectionTitle: sec.sectionTitle || `Section ${sIdx + 1}`,
            sectionDescription: sec.sectionDescription || "",
            orderIndex: sec.orderIndex ?? sIdx,
            evaluateIndividuals: sec.evaluateIndividuals || false,
            items: (sec.items || []).map(item => ({
              questionText: item.questionText,
              questionDescription: item.questionDescription || "",
              questionType: item.questionType,
              minScore: item.minScore || 1,
              maxScore: item.maxScore || 5,
              choices: item.choices || [],
              correctAnswer: item.correctAnswer || "",
              pointsValue: item.pointsValue || 1,
              required: item.required !== false
            }))
          }))
        }
      };

      templates.push(newTemplate);
      localStorage.setItem('custom_templates', JSON.stringify(templates));
      toast.success(`Saved "${templateName}" as a custom template!`);
      setShowSaveTemplateModal(false);
    } catch (err) {
      toast.error("Failed to save template: " + err.message);
    }
  };

  const handleRequestClose = () => {
    if (checkIsDirty()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const overlayClass = `qdetail-modal-overlay${
    isEditing ? " qdetail-modal-overlay--edit" : ""
  }`;

  return createPortal(
    <>
    <div className={overlayClass} onClick={handleRequestClose}>
      <div
        className={`modal-content questionnaire-detail-modal${isEditing ? " questionnaire-detail-modal--editing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qdetail-modal-header">
          <h2 className="qdetail-modal-title">
            {isEditing ? "Edit Questionnaire" : "Questionnaire Details"}
          </h2>
          <button type="button" className="qdetail-close-btn" onClick={handleRequestClose} aria-label="Close">
            &times;
          </button>
        </div>

        {loading || !questionnaire ? (
          <div className="qdetail-loading">
            {loading ? "Loading details..." : "Failed to load details. Please try again."}
          </div>
        ) : (
          <>
            {!isEditing ? (
              <div className="qdetail-view">
                <div className="qdetail-body">
                <div className="qdetail-meta-grid">
                  <div className="qdetail-meta-card qdetail-meta-card--wide">
                    <span className="qdetail-meta-label">Title</span>
                    <p className="qdetail-meta-value qdetail-meta-value--title">{questionnaire.title}</p>
                  </div>
                  <div className="qdetail-meta-card">
                    <span className="qdetail-meta-label">Target</span>
                    <p className="qdetail-meta-value">
                      <span className={`qdetail-target-badge qdetail-target-badge--${(questionnaire.target || "ADVISER").toLowerCase()}`}>
                        {questionnaire.target === "ADVISER" ? "Adviser" : "Student"}
                      </span>
                    </p>
                  </div>
                  <div className="qdetail-meta-card">
                    <span className="qdetail-meta-label">Questions</span>
                    <p className="qdetail-meta-value">{questionnaire.questionCount}</p>
                  </div>
                  <div className="qdetail-meta-card">
                    <span className="qdetail-meta-label">Status</span>
                    <p className="qdetail-meta-value">
                      <span className={`status-badge ${questionnaire.isActive ? "status-active" : "status-inactive"}`}>
                        {questionnaire.isActive ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <div className="qdetail-meta-card qdetail-meta-card--wide">
                    <span className="qdetail-meta-label">Description</span>
                    <p className="qdetail-meta-value">{questionnaire.description || "No description provided."}</p>
                  </div>
                  <div className="qdetail-meta-card qdetail-meta-card--wide">
                    <span className="qdetail-meta-label">Assigned classes</span>
                    <p className="qdetail-meta-value">
                      {questionnaire.assignedClassNames?.length > 0
                        ? questionnaire.assignedClassNames.join(", ")
                        : "Not assigned to any classes"}
                    </p>
                  </div>
                  <div className="qdetail-meta-card">
                    <span className="qdetail-meta-label">Created</span>
                    <p className="qdetail-meta-value">{formatDate(questionnaire.createdAt)}</p>
                  </div>
                  <div className="qdetail-meta-card">
                    <span className="qdetail-meta-label">Deadline</span>
                    <p className={`qdetail-meta-value ${!questionnaire.deadlineAt ? "qdetail-meta-value--muted" : ""}`}>
                      {formatDeadline(questionnaire.deadlineAt)}
                    </p>
                  </div>
                </div>

                <section className="qdetail-questions">
                  <h3 className="qdetail-questions-title">Questions</h3>
                  <div className="qdetail-questions-list">
                    {formData.sections.map((section, sIdx) => (
                      <div key={sIdx} className="qdetail-section-block">
                        {formData.sections.length > 1 && (
                          <h4 className="qdetail-section-name">{section.sectionTitle}</h4>
                        )}
                        <div className="qdetail-section-items">
                          {section.items?.map((q, qIdx) => (
                            <article key={qIdx} className="qdetail-question-card">
                              <p className="qdetail-question-text">
                                <span className="qdetail-question-num">{qIdx + 1}.</span> {q.questionText}
                              </p>
                              <p className="qdetail-question-meta">
                                <span>{formatQuestionType(q.questionType)}</span>
                                {(q.questionType === "NUMERIC_SCALE" || q.questionType === "RATING") && (
                                  <span> · Range {q.minScore}–{q.maxScore}</span>
                                )}
                                <span> · {q.required === false ? "Optional" : "Required"}</span>
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                </div>

                <footer className="qdetail-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (questionnaire.target === "STUDENT" && questionnaire.isActive) {
                        toast.error("Active peer-to-peer questionnaires cannot be edited. Please deactivate it first.");
                        return;
                      }
                      setIsEditing(true);
                    }}
                    title={questionnaire.target === "STUDENT" && questionnaire.isActive ? "Deactivate to edit" : ""}
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary animate-pulse"
                    onClick={handleOpenSaveTemplateModal}
                    style={{
                      border: '1px solid var(--dtm-gold)',
                      color: 'var(--dtm-gold)',
                      background: 'rgba(242, 201, 76, 0.05)',
                    }}
                  >
                    Add as Template
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => window.open(questionnaire.googleFormUrl, "_blank")}>
                    View form
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleRequestClose}>
                    Close
                  </button>
                </footer>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="qdetail-edit-view">
                <form onSubmit={handleSaveChanges} className="qdetail-edit-form">
                  <div className="qdetail-edit-scroll"><div className="questionnaire-two-column-container">
                    {/* LEFT COLUMN - SECTION EDITOR & QUESTIONS */}
                    <div className="questionnaire-preview-panel">
                      {formData.sections[activeSectionIndex] && (
                        <>
                          <div className="qdetail-edit-q-summary">
                            <span className="qdetail-edit-q-summary-label">Questionnaire</span>
                            <strong className="qdetail-edit-q-summary-title">
                              {formData.title?.trim() || "Untitled"}
                            </strong>
                            <span className="qdetail-edit-q-summary-meta">
                              {formData.target === "STUDENT" ? "Peer-to-Peer" : "Team"}
                            </span>
                          </div>
                          <h3 className="qdetail-edit-panel-heading">Page &amp; questions</h3>
                          <div className="section-editor">
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dtm-gold)', margin: 0 }}>Page title</label>
                              <input
                                type="text"
                                value={formData.sections[activeSectionIndex].sectionTitle}
                                onChange={(e) => {
                                  const updatedSections = [...formData.sections];
                                  updatedSections[activeSectionIndex].sectionTitle = e.target.value;
                                  setFormData({ ...formData, sections: updatedSections });
                                }}
                                placeholder="Section Title"
                                style={{ padding: '8px 10px', fontSize: '11px', width: '100%', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dtm-gold)', margin: 0 }}>Section Description</label>
                              <textarea
                                value={formData.sections[activeSectionIndex].sectionDescription || ''}
                                onChange={(e) => {
                                  const updatedSections = [...formData.sections];
                                  updatedSections[activeSectionIndex].sectionDescription = e.target.value;
                                  setFormData({ ...formData, sections: updatedSections });
                                }}
                                rows="2"
                                placeholder="Describe this section (optional)"
                                style={{ padding: '8px 10px', fontSize: '11px', width: '100%', boxSizing: 'border-box' }}
                              />
                            </div>

                            {formData.target !== 'STUDENT' && (
                              <div className="form-group" style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dtm-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="checkbox"
                                    checked={formData.sections[activeSectionIndex].evaluateIndividuals || false}
                                    onChange={(e) => {
                                      const updatedSections = [...formData.sections];
                                      updatedSections[activeSectionIndex].evaluateIndividuals = e.target.checked;
                                      setFormData({ ...formData, sections: updatedSections });
                                    }}
                                    style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                                  />
                                  Evaluate Individual Students
                                </label>
                                <small style={{ display: 'block', color: 'var(--dtm-muted)', fontSize: '9px', marginTop: '4px', marginLeft: '22px' }}>
                                  When enabled, advisers will answer these questions for each student individually instead of for the team as a whole.
                                </small>
                              </div>
                            )}
                          </div>

                          <div style={{
                            padding: '10px',
                            backgroundColor: 'rgba(138, 21, 31, 0.2)',
                            borderLeft: '3px solid var(--dtm-gold)',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            fontSize: '10px',
                            color: 'var(--dtm-text)'
                          }}>
                            📄 {formData.sections.length} page(s) • {formData.sections[activeSectionIndex].items?.length || 0} question(s)
                          </div>

                          {/* Section Navigation */}
                          <div style={{ marginBottom: '8px' }}>
                            <div className="section-tabs">
                              {formData.sections.map((section, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <button
                                    type="button"
                                    className={`section-tab ${activeSectionIndex === idx ? 'active' : ''}`}
                                    onClick={() => {
                                      setActiveSectionIndex(idx);
                                      setEditingQuestionIndex(null);
                                      setNewQuestion({
                                        questionText: "",
                                        questionType: formData.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
                                        minScore: 1,
                                        maxScore: formData.target === 'STUDENT' ? 10 : 5,
                                        choices: [],
                                        correctAnswer: "",
                                        pointsValue: 1,
                                        required: true,
                                      });
                                    }}
                                  >
                                    {section.sectionTitle || `Section ${idx + 1}`}
                                  </button>
                                  {formData.sections.length > 1 && activeSectionIndex === idx && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveSection(idx); }}
                                      style={{ position: 'absolute', right: '-8px', top: '-10px', width: '22px', height: '22px', borderRadius: '999px', padding: 0, minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Delete Section"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Questions List */}
                          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: 'var(--dtm-gold)' }}>
                              Questions in this page
                            </h4>

                            {formData.sections[activeSectionIndex].items && formData.sections[activeSectionIndex].items.length > 0 ? (
                              <div className="qdetail-edit-questions-list">
                                {formData.sections[activeSectionIndex].items.map((q, qIdx) => (
                                  <div key={qIdx} className="qdetail-edit-question-card">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: 'var(--dtm-text)', wordBreak: 'break-word' }}>
                                        Q{qIdx + 1}: {q.questionText}
                                      </p>
                                      <small style={{ color: 'var(--dtm-muted)', fontSize: '10px' }}>
                                        {q.questionType}
                                        {(q.questionType === 'NUMERIC_SCALE' || q.questionType === 'RATING') && ` (${q.minScore}-${q.maxScore})`}
                                        {q.required === false ? ' • Optional' : ' • Required'}
                                      </small>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => handleEditQuestion(qIdx)}
                                        style={{ padding: '4px 8px', fontSize: '10px' }}
                                        title="Edit question"
                                      >
                                        ✎
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleRemoveQuestion(qIdx)}
                                        style={{ padding: '4px 8px', fontSize: '10px' }}
                                        title="Delete question"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: '10px', color: 'var(--dtm-muted)', marginBottom: 0, fontStyle: 'italic' }}>
                                No questions yet. Add one on the right →
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* RIGHT COLUMN - CREATION FORM */}
                    <div className="questionnaire-creation-panel creation-form">
                      <h3 className="qdetail-edit-panel-heading">Questionnaire details</h3>
                      <div className="qdetail-title-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Title *</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder={formData.target === 'STUDENT' ? "e.g., Peer Performance Evaluation" : "e.g., Team Performance Evaluation"}
                            style={{ fontSize: '11px' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Questionnaire For</label>
                          <CustomSelect
                            value={formData.target}
                            onChange={(newTarget) => {
                              setFormData({ ...formData, target: newTarget });
                              if (newTarget === 'STUDENT' && !['RATING', 'TEXT'].includes(newQuestion.questionType)) {
                                setNewQuestion({ ...newQuestion, questionType: 'RATING', maxScore: 10 });
                              }
                            }}
                            options={[
                              { value: 'ADVISER', label: 'Team' },
                              { value: 'STUDENT', label: 'Peer-to-Peer' }
                            ]}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '4px', marginTop: '-6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ marginBottom: '4px' }}>Description</label>
                          <span style={{ fontSize: '9px', color: 'var(--dtm-muted)' }}>
                            {formData.description?.length || 0}/250
                          </span>
                        </div>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows="2"
                          maxLength={250}
                          placeholder="What is this questionnaire about?"
                          style={{ fontSize: '11px' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label>Deadline (Optional)</label>
                        <input
                          type="datetime-local"
                          value={formData.deadlineAt}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                          onChange={(e) => setFormData({ ...formData, deadlineAt: e.target.value })}
                          style={{ fontSize: '11px' }}
                        />
                        <small style={{ color: 'var(--dtm-muted)', fontSize: '10px' }}>
                          Leave blank for no deadline. When reached, this questionnaire closes automatically.
                        </small>
                      </div>

                      <div style={{ marginBottom: '8px', marginTop: '4px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: 'var(--dtm-gold)' }}>
                          {editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'}
                        </h3>
                        
                        <div className="add-question-box">
                          <div className="form-group">
                            <label>Question Text *</label>
                            <div className="qdetail-add-question-row">
                              <input
                                type="text"
                                value={newQuestion.questionText}
                                onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                                placeholder="Ask your question..."
                              />
                                <CustomSelect
                                  value={newQuestion.questionType}
                                  onChange={(qType) => {
                                    setNewQuestion({ 
                                      ...newQuestion, 
                                      questionType: qType,
                                      maxScore: qType === 'RATING' && formData.target === 'STUDENT' ? 10 : newQuestion.maxScore
                                    });
                                  }}
                                  options={formData.target === 'STUDENT' ? [
                                    { value: 'RATING', label: 'Rating' },
                                    { value: 'TEXT', label: 'Text Response' }
                                  ] : [
                                    { value: 'NUMERIC_SCALE', label: 'Numeric Scale' },
                                    { value: 'RATING', label: 'Rating' },
                                    { value: 'TEXT', label: 'Text Response' },
                                    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' }
                                  ]}
                                  style={{ width: '135px', flexShrink: 0 }}
                                />
                                <button
                                  type="button"
                                  onClick={handleAddQuestion}
                                  className="add-question-btn"
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(138, 21, 31, 0.9), rgba(138, 21, 31, 0.6))',
                                    border: '1px solid rgba(242, 201, 76, 0.4)',
                                    color: 'var(--dtm-gold)',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: '0',
                                    padding: '0',
                                    flexShrink: 0,
                                    position: 'relative'
                                  }}
                                  title={editingQuestionIndex !== null ? "Update Question" : "Add Question"}
                                >
                                  {editingQuestionIndex !== null ? '✓' : '+'}
                                </button>
                                {editingQuestionIndex !== null && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingQuestionIndex(null);
                                      setNewQuestion({
                                        questionText: "",
                                        questionDescription: "",
                                        questionType: formData.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
                                        minScore: 1,
                                        maxScore: formData.target === 'STUDENT' ? 10 : 5,
                                        choices: [],
                                        correctAnswer: "",
                                        pointsValue: 1,
                                        required: true,
                                      });
                                    }}
                                    className="btn btn-sm btn-secondary"
                                    style={{ flexShrink: 0, padding: '0 8px', height: '36px', fontSize: '11px', borderRadius: '4px' }}
                                    title="Cancel Edit"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={handleAddSection}
                                  className="add-page-icon-btn"
                                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '0', padding: '0' }}
                                  title="Add Section"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="2" width="16" height="8" rx="1"></rect>
                                    <rect x="3" y="14" width="16" height="8" rx="1"></rect>
                                  </svg>
                                </button>
                            </div>

                            {/* Description field for Peer-to-Peer Questionnaires */}
                            {(formData.target === 'STUDENT' || formData.sections[activeSectionIndex]?.evaluateIndividuals) && (
                              <div className="form-group" style={{ marginTop: '8px', marginBottom: '12px' }}>
                                <label style={{ fontSize: '11px', opacity: 0.8 }}>Question Description (Optional)</label>
                                <textarea
                                  className="custom-textarea"
                                  value={newQuestion.questionDescription || ""}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, questionDescription: e.target.value })}
                                  placeholder="Add more details or instructions for this question..."
                                  style={{ 
                                    fontSize: '11px', 
                                    minHeight: '60px',
                                    resize: 'vertical',
                                    marginTop: '4px',
                                    width: '100%',
                                    padding: '10px'
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {(newQuestion.questionType === 'NUMERIC_SCALE' || newQuestion.questionType === 'RATING') && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Min</label>
                                <input
                                  type="number"
                                  value={newQuestion.minScore}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value);
                                    if (isNaN(val) || val < 1) val = 1;
                                    if (val > 10) val = 10;
                                    setNewQuestion({ ...newQuestion, minScore: val });
                                  }}
                                  min="1"
                                  max="10"
                                  style={{ fontSize: '11px' }}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Max</label>
                                <input
                                  type="number"
                                  value={newQuestion.maxScore}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value);
                                    if (isNaN(val) || val < 1) val = 1;
                                    if (val > 10) val = 10;
                                    setNewQuestion({ ...newQuestion, maxScore: val });
                                  }}
                                  min="1"
                                  max="10"
                                  style={{ fontSize: '11px' }}
                                />
                              </div>
                            </div>
                          )}

                          {newQuestion.questionType === 'MULTIPLE_CHOICE' && (
                            <div className="form-group">
                              <label>Choices (min. 2)</label>
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
                                    placeholder={`Option ${index + 1}`}
                                    className="choice-input"
                                    style={{ fontSize: '11px' }}
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
                                      style={{ padding: '5px 8px', fontSize: '10px' }}
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
                                style={{ marginTop: '4px', padding: '5px 10px', fontSize: '10px' }}
                              >
                                + Add Option
                              </button>
                            </div>
                          )}

                          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label>Requirement</label>
                              <CustomSelect
                                value={newQuestion.required ? 'REQUIRED' : 'OPTIONAL'}
                                onChange={(val) => setNewQuestion({ ...newQuestion, required: val === 'REQUIRED' })}
                                options={[
                                  { value: 'REQUIRED', label: 'Required' },
                                  { value: 'OPTIONAL', label: 'Optional' }
                                ]}
                              />
                            </div>
                            {formData.target !== 'STUDENT' && (
                              <>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px' }}>
                                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                    <label style={{ marginBottom: '3px' }}>Correct Answer (Optional)</label>
                                    <input
                                      type="text"
                                      placeholder="Leave blank for non-graded"
                                      value={newQuestion.correctAnswer}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                  <div className="form-group" style={{ minWidth: '80px', margin: 0 }}>
                                    <label style={{ marginBottom: '3px' }}>Points</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={newQuestion.pointsValue}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, pointsValue: parseInt(e.target.value) || 1 })}
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                </div>
                                <small style={{ display: 'block', fontSize: '10px', color: 'var(--dtm-muted)' }}>
                                  For MULTIPLE CHOICE: choice letter or text.
                                </small>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div></div><footer className="qdetail-edit-footer">
                    <button type="submit" className="btn btn-primary" disabled={loading}>Save Changes</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  </footer>
                </form>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={showConfirmClose}
        title="Unsaved Changes"
        message="You have unsaved changes in the questionnaire. Are you sure you want to exit without saving?"
        onConfirm={() => {
          setShowConfirmClose(false);
          onClose();
        }}
        onCancel={() => setShowConfirmClose(false)}
        confirmText="Exit without saving"
        cancelText="Stay and Edit"
        isDanger={true}
      />
      {showSaveTemplateModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowSaveTemplateModal(false)}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="confirm-modal-title">Save as Custom Template</h3>
            <p className="confirm-modal-message">Enter a name for this template:</p>
            <input
              type="text"
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value)}
              placeholder="Template Name"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontSize: '14px',
                marginBottom: '20px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--dtm-gold)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmSaveTemplate();
                } else if (e.key === 'Escape') {
                  setShowSaveTemplateModal(false);
                }
              }}
              autoFocus
            />
            <div className="confirm-modal-actions">
              <button 
                className="confirm-modal-btn confirm-modal-btn-primary"
                onClick={handleConfirmSaveTemplate}
              >
                Save
              </button>
              <button 
                className="confirm-modal-btn confirm-modal-btn-secondary"
                onClick={() => setShowSaveTemplateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* AI Chat FAB and Panel */}
    <button
      className="ai-fab"
      onClick={() => setIsAiOpen((prev) => !prev)}
      aria-label="Open AI assistant"
      title="AI Assistant"
      style={{ zIndex: 1450, visibility: 'visible', pointerEvents: 'auto' }}
    >
      AI
    </button>

    {isAiOpen && (
      <div className="ai-fab-panel" role="dialog" aria-label="AI assistant chat" style={{ zIndex: 1451 }}>
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
    </>,
    document.body
  );
};

export default QuestionnaireDetailModal;
