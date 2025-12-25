// src/pages/ManagerTeam.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom"; // Import Link
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

  // Modal state
  const [creatingFor, setCreatingFor] = useState<{ id: string; name?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (role !== "Manager") {
      setLoading(false);
      return;
    }

    const loadTeam = async () => {
      setLoading(true);
      try {
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

    loadTeam();
  }, [user, role]);

  if (loading) return <div className="manager-container">Loading team...</div>;
  if (role !== "Manager") return <div className="manager-container">You are not authorized to view this page.</div>;

  return (
    <div className="manager-container">
      <h2 className="manager-title">My Team</h2>

      {team.length === 0 && <p className="no-members">You have no assigned team members.</p>}

      <div className="team-list">
        {team.map((member) => (
          <div key={member.id} className="team-card-row">
            
            {/* Left Side: Info */}
            <div className="team-info">
              <h3>{member.displayName}</h3>
              <p className="employee-type">{member.employeeType}</p>
            </div>

            {/* Right Side: Actions */}
            <div className="team-actions">
              <Link to={`/manager/kpis/${member.id}`} className="view-btn">
                View KPIs
              </Link>

              {/* NEW: View Report Button */}
              <Link to={`/manager/reports/${member.id}`} className="report-btn">
                View Report
              </Link>

              <button
                className="create-btn"
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