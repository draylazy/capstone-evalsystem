import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Global API Cache Interceptor for GET requests to optimize page loading speed
const fetchCache = {
  store: new Map(),
  set(url, data, ttlMs = 15000) { // 15 seconds cache lifetime
    this.store.set(url, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  },
  get(url) {
    const cached = this.store.get(url);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.store.delete(url);
      return null;
    }
    return cached.data;
  },
  clear() {
    this.store.clear();
  }
};

const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const method = init?.method || 'GET';
  const url = typeof input === 'string' ? input : input.url;

  // Intercept only GET requests destined for the backend APIs
  const isApiGet = method.toUpperCase() === 'GET' && 
    (url.includes('/api') || url.includes('/auth') || url.includes('/ai'));

  if (isApiGet) {
    const cachedData = fetchCache.get(url);
    if (cachedData !== null) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await originalFetch.apply(this, arguments);

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          fetchCache.set(url, data);
        } catch (e) {
          // Safe fallback if JSON parsing fails
        }
      }
    }
    return response;
  } else {
    // Clear cache immediately on state modifications to ensure lists refresh with fresh data
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      fetchCache.clear();
    }
    return await originalFetch.apply(this, arguments);
  }
};


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
