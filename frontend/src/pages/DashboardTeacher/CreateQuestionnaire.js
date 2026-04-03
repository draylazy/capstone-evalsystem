import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/Sidebar/TeacherSidebar";
import { questionnaireAPI } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import "./Teacher.css";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

const CreateQuestionnaire = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [googleLinked, setGoogleLinked] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    questions: [],
    sections: []
  });

  const [newSection, setNewSection] = useState({
    sectionTitle: "",
    sectionDescription: "",
    items: []
  });

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionType: "NUMERIC_SCALE",
    minScore: 1,
    maxScore: 5,
    choices: [],
    correctAnswer: "",
    pointsValue: 1
  });

  const [activeSectionIndex, setActiveSectionIndex] = useState(null);
  const [usesSections, setUsesSections] = useState(false);

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

    const looseQCount = formData.questions.length;
    const sectionedQCount = formData.sections.reduce((sum, sec) => sum + sec.items.length, 0);
    
    if (looseQCount === 0 && sectionedQCount === 0) {
      toast.error('Please add at least one question');
      return;
    }

    try {
      toast.info('Creating questionnaire...');
      await questionnaireAPI.createQuestionnaire(formData);
      toast.success('Questionnaire created successfully!');
      navigate('/teacher/questionnaires');
    } catch (err) {
      toast.error('Error creating questionnaire: ' + err.message);
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

    if (usesSections && activeSectionIndex !== null) {
      const updatedSections = [...formData.sections];
      updatedSections[activeSectionIndex].items.push({ ...newQuestion });
      setFormData({ ...formData, sections: updatedSections });
    } else {
      setFormData({
        ...formData,
        questions: [...formData.questions, { ...newQuestion }]
      });
    }

    setNewQuestion({
      questionText: "",
      questionType: "NUMERIC_SCALE",
      minScore: 1,
      maxScore: 5,
      choices: [],
      correctAnswer: "",
      pointsValue: 1
    });

    toast.success('Question added!');
  };

  const handleRemoveQuestion = (index) => {
    if (usesSections && activeSectionIndex !== null) {
      const updatedSections = [...formData.sections];
      updatedSections[activeSectionIndex].items = updatedSections[activeSectionIndex].items.filter((_, i) => i !== index);
      setFormData({ ...formData, sections: updatedSections });
    } else {
      const updatedQuestions = formData.questions.filter((_, i) => i !== index);
      setFormData({ ...formData, questions: updatedQuestions });
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
    if (!usesSections && formData.questions.length > 0) {
      toast.error('Cannot enable sections mode while you have loose questions. Please remove all loose questions first.');
      return;
    }
    if (usesSections && formData.sections.length > 0) {
      toast.error('Cannot disable sections mode while you have sections. Please remove all sections first.');
      return;
    }
    setUsesSections(!usesSections);
    setActiveSectionIndex(null);
  };

  const getCurrentQuestions = () => {
    if (usesSections && activeSectionIndex !== null) {
      return formData.sections[activeSectionIndex].items;
    }
    return formData.questions;
  };

  const totalQuestions = usesSections 
    ? formData.sections.reduce((sum, sec) => sum + sec.items.length, 0)
    : formData.questions.length;

  return (
    <div className="teacher-container">
      <TeacherSidebar />
      <div className="teacher-content">
        <div style={{ marginBottom: '20px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/teacher/questionnaires')}
            style={{ marginBottom: '20px' }}
          >
            ← Back to Questionnaires
          </button>
          <h1>Create New Questionnaire</h1>
        </div>

        {!googleLinked && (
          <div className="alert-warning">
            <strong>⚠️ Google Account Not Linked</strong>
            <p>Please link your Google account in the Profile page to create questionnaires.</p>
          </div>
        )}

        <div className="section">
          <form onSubmit={handleCreateQuestionnaire}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Team Performance Evaluation"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="Describe the purpose of this questionnaire"
              />
            </div>

            {/* Organization Mode Toggle */}
            <div className="form-group" style={{ 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '5px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={usesSections}
                    onChange={handleToggleSectionsMode}
                    style={{ marginRight: '8px' }}
                  />
                  <strong>Organize questions into sections</strong>
                </label>
                <small style={{ color: '#666' }}>
                  💡 Like Google Forms - partition your questionnaire into logical sections
                </small>
              </div>
            </div>

            {/* Sections Display */}
            {usesSections && (
              <div className="form-group">
                <h3>Sections ({formData.sections.length} created)</h3>
                
                {formData.sections.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {formData.sections.map((section, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSectionIndex(idx)}
                          style={{
                            padding: '10px 15px',
                            backgroundColor: activeSectionIndex === idx ? '#3498db' : '#ecf0f1',
                            color: activeSectionIndex === idx ? '#fff' : '#333',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: activeSectionIndex === idx ? 'bold' : 'normal'
                          }}
                        >
                          {section.sectionTitle} ({section.items.length})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create New Section */}
                <div className="add-question-box" style={{ marginBottom: '20px' }}>
                  <h4>Create New Section</h4>
                  <div className="form-group">
                    <label>Section Title *</label>
                    <input
                      type="text"
                      value={newSection.sectionTitle}
                      onChange={(e) => setNewSection({ ...newSection, sectionTitle: e.target.value })}
                      placeholder="e.g., Communication Skills"
                    />
                  </div>

                  <div className="form-group">
                    <label>Section Description (Optional)</label>
                    <textarea
                      value={newSection.sectionDescription}
                      onChange={(e) => setNewSection({ ...newSection, sectionDescription: e.target.value })}
                      rows="2"
                      placeholder="Describe what this section covers"
                    />
                  </div>

                  <button 
                    type="button" 
                    onClick={handleCreateSection} 
                    className="btn btn-assign"
                    style={{ marginTop: '10px' }}
                  >
                    + Create Section
                  </button>
                </div>

                {/* Active Section Display */}
                {activeSectionIndex !== null && (
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#e8f4f8', 
                    borderLeft: '4px solid #3498db',
                    borderRadius: '5px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ marginTop: 0 }}>
                      📋 {formData.sections[activeSectionIndex].sectionTitle}
                      {formData.sections[activeSectionIndex].sectionDescription && (
                        <><br /><small>{formData.sections[activeSectionIndex].sectionDescription}</small></>
                      )}
                    </h4>
                    <p style={{ marginBottom: '15px', color: '#666' }}>
                      Questions in this section: {formData.sections[activeSectionIndex].items.length}
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRemoveSection(activeSectionIndex)}
                    >
                      Remove Section
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Questions Display */}
            <div className="form-group">
              <h3>Questions ({totalQuestions} total)</h3>
              
              {getCurrentQuestions().length > 0 && (
                <div className="questions-success-hint">
                  <small>
                    ✅ {usesSections && activeSectionIndex !== null 
                      ? `${getCurrentQuestions().length} questions in this section` 
                      : `${getCurrentQuestions().length} questions added`}
                  </small>
                </div>
              )}
              
              {getCurrentQuestions().map((q, index) => (
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
                      {q.correctAnswer && (
                        <div style={{ marginTop: '5px', color: '#27ae60' }}>
                          <small>✓ Correct Answer: <strong>{q.correctAnswer}</strong> | Points: <strong>{q.pointsValue || 1}</strong></small>
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

              {/* Add Question Form */}
              {(!usesSections || activeSectionIndex !== null) && (
                <div className="add-question-box">
                <h4>Add New Question</h4>
                <div className="form-group">
                  <label>Question Text *</label>
                  <input
                    type="text"
                    value={newQuestion.questionText}
                    onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                    placeholder="What would you like to ask?"
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

                <div className="form-group" style={{ marginTop: '12px', borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                  <h4 style={{ marginBottom: '10px' }}>Quiz Settings (Optional)</h4>
                  <label>Correct Answer</label>
                  <input
                    type="text"
                    placeholder="Enter correct answer (or leave blank for non-graded questions)"
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                  />
                  <small style={{ display: 'block', marginTop: '5px', color: '#7f8c8d' }}>
                    For SHORT ANSWER: exact answer text. For MULTIPLE CHOICE: choice letter or text. For NUMERIC: the number.
                  </small>
                </div>

                <div className="form-group">
                  <label>Points for Correct Answer</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuestion.pointsValue}
                    onChange={(e) => setNewQuestion({ ...newQuestion, pointsValue: parseInt(e.target.value) || 1 })}
                  />
                  <small style={{ display: 'block', marginTop: '5px', color: '#7f8c8d' }}>
                    Points awarded when answer is correct (default: 1)
                  </small>
                </div>

                <button type="button" onClick={handleAddQuestion} className="btn" style={{ marginTop: '12px' }}>
                  + Add Question
                </button>
              </div>
              )}

              {usesSections && activeSectionIndex === null && (
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '5px',
                  marginTop: '15px'
                }}>
                  <small>👆 <strong>Create a section above and select it to add questions</strong></small>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={!googleLinked || totalQuestions === 0}>
                Create Questionnaire
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/teacher/questionnaires')} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateQuestionnaire;
