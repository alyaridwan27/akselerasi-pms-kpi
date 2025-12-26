// src/pages/ManagerTeam.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi"; // Added for warning icon
import "./ManagerTeam.css";
import ManagerCreateKPIModal from "../components/ManagerCreateKPIModal";

interface TeamMember {
  id: string;
  displayName: string;
  employeeType: string;
}

const ManagerTeam: React.FC = () => {
  const { user, role } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ⭐ NEW STATE: Certification status
  const [isCertified, setIsCertified] = useState<boolean>(true); 

  // Modal state
  const [creatingFor, setCreatingFor] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (role !== "Manager") {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // ⭐ NEW: Fetch manager's own document for certification status
        const myDoc = await getDoc(doc(db, "users", user.uid));
        if (myDoc.exists()) {
          setIsCertified(!!myDoc.data().trainingCompleted);
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("managerId", "==", user.uid));
        const snap = await getDocs(q);

        const members: TeamMember[] = snap.docs.map((doc) => ({
          id: doc.id,
          displayName: doc.data().displayName,
          employeeType: doc.data().employeeType,
        }));

        setTeam(members);
      } catch (error) {
        console.error("Error loading team:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, role]);

  if (loading) return <div className="manager-container">Loading team...</div>;
  if (role !== "Manager") return <div className="manager-container">Access Denied.</div>;

  return (
    <div className="manager-container">
      
      {/* ⭐ NEW: Training Warning Banner */}
      {!isCertified && (
        <div className="rater-training-banner">
          <FiAlertTriangle className="banner-icon" />
          <div className="banner-text">
            <h3>Rater Training Required</h3>
            <p>You must be certified by HR to manage KPIs or view team performance reports.</p>
          </div>
        </div>
      )}

      <h2 className="manager-title">My Team</h2>

      {team.length === 0 && <p className="no-members">You have no assigned team members.</p>}

      <div className="team-list">
        {team.map((member) => (
          <div key={member.id} className="team-card-row">
            
            <div className="team-info">
              <h3>{member.displayName}</h3>
              <p className="employee-type">{member.employeeType}</p>
            </div>

            <div className="team-actions">
              {/* ⭐ ACTION LOCKS: Disabled if not certified */}
              <Link 
                to={isCertified ? `/manager/kpis/${member.id}` : "#"} 
                className={`view-btn ${!isCertified ? 'btn-locked' : ''}`}
              >
                View KPIs
              </Link>

              <Link 
                to={isCertified ? `/manager/reports/${member.id}` : "#"} 
                className={`report-btn ${!isCertified ? 'btn-locked' : ''}`}
              >
                View Report
              </Link>

              <button
                className={`create-btn ${!isCertified ? 'btn-locked' : ''}`}
                disabled={!isCertified}
                onClick={() => setCreatingFor({ id: member.id, name: member.displayName })}
              >
                Assign KPI
              </button>
            </div>

          </div>
        ))}
      </div>
      
      {creatingFor && (
        <ManagerCreateKPIModal
          ownerId={creatingFor.id}
          ownerName={creatingFor.name}
          onClose={() => setCreatingFor(null)}
          onCreated={() => setCreatingFor(null)}
        />
      )}
    </div>
  );
};

export default ManagerTeam;