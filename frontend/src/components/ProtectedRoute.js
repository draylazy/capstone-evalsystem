import React from 'react';
import { Navigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = authAPI.getCurrentUser();
  
  if (!user || !authAPI.isAuthenticated()) {
    // User not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User doesn't have required role, redirect to their dashboard
    const redirectPath = user.role === 'TEACHER' ? '/teacher/dashboard' : '/adviser/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  
  return children;
};

export default ProtectedRoute;
