import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-container">
      <div className="privacy-policy-content">
        <button className="back-btn" onClick={() => navigate('/login')}>
          &larr; Back to Login
        </button>
        
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: May 17, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to the Student and Adviser Evaluation System (SAES). This Privacy Policy explains how we collect, use, and protect your personal information when you use our web application. By using our system, you consent to the data practices described in this statement.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We may collect the following types of information when you use our Google OAuth Login:</p>
          <ul>
            <li><strong>Personal Information:</strong> Your name and email address provided by your Google Account.</li>
            <li><strong>Educational Data:</strong> Information relating to your classes, teams, and peer/adviser evaluations.</li>
            <li><strong>Google Drive/Sheets Access (Teachers Only):</strong> If you configure auto-export, we request access to create and modify Google Sheets in your Google Drive specifically for exporting evaluation data.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>The information we collect is used strictly for educational and administrative purposes:</p>
          <ul>
            <li>To verify your identity and role within the system.</li>
            <li>To record, calculate, and present peer-to-peer and adviser-to-student evaluation scores.</li>
            <li>To automatically export evaluation results to the instructor's Google Sheet (if configured).</li>
          </ul>
          <p>
            <strong>Note:</strong> We do NOT sell, rent, or share your personal information with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or destruction. However, no data transmission over the Internet or electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2>5. Your Rights</h2>
          <p>
            You have the right to review, update, or request the deletion of your personal data stored within our system. You can also revoke Google OAuth permissions at any time through your Google Account Security settings.
          </p>
        </section>

        <section>
          <h2>6. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact your system administrator or the capstone development team.
          </p>
        </section>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
