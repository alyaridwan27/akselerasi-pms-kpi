import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import "./HRRaterTraining.css";

interface ManagerStatus {
  id: string;
  displayName: string;
  email: string;
  trainingCompleted: boolean;
  trainingDate?: any;
}

const HRRaterTraining: React.FC = () => {
  const [managers, setManagers] = useState<ManagerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadManagers = async () => {
    setLoading(true);
    // Fetch only users with 'Manager' role
    const q = query(collection(db, "users"), where("role", "==", "Manager"));
    const snap = await getDocs(q);
    setManagers(snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as ManagerStatus)));
    setLoading(false);
  };

  useEffect(() => { loadManagers(); }, []);

  const toggleTraining = async (managerId: string, currentStatus: boolean) => {
    const userRef = doc(db, "users", managerId);
    await updateDoc(userRef, {
      trainingCompleted: !currentStatus,
      trainingDate: !currentStatus ? serverTimestamp() : null
    });
    alert("Manager training status updated.");
    loadManagers();
  };

  if (loading) return <div className="hr-training-page">Loading Manager data...</div>;

  return (
    <div className="hr-training-page">
      <div className="page-header">
        <h1>Rater Training & Readiness</h1>
        <p className="muted">Ensure managers are certified to provide fair and unbiased performance ratings.</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="val">{managers.filter(m => m.trainingCompleted).length}</span>
          <span className="lab">Certified Raters</span>
        </div>
        <div className="stat-card">
          <span className="val">{managers.filter(m => !m.trainingCompleted).length}</span>
          <span className="lab">Pending Training</span>
        </div>
      </div>

      <div className="card table-card">
        <table className="training-table">
          <thead>
            <tr>
              <th>Manager Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {managers.map(m => (
              <tr key={m.id}>
                <td><strong>{m.displayName}</strong></td>
                <td>{m.email}</td>
                <td>
                  {m.trainingCompleted ? (
                    <span className="status-pill certified"><FiCheckCircle /> Certified</span>
                  ) : (
                    <span className="status-pill pending"><FiAlertCircle /> Needs Training</span>
                  )}
                </td>
                <td>
                  <button 
                    className={`train-btn ${m.trainingCompleted ? 'revoke' : 'approve'}`}
                    onClick={() => toggleTraining(m.id, !!m.trainingCompleted)}
                  >
                    {m.trainingCompleted ? "Revoke Certification" : "Mark as Trained"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRRaterTraining;