import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FiUser, FiLogOut, FiChevronDown } from "react-icons/fi";
import "./Topbar.css";

const Topbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // ⭐ Fetch displayName for initials
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setDisplayName(snap.data().displayName || "");
        }
      }
    };
    fetchUserData();
  }, [user]);

  // ⭐ Helper to get initials (e.g., "Alya Ridwan" -> "AR")
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h3>{role} Portal</h3>
      </div>

      <div className="topbar-right">
        <div className="profile-wrapper" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="user-avatar">{getInitials(displayName)}</div>
          <div className="user-info-box">
            <span className="user-name">{displayName || user?.email}</span>
            <FiChevronDown className={showDropdown ? "rotate" : ""} />
          </div>

          {showDropdown && (
            <div className="profile-dropdown">
              <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                <FiUser /> User Profile
              </Link>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-item" onClick={logout}>
                <FiLogOut /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;