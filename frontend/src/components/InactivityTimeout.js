import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { authAPI } from '../services/api';

const InactivityTimeout = ({ timeout = 3600000 }) => { // Default to 1 hour (3600000 ms)
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const timerRef = useRef(null);
  const throttleRef = useRef(0);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/' || location.pathname === '/register';

  const logoutUser = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    localStorage.removeItem('lastActivity');
    authAPI.logout();
    localStorage.removeItem('token'); // Just in case it's used elsewhere
    toast.warning('You have been logged out due to inactivity.');
    navigate('/login', { replace: true });
  }, [navigate, toast]);

  const checkTimeout = useCallback(() => {
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
      logoutUser();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(checkTimeout, timeout - elapsed);
    }
  }, [isAuthPage, timeout, logoutUser]);

  const resetTimer = useCallback((updateStorage = true) => {
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
  }, [isAuthPage, timeout, checkTimeout]);

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
          logoutUser();
        } else {
          const newLastActivity = Number(e.newValue);
          if (newLastActivity) {
            resetTimer(false);
          }
        }
      } else if (e.key === 'user' && !e.newValue) {
        // user was cleared (e.g. manual logout in another tab)
        logoutUser();
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
  }, [location.pathname, timeout, isAuthPage, checkTimeout, logoutUser, resetTimer]);

  return null;
};

export default InactivityTimeout;
