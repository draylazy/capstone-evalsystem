import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { generateDecimalRatingRange, generateNumericRange } from "../../utils/ratingUtils";
import RatingGrid from "../../components/Evaluation/RatingGrid";
import "../DashboardTeacher/Teacher.css";
import "./StudentResponsive.css";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import ExitConfirmModal from "../../components/ConfirmModal/ExitConfirmModal";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const isAnswerFilled = (value) => value !== undefined && value !== null && value !== "";

const StudentEvaluateForm = () => {
  const { questionnaireId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [questionnaire, setQuestionnaire] = useState(null);
  const [members, setMembers] = useState([]);
  const [answers, setAnswers] = useState({}); // { evaluationId: { itemId: value } }
  const [status, setStatus] = useState("IN_PROGRESS");
  const isSubmitted = status === 'SUBMITTED';
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    const fetchGroupForm = async () => {
      try {
        const token = currentUser?.token;
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/student/evaluations/group/${questionnaireId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load evaluation form");
        const data = await res.json();
        
        if (data.status === 'SUBMITTED') {
          toast.info("Evaluation already submitted.");
          navigate('/student/dashboard');
          return;
        }

        setQuestionnaire(data.questionnaire);
        setMembers(data.members);
        setAnswers(data.answers || {});
        setStatus(data.status);
      } catch (err) {
        toast.error(err.message);
        navigate('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchGroupForm();
  }, [questionnaireId, currentUser]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitted]);

  // Group items by sections for sequential navigation
  const pages = useMemo(() => {
    if (!questionnaire) return [];
    
    const pgs = [];
    
    // Top-level items (General)
    const topItems = (questionnaire.items || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    if (topItems.length > 0) {
      pgs.push({
        id: 'general',
        title: 'General',
        description: questionnaire.description || 'General questions for the evaluation.',
        items: topItems
      });
    }

    // Sections
    if (questionnaire.sections) {
      const sortedSections = [...questionnaire.sections].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      sortedSections.forEach(section => {
        if (section.items && section.items.length > 0) {
          const secItems = [...section.items].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          pgs.push({
            id: section.id || section.sectionTitle,
            title: section.sectionTitle,
            description: section.sectionDescription || "Please rate each team member based on this criteria.",
            items: secItems
          });
        }
      });
    }

    return pgs;
  }, [questionnaire]);

  const currentPage = pages[currentPageIndex];

  const { sectionProgress, overallPercent, overallAnswered, overallTotal } = useMemo(() => {
    if (!pages.length || !members.length) {
      return { sectionProgress: [], overallPercent: 0, overallAnswered: 0, overallTotal: 0 };
    }

    const sectionProgress = pages.map((page) => {
      let total = 0;
      let filled = 0;
      for (const item of page.items) {
        for (const member of members) {
          if (item.required === false) continue;
          total += 1;
          const val = answers[member.evaluationId]?.[item.id];
          if (isAnswerFilled(val)) filled += 1;
        }
      }
      const percent = total === 0 ? 100 : Math.round((filled / total) * 100);
      return { total, filled, percent };
    });

    const overallTotal = sectionProgress.reduce((sum, s) => sum + s.total, 0);
    const overallAnswered = sectionProgress.reduce((sum, s) => sum + s.filled, 0);
    const overallPercent =
      overallTotal === 0 ? 0 : Math.round((overallAnswered / overallTotal) * 100);

    return { sectionProgress, overallPercent, overallAnswered, overallTotal };
  }, [pages, members, answers]);

  const handleScoreChange = (evaluationId, itemId, val) => {
    if (isSubmitted) return;
    setIsDirty(true);
    setAnswers(prev => ({
      ...prev,
      [evaluationId]: {
        ...(prev[evaluationId] || {}),
        [itemId]: val
      }
    }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const token = currentUser?.token;
      const res = await fetch(`${API_BASE_URL}/api/student/evaluations/group/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });
      if (!res.ok) throw new Error("Failed to save draft");
      toast.success("Draft saved successfully!");
      setIsDirty(false);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    let isComplete = true;
    for (const page of pages) {
      for (const item of page.items) {
        for (const member of members) {
          const val = answers[member.evaluationId]?.[item.id];
          if (item.required !== false && (val === undefined || val === null || val === "")) {
            isComplete = false;
            break;
          }
        }
        if (!isComplete) break;
      }
      if (!isComplete) break;
    }

    if (!isComplete) {
      toast.error("Please answer all questions for all team members before submitting.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const token = currentUser?.token;
      
      // Save first
      await fetch(`${API_BASE_URL}/api/student/evaluations/group/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ answers })
      });

      // Submit all
      const evaluationIds = members.map(m => m.evaluationId);
      const res = await fetch(`${API_BASE_URL}/api/student/evaluations/group/submit`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ evaluationIds })
      });
      
      if (!res.ok) throw new Error("Failed to submit");
      toast.success("All evaluations submitted successfully!");
      setIsDirty(false);
      navigate('/student/dashboard');
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  const handleExitClick = () => {
    setPendingPath('/student/dashboard');
    if (isDirty && !isSubmitted) {
      setShowExitModal(true);
    } else {
      navigate('/student/dashboard');
    }
  };

  const handleExitWithSave = async () => {
    const success = await handleSaveDraft();
    if (success) {
      setShowExitModal(false);
      navigate(pendingPath || '/student/dashboard');
    }
  };

  const handleExitWithoutSave = () => {
    setShowExitModal(false);
    navigate(pendingPath || '/student/dashboard');
  };

  if (loading) return <div className="teacher-container student-eval-page"><div className="teacher-content eval-content-wrapper eval-loading">Loading evaluation form...</div></div>;
  if (!questionnaire || pages.length === 0) return <div className="teacher-container student-eval-page"><div className="teacher-content eval-content-wrapper eval-loading">No questions found.</div></div>;

  return (
    <div className="teacher-container student-eval-page">
      <div className="teacher-content eval-content-wrapper">
        {/* Header */}
        <header className="eval-header">
          <div className="eval-header-text">
            <p className="eval-header-eyebrow">Team evaluation</p>
            <h1 className="eval-title">{questionnaire.title}</h1>
            <p className="eval-subtitle">Rate each teammate for this section</p>
          </div>
          <button type="button" className="btn-secondary eval-exit-btn" onClick={handleExitClick}>
            Exit
          </button>
        </header>

        {/* Main Content Pane */}
        <div className="eval-main-pane">
          
          {/* Left Pane - Section Card */}
          <aside className="eval-left-pane">
            <div className="eval-section-card">
              <span className="eval-section-label">Current section</span>
              <h2 className="eval-section-title">{currentPage.title}</h2>
              <p className="eval-section-desc">{currentPage.description}</p>
            </div>

            <div className="eval-progress">
              <div className="eval-progress-header">
                <span className="eval-progress-label">Progress</span>
                <span className="eval-progress-count">
                  {pages.length > 1
                    ? `Section ${currentPageIndex + 1} of ${pages.length}`
                    : "Completion"}
                  {" · "}
                  {overallPercent}%
                </span>
              </div>
              <div
                className={`eval-progress-track${pages.length > 1 ? " eval-progress-track--segmented" : ""}`}
                role="progressbar"
                aria-valuenow={overallPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Evaluation ${overallPercent}% complete`}
              >
                {pages.length > 1 ? (
                  pages.map((page, idx) => {
                    const { percent } = sectionProgress[idx] || { percent: 0 };
                    const isCurrent = idx === currentPageIndex;
                    const isComplete = percent >= 100;
                    return (
                      <div
                        key={page.id}
                        className={`eval-progress-segment${isCurrent ? " is-current" : ""}${isComplete ? " is-complete" : ""}`}
                        title={`${page.title}: ${percent}%`}
                      >
                        <div className="eval-progress-segment-fill"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="eval-progress-segment eval-progress-segment--single">
                    <div
                      className="eval-progress-segment-fill"
                      style={{ width: `${overallPercent}%` }}
                    />
                  </div>
                )}
              </div>
              <p className="eval-progress-meta">
                {overallAnswered} of {overallTotal} required responses
                {pages.length > 1 ? ` · ${currentPage?.title || ""}` : ""}
              </p>
            </div>
          </aside>

          {/* Right Pane - Members Rating */}
          <div className="eval-right-pane">
            <div className="eval-questions-stack">
              {currentPage.items.map((item, itemIndex) => {
                const isRating = item.questionType === "RATING";
                const isScale =
                  item.questionType !== "TEXT" && item.questionType !== "MULTIPLE_CHOICE";
                let finalRange = [];
                if (isRating) {
                  finalRange = generateDecimalRatingRange(item.minScore, item.maxScore);
                } else if (isScale) {
                  finalRange = generateNumericRange(item.minScore, item.maxScore);
                }

                return (
                  <article key={item.id} className="eval-question-card">
                    <h3 className="eval-question-title">
                      {itemIndex + 1}. {item.questionText}
                    </h3>
                    {item.questionDescription && (
                      <p className="eval-question-desc">{item.questionDescription}</p>
                    )}

                    {item.questionType === "TEXT" ? (
                      <div className="eval-text-responses">
                        {members.map((member) => (
                          <div key={member.id} className="eval-text-member-block">
                            <label className="eval-text-member-label" htmlFor={`text-${item.id}-${member.id}`}>
                              {member.name}
                              {member.isMe && <span className="rating-grid-self-badge">You</span>}
                            </label>
                            <textarea
                              id={`text-${item.id}-${member.id}`}
                              className="custom-textarea"
                              placeholder={`Enter response for ${member.name}...`}
                              value={answers[member.evaluationId]?.[item.id] || ""}
                              onChange={(e) => handleScoreChange(member.evaluationId, item.id, e.target.value)}
                              disabled={isSubmitted}
                            />
                          </div>
                        ))}
                      </div>
                    ) : item.questionType === "MULTIPLE_CHOICE" ? (
                      <div className="eval-choice-responses">
                        {members.map((member) => (
                          <div key={member.id} className="eval-choice-member-block">
                            <div className="eval-choice-member-label">
                              {member.name}
                              {member.isMe && <span className="rating-grid-self-badge">You</span>}
                            </div>
                            <div className="eval-choice-options">
                              {(item.choices || []).map((choice, idx) => {
                                const isSelected =
                                  String(answers[member.evaluationId]?.[item.id]) === String(choice);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    className={`eval-choice-btn${isSelected ? " is-selected" : ""}`}
                                    onClick={() => handleScoreChange(member.evaluationId, item.id, choice)}
                                    disabled={isSubmitted}
                                  >
                                    {choice}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RatingGrid
                        members={members}
                        item={item}
                        scoreRange={finalRange}
                        answers={answers}
                        onScoreChange={handleScoreChange}
                        isSubmitted={isSubmitted}
                        isRating={isRating}
                      />
                    )}
                  </article>
                );
              })}

            </div>
          </div>
        </div>

        <footer className="eval-footer">
          <div className="eval-footer-start">
            {!isSubmitted && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSaveDraft}
                disabled={saving || submitting}
              >
                {saving ? "Saving..." : "Save draft"}
              </button>
            )}
          </div>

          <div className="eval-footer-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPageIndex === 0}
            >
              Previous
            </button>
            {currentPageIndex < pages.length - 1 ? (
              <button
                type="button"
                className="btn eval-footer-primary"
                onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              >
                Next
              </button>
            ) : (
              !isSubmitted ? (
                <button
                  type="button"
                  className="btn eval-footer-primary"
                  onClick={handleSubmit}
                  disabled={saving || submitting}
                >
                  {submitting ? "Submitting..." : "Submit all"}
                </button>
              ) : (
                <button type="button" className="btn" onClick={() => navigate("/student/dashboard")}>
                  Done
                </button>
              )
            )}
          </div>
        </footer>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirm Submission"
        message="Are you sure you want to submit all evaluations? You cannot edit them after submission."
        confirmText="Submit Evaluations"
        cancelText="Cancel"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />

      <ExitConfirmModal
        isOpen={showExitModal}
        onSave={handleExitWithSave}
        onDiscard={handleExitWithoutSave}
        onCancel={() => setShowExitModal(false)}
      />
    </div>
  );
};

export default StudentEvaluateForm;
