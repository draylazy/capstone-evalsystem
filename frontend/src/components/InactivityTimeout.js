import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { AlertTriangle } from 'lucide-react';

const InactivityTimeout = ({ timeout = 3600000 }) => { // Default to 1 hour (3600000 ms)
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const timerRef = useRef(null);
  const throttleRef = useRef(0);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/' || location.pathname === '/register';

  const performLogout = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    localStorage.removeItem('lastActivity');
    authAPI.logout();
    localStorage.removeItem('token'); // Just in case it's used elsewhere
    setShowModal(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleTimeoutReached = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowModal(true);
  }, []);

  const checkTimeout = useCallback(() => {
    if (showModal) return;
    const isAuthenticated = authAPI.isAuthenticated();
    if (!isAuthenticated || isAuthPage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const lastActivity = Number(localStorage.getItem('lastActivity'));
    if (!lastActivity) {
      localStorage.setItem('lastActivity', Date.now().toString());
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(checkTimeout, timeout);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastActivity;

    if (elapsed >= timeout) {
      handleTimeoutReached();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(checkTimeout, timeout - elapsed);
    }
  }, [isAuthPage, timeout, handleTimeoutReached, showModal]);

  const resetTimer = useCallback((updateStorage = true) => {
    if (showModal) return;
    const isAuthenticated = authAPI.isAuthenticated();
    if (!isAuthenticated || isAuthPage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const now = Date.now();
    if (updateStorage) {
      localStorage.setItem('lastActivity', now.toString());
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(checkTimeout, timeout);
  }, [isAuthPage, timeout, checkTimeout, showModal]);

  useEffect(() => {
    if (isAuthPage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Check timeout status immediately on mount/render
    checkTimeout();

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      if (showModal) return;
      const now = Date.now();
      // Throttle writing to localStorage to once every 10 seconds to avoid performance overhead
      if (now - throttleRef.current > 10000) {
        throttleRef.current = now;
        resetTimer(true);
      } else {
        resetTimer(false);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'lastActivity') {
        if (!e.newValue) {
          // lastActivity was cleared (e.g. logged out in another tab)
          performLogout();
        } else {
          const newLastActivity = Number(e.newValue);
          if (newLastActivity && !showModal) {
            resetTimer(false);
          }
        }
      } else if (e.key === 'user' && !e.newValue) {
        // user was cleared (e.g. manual logout in another tab)
        performLogout();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, timeout, isAuthPage, checkTimeout, performLogout, resetTimer, showModal]);

  const handleModalConfirm = () => {
    performLogout();
  };

  if (!showModal) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <AlertTriangle size={32} color="#f2c94c" />
        </div>
        <h2 style={styles.title}>Session Expired</h2>
        <p style={styles.message}>
          You have been logged out due to inactivity. Please log in again to continue.
        </p>
        <button 
          onClick={handleModalConfirm} 
          style={styles.button}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #a01a26, #8a151f)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(138, 21, 31, 0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #8a151f, #6c0f17)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  card: {
    backgroundColor: 'rgba(30, 15, 18, 0.95)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '450px',
    width: '90%',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(242, 201, 76, 0.1)',
    borderRadius: '50%',
    padding: '16px',
    marginBottom: '20px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid rgba(242, 201, 76, 0.2)',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f5f0eb',
    margin: '0 0 12px 0',
    fontFamily: '"Outfit", "Inter", sans-serif',
  },
  message: {
    fontSize: '15px',
    color: '#a09890',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
    fontFamily: '"Inter", sans-serif',
  },
  button: {
    background: 'linear-gradient(135deg, #8a151f, #6c0f17)',
    color: '#ffffff',
    border: '1px solid rgba(138, 21, 31, 0.5)',
    borderRadius: '10px',
    padding: '10px 22px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.3s ease',
    minHeight: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    fontFamily: '"Inter", sans-serif',
  }
};

export default InactivityTimeout;
