import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiHome, FiTarget, FiFileText, FiUsers } from "react-icons/fi";
import "./Sidebar.css";
import { useAuth } from "../context/AuthContext";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { role } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Akselerasi</h2>
      </div>

      <div className="sidebar-menu">

        {/* DASHBOARD — visible to all roles */}
        <Link
          to="/dashboard"
          className={`sidebar-item ${isActive("/dashboard") ? "active" : ""}`}
        >
          <FiHome className="sidebar-icon" />
          <span>Dashboard</span>
        </Link>

        {/* EMPLOYEE-ONLY MENUS */}
        {role === "Employee" && (
          <>
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
          </>
        )}

        {/* MANAGER-ONLY MENUS */}
        {role === "Manager" && (
          <Link
            to="/manager/team"
            className={`sidebar-item ${
              isActive("/manager/team") ? "active" : ""
            }`}
          >
            <FiUsers className="sidebar-icon" />
            <span>Team</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
