import React from "react";
import { useAuth } from "../context/AuthContext";
import "./Topbar.css";

const Topbar: React.FC = () => {
  const { user, role, logout } = useAuth();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h3>{role}</h3>
      </div>

      <div className="topbar-right">
        <span className="user-email">{user?.email}</span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;
