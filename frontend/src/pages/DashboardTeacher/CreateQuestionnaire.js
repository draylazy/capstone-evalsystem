import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { questionnaireAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import "./Teacher.css";
import "./QuestionnaireTwoColumn.css";
import CustomSelect from "../../components/CustomSelect/CustomSelect";

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

const CreateQuestionnaire = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [googleLinked, setGoogleLinked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || null;
    } catch {
      return null;
    }
  }, []);

  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your AI Assistant. I can help you design your questionnaire, suggest questions, refine wording, or set up multiple-choice options. Ask me to draft questions or give advice on questionnaire creation!" },
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
      const qCount = formData.sections.reduce((sum, sec) => sum + sec.items.length, 0);
      const sectionsInfo = formData.sections.map((sec, sIdx) => {
        const itemsInfo = sec.items.map((item, qIdx) => `- Q${qIdx + 1}: ${item.questionText} (${item.questionType}, required=${item.required !== false})`).join('\n');
        return `Section ${sIdx + 1}: "${sec.sectionTitle}" (${sec.items.length} questions)\n${itemsInfo}`;
      }).join('\n\n');

      return [
        `User is currently creating/editing a questionnaire draft.`,
        `Current Draft Title: ${formData.title || '(No title yet)'}`,
        `Current Draft Target: ${formData.target} (${formData.target === 'STUDENT' ? 'Peer-to-Peer' : 'Team Evaluation'})`,
        `Current Draft Description: ${formData.description || '(No description yet)'}`,
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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadlineAt: "",
    questions: [],
    sections: [
      {
        sectionTitle: "Section 1",
        sectionDescription: "",
        orderIndex: 0,
        evaluateIndividuals: false,
        items: []
      }
    ],
    target: "ADVISER"
  });

  const [newSection, setNewSection] = useState({
    sectionTitle: "",
    sectionDescription: "",
    evaluateIndividuals: false,
    items: []
  });

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionDescription: "",
    questionType: "NUMERIC_SCALE",
    minScore: 1,
    maxScore: 5,
    choices: [],
    required: true
  });

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [usesSections, setUsesSections] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState("none");
  const [customTemplates, setCustomTemplates] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('custom_templates');
    if (stored) {
      setCustomTemplates(JSON.parse(stored));
    }
  }, []);

  const handleDeleteTemplate = async (key) => {
    const custom = customTemplates.find(t => t.key === key);
    if (!custom) return;
    const ok = await confirm({
      title: "Delete Custom Template?",
      message: `Are you sure you want to delete the template "${custom.label}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      isDanger: true,
    });
    if (ok) {
      const updated = customTemplates.filter(t => t.key !== key);
      setCustomTemplates(updated);
      localStorage.setItem('custom_templates', JSON.stringify(updated));
      if (selectedTemplate === key) {
        setSelectedTemplate("none");
      }
      toast.success("Template deleted successfully!");
    }
  };

  const handleApplyTemplate = async (templateKey) => {
    if (templateKey === 'none') {
      setSelectedTemplate("none");
      return;
    }

    const totalQCount = formData.sections.reduce((sum, sec) => sum + sec.items.length, 0);
    if (totalQCount > 0 || formData.title.trim() || formData.description.trim()) {
      const ok = await confirm({
        title: "Apply Template?",
        message: "Applying a template will overwrite your current title, description, and all questions. Do you want to proceed?",
        confirmText: "Yes, Apply",
        cancelText: "Cancel",
        isDanger: false,
      });
      if (!ok) return;
    }

    setSelectedTemplate(templateKey);

    if (templateKey === 'student_standard') {
      setFormData({
        ...formData,
        title: "Peer Performance Evaluation",
        description: "Standard peer-to-peer evaluation questionnaire assessing contribution, teamwork, and reliability.",
        target: "STUDENT",
        sections: [
          {
            sectionTitle: "Technical Contributions",
            sectionDescription: "Assess this member's technical contributions, code quality, and workload distribution.",
            orderIndex: 0,
            evaluateIndividuals: false,
            items: [
              {
                questionText: "Quality of Work",
                questionDescription: "Rate the quality, completeness, and accuracy of this member's deliverables.",
                questionType: "RATING",
                minScore: 1,
                maxScore: 10,
                choices: [],
                required: true
              },
              {
                questionText: "Quantity of Work",
                questionDescription: "Rate the volume of work this member completed relative to expectations.",
                questionType: "RATING",
                minScore: 1,
                maxScore: 10,
                choices: [],
                required: true
              }
            ]
          },
          {
            sectionTitle: "Cooperation & Reliability",
            sectionDescription: "Assess this member's communication, meeting attendance, and timeliness.",
            orderIndex: 1,
            evaluateIndividuals: false,
            items: [
              {
                questionText: "Communication & Collaboration",
                questionDescription: "Rate how effectively this member shared information, responded to updates, and collaborated with peers.",
                questionType: "RATING",
                minScore: 1,
                maxScore: 10,
                choices: [],
                required: true
              },
              {
                questionText: "Reliability & Attendance",
                questionDescription: "Rate their promptness in attending scheduled meetings and finishing tasks on time.",
                questionType: "RATING",
                minScore: 1,
                maxScore: 10,
                choices: [],
                required: true
              }
            ]
          },
          {
            sectionTitle: "Qualitative Feedback",
            sectionDescription: "Provide descriptive feedback for this member's development.",
            orderIndex: 2,
            evaluateIndividuals: false,
            items: [
              {
                questionText: "Primary Strengths",
                questionDescription: "What did this member do particularly well during this project cycle?",
                questionType: "TEXT",
                choices: [],
                required: false
              },
              {
                questionText: "Areas for Improvement",
                questionDescription: "What can this member improve to work more effectively in the next cycle?",
                questionType: "TEXT",
                choices: [],
                required: false
              }
            ]
          }
        ]
      });
      setActiveSectionIndex(0);
      setNewQuestion({
        questionText: "",
        questionDescription: "",
        questionType: "RATING",
        minScore: 1,
        maxScore: 10,
        choices: [],
        required: true
      });
      toast.success("Standard Peer-to-Peer Template loaded!");
    } else if (templateKey === 'adviser_standard') {
      setFormData({
        ...formData,
        title: "Team Performance Evaluation",
        description: "Standard adviser evaluation questionnaire assessing team progress, documentation, presentation, and collaboration.",
        target: "ADVISER",
        sections: [
          {
            sectionTitle: "Project Execution",
            sectionDescription: "Evaluate the team's technical implementation, project progress, and goals achievement.",
            orderIndex: 0,
            evaluateIndividuals: false,
            items: [
              {
                questionText: "Project Progress",
                questionDescription: "Rate the completion of project milestones relative to the planned schedule.",
                questionType: "NUMERIC_SCALE",
                minScore: 1,
                maxScore: 5,
                choices: [],
                required: true
              },
              {
                questionText: "Technical Quality & Integrity",
                questionDescription: "Rate the architecture, code quality, and robustness of the system components.",
                questionType: "NUMERIC_SCALE",
                minScore: 1,
                maxScore: 5,
                choices: [],
                required: true
              }
            ]
          },
          {
            sectionTitle: "Communication & Documentation",
            sectionDescription: "Evaluate the team's presentation quality and technical documentation.",
            orderIndex: 1,
            evaluateIndividuals: false,
            items: [
              {
                questionText: "Presentation Quality",
                questionDescription: "Rate the presentation style, clarity of explanation, and responsiveness to Q&A.",
                questionType: "NUMERIC_SCALE",
                minScore: 1,
                maxScore: 5,
                choices: [],
                required: true
              },
              {
                questionText: "Documentation & Reports",
                questionDescription: "Rate the completeness, correctness, and presentation of written reports.",
                questionType: "NUMERIC_SCALE",
                minScore: 1,
                maxScore: 5,
                choices: [],
                required: true
              }
            ]
          },
          {
            sectionTitle: "Adviser Remarks",
            sectionDescription: "Provide qualitative feedback and recommendations for the team.",
            orderIndex: 2,
            evaluateIndividuals: false,
            items: [
              {
                questionText: "General Feedback & Action Points",
                questionDescription: "Write down critical feedback, highlights, or required corrections for the milestone.",
                questionType: "TEXT",
                choices: [],
                required: false
              }
            ]
          }
        ]
      });
      setActiveSectionIndex(0);
      setNewQuestion({
        questionText: "",
        questionDescription: "",
        questionType: "NUMERIC_SCALE",
        minScore: 1,
        maxScore: 5,
        choices: [],
        required: true
      });
      toast.success("Standard Team Evaluation Template loaded!");
    } else {
      const custom = customTemplates.find(t => t.key === templateKey);
      if (custom) {
        setFormData({
          ...formData,
          title: custom.data.title || "",
          description: custom.data.description || "",
          target: custom.data.target || "ADVISER",
          sections: (custom.data.sections || []).map((sec, sIdx) => ({
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
        });
        setActiveSectionIndex(0);
        setNewQuestion({
          questionText: "",
          questionDescription: "",
          questionType: custom.data.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
          minScore: 1,
          maxScore: custom.data.target === 'STUDENT' ? 10 : 5,
          choices: [],
          required: true
        });
        toast.success(`Template "${custom.label}" loaded!`);
      }
    }
  };

  useEffect(() => {
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

  const handleCreateQuestionnaire = async (e) => {
    e.preventDefault();

    if (!googleLinked) {
      const linkedNow = await checkGoogleLink();
      if (!linkedNow) {
        toast.error('Please link your Google account in the Profile page first.');
        return;
      }
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a questionnaire title');
      return;
    }

    const sectionedQCount = formData.sections.reduce((sum, sec) => sum + sec.items.length, 0);

    if (sectionedQCount === 0) {
      toast.error('Please add at least one question');
      return;
    }

    if (formData.deadlineAt) {
      const deadline = new Date(formData.deadlineAt);
      if (Number.isNaN(deadline.getTime())) {
        toast.error('Please provide a valid deadline');
        return;
      }
      if (deadline <= new Date()) {
        toast.error('Deadline must be in the future');
        return;
      }
    }

    setSubmitting(true);

    try {
      toast.info('Creating questionnaire...');
      const payload = {
        ...formData,
        deadlineAt: formData.deadlineAt || null,
      };
      await questionnaireAPI.createQuestionnaire(payload);
      toast.success('Questionnaire created successfully!');
      navigate('/teacher/questionnaires');
    } catch (err) {
      toast.error('Error creating questionnaire: ' + err.message);
      setSubmitting(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.questionText.trim()) {
      toast.error('Please enter a question text');
      return;
    }

    if (newQuestion.questionType === 'MULTIPLE_CHOICE') {
      if (!newQuestion.choices || newQuestion.choices.length < 2) {
        toast.error('Multiple choice questions must have at least 2 choices');
        return;
      }
    }

    if (activeSectionIndex !== null) {
      const updatedSections = [...formData.sections];
      
      if (editingQuestionIndex !== null) {
        updatedSections[activeSectionIndex].items[editingQuestionIndex] = { ...newQuestion };
        setEditingQuestionIndex(null);
      } else {
        updatedSections[activeSectionIndex].items.push({ ...newQuestion });
      }
      
      setFormData({ ...formData, sections: updatedSections });
    }

    setNewQuestion({
      questionText: "",
      questionDescription: "",
      questionType: formData.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
      minScore: 1,
      maxScore: formData.target === 'STUDENT' ? 10 : 5,
      choices: [],
      required: true
    });

    toast.success(editingQuestionIndex !== null ? 'Question updated!' : 'Question added!');
  };

  const handleEditQuestion = (index) => {
    if (activeSectionIndex !== null) {
      const q = formData.sections[activeSectionIndex].items[index];
      setNewQuestion({ ...q });
      setEditingQuestionIndex(index);
    }
  };

  const handleRemoveQuestion = (index) => {
    if (activeSectionIndex !== null) {
      const updatedSections = [...formData.sections];
      updatedSections[activeSectionIndex].items = updatedSections[activeSectionIndex].items.filter((_, i) => i !== index);
      setFormData({ ...formData, sections: updatedSections });
    }
    toast.success('Question removed');
  };

  const handleCreateSection = () => {
    if (!newSection.sectionTitle.trim()) {
      toast.error('Please enter a section title');
      return;
    }

    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          sectionTitle: newSection.sectionTitle,
          sectionDescription: newSection.sectionDescription,
          orderIndex: formData.sections.length,
          items: []
        }
      ]
    });

    setNewSection({
      sectionTitle: "",
      sectionDescription: "",
      items: []
    });

    toast.success('Section created!');
    setActiveSectionIndex(formData.sections.length);
  };

  const handleRemoveSection = (index) => {
    const updatedSections = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: updatedSections });
    if (activeSectionIndex === index) {
      setActiveSectionIndex(null);
    }
    toast.success('Section removed');
  };

  const handleToggleSectionsMode = () => {
    // Create a new section with an incremented title
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
    // Set the newly created section as active
    setActiveSectionIndex(formData.sections.length);
  };

  const getCurrentQuestions = () => {
    if (activeSectionIndex !== null && formData.sections[activeSectionIndex]) {
      return formData.sections[activeSectionIndex].items;
    }
    return [];
  };

  const totalQuestions = formData.sections.reduce((sum, sec) => sum + sec.items.length, 0);

  const hasUnsavedWork = () =>
    !submitting && (totalQuestions > 0 || formData.title.trim() || formData.description.trim());

  const beforeNavigate = async () => {
    if (!hasUnsavedWork()) return true;
    return confirm({
      title: "Leave Page?",
      message: "You have unsaved questions. If you leave now, all your work will be lost.",
      confirmText: "Yes, Leave",
      cancelText: "Stay",
      isDanger: true,
    });
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (submitting) return;
      if (totalQuestions > 0 || formData.title.trim() || formData.description.trim()) {
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [formData, totalQuestions, submitting]);

  useEffect(() => {
    const handlePopState = async () => {
      if (!hasUnsavedWork()) return;
      const ok = await confirm({
        title: "Leave Page?",
        message: "You have unsaved questions. If you leave now, all your work will be lost.",
        confirmText: "Yes, Leave",
        cancelText: "Stay",
        isDanger: true,
      });
      if (!ok) {
        window.history.pushState(null, "", window.location.pathname);
      }
    };
    window.history.pushState(null, "", window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, totalQuestions, submitting]);

  return (
    <div className="teacher-container">
      <TeacherSidebar beforeNavigate={beforeNavigate} />
      <div className="teacher-content create-questionnaire-page">
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: '0' }}>Create New Questionnaire</h1>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              const ok = await beforeNavigate();
              if (ok) navigate('/teacher/questionnaires');
            }}
          >
            ← Back to Questionnaires
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--dtm-muted)', fontWeight: '500', flexShrink: 0 }}>Quick Template:</span>
          {[
            { key: 'student_standard', label: 'Peer-to-Peer', isCustom: false },
            { key: 'adviser_standard', label: 'Team Eval', isCustom: false },
            ...customTemplates.map(t => ({ key: t.key, label: t.label, isCustom: true }))
          ].map(({ key, label, isCustom }) => (
            <div key={key} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleApplyTemplate(key)}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: selectedTemplate === key ? '1px solid var(--dtm-gold)' : '1px solid rgba(255,255,255,0.12)',
                  background: selectedTemplate === key ? 'linear-gradient(135deg, rgba(242,201,76,0.2), rgba(242,201,76,0.08))' : 'rgba(255,255,255,0.05)',
                  color: selectedTemplate === key ? 'var(--dtm-gold)' : 'rgba(255,255,255,0.55)',
                  boxShadow: selectedTemplate === key ? '0 0 10px rgba(242,201,76,0.15)' : 'none',
                  paddingRight: isCustom ? '24px' : '12px'
                }}
              >
                {label}
              </button>
              {isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(key);
                  }}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    borderRadius: '50%'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#ff4d4f'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.4)'}
                  title="Delete Template"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        {!googleLinked && (
          <div className="alert-warning">
            <strong>⚠️ Google Account Not Linked</strong>
            <p>Please link your Google account in the Profile page to create questionnaires.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '20px' }}>
          {/* LEFT COLUMN - SECTION EDITOR & QUESTIONS */}
          <div className="questionnaire-preview-panel">
            {activeSectionIndex !== null && formData.sections[activeSectionIndex] && (
              <>
                <div className="section-editor">
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dtm-gold)', margin: 0 }}>Section Title</label>
                    <input
                      type="text"
                      value={formData.sections[activeSectionIndex].sectionTitle}
                      onChange={(e) => {
                        const updatedSections = [...formData.sections];
                        updatedSections[activeSectionIndex].sectionTitle = e.target.value;
                        setFormData({ ...formData, sections: updatedSections });
                      }}
                      placeholder="e.g., Communication Skills"
                      style={{ padding: '8px 10px', fontSize: '11px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dtm-gold)', margin: 0 }}>Description</label>
                    <textarea
                      value={formData.sections[activeSectionIndex].sectionDescription}
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
                            // If enabling individual eval and current question type is not compatible, reset to RATING
                            if (e.target.checked && !['RATING', 'TEXT'].includes(newQuestion.questionType)) {
                              setNewQuestion({ ...newQuestion, questionType: 'RATING', maxScore: 10 });
                            }
                          }}
                          style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        Evaluate Individual Students
                      </label>
                      <small style={{ display: 'block', color: 'var(--dtm-muted)', fontSize: '9px', marginTop: '4px', marginLeft: '22px' }}>
                        When enabled, advisers will answer these questions for each student individually instead of for the team as a whole. Questions follow the peer-to-peer format (Rating and Text only).
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
                  📄 {formData.sections.length} page(s) • {formData.sections[activeSectionIndex].items.length} question(s)
                </div>

                {/* Section Navigation */}
                {formData.sections.length > 1 && (
                  <div className="section-tabs" style={{ marginBottom: '8px' }}>
                    {formData.sections.map((section, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`section-tab ${activeSectionIndex === idx ? 'active' : ''}`}
                        onClick={() => {
                          setActiveSectionIndex(idx);
                          setEditingQuestionIndex(null);
                          // If switching to a section with individual eval and current question type is not compatible, reset to RATING
                          if (section.evaluateIndividuals && !['RATING', 'TEXT'].includes(newQuestion.questionType)) {
                            setNewQuestion({ ...newQuestion, questionType: 'RATING', maxScore: 10 });
                          } else {
                            setNewQuestion({
                              questionText: "",
                              questionType: formData.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
                              minScore: 1,
                              maxScore: formData.target === 'STUDENT' ? 10 : 5,
                              choices: []
                            });
                          }
                        }}
                      >
                        {section.sectionTitle}
                      </button>
                    ))}
                  </div>
                )}

                {/* Questions List */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: 'var(--dtm-gold)' }}>
                    Questions in this page
                  </h4>

                  {formData.sections[activeSectionIndex].items && formData.sections[activeSectionIndex].items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                      {formData.sections[activeSectionIndex].items.map((q, index) => (
                        <div key={index} style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderLeft: '3px solid var(--dtm-gold)',
                          borderRadius: '4px',
                          padding: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: 'var(--dtm-text)', wordBreak: 'break-word' }}>
                              Q{index + 1}: {q.questionText}
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
                                onClick={() => handleEditQuestion(index)}
                                style={{ padding: '4px 8px', fontSize: '10px' }}
                                title="Edit question"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleRemoveQuestion(index)}
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
          <div className="questionnaire-creation-panel">
            <form onSubmit={handleCreateQuestionnaire} className="creation-form">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '0px', position: 'relative', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 2, minWidth: '250px' }}>
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      setSelectedTemplate("none");
                    }}
                    required
                    placeholder={formData.target === 'STUDENT' ? "e.g., Peer Performance Evaluation" : "e.g., Team Performance Evaluation"}
                    style={{ fontSize: '11px' }}
                  />
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                  <label>Questionnaire For</label>
                  <CustomSelect
                    value={formData.target}
                    onChange={(newTarget) => {
                      setFormData({ ...formData, target: newTarget });
                      setSelectedTemplate("none");
                      if (newTarget === 'STUDENT' && !['RATING', 'TEXT'].includes(newQuestion.questionType)) {
                        setNewQuestion({ ...newQuestion, questionType: 'RATING', maxScore: 10 });
                      } else if (newTarget === 'ADVISER' && !['NUMERIC_SCALE', 'RATING', 'TEXT', 'MULTIPLE_CHOICE'].includes(newQuestion.questionType)) {
                        setNewQuestion({ ...newQuestion, questionType: 'NUMERIC_SCALE', minScore: 1, maxScore: 5 });
                      }
                    }}
                    options={[
                      { value: 'ADVISER', label: 'Team' },
                      { value: 'STUDENT', label: 'Peer-to-Peer' }
                    ]}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!googleLinked || totalQuestions === 0 || submitting}
                  style={{ padding: '8px 12px', fontSize: '11px', marginTop: '24px', height: '36px' }}
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
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
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setSelectedTemplate("none");
                  }}
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

              {/* Questions Display */}
              <div style={{ marginBottom: '8px', marginTop: '4px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: 'var(--dtm-gold)' }}>
                  {editingQuestionIndex !== null ? 'Edit Question' : 'Add Question'}
                </h3>

                {/* Add Question Form */}
                {activeSectionIndex !== null && (
                  <div className="add-question-box">
                    <div className="form-group">
                      <label>Question Text *</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '250px', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            value={newQuestion.questionText}
                            onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                            placeholder="Ask your question..."
                            style={{ fontSize: '11px', flex: 1, minWidth: '200px' }}
                          />

                            <CustomSelect
                              value={newQuestion.questionType}
                              onChange={(qType) => {
                                const isIndividualSection = formData.sections[activeSectionIndex]?.evaluateIndividuals;
                                setNewQuestion({ 
                                  ...newQuestion, 
                                  questionType: qType,
                                  maxScore: (qType === 'RATING' && (formData.target === 'STUDENT' || isIndividualSection)) ? 10 : newQuestion.maxScore
                                });
                              }}
                              options={(formData.target === 'STUDENT' || formData.sections[activeSectionIndex]?.evaluateIndividuals) ? [
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

                            <CustomSelect
                              value={newQuestion.required !== false ? 'required' : 'optional'}
                              onChange={(val) => {
                                setNewQuestion({
                                  ...newQuestion,
                                  required: val === 'required'
                                });
                              }}
                              options={[
                                { value: 'required', label: 'Required' },
                                { value: 'optional', label: 'Optional' }
                              ]}
                              style={{ width: '110px', flexShrink: 0 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                  questionType: formData.target === 'STUDENT' ? "RATING" : "NUMERIC_SCALE",
                                  minScore: 1,
                                  maxScore: formData.target === 'STUDENT' ? 10 : 5,
                                  choices: [],
                                  required: true
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
                            onClick={handleToggleSectionsMode}
                            className="add-page-icon-btn"
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '0', padding: '0' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="2" width="16" height="8" rx="1"></rect>
                              <rect x="3" y="14" width="16" height="8" rx="1"></rect>
                            </svg>
                          </button>
                        </div>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group">
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
                        <div className="form-group">
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


                  </div>
                )}

              </div>


            </form>
          </div>
        </div>

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

export default CreateQuestionnaire;
