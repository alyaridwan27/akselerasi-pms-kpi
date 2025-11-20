// src/pages/MyKPIs.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import UpdateKPIModal from "../components/UpdateKPIModal";
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

  // Modal states
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  useEffect(() => {
    if (!user) {
      setKpis([]);
      setLoading(false);
      return;
    }

    const uid = user.uid;

    const fetchKPIs = async () => {
      setLoading(true);
      try {
        const kpiRef = collection(db, "kpis");
        const q = query(kpiRef, where("ownerId", "==", uid));
        const snap = await getDocs(q);

        const items: KPI[] = snap.docs.map((docItem) => {
          const data = docItem.data() as any;
          return {
            id: docItem.id,
            title: data.title ?? "Untitled KPI",
            description: data.description ?? "",
            targetValue: data.targetValue ?? 0,
            currentValue: data.currentValue ?? 0,
            unit: data.unit ?? "",
            weight: data.weight ?? 0,
            status: data.status ?? "Draft",
          };
        });

        setKpis(items);
      } catch (err) {
        console.error("Error fetching KPIs:", err);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [user, refreshFlag]);

  if (loading) return <div style={{ padding: 20 }}>Loading KPIs...</div>;

  return (
  <div className="kpi-container">

    <h2 className="kpi-title-header">My KPIs</h2>

    {kpis.length === 0 && <p>No KPIs found for your account.</p>}

    <div className="kpi-grid">
      {kpis.map((kpi) => {
        const progress = kpi.currentValue / kpi.targetValue;
        const pct = Math.round(progress * 100);

        let progressColor = "#DC2626";
        let statusText = "Behind";

        if (progress >= 0.8) {
          progressColor = "#16A34A";
          statusText = "On Track";
        } else if (progress >= 0.5) {
          progressColor = "#CA8A04";
          statusText = "At Risk";
        }

        return (
          <div key={kpi.id} className="kpi-card">

            {/* KPI Title + Icon */}
            <h3 className="kpi-card-title">
              <span className="kpi-icon">🎯</span> {/* Icon here */}
              {kpi.title}
            </h3>

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
              ></div>
            </div>

            <div className="kpi-stats">
              <span>Progress: {kpi.currentValue} / {kpi.targetValue} {kpi.unit}</span>
              <span>Completion: {pct}%</span>
              <span>Weight: {kpi.weight}</span>
              <span style={{ color: progressColor, fontWeight: 600 }}>
                Status: {statusText}
              </span>
            </div>

            {/* Buttons */}
            <div className="kpi-actions">
              <button
                className="kpi-view-btn"
                onClick={() => (window.location.href = `/kpi/${kpi.id}`)}
              >
                View Details
              </button>

              <button
                className="kpi-update-btn"
                onClick={() => setSelectedKPI(kpi)}
              >
                Update KPI
              </button>
            </div>

          </div>
        );
      })}
    </div>

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
