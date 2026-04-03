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
    questions: []
  });

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionType: "NUMERIC_SCALE",
    minScore: 1,
    maxScore: 5,
    choices: [],
    orderIndex: 0,
    correctAnswer: "",
    pointsValue: 1
  });

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

    // Validate multiple choice questions have at least 2 choices
    if (newQuestion.questionType === 'MULTIPLE_CHOICE') {
      if (!newQuestion.choices || newQuestion.choices.length < 2) {
        toast.error('Multiple choice questions must have at least 2 choices');
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
      orderIndex: 0,
      correctAnswer: "",
      pointsValue: 1
    });

    toast.success('Question added!');
  };

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
    toast.success('Question removed');
  };

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

            <div className="form-group">
              <h3>Questions ({formData.questions.length} added)</h3>
              
              {formData.questions.length > 0 && (
                <div className="questions-success-hint">
                  <small>
                    ✅ Questions added below. Add more questions or scroll down to create the questionnaire.
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
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={!googleLinked}>
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
