import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', email);
      const data = await authAPI.login(email, password);
      console.log('Login response:', data);
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data));
      console.log('User data stored, role:', data.role);
      
      // Redirect based on role
      if (data.role === 'TEACHER') {
        console.log('Redirecting to teacher dashboard');
        navigate('/teacher/dashboard');
      } else if (data.role === 'ADVISER') {
        console.log('Redirecting to adviser dashboard');
        navigate('/adviser/dashboard');
      } else {
        console.log('Unknown role, redirecting to home');
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Adviser Evaluation System</h1>
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <div className="register-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
