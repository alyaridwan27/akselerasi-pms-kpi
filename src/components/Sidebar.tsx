import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiHome,
  FiTarget,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiGrid,
  FiCheckCircle,
  FiAward,
} from "react-icons/fi";
import "./Sidebar.css";
import { useAuth } from "../context/AuthContext";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { role } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Akselerasi</h2>
      </div>

      <div className="sidebar-menu">
        {/* GLOBAL DASHBOARD */}
        {(role === "Employee" ||
          role === "Manager" ||
          role === "HR" ||
          role === "Admin") && (
          <Link
            to="/dashboard"
            className={`sidebar-item ${isActive("/dashboard") ? "active" : ""}`}
          >
            <FiHome className="sidebar-icon" />
            <span>Dashboard</span>
          </Link>
        )}

        {/* EMPLOYEE MENU */}
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

        {/* MANAGER MENU */}
        {role === "Manager" && (
          <Link
            to="/manager/team"
            className={`sidebar-item ${isActive("/manager") ? "active" : ""}`}
          >
            <FiUsers className="sidebar-icon" />
            <span>Team</span>
          </Link>
        )}

        {/* HR MENU */}
        {role === "HR" && (
          <>
            <Link
              to="/hr/kpis"
              className={`sidebar-item ${isActive("/hr/kpis") ? "active" : ""}`}
            >
              <FiGrid className="sidebar-icon" />
              <span>Organization KPIs</span>
            </Link>

            <Link
              to="/hr/final-review"
              className={`sidebar-item ${isActive("/hr/final-review") ? "active" : ""}`}
            >
              <FiCheckCircle className="sidebar-icon" />
              <span>Final Reviews</span>
            </Link>

            <Link
              to="/hr/rewards"
              className={`sidebar-item ${isActive("/hr/rewards") ? "active" : ""}`}
            >
              <FiAward className="sidebar-icon" />
              <span>Rewards</span>
            </Link>
          </>
        )}

        {/* ADMIN MENU */}
        {role === "Admin" && (
          <>
            <Link
              to="/admin/calibration"
              className={`sidebar-item ${isActive("/admin/calibration") ? "active" : ""}`}
            >
              <FiCheckCircle className="sidebar-icon" />
              <span>Calibration</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
