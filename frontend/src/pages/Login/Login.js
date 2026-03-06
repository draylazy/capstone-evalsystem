import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const googleBtnRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for Google script to load
    const interval = setInterval(() => {
      if (window.google && googleBtnRef.current) {
        clearInterval(interval);

        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
        });
      }
    }, 200);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectByRole = (role) => {
    if (role === 'TEACHER') navigate('/teacher/dashboard');
    else if (role === 'ADVISER') navigate('/adviser/dashboard');
    else navigate('/login');
  };

  const handleGoogleCredential = async (response) => {
    setError('');
    setLoading(true);

    try {
      toast.info('Signing in with Google...');

      const data = await authAPI.googleLogin(response.credential);

      // Store FULL response like you currently do (contains token + role etc.)
      localStorage.setItem('user', JSON.stringify(data));

      toast.success('Login successful!');
      redirectByRole(data.role);
    } catch (err) {
      toast.error('Google login failed: ' + (err.message || 'Unknown error'));
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Adviser Evaluation System</h1>
        <h2>Sign in</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="google-button-container">
          <div ref={googleBtnRef} />
        </div>

        {loading && (
          <p className="loading-text">
            Signing in...
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;