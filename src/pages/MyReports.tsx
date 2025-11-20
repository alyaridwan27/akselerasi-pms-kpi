import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./MyReports.css";

const MyReports: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadKPIs = async () => {
      setLoading(true);

      const kpiRef = collection(db, "kpis");
      const q = query(kpiRef, where("ownerId", "==", user.uid));
      const snap = await getDocs(q);

      const list: any[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setKpis(list);
      setLoading(false);
    };

    loadKPIs();
  }, [user]);

  if (loading) return <div>Loading report...</div>;

  // Compute Objective Score
  const objectiveScore =
    kpis.length > 0
      ? Math.round(
          kpis.reduce(
            (sum, k) => sum + (k.currentValue / k.targetValue) * (k.weight ?? 0),
            0
          ) * 100
        )
      : 0;

  // Placeholder: subjective score not implemented yet
  const subjectiveScore = null; // Will come from Group 2

  const finalScore = subjectiveScore
    ? Math.round(objectiveScore * 0.7 + subjectiveScore * 0.3)
    : null;

  return (
    <div className="reports-container">
      <h2>My Quarterly Report</h2>
      <p className="cycle-label">Q1 2025 (Prototype)</p>

      {/* Score Cards */}
      <div className="score-cards">

        <div className="score-card">
          <h3>{objectiveScore}%</h3>
          <p>Objective Score (70%)</p>
        </div>

        <div className="score-card">
          <h3>{subjectiveScore ?? "—"}</h3>
          <p>Subjective Score (30%)</p>
          {!subjectiveScore && (
            <span className="pending">Awaiting 360 Feedback</span>
          )}
        </div>

        <div className="score-card">
          <h3>{finalScore ?? "—"}</h3>
          <p>Final Score</p>
          {!finalScore && (
            <span className="pending">Pending Review Completion</span>
          )}
        </div>

      </div>

      {/* KPI Contributions */}
      <h3 className="section-title">KPI Contribution Breakdown</h3>
      <div className="kpi-table">
        {kpis.map((k) => {
          const pct = k.currentValue / k.targetValue;
          const contrib = Math.round((pct * (k.weight ?? 0)) * 100);

          return (
            <div key={k.id} className="kpi-row">
              <strong>{k.title}</strong>
              <span>{Math.round(pct * 100)}%</span>
              <span>{contrib}%</span>
              <span>{k.weight}</span>
            </div>
          );
        })}
      </div>

      {/* Placeholder for 360 Feedback */}
      <h3 className="section-title">Manager / Peer Feedback</h3>
      <div className="placeholder-box">
        <p>This section will display feedback from the 360 review module.</p>
        <p>Group B will implement this.</p>
      </div>

      {/* Optional AI Feature */}
      <h3 className="section-title">AI Review Assistant (Optional)</h3>
      <div className="placeholder-box">
        <p>This prototype can generate AI-based performance summaries.</p>
        <button className="ai-btn">Generate AI Summary (Optional)</button>
      </div>

    </div>
  );
};

export default MyReports;
