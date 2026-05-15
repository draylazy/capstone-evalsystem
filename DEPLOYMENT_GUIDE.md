# 🚀 Capstone Project Deployment Guide

This guide will walk you through deploying your Academic Evaluation System to the web.

## 1. Database Setup (Aiven / Railway)
Since you're using MySQL, I recommend **Aiven** (free tier) or **Railway**.

1.  Sign up at [Aiven.io](https://aiven.io/).
2.  Create a **MySQL** service (choose the Free plan).
3.  Once the service is running, copy the **Service URI** or the individual connection details (Host, Port, User, Password).
4.  Download the **CA Certificate** if required (usually not needed for basic Spring Boot setup if `useSSL=false` is used, but good to have).

## 2. Backend Deployment (Render)
Render is great for Spring Boot apps.

1.  Push your code to **GitHub**.
2.  Sign up at [Render.com](https://render.com/).
3.  Click **New +** > **Web Service**.
4.  Connect your GitHub repository.
5.  **Settings**:
    *   **Name**: `capstone-backend`
    *   **Runtime**: `Docker`
    *   **Dockerfile Path**: `backend/Dockerfile`
    *   **Instance Type**: `Free`
6.  **Environment Variables**:
    *   `SPRING_DATASOURCE_URL`: `jdbc:mysql://<HOST>:<PORT>/<DB_NAME>`
    *   `SPRING_DATASOURCE_USERNAME`: `<YOUR_USER>`
    *   `SPRING_DATASOURCE_PASSWORD`: `<YOUR_PASSWORD>`
    *   `JWT_SECRET`: (Generate a long random string)
    *   `GOOGLE_CLIENT_ID`: (Your Google ID)
    *   `GOOGLE_CLIENT_SECRET`: (Your Google Secret)
    *   `GOOGLE_REDIRECT_URI`: `https://<YOUR-VERCEL-DOMAIN>/profile/google-callback`
    *   `GEMINI_API_KEY`: (Your Gemini Key)

## 3. Frontend Deployment (Vercel)
1.  Sign up at [Vercel.com](https://vercel.com/).
2.  Click **Add New** > **Project**.
3.  Connect your GitHub repository.
4.  **Settings**:
    *   **Framework Preset**: `Create React App`
    *   **Root Directory**: `frontend`
5.  **Environment Variables**:
    *   `REACT_APP_API_BASE_URL`: `https://capstone-backend.onrender.com/api` (Replace with your actual Render URL)
6.  Click **Deploy**.

## 4. Final Steps (Google Cloud Console)
Don't forget to update your Google OAuth settings!

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Navigate to **APIs & Services** > **Credentials**.
3.  Edit your OAuth 2.0 Client ID.
4.  Add your production URLs to:
    *   **Authorized JavaScript origins**: `https://<YOUR-VERCEL-DOMAIN>`
    *   **Authorized redirect URIs**: `https://<YOUR-VERCEL-DOMAIN>/profile/google-callback`

---

## 🛠 Troubleshooting
- **CORS Errors**: If you see CORS errors, ensure your Backend controller has `@CrossOrigin(origins = "https://your-vercel-app.vercel.app")` or a global CORS config.
- **Cold Start**: Render's free tier spins down after inactivity. The first request might take 30-60 seconds to wake up.
