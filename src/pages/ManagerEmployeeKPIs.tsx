import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import StatusBadge from "../components/StatusBadge";
import KPIDetailModal from "../components/KPIDetailModal";
import QuarterBadge from "../components/QuarterBadge";
import QuarterFilter from "../components/QuarterFilter"; // Ensure you have this component created
import "./ManagerEmployeeKPIs.css";

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

const ManagerEmployeeKPIs: React.FC = () => {
  const { employeeId } = useParams();

  const [employeeName, setEmployeeName] = useState("");
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [filtered, setFiltered] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailKPI, setDetailKPI] = useState<string | null>(null);
  
  // Filters
  const [filter, setFilter] = useState("All"); // Status Filter
  const [quarterFilter, setQuarterFilter] = useState("All"); // New Quarter Filter
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear()); // New Year Filter

  // Calculate available years dynamically from the loaded KPIs
  const availableYears = Array.from(
    new Set(kpis.map((k) => k.year))
  ).sort((a, b) => a - b);

  // Load KPIs
  useEffect(() => {
    if (!employeeId) return;

    const load = async () => {
      setLoading(true);

      // load employee name
      const uref = doc(db, "users", employeeId);
      const usnap = await getDoc(uref);
      if (usnap.exists()) setEmployeeName(usnap.data().displayName);

      // load KPIs
      const kref = collection(db, "kpis");
      const q = query(kref, where("ownerId", "==", employeeId));
      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      setKpis(list);
      setLoading(false);
    };

    load();
  }, [employeeId]);

  // Combined Filtering logic (Status + Quarter + Year)
  useEffect(() => {
    let result = kpis;

    // 1. Filter by Status (from existing buttons)
    if (filter !== "All") {
      result = result.filter((k) => k.status === filter);
    }

    // 2. Filter by Quarter
    if (quarterFilter !== "All") {
      result = result.filter((k) => k.quarter === quarterFilter);
    }

    // 3. Filter by Year
    result = result.filter((k) => k.year === yearFilter);

    setFiltered(result);
  }, [filter, quarterFilter, yearFilter, kpis]);

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

      {/* NEW: Time Filter UI */}
      <QuarterFilter
        selectedQuarter={quarterFilter}
        setQuarter={setQuarterFilter}
        selectedYear={yearFilter}
        setYear={setYearFilter}
        availableYears={availableYears}
      />

      {/* EXISTING: Status Filter Bar */}
      <div className="filter-bar">
        {["All", "PendingReview", "NeedsRevision", "Approved"].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "PendingReview" ? "Pending Review" :
             f === "NeedsRevision" ? "Needs Revision" :
             f}
          </button>
        ))}
      </div>

      {/* KPI LIST */}
      <div className="manager-kpi-grid">
        {filtered.length === 0 && <p>No KPIs for this filter.</p>}

        {filtered.map((kpi) => {
          const pct =
            kpi.targetValue === 0
              ? 0
              : Math.round((kpi.currentValue / kpi.targetValue) * 100);

          const color =
            pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626";

          return (
            <div key={kpi.id} className="manager-kpi-card">
              <h3>{kpi.title}</h3>
              <StatusBadge status={kpi.status || "Active"} />
              <QuarterBadge quarter={kpi.quarter} year={kpi.year} />

              {kpi.description && <p className="desc">{kpi.description}</p>}

              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>

              <div className="stats">
                <span>
                  Progress: {kpi.currentValue}/{kpi.targetValue} {kpi.unit}
                </span>
                <span>Weight: {kpi.weight}</span>
              </div>

              {/* View Details */}
              <div className="actions">
                <button
                  className="details-btn"
                  onClick={() => setDetailKPI(kpi.id)}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {detailKPI && (
        <KPIDetailModal
          kpiId={detailKPI}
          onClose={() => setDetailKPI(null)}
        />
      )}
    </div>
  );
};

export default ManagerEmployeeKPIs;