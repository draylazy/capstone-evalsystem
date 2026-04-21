import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../../components/Sidebar/StudentSidebar";
import { useToast } from "../../contexts/ToastContext";
import "../DashboardTeacher/Teacher.css";

const API_BASE_URL = "http://localhost:8080";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [questionnaires, setQuestionnaires] = useState([]);
  
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    const fetchQuestionnaires = async () => {
      try {
        const token = currentUser ? currentUser.token : '';
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/student/questionnaires`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch questionnaires");
        
        const data = await res.json();
        setQuestionnaires(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestionnaires();
  }, [currentUser, toast]);

  const handleActionClick = (q) => {
    navigate(`/student/evaluate/${q.id}`);
  };

  const studentName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || "Student";

  return (
    <div className="teacher-container">
      <StudentSidebar />
      <div className="teacher-content">
        <h1 className="teacher-page-title">Student Dashboard</h1>

        <section className="teacher-hero">
          <div>
            <p className="teacher-hero-kicker">Your Portal</p>
            <h2 className="teacher-hero-title">Welcome, {studentName}</h2>
            <p className="teacher-hero-text">
              View and complete your assigned evaluations here.
            </p>
          </div>
        </section>

        <div className="section">
          <h2>Peer Evaluations</h2>
          {loading ? (
            <p>Loading...</p>
          ) : questionnaires.length === 0 ? (
            <p style={{ marginTop: 20, color: 'var(--dtm-muted)' }}>You have no assigned questionnaires at this time.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {questionnaires.map((q) => (
                <div key={q.id} className="evaluation-response-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ color: 'var(--dtm-gold)', margin: 0 }}>{q.title}</h3>
                      <p style={{ color: 'var(--dtm-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>{q.description}</p>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dtm-muted)' }}>
                      Assigned: {new Date(q.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: 'var(--dtm-muted)', fontSize: '0.9rem' }}>
                      {q.peerTasks?.every(t => t.status === 'SUBMITTED') ? (
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>All evaluations completed ✓</span>
                      ) : (
                        <span>
                          Progress: <strong>{q.peerTasks?.filter(t => t.status === 'SUBMITTED').length || 0} / {q.peerTasks?.length || 0}</strong> teammates evaluated
                        </span>
                      )}
                    </div>
                    <button 
                      className={q.peerTasks?.every(t => t.status === 'SUBMITTED') ? 'btn-secondary' : 'btn'} 
                      onClick={() => handleActionClick(q)}
                    >
                      {q.peerTasks?.every(t => t.status === 'SUBMITTED') ? 'View Responses' : 'Start/Continue Group Evaluation'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
