// src/pages/ManagerEmployeeKPIs.tsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import StatusBadge from "../components/StatusBadge";
import "./ManagerEmployeeKPIs.css";

interface KPI {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  weight?: number;
  status?: string;
}

const ManagerEmployeeKPIs: React.FC = () => {
  const { employeeId } = useParams();
  const [employeeName, setEmployeeName] = useState("");
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;

    const load = async () => {
      setLoading(true);

      const userRef = doc(db, "users", employeeId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setEmployeeName(userSnap.data().displayName);
      }

      const kpiRef = collection(db, "kpis");
      const q = query(kpiRef, where("ownerId", "==", employeeId));
      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      setKpis(list);
      setLoading(false);
    };

    load();
  }, [employeeId]);

  if (loading) return <div style={{ padding: 20 }}>Loading employee KPIs...</div>;

  return (
    <div className="manager-kpi-container">
      <h2 className="manager-kpi-title">KPIs for {employeeName}</h2>

      <button
        className="back-btn"
        onClick={() => (window.location.href = "/manager/team")}
      >
        ← Back to Team
      </button>

      <div className="manager-kpi-grid">
        {kpis.length === 0 && <p>No KPIs assigned yet.</p>}

        {kpis.map((kpi) => {
          const pct = Math.round((kpi.currentValue / kpi.targetValue) * 100);
          const progressColor =
            pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626";

          return (
            <div key={kpi.id} className="manager-kpi-card">

              {/* Title & Status */}
              <h3>{kpi.title}</h3>
              <StatusBadge status={kpi.status || "Active"} />

              {/* Description */}
              {kpi.description && <p className="desc">{kpi.description}</p>}

              {/* Progress Bar */}
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${pct}%`, background: progressColor }}
                />
              </div>

              {/* Stats */}
              <div className="stats">
                <span>
                  Progress: {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                </span>
                <span>Weight: {kpi.weight}</span>
                <span>Status: {pct}%</span>
              </div>

              {/* Actions */}
              <div className="actions">
                <button
                  className="details-btn"
                  onClick={() => (window.location.href = `/kpi/${kpi.id}`)}
                >
                  View Details
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManagerEmployeeKPIs;
