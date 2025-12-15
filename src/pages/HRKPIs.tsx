import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase";
import "./HRKPIs.css";
import KPIDetailModal from "../components/KPIDetailModal";

type KPI = {
  id: string;
  title: string;
  ownerName: string;
  quarter: string;
  currentValue: number;
  targetValue: number;
  status: string;
  weight: number;
};

const HRKPIs: React.FC = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const ref = collection(db, "kpis");
      const snap = await getDocs(query(ref));

      const list: KPI[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title,
          ownerName: data.ownerName ?? "—",
          quarter: data.quarter ?? "—",
          currentValue: data.currentValue ?? 0,
          targetValue: data.targetValue ?? 0,
          status: data.status ?? "Active",
          weight: data.weight ?? 0,
        };
      });

      setKpis(list);
      setLoading(false);
    };

    load();
  }, []);

  const visibleKPIs = useMemo(() => {
    return kpis.filter((k) => {
      if (selectedQuarter !== "All" && k.quarter !== selectedQuarter)
        return false;
      if (selectedStatus !== "All" && k.status !== selectedStatus)
        return false;
      return true;
    });
  }, [kpis, selectedQuarter, selectedStatus]);

  if (loading) {
    return <div className="hr-kpis-page">Loading KPIs...</div>;
  }

  return (
    <div className="hr-kpis-page">
      <div className="page-header">
        <h1>Organization KPIs</h1>
        <p className="muted">
          Read-only overview of all employee KPIs across the organization.
        </p>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
        >
          <option value="All">All Quarters</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Approved">Approved</option>
          <option value="PendingReview">Pending</option>
          <option value="NeedsRevision">Needs Revision</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="kpi-table">
          <thead>
            <tr>
              <th>KPI</th>
              <th>Owner</th>
              <th>Quarter</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {visibleKPIs.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No KPIs found.
                </td>
              </tr>
            )}

            {visibleKPIs.map((k) => {
              const pct =
                k.targetValue > 0
                  ? Math.round((k.currentValue / k.targetValue) * 100)
                  : 0;

              return (
                <tr
                  key={k.id}
                  className="clickable"
                  onClick={() => setActiveKpiId(k.id)}
                >
                  <td className="kpi-title">{k.title}</td>
                  <td>{k.ownerName}</td>
                  <td>{k.quarter}</td>
                  <td>
                    {k.currentValue}/{k.targetValue} ({pct}%)
                  </td>
                  <td>
                    <span className={`status ${k.status}`}>
                      {k.status}
                    </span>
                  </td>
                  <td>{k.weight}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {activeKpiId && (
        <KPIDetailModal
          kpiId={activeKpiId}
          onClose={() => setActiveKpiId(null)}
        />
      )}
    </div>
  );
};

export default HRKPIs;
