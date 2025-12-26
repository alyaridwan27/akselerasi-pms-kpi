// src/pages/MyKPIs.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"; // Added doc/getDoc
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import KPIDetailModal from "../components/KPIDetailModal";
import StatusBadge from "../components/StatusBadge";
import QuarterBadge from "../components/QuarterBadge";
import QuarterFilter from "../components/QuarterFilter";
import { FiLock } from "react-icons/fi"; // Added for lock icon
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

  // ⭐ NEW STATE: Global Lock Status
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch System Lock Status
        const configSnap = await getDoc(doc(db, "system", "config"));
        if (configSnap.exists()) {
          setIsLocked(!!configSnap.data().systemLocked);
        }

        // 2. Load KPIs
        const kref = collection(db, "kpis");
        const q = query(kref, where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setKpis(list);
      } catch (error) {
        console.error("Error loading MyKPIs:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, detailKPI]);

  const availableYears = Array.from(new Set(kpis.map((k) => k.year))).sort((a, b) => a - b);

  const visibleKPIs = kpis.filter((k) => {
    const matchQuarter = quarterFilter === "All" || k.quarter === quarterFilter;
    const matchYear = k.year === yearFilter;
    return matchQuarter && matchYear;
  });

  if (loading) return <div className="manager-kpi-container">Loading KPIs...</div>;

  return (
    <div className="manager-kpi-container">
      
      {/* ⭐ NEW: Global Lock Warning Banner */}
      {isLocked && (
        <div className="system-lock-banner">
          <FiLock className="lock-icon" />
          <div className="lock-text">
            <h3>Performance Period Locked</h3>
            <p>The Admin has frozen data entry for this period. You can view your progress, but updates are disabled.</p>
          </div>
        </div>
      )}

      <h2 className="manager-kpi-title">My KPIs</h2>

      <QuarterFilter
        selectedQuarter={quarterFilter}
        setQuarter={setQuarterFilter}
        selectedYear={yearFilter}
        setYear={setYearFilter}
        availableYears={availableYears.length > 0 ? availableYears : [new Date().getFullYear()]}
      />

      <div className="manager-kpi-grid">
        {visibleKPIs.length === 0 ? (
          <p className="empty-msg">No KPIs found for the selected period.</p>
        ) : (
          visibleKPIs.map((kpi) => {
            const pct = kpi.targetValue > 0 ? Math.round((kpi.currentValue / kpi.targetValue) * 100) : 0;
            const progressColor = pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626";

            return (
              <div key={kpi.id} className="manager-kpi-card">
                <h3>{kpi.title}</h3>
                
                <div className="badge-row">
                  <StatusBadge status={kpi.status || "Active"} />
                  <QuarterBadge quarter={kpi.quarter} year={kpi.year} />
                </div>

                {kpi.description && <p className="desc">{kpi.description}</p>}

                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(100, pct)}%`, background: progressColor }} 
                  />
                </div>

                <div className="stats">
                  <span>
                    <strong>Progress:</strong> {kpi.currentValue}/{kpi.targetValue} {kpi.unit}
                  </span>
                  <span>
                    <strong>Completion:</strong> {pct}%
                  </span>
                  <span>
                    <strong>Weight:</strong> {kpi.weight}
                  </span>
                </div>

                <div className="actions">
                  <button className="details-btn" onClick={() => setDetailKPI(kpi)}>
                    {isLocked ? "View Details" : "Update Progress"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {detailKPI && (
        <KPIDetailModal
          kpiId={detailKPI.id}
          onClose={() => setDetailKPI(null)}
          // ⭐ PASS LOCK STATUS: Ensure modal is read-only if locked
          readOnly={isLocked} 
        />
      )}
    </div>
  );
};

export default MyKPIs;