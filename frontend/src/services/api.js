// API Base URL
const API_BASE_URL = 'http://localhost:8080/api';

// Helper function to get auth token
const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.token || null;
};

// Helper function to create headers
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Authentication API
export const authAPI = {
  login: async (email, password) => {
    console.log('API: Sending login request to:', `${API_BASE_URL}/auth/login`);
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    
    console.log('API: Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API: Login error response:', error);
      throw new Error(error.message || 'Login failed');
    }
    
    const data = await response.json();
    console.log('API: Login success, data:', data);
    return data;
  },
  
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
    
    return await response.json();
  },
  
  logout: () => {
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => {
    const user = localStorage.getItem('user');
    return !!user; // Check if user data exists instead of token
  }
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    return await response.json();
  },
  
  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    
    return await response.json();
  }
};

// Classes API
export const classAPI = {
  getAllClasses: async () => {
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch classes');
    }
    
    return await response.json();
  },
  
  getClassById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch class');
    }
    
    return await response.json();
  },
  
  createClass: async (classData) => {
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(classData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create class');
    }
    
    return await response.json();
  },
  
  updateClass: async (id, classData) => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(classData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update class');
    }
    
    return await response.json();
  },
  
  deleteClass: async (id) => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete class');
    }
    
    return await response.json();
  }
};

// Teams API
export const teamAPI = {
  getAllTeams: async () => {
    const response = await fetch(`${API_BASE_URL}/teams`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }
    
    return await response.json();
  },
  
  getTeamById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team');
    }
    
    return await response.json();
  },
  
  createTeam: async (teamData) => {
    const response = await fetch(`${API_BASE_URL}/teams`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(teamData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create team');
    }
    
    return await response.json();
  },
  
  updateTeam: async (id, teamData) => {
    const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(teamData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update team');
    }
    
    return await response.json();
  },
  
  deleteTeam: async (id) => {
    const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete team');
    }
    
    return await response.json();
  }
};

// Evaluations API
export const evaluationAPI = {
  getAllEvaluations: async () => {
    const response = await fetch(`${API_BASE_URL}/evaluations`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch evaluations');
    }
    
    return await response.json();
  },
  
  getEvaluationById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/evaluations/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch evaluation');
    }
    
    return await response.json();
  },
  
  createEvaluation: async (evaluationData) => {
    const response = await fetch(`${API_BASE_URL}/evaluations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(evaluationData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create evaluation');
    }
    
    return await response.json();
  },
  
  submitEvaluation: async (id, scores) => {
    const response = await fetch(`${API_BASE_URL}/evaluations/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(scores),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit evaluation');
    }
    
    return await response.json();
  }
};

// Questionnaires API
export const questionnaireAPI = {
  getAllQuestionnaires: async () => {
    const response = await fetch(`${API_BASE_URL}/questionnaires`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch questionnaires');
    }
    
    return await response.json();
  },
  
  getQuestionnaireById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/questionnaires/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch questionnaire');
    }
    
    return await response.json();
  },
  
  createQuestionnaire: async (questionnaireData) => {
    const response = await fetch(`${API_BASE_URL}/questionnaires`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(questionnaireData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create questionnaire');
    }
    
    return await response.json();
  },
  
  updateQuestionnaire: async (id, questionnaireData) => {
    const response = await fetch(`${API_BASE_URL}/questionnaires/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(questionnaireData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update questionnaire');
    }
    
    return await response.json();
  },
  
  deleteQuestionnaire: async (id) => {
    const response = await fetch(`${API_BASE_URL}/questionnaires/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete questionnaire');
    }
    
    return await response.json();
  }
};

// Reports API
export const reportAPI = {
  getAllReports: async () => {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }
    
    return await response.json();
  },
  
  getReportById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch report');
    }
    
    return await response.json();
  },
  
  generateReport: async (reportData) => {
    const response = await fetch(`${API_BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reportData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate report');
    }
    
    return await response.json();
  },
  
  downloadReport: async (id) => {
    const response = await fetch(`${API_BASE_URL}/reports/${id}/download`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to download report');
    }
    
    return await response.blob();
  }
};

export default {
  authAPI,
  userAPI,
  classAPI,
  teamAPI,
  evaluationAPI,
  questionnaireAPI,
  reportAPI
};
