# SAES - Student and Adviser Evaluation System
An integrated academic evaluation system combining adviser assessments and peer evaluations to provide structured, rubric-based grading for student teams.

## 📖 About
The Student and Adviser Evaluation System (SAES) supports two distinct evaluation workflows:
- **Adviser-Led Team Evaluation** — Academic advisers assess the performance of their assigned student teams through structured rubric-based questionnaires.
- **Peer-to-Peer Evaluation** — Students evaluate their fellow team members based on the same rubric criteria.

The platform centralizes evaluation management, automates report generation, and integrates an AI-powered feedback summarization module to generate concise summaries, highlight strengths and areas for improvement, and detect scoring inconsistencies across evaluators.

---

## 🛠 Tech Stack
- **Frontend:** React.js + Vite — deployed on Vercel
- **Backend:** Spring Boot (Java) — deployed on Render
- **Database:** MySQL — hosted on Aiven
- **AI Integration:** Groq API (AI-powered feedback summarization)
- **Authentication:** Google OAuth 2.0
- **Integrations:** Google Sheets API, CSV Export
- **Deployment:** Vercel, Render, Aiven

---

## 🚀 Setup & Run Instructions

**Backend (Spring Boot)**  
Create the database using MySQL Workbench:
```bash
CREATE DATABASE saes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Clone the repository and navigate to the backend:
```bash
git clone https://github.com/draylazy/capstone-merged-evaluation-system.git
cd capstone-merged-evaluation-system/backend
```

Create a `.env` file in the backend root directory and configure the following environment variables:
```env
DB_URL=jdbc:mysql://localhost:3306/saes_db
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password
GROQ_API_KEY=your_groq_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
```

Run the backend:
```bash
./mvnw spring-boot:run
```

> Never commit your `.env` file to version control. Make sure `.env` is listed in your `.gitignore`.

Backend will run at: **http://localhost:8080/**

**Frontend (React.js)**  
Navigate to the frontend folder:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run the frontend:
```bash
npm run dev
```

Frontend will run at: **http://localhost:3000/**

---

## 👨‍💻 Team Members
- Rivera, Nico
- Cortes, Ken Daniel E.
- Pael, Neilross Ulysses P.
- Abadiano, Kent Dominic
- Ricablanca, Claudine Margaret
- Bajamunde, Louie V.
- Queddeng, James Adriane S.
- Magpatoc, Mark Andrew G.
- Rigodon, Keith Yancy A.
- Tabungar, Steven Jan M.

**Adviser:** Cheryl B. Pantaleon

---

## 🌐 Deployed Link
```bash
https://capstone-evalsystem.vercel.app/login
```
