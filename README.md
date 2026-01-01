# AI-Powered Performance Management System (Gemini 2.0)

A comprehensive HR platform built with React, Firebase, and Google Gemini 2.0 Flash. This system automates the performance review lifecycle, from KPI tracking to AI-generated development plans.

## 🌟 Key Features

### 1. AI-Driven KPI Auditing
- **Automated Scoring**: Managers upload evidence (PDF/Text), and the Gemini 2.0 Flash model scores performance against a custom rubric.
- **Rubric Customization**: Managers can define specific standards for each KPI, ensuring the AI audits based on organizational goals.

### 2. Performance Remediation (HR)
- **Targeted Development**: The system automatically identifies employees in the "Needs Improvement" category (Final Score < 60).
- **AI Growth Roadmaps**: HR can generate a personalized 3-month remediation plan with a single click.
- **Role-Based Visibility**: Employees and Managers have read-only access to these roadmaps once finalized by HR.

### 3. Role-Based Dashboards
- **Admin**: Manage users (Email/Password/Role), system cycles (Year/Quarter), and KPI templates.
- **Manager**: Create/Edit KPIs, audit evidence using AI, and manage team performance.
- **Employee**: Track personal KPIs, upload evidence, and view assigned development plans.
- **HR**: Oversee final reviews and manage professional development across the organization.

## 🛠️ Tech Stack
- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend/DB**: Firebase Authentication, Firestore, Cloud Storage
- **AI Engine**: Google Generative AI (Gemini 2.0 Flash SDK)
- **Icons**: React Icons (Fi, Lu)

## 🚀 Getting Started

1. **Clone the Repo**:
   ```
   git clone [https://github.com/your-username/performance-system.git](https://github.com/your-username/performance-system.git)
   cd performance-system
   ```

2. **Environment Setup**
    Create a `.env` file in the root directory and add the following environment variables:

    ```
    VITE_GEMINI_API_KEY=your_google_gemini_key
    VITE_FIREBASE_API_KEY=your_firebase_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```
    Important:
    Ensure the `.env` file is included in `.gitignore` to prevent sensitive credentials from being committed.

3. **Install Dependencies**
    ```
    npm install
    ```

4. **Run the Application Locally**
    ```
    npm run dev
    ```

    The application will be available at:

    http://localhost:5173
