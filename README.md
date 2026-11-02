# 🛡️ CyberGuard AI
### AI-Powered Cybersecurity Monitoring and Threat Detection Platform

CyberGuard AI is an intelligent cybersecurity monitoring platform designed to analyze security events, identify suspicious activities, generate security incidents, and provide AI-powered threat explanations.

It combines rule-based threat detection with Large Language Model (LLM) analysis to help security teams understand potential cyber threats through a centralized dashboard.

---

## 🚀 Live Application

- **Frontend:** https://cyberguard-brown.vercel.app
- **Backend API:** https://cyberguard-ai-nxqh.onrender.com
- **API Documentation:** https://cyberguard-ai-nxqh.onrender.com/docs

---

## 🎯 Problem Statement

Organizations generate large volumes of security logs every day. Manually analyzing these logs to identify suspicious activities is time-consuming and makes threat identification difficult.

CyberGuard AI addresses this problem by automating security-event analysis through predefined detection rules and AI-powered explanations.

### my Solution

- Automated security-event processing.
- Rule-based identification of suspicious activities.
- Automatic security incident generation.
- Severity classification and risk assessment.
- LLM-powered threat explanations and recommendations.
- Centralized security monitoring dashboard.

---

## ✨ Key Features

### 1. Security Event Management
- Upload security events through CSV files.
- Process and analyze uploaded records.
- View security events with pagination.
- Search and filter events.

### 2. Threat Detection Engine

CyberGuard AI currently implements four detection rules:

| Detection Rule | Description | Trigger Condition |
|---|---|---|
| Brute Force | Identifies repeated failed login attempts | Failed attempts ≥ 5 |
| Suspicious Login | Identifies suspicious failed login activity | Failed attempts ≥ 3 for login_failed |
| Excessive Data Transfer | Detects unusually large data transfers | Bytes transferred ≥ 10 MB |
| Port Scan | Identifies possible network scanning activity | port_scan, network_scan, or scan_detected |

### 3. Incident Management
- Automatically generate incidents from detection results.
- Classify incidents by severity.
- View incident details.
- Track incident status.
- Assign incidents for investigation.

### 4. AI-Powered Analysis
- Integrates a Large Language Model through Groq.
- Generates human-readable security explanations.
- Provides contextual threat analysis.
- Helps analysts understand potential attack patterns.

**Important:** Rule-based detection identifies suspicious activity. The LLM provides additional interpretation and explanations; it does not replace the detection engine.

### 5. Security Dashboard
- Security-event overview.
- Incident monitoring.
- Attack-type analytics.
- Severity distribution.
- Risk summaries.
- Centralized security visibility.

### 6. Authentication and Authorization
- JWT-based authentication.
- Password hashing.
- Role-based access control (RBAC).
- Protected API endpoints.

---

## 🏗️ System Architecture

```text
             USER
              |
              v
       REACT FRONTEND
              |
        REST API / JSON
              |
              v
       FASTAPI BACKEND
              |
       SECURITY EVENT
          PROCESSING
              |
              v
      THREAT DETECTION
           ENGINE
              |
       +------+------+
       |             |
       v             v
   DATABASE      GROQ LLM
       |             |
       v             v
   INCIDENTS     AI ANALYSIS
       |             |
       +------+------+
              |
              v
       REACT DASHBOARD
              |
              v
     SECURITY INSIGHTS
```

---

## 🛠️ Technology Stack

### Frontend
- React
- JavaScript
- Vite
- CSS
- REST API integration

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT Authentication
- Passlib and bcrypt

### AI Integration
- Groq API
- Large Language Model-based analysis

### Database
- SQLite

### Deployment
- Vercel — Frontend
- Render — Backend
- GitHub — Version control

---

## 📁 Project Structure

```text
cyberguard-ai/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py
│   │   │   │   └── events.py
│   │   │   ├── incidents.py
│   │   │   └── reports.py
│   │   │
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   └── detection_rules/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SecurityContext.jsx
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vercel.json
│
└── README.md
```

---

## 🔄 Application Workflow

1. The user authenticates through the login interface.
2. The frontend communicates with the FastAPI backend using REST APIs.
3. The user uploads a CSV file containing security events.
4. The backend validates and processes the uploaded records.
5. The detection engine evaluates each event against registered security rules.
6. Suspicious activities generate security incidents.
7. Relevant incident information can be sent for LLM-powered analysis.
8. Events, incidents, and analysis results are made available to the dashboard.
9. The frontend displays security information and analytics.

---

## 🔌 Frontend and Backend Integration

The frontend and backend communicate using REST APIs.

**Main integration file:**

`frontend/src/services/api.js`

The frontend uses JavaScript's Fetch API to communicate with the backend.

The backend URL is configured through:

```env
VITE_API_BASE_URL=https://cyberguard-ai-nxqh.onrender.com
```

The backend enables cross-origin communication through CORS middleware configured in:

`backend/app/main.py`

---

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.10+
- Node.js
- npm
- Git
- Groq API key

### 1. Clone the repository

```bash
git clone https://github.com/sai1234-do/cyberguard-ai.git

cd cyberguard-ai
```

### 2. Backend setup

```bash
cd backend

python -m venv venv
```

Activate the virtual environment.

Windows:

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure backend environment variables using a `.env` file.

Example:

```env
DEBUG=False
DATABASE_URL=sqlite:///./cyberguard.db

JWT_SECRET_KEY=your_generated_secret

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_strong_password
ADMIN_FULL_NAME=CyberGuard Administrator

GROQ_API_KEY=your_groq_api_key

FRONTEND_ORIGIN=http://localhost:5173
```

Never commit actual API keys, passwords, or secret values to GitHub.

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend runs at:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend setup

Open another terminal:

```bash
cd frontend

npm install
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at:

`http://localhost:5173`

---

## 🧪 Testing

The application can be validated using:

- Normal login events.
- Repeated failed login attempts.
- Suspicious login activity.
- Large data-transfer events.
- Port-scanning events.
- Normal security events.
- CSV upload validation.
- Authentication and authorization checks.
- API response validation.

Synthetic datasets can be used to test detection rules and verify incident generation.

---

## 👥 Team Responsibilities

CyberGuard AI is developed by a team of five members.

| Member | Responsibility |
|---|---|
| Member 1 | Backend Development and LLM Integration |
| Member 2 | Frontend Development and Dashboard |
| Member 3 | Threat Detection Engine and Security Rules |
| Member 4 | Database Design and Data Management |
| Member 5 | Testing, Validation and Documentation |

---

## 🔮 Future Enhancements

- Real-time security-event ingestion.
- Integration with SIEM platforms.
- Advanced anomaly detection using machine learning.
- Threat intelligence integration.
- Automated alert notifications.
- Advanced incident correlation.
- Persistent production database.
- Enhanced security analytics and reporting.

---

## ⚠️ Current Limitations

- Security events are currently ingested through CSV uploads.
- Detection relies primarily on predefined rules.
- LLM-generated explanations should be reviewed by security analysts.
- The current free deployment uses SQLite and does not provide guaranteed persistent production storage.
- The platform is a project prototype and is not a replacement for a production-grade security operations center (SOC).

---

## 🔐 Security Notice

- Never expose API keys or authentication secrets.
- Use strong passwords.
- Keep environment variables outside version control.
- Review AI-generated security recommendations before taking action.
- Use synthetic or authorized security data for testing.

---

## 📜 License

This project is developed for educational and academic purposes.

---

**CyberGuard AI — Detect. Analyze. Understand. Defend.**
