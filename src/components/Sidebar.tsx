import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiTarget, FiFileText } from "react-icons/fi";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Akselerasi</h2>
      </div>

      <div className="sidebar-menu">

        <Link
          to="/dashboard"
          className={`sidebar-item ${isActive("/dashboard") ? "active" : ""}`}
        >
          <FiHome className="sidebar-icon" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/my-kpis"
          className={`sidebar-item ${isActive("/my-kpis") ? "active" : ""}`}
        >
          <FiTarget className="sidebar-icon" />
          <span>My KPIs</span>
        </Link>

        <Link
          to="/my-reports"
          className={`sidebar-item ${isActive("/my-reports") ? "active" : ""}`}
        >
          <FiFileText className="sidebar-icon" />
          <span>My Reports</span>
        </Link>

      </div>
    </div>
  );
};

export default Sidebar;
