import React from 'react';
import ReactDOM from 'react-dom';
import './ConfirmModal.css';

const ExitConfirmModal = ({ isOpen, onSave, onDiscard, onCancel }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <h3 className="confirm-modal-title">Unsaved Changes</h3>
        <p className="confirm-modal-message">
          You have unsaved changes in your evaluation. Would you like to save a draft before leaving?
        </p>
        <div className="confirm-modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
          <button 
            className="confirm-modal-btn confirm-modal-btn-primary"
            onClick={onSave}
            style={{ width: '100%' }}
          >
            Save Draft & Exit
          </button>
          <button 
            className="confirm-modal-btn confirm-modal-btn-secondary"
            onClick={onDiscard}
            style={{ width: '100%', border: '1px solid rgba(255, 77, 79, 0.3)', color: '#ff4d4f' }}
          >
            Exit without Saving
          </button>
          <button 
            className="confirm-modal-btn confirm-modal-btn-secondary"
            onClick={onCancel}
            style={{ width: '100%' }}
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExitConfirmModal;
