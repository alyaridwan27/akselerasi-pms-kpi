// src/pages/Dashboard.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";

const Dashboard: React.FC = () => {
  const { user, role, logout } = useAuth();

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Akselerasi — Dashboard</h2>
        <div>
          <span style={{ marginRight: 12 }}>{role}</span>
          <button onClick={() => logout()}>Logout</button>
        </div>
      </header>

      <main>
        <p>Welcome, {user?.email}</p>
        <p>Role (from Firestore): {role}</p>
        <p>Use this page as a starting point — we'll add My KPIs next.</p>
      </main>
    </div>
  );
};

export default Dashboard;
