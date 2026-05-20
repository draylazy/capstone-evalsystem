import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
};

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback(({ title = 'Are you sure?', message = '', confirmText = 'Yes, Leave', cancelText = 'Stay', isDanger = true } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ isOpen: true, title, message, confirmText, cancelText, isDanger });
    });
  }, []);

  const handleConfirm = () => {
    setState(s => ({ ...s, isOpen: false }));
    resolverRef.current?.(true);
  };

  const handleCancel = () => {
    setState(s => ({ ...s, isOpen: false }));
    resolverRef.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        isDanger={state.isDanger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};
