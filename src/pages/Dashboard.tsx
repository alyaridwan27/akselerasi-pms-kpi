import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import QuarterFilter from "../components/QuarterFilter";
import "./Dashboard.css";
import dayjs from "dayjs";

interface KPI {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  quarter: string;
  year: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Default to current real-world quarter and year
  const [quarter, setQuarter] = useState(`Q${Math.floor(dayjs().month() / 3) + 1}`);
  const [year, setYear] = useState(dayjs().year());
  
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const availableYears = [2024, 2025, 2026];

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const kpiRef = collection(db, "kpis");
        const q = query(kpiRef, where("ownerId", "==", user.uid), where("year", "==", year));
        const snap = await getDocs(q);
        
        const kpiList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as KPI));
        // Filter by the selected quarter
        setKpis(kpiList.filter(k => quarter === "All" || k.quarter === quarter));

        const updatesRef = collection(db, "progressUpdates");
        const updQuery = query(
          updatesRef,
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(5)
        );
        const updSnap = await getDocs(updQuery);
        setUpdates(updSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, quarter, year]);

  const stats = useMemo(() => {
    const total = kpis.length;
    const completed = kpis.filter(k => k.targetValue > 0 && k.currentValue >= k.targetValue).length;
    const avgProgress = total > 0 
      ? Math.round((kpis.reduce((sum, k) => sum + (Math.min(1, k.currentValue / k.targetValue)), 0) / total) * 100)
      : 0;
    return { total, completed, avgProgress };
  }, [kpis]);

  if (loading) return <div className="dashboard-container"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard-container">
      {/* Header with Filter */}
      <header className="header">
        <div className="welcome-text">
          <h2>Hello, {user?.displayName || "Employee"}</h2>
          <p className="subtitle">Overview for <strong>{quarter} {year}</strong></p>
        </div>
        <QuarterFilter 
          selectedQuarter={quarter} 
          setQuarter={setQuarter} 
          selectedYear={year} 
          setYear={setYear} 
          availableYears={availableYears} 
        />
      </header>

      {/* Top Stat Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total KPIs</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <div className="gauge-display">
            <span className="gauge-value">{stats.avgProgress}%</span>
          </div>
          <span className="stat-label">Overall Progress</span>
        </div>
      </div>

      {/* KPI Breakdown */}
      <div className="content-card">
        <h3 className="section-title">{quarter} KPI Breakdown</h3>
        <div className="kpi-list">
          {kpis.length === 0 ? (
            <p className="muted">No KPIs found for this period.</p>
          ) : (
            kpis.map(k => (
              <div key={k.id} className="kpi-item">
                <div className="kpi-main-info">
                  <span className="kpi-name">{k.title}</span>
                  <span className="kpi-percent">{Math.round((k.currentValue/k.targetValue)*100)}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${Math.min(100, (k.currentValue/k.targetValue)*100)}%` }}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="content-card">
        <h3 className="section-title">Recent Activity</h3>
        <div className="activity-list">
          {updates.length === 0 ? (
            <p className="muted">No recent updates.</p>
          ) : (
            updates.map(u => (
              <div className="activity-item" key={u.id}>
                <div className="activity-details">
                  <p>Updated <strong>{kpis.find(k => k.id === u.kpiId)?.title || "KPI"}</strong></p>
                  <span className="activity-time">{dayjs(u.timestamp?.toDate()).format("MMM D, YYYY")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;