// src/pages/UserProfile.tsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { FiUser, FiBriefcase, FiAward, FiTrendingUp, FiCheckCircle } from "react-icons/fi";
import "./UserProfile.css";

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProfileData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Basic Profile
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        // 2. Fetch Performance History
        const historyQ = query(
          collection(db, "finalReviews"),
          where("employeeId", "==", user.uid)
        );
        const historySnap = await getDocs(historyQ);
        setHistory(historySnap.docs.map(d => d.data()));
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user]);

  if (loading) return <div className="profile-container">Loading Profile...</div>;

  return (
    <div className="profile-container">
      <div className="profile-card main-info">
        <div className="avatar-placeholder">
          <FiUser size={48} />
        </div>
        <div className="info-text">
          <h1>{profile?.displayName}</h1>
          <p className="email">{profile?.email}</p>
          <div className="role-badges">
            <span className="badge role"><FiBriefcase /> {profile?.employeeType}</span>
            <span className="badge system-role">{profile?.role}</span>
            {profile?.trainingCompleted && (
              <span className="badge certified"><FiCheckCircle /> Certified Rater</span>
            )}
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Performance History Section */}
        <div className="profile-card">
          <h3><FiAward /> Performance History</h3>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="empty">No finalized reviews yet.</p>
            ) : (
              history.map((rev, i) => (
                <div key={i} className="history-item">
                  <div className="history-period">{rev.quarter} {rev.year}</div>
                  <div className={`history-category cat-${rev.performanceCategory.toLowerCase().replace(" ", "-")}`}>
                    {rev.performanceCategory}
                  </div>
                  <div className="history-score">Score: {rev.finalScore}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Development & Growth Section */}
        <div className="profile-card">
          <h3><FiTrendingUp /> Growth & Training</h3>
          <p className="muted">Active development tracks assigned by HR appear here.</p>
          {/* You can fetch development plans here using a similar query to history */}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;