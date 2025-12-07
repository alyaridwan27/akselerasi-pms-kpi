import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import KPIDetailModal from "../components/KPIDetailModal";
import StatusBadge from "../components/StatusBadge";
import QuarterBadge from "../components/QuarterBadge";
import QuarterFilter from "../components/QuarterFilter";
import "./MyKPIs.css";

interface KPI {
  year: number;
  quarter: string;
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
  const [quarterFilter, setQuarterFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [detailKPI, setDetailKPI] = useState<KPI | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadKPIs = async () => {
      setLoading(true);
      const kref = collection(db, "kpis");
      const q = query(kref, where("ownerId", "==", user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setKpis(list);
      setLoading(false);
    };
    loadKPIs();
  }, [user, detailKPI]); // Reload if detail modal updates data

  const availableYears = Array.from(new Set(kpis.map((k) => k.year))).sort((a, b) => a - b);

  const visibleKPIs = kpis.filter((k) => {
    const matchQuarter = quarterFilter === "All" || k.quarter === quarterFilter;
    const matchYear = k.year === yearFilter;
    return matchQuarter && matchYear;
  });

  if (loading) return <div style={{ padding: 20 }}>Loading KPIs...</div>;

  return (
    <div className="kpi-container">
      <h2 className="kpi-title-header">My KPIs</h2>

      <QuarterFilter
        selectedQuarter={quarterFilter}
        setQuarter={setQuarterFilter}
        selectedYear={yearFilter}
        setYear={setYearFilter}
        availableYears={availableYears}
      />

      {visibleKPIs.length === 0 && <p style={{ marginTop: 20 }}>No KPIs found.</p>}

      <div className="kpi-grid">
        {visibleKPIs.map((kpi) => {
          const pct = kpi.targetValue > 0 ? Math.round((kpi.currentValue / kpi.targetValue) * 100) : 0;
          const progressColor = pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626";

          return (
            <div key={kpi.id} className="kpi-card">
              <h3 className="kpi-card-title">
                <span className="kpi-icon">🎯</span> {kpi.title}
              </h3>

              <div style={{ display: "flex", gap: "8px" }}>
                <StatusBadge status={kpi.status || "Active"} />
                <QuarterBadge quarter={kpi.quarter} year={kpi.year} />
              </div>

              {kpi.description && <p className="kpi-description">{kpi.description}</p>}

              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: progressColor }} />
              </div>

              <div className="kpi-stats">
                <span>Progress: {kpi.currentValue}/{kpi.targetValue} {kpi.unit}</span>
                <span>Completion: {pct}%</span>
                <span>Weight: {kpi.weight}</span>
              </div>

              <div className="kpi-actions">
                <button className="kpi-view-btn" onClick={() => setDetailKPI(kpi)}>
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {detailKPI && (
        <KPIDetailModal
          kpiId={detailKPI.id}
          onClose={() => setDetailKPI(null)}
        />
      )}
    </div>
  );
};

export default MyKPIs;