// src/pages/MyKPIs.tsx

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import UpdateKPIModal from "../components/UpdateKPIModal";
import StatusBadge from "../components/StatusBadge";
import "./MyKPIs.css";

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

const MyKPIs: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const kpiRef = collection(db, "kpis");
      const q = query(kpiRef, where("ownerId", "==", user.uid));
      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      setKpis(list);
      setLoading(false);
    };

    load();
  }, [user, refreshFlag]);

  if (loading) return <div style={{ padding: 20 }}>Loading KPIs...</div>;

  return (
    <div className="kpi-container">
      <h2 className="kpi-title-header">My KPIs</h2>

      {kpis.length === 0 && <p>No KPIs found.</p>}

      <div className="kpi-grid">
        {kpis.map((kpi) => {
          const pct = Math.round((kpi.currentValue / kpi.targetValue) * 100);
          const progressColor =
            pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626";

          return (
            <div key={kpi.id} className="kpi-card">

              {/* Title */}
              <h3 className="kpi-card-title">
                <span className="kpi-icon">🎯</span> {kpi.title}
              </h3>

              {/* Status Badge */}
              <StatusBadge status={kpi.status || "Active"} />

              {/* Description */}
              {kpi.description && (
                <p className="kpi-description">{kpi.description}</p>
              )}

              {/* Progress Bar */}
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: progressColor,
                  }}
                />
              </div>

              {/* Stats */}
              <div className="kpi-stats">
                <span>
                  Progress: {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                </span>
                <span>Completion: {pct}%</span>
                <span>Weight: {kpi.weight}</span>
              </div>

              {/* Actions */}
              <div className="kpi-actions">
                <button
                  className="kpi-view-btn"
                  onClick={() => (window.location.href = `/kpi/${kpi.id}`)}
                >
                  View Details
                </button>

                <button
                  className="kpi-update-btn"
                  disabled={kpi.status === "Approved"}
                  onClick={() => setSelectedKPI(kpi)}
                >
                  {kpi.status === "Approved" ? "Locked" : "Update KPI"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedKPI && (
        <UpdateKPIModal
          kpi={selectedKPI}
          onClose={() => setSelectedKPI(null)}
          onUpdated={() => setRefreshFlag(refreshFlag + 1)}
        />
      )}
    </div>
  );
};

export default MyKPIs;
