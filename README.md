# 🎓 Smart Curriculum Activity & Attendance System

An intelligent, full-stack curriculum activity and attendance management platform powered by **React**, **Node.js**, **Neon PostgreSQL**, **Google Gemini AI**, and **Cloudinary CDN**.

---

## ✨ Key Features

### 👨‍🎓 **Student Portal**
- **Multi-Mode Attendance Scanner:** Scan dynamic QR codes via live camera, upload QR screenshot images, or enter **Lecture ID (`LEC-...`)** manually.
- **Timetable & Live Status:** View daily and weekly class schedules with real-time active lecture detection.
- **🤖 AI Study Buddy (Google Gemini):**
  - Automated micro-learning and revision recommendations during detected **Free Periods**.
  - Interactive academic AI chat with Markdown and code syntax highlighting.
  - Quick subject review and personalized study goals.
- **Attendance History & Analytics:** Comprehensive attendance tracking (Present, Absent, Late) with downloadable **PDF Transcripts** and **CSV Reports**.
- **Cloud Profile Management:** Upload profile photos with auto face-detection cropping via **Cloudinary**.

### 👩‍🏫 **Teacher Portal**
- **Dynamic QR Attendance Generator:** Start lecture attendance sessions with customizable expiry timers and real-time live attendance counters.
- **Student Roster Management:** Search and filter department students with live attendance percentage badges and contact details.
- **Timetable Management:** View scheduled lectures and start attendance directly from the timetable.
- **Comprehensive Class Reports:** Generate and export official classroom attendance reports in PDF and CSV formats.

### 🛡️ **Admin Portal**
- **User & Role Management:** Manage Students, Teachers, and Department Admins.
- **Curriculum & Timetable Scheduling:** Manage subjects, classroom allocations, and faculty assignments.
- **Audit Logs & System Analytics:** Track user activity, session creation, and system operations.

### 🔒 **Security & Authentication**
- **Dual Authentication:** Sign in using Password or **6-Digit Email OTP** (Nodemailer Gmail SMTP).
- **Forgot Password / Account Recovery:** Secure password reset via email OTP verification.
- **JWT & Role-Based Access Control (RBAC):** Protected routes and API endpoints.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, TanStack Query |
| **Backend** | Node.js, Express.js, TypeScript, Drizzle ORM |
| **Database** | Neon PostgreSQL (Serverless Cloud Database) |
| **Generative AI** | Google Gemini API (`@google/genai`, `@google/generative-ai`) |
| **Media & CDN** | Cloudinary SDK (`cloudinary` v2) |
| **Email Service** | Nodemailer (Gmail SMTP) |
| **Reporting & QR** | PDFKit, CSV-Writer, HTML5-QRCode, QRCode |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js (v18+)](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Neon PostgreSQL Database](https://neon.tech/)
- [Google Gemini API Key](https://ai.google.dev/)
- [Cloudinary Account](https://cloudinary.com/)

---

### 2. Clone the Repository
```bash
git clone https://github.com/YamanLadani/Smart-Attendance-System.git
cd Smart-Attendance-System
```

---

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://<username>:<password>@<neon-endpoint>.neon.tech/<dbname>?sslmode=require
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Gmail SMTP Email Delivery
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM="Smart Attendance <noreply@smartattendance.com>"

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
CLIENT_URL=http://localhost:5173
```

Start the backend development server:
```bash
npm run dev
```

---

### 4. Frontend Setup

```bash
cd ../client
npm install
```

Start the Vite development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📄 License
This project is licensed under the MIT License.
