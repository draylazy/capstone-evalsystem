import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ProtectedRoute from './components/ProtectedRoute';

// Teacher Dashboard Pages
import Teacher from './pages/DashboardTeacher/Teacher';
import Classes from './pages/DashboardTeacher/Classes';
import Teams from './pages/DashboardTeacher/Teams';
import Advisers from './pages/DashboardTeacher/Advisers';
import Questionnaires from './pages/DashboardTeacher/Questionnaires';
import Reports from './pages/DashboardTeacher/Reports';
import Student from './pages/DashboardTeacher/Student';

// Adviser Dashboard Pages
import Adviser from './pages/DashboardAdviser/Adviser';
import Evaluations from './pages/DashboardAdviser/Evaluations';
import Completed from './pages/DashboardAdviser/Completed';
import Account from './pages/DashboardAdviser/Account';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Teacher Routes */}
          <Route 
            path="/teacher/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Teacher />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/classes" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Classes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/teams" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Teams />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/advisers" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Advisers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/questionnaires" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Questionnaires />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/reports" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/students" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <Student />
              </ProtectedRoute>
            } 
          />

          {/* Adviser Routes */}
          <Route 
            path="/adviser/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['ADVISER']}>
                <Adviser />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adviser/evaluations" 
            element={
              <ProtectedRoute allowedRoles={['ADVISER']}>
                <Evaluations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adviser/completed" 
            element={
              <ProtectedRoute allowedRoles={['ADVISER']}>
                <Completed />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adviser/account" 
            element={
              <ProtectedRoute allowedRoles={['ADVISER']}>
                <Account />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
