import React, { useState } from "react";
import "./PendingEvaluationsModal.css";

const PendingEvaluationsModal = ({ isOpen, onClose, adviserPending = [], studentPending = [] }) => {
  const [activeTab, setActiveTab] = useState("ADVISER");

  if (!isOpen) return null;

  const currentList = activeTab === "ADVISER" ? adviserPending : studentPending;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pending-evaluations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-group">
            <h2>Pending Evaluations</h2>
            <div className="pending-tabs">
              <button 
                className={`tab-btn ${activeTab === "ADVISER" ? "active" : ""}`}
                onClick={() => setActiveTab("ADVISER")}
              >
                Advisers ({adviserPending.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === "STUDENT" ? "active" : ""}`}
                onClick={() => setActiveTab("STUDENT")}
              >
                Students ({studentPending.length})
              </button>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {currentList.length === 0 ? (
            <p className="empty-state">No pending {activeTab.toLowerCase()} evaluations</p>
          ) : (
            <div className="pending-list">
              <table className="pending-table">
                <thead>
                  <tr>
                    <th>{activeTab === "ADVISER" ? "Adviser" : "Student"}</th>
                    <th>Class</th>
                    <th>Team</th>
                    <th>Questionnaire</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((evaluation, idx) => (
                    <tr key={idx}>
                      <td>{activeTab === "ADVISER" ? evaluation.adviserName : evaluation.studentName}</td>
                      <td>{evaluation.className}</td>
                      <td>{evaluation.teamName}</td>
                      <td>{evaluation.questionnaireName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingEvaluationsModal;
