import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      setShowError(true);
      return;
    }

    if (code) {
      // Send code to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_CODE',
          code: code
        }, window.location.origin);
        window.close();
      } else {
        // If not in popup (e.g. mobile redirect), we need to route based on auth status
        const userStr = localStorage.getItem('user');
        if (userStr) {
          // If already logged in, they are linking their account
          navigate(`/profile?code=${code}`);
        } else {
          // If not logged in, they are trying to log in
          navigate(`/login?code=${code}`);
        }
      }
    }
  }, [searchParams, navigate]);

  const handleErrorClose = () => {
    setShowError(false);
    if (window.opener) {
      window.close();
    } else {
      navigate('/profile');
    }
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div className="spinner"></div>
        <p>Completing Google account linking...</p>
      </div>

      <ConfirmModal
        isOpen={showError}
        title="Error"
        message="Failed to link Google account"
        confirmText="OK"
        showCancel={false}
        onConfirm={handleErrorClose}
        onCancel={handleErrorClose}
      />
    </>
  );
};

export default GoogleCallback;
