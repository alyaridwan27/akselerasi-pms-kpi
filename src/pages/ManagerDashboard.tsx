// src/pages/ManagerDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import KPIDetailModal from "../components/KPIDetailModal";
import QuarterBadge from "../components/QuarterBadge";
import "./ManagerDashboard.css";

type KPIItem = {
  id: string;
  ownerId: string;
  title: string;
  currentValue: number;
  targetValue: number;
  weight: number;
  status: string;
  year: number;
  quarter: string;
};

type ProgressUpdate = {
  id: string;
  kpiId: string;
  newValue: number;
  timestamp: any;
  year: number;
  quarter: string;
};

const CHUNK = 10;
function chunkArray<T>(arr: T[], size = CHUNK) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ManagerDashboard: React.FC = () => {
  const { user, role } = useAuth();

  const [teamMembers, setTeamMembers] = useState<
    { id: string; displayName: string }[]
  >([]);

  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailKPI, setDetailKPI] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("All");

  // --------------------------
  // LOAD DATA
  // --------------------------
  useEffect(() => {
    if (!user) return;
    if (role !== "Manager") {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Load team members
        const usersRef = collection(db, "users");
        const qUsers = query(usersRef, where("managerId", "==", user.uid));
        const snapUsers = await getDocs(qUsers);

        const members = snapUsers.docs.map((d) => ({
          id: d.id,
          displayName: d.data().displayName || "Unnamed",
        }));
        setTeamMembers(members);

        if (members.length === 0) {
          setKpis([]);
          setUpdates([]);
          setLoading(false);
          return;
        }

        // 2) Load KPIs for these users
        const memberIds = members.map((m) => m.id);
        const chunks = chunkArray(memberIds);
        const allK: KPIItem[] = [];

        for (const c of chunks) {
          const kRef = collection(db, "kpis");
          const qK = query(kRef, where("ownerId", "in", c));
          const snap = await getDocs(qK);

          snap.forEach((doc) => {
            const d = doc.data() as any;
            allK.push({
              id: doc.id,
              ownerId: d.ownerId,
              title: d.title,
              currentValue: d.currentValue,
              targetValue: d.targetValue,
              weight: d.weight,
              status: d.status,
              year: d.year,
              quarter: d.quarter,
            });
          });
        }

        setKpis(allK);

        // 3) Load updates
        const kpiIds = allK.map((k) => k.id);
        const updChunks = chunkArray(kpiIds);
        const updList: ProgressUpdate[] = [];

        for (const chunk of updChunks) {
          const updRef = collection(db, "progressUpdates");
          const qUpd = query(
            updRef,
            where("kpiId", "in", chunk),
            orderBy("timestamp", "desc"),
            limit(20)
          );
          const snap = await getDocs(qUpd);

          snap.forEach((d) => {
            const u = d.data() as any;
            updList.push({
              id: d.id,
              kpiId: u.kpiId,
              newValue: u.newValue,
              timestamp: u.timestamp,
              year: u.year || 0,
              quarter: u.quarter || "Q?",
            });
          });
        }

        updList.sort((a, b) => {
          const ta = a.timestamp?.toDate?.().getTime?.() ?? 0;
          const tb = b.timestamp?.toDate?.().getTime?.() ?? 0;
          return tb - ta;
        });

        setUpdates(updList.slice(0, 10));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, role]);

  // --------------------------
  // DERIVED VALUES (SAFE)
  // --------------------------
  const availableYears = useMemo(() => {
    const yrs = Array.from(new Set(kpis.map((k) => k.year))).sort();
    return yrs.length > 0 ? yrs : [new Date().getFullYear()];
  }, [kpis]);

  // Fix year state **in effect**, NOT during render
  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredKPIs = useMemo(() => {
    return kpis.filter((k) => {
      const matchYear = k.year === selectedYear;
      const matchQuarter =
        selectedQuarter === "All" || k.quarter === selectedQuarter;
      return matchYear && matchQuarter;
    });
  }, [kpis, selectedYear, selectedQuarter]);

  const totalKPIs = filteredKPIs.length;
  const approvedKPIs = filteredKPIs.filter((k) => k.status === "Approved").length;
  const pendingKPIs = filteredKPIs.filter((k) => k.status === "PendingReview").length;
  const needsRevision = filteredKPIs.filter((k) => k.status === "NeedsRevision").length;

  // Donut chart
  const totalStatus = approvedKPIs + pendingKPIs + needsRevision || 1;
  const degApproved = (approvedKPIs / totalStatus) * 360;
  const degPending = (pendingKPIs / totalStatus) * 360;

  const gradientStyle = {
    background: `conic-gradient(
      #10b981 0deg ${degApproved}deg,
      #f59e0b ${degApproved}deg ${degApproved + degPending}deg,
      #ef4444 ${degApproved + degPending}deg 360deg
    )`,
  };

  // --------------------------
  // RENDER
  // --------------------------
  if (loading) return <div className="mgr-loading">Loading...</div>;
  if (role !== "Manager") return <div>You are not a manager.</div>;

  return (
    <div className="manager-dashboard">
      <div className="mgr-header">
        <h1>Team Dashboard</h1>

        {/* Filters */}
        <div className="filters">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>

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
        </div>
      </div>

      {/* KPI SUMMARY */}
      <div className="dashboard-top-section">
        <div className="stats-cards-left">
          <div className="card">
            <div className="card-number">{teamMembers.length}</div>
            <div className="card-label">Team Members</div>
          </div>
          <div className="card">
            <div className="card-number">{totalKPIs}</div>
            <div className="card-label">Total KPIs</div>
          </div>
        </div>

        <div className="donut-card">
          <div className="donut-chart-container">
            <div className="donut-chart" style={gradientStyle}>
              <div className="donut-hole">
                <span>{totalStatus}</span>
              </div>
            </div>
          </div>

          <div className="donut-legend">
            <div className="legend-item">
              <span className="dot dot-green"></span> Approved: {approvedKPIs}
            </div>
            <div className="legend-item">
              <span className="dot dot-orange"></span> Pending: {pendingKPIs}
            </div>
            <div className="legend-item">
              <span className="dot dot-red"></span> Revision: {needsRevision}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="updates-panel">
        <h3>Recent KPI Updates</h3>

        {updates.map((u) => (
          <div key={u.id} className="update-row">
            <div>
              <div className="u-kpi">
                {u.kpiId} <QuarterBadge quarter={u.quarter} year={u.year} />
              </div>
              <div className="u-val">New Value: {u.newValue}</div>
              <div className="u-ts">
                {u.timestamp?.toDate?.().toLocaleString?.()}
              </div>
            </div>
            <button className="open-btn" onClick={() => setDetailKPI(u.kpiId)}>
              Open
            </button>
          </div>
        ))}
      </div>

      {/* Team Section */}
      <div className="team-panel">
        <h3>Team Members</h3>
        {teamMembers.map((m) => (
          <div key={m.id} className="team-card">
            <div className="team-name">{m.displayName}</div>

            <div className="team-actions">
              <button
                className="secondary"
                onClick={() => (window.location.href = `/manager/kpis/${m.id}`)}
              >
                View KPIs
              </button>

              <button onClick={() => (window.location.href = "/manager/team")}>
                Assign KPI
              </button>
            </div>
          </div>
        ))}
      </div>

      {detailKPI && (
        <KPIDetailModal kpiId={detailKPI} onClose={() => setDetailKPI(null)} />
      )}
    </div>
  );
};

export default ManagerDashboard;
