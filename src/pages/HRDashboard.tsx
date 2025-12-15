// src/pages/HRDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import "./HRDashboard.css";

type KPI = {
  id: string;
  status: string;
  quarter: string;
};

const HRDashboard: React.FC = () => {
  const [employeesCount, setEmployeesCount] = useState(0);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. Load employees
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "Employee"))
      );
      setEmployeesCount(usersSnap.size);

      // 2. Load all KPIs
      const kpiSnap = await getDocs(collection(db, "kpis"));
      setKpis(
        kpiSnap.docs.map((d) => ({
          id: d.id,
          status: d.data().status,
          quarter: d.data().quarter,
        }))
      );

      setLoading(false);
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const total = kpis.length;
    const approved = kpis.filter((k) => k.status === "Approved").length;
    const pending = kpis.filter((k) => k.status === "PendingReview").length;
    const revision = kpis.filter((k) => k.status === "NeedsRevision").length;

    const byQuarter = {
      Q1: kpis.filter((k) => k.quarter === "Q1").length,
      Q2: kpis.filter((k) => k.quarter === "Q2").length,
      Q3: kpis.filter((k) => k.quarter === "Q3").length,
      Q4: kpis.filter((k) => k.quarter === "Q4").length,
    };

    return { total, approved, pending, revision, byQuarter };
  }, [kpis]);

  if (loading) return <div className="hr-loading">Loading HR Dashboard...</div>;

  return (
    <div className="hr-dashboard">
      <h1>HR Dashboard</h1>
      <p className="subtitle">Organization KPI Overview</p>

      {/* TOP STATS */}
      <div className="hr-stats">
        <div className="stat-card">
          <span className="value">{employeesCount}</span>
          <span className="label">Employees</span>
        </div>
        <div className="stat-card">
          <span className="value">{stats.total}</span>
          <span className="label">Total KPIs</span>
        </div>
        <div className="stat-card green">
          <span className="value">{stats.approved}</span>
          <span className="label">Approved</span>
        </div>
        <div className="stat-card orange">
          <span className="value">{stats.pending}</span>
          <span className="label">Pending</span>
        </div>
        <div className="stat-card red">
          <span className="value">{stats.revision}</span>
          <span className="label">Needs Revision</span>
        </div>
      </div>

      {/* KPI BY QUARTER */}
      <div className="quarter-section">
        <h3>KPIs by Quarter</h3>
        <div className="quarter-grid">
          {Object.entries(stats.byQuarter).map(([q, v]) => (
            <div key={q} className="quarter-card">
              <span className="quarter">{q}</span>
              <span className="count">{v} KPIs</span>
            </div>
          ))}
        </div>
      </div>

      {/* INSIGHTS */}
      <div className="insights">
        <h3>Insights</h3>
        <ul>
          <li>
            {stats.pending > stats.approved
              ? "Many KPIs are still awaiting approval."
              : "Most KPIs have been approved this quarter."}
          </li>
          <li>Quarter-based KPI tracking is active.</li>
          <li>Managers are responsible for final approvals.</li>
        </ul>
      </div>
    </div>
  );
};

export default HRDashboard;
