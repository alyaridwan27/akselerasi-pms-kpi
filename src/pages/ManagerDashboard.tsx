// src/pages/ManagerDashboard.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./ManagerDashboard.css";
import { useNavigate } from "react-router-dom";
import ManagerCreateKPIModal from "../components/ManagerCreateKPIModal";


type KPIItem = {
  id: string;
  ownerId: string;
  title: string;
  currentValue: number;
  targetValue: number;
  weight?: number;
  status?: string;
};

type ProgressUpdate = {
  id: string;
  kpiId: string;
  newValue: number;
  timestamp?: any;
};

const CHUNK = 10; // Firestore 'in' supports up to 10 items per query

function chunkArray<T>(arr: T[], n = CHUNK) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const ManagerDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<{ id: string; displayName: string }[]>([]);
  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<{ id: string; name?: string } | null>(null);


  // Aggregates
  const totalKPIs = kpis.length;
  const completedKPIs = kpis.filter(k => (k.status === "Completed" || (k.targetValue > 0 && k.currentValue >= k.targetValue))).length;

  // Weighted overall progress: sum(weight * pct) / sum(weights) if weights present else simple average
  const overallProgressPct = React.useMemo(() => {
    if (kpis.length === 0) return 0;
    const withWeights = kpis.filter(k => typeof k.weight === "number" && k.weight > 0);
    if (withWeights.length > 0) {
      const totalWeight = withWeights.reduce((s, k) => s + (k.weight ?? 0), 0);
      if (totalWeight <= 0) return 0;
      const weightedSum = withWeights.reduce((s, k) => {
        const pct = k.targetValue === 0 ? 0 : Math.min(1, k.currentValue / k.targetValue);
        return s + pct * (k.weight ?? 0);
      }, 0);
      return Math.round((weightedSum / totalWeight) * 100);
    }
    // fallback: simple average
    const avg = kpis.reduce((s, k) => {
      const pct = k.targetValue === 0 ? 0 : Math.min(1, k.currentValue / k.targetValue);
      return s + pct;
    }, 0) / kpis.length;
    return Math.round(avg * 100);
  }, [kpis]);

  const pendingApprovals = kpis.filter(k => k.status === "PendingReview" || k.status === "PendingApproval");

  useEffect(() => {
    if (!user) return;
    if (role !== "Manager") {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Load users where managerId == current user
        const usersRef = collection(db, "users");
        const qUsers = query(usersRef, where("managerId", "==", user.uid));
        const usersSnap = await getDocs(qUsers);
        const members = usersSnap.docs.map(d => ({
          id: d.id,
          displayName: (d.data() as any).displayName ?? d.id,
        }));
        setTeamMembers(members);

        if (members.length === 0) {
          setKpis([]);
          setUpdates([]);
          setLoading(false);
          return;
        }

        // 2) Load KPIs for these members (use chunked 'in' queries)
        const memberIds = members.map(m => m.id);
        const chunks = chunkArray(memberIds);
        const allKpis: KPIItem[] = [];
        for (const ch of chunks) {
          const kpiRef = collection(db, "kpis");
          const q = query(kpiRef, where("ownerId", "in", ch));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const data = doc.data() as any;
            allKpis.push({
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title ?? "Untitled KPI",
              currentValue: data.currentValue ?? 0,
              targetValue: data.targetValue ?? 0,
              weight: typeof data.weight === "number" ? data.weight : undefined,
              status: data.status ?? "Active",
            });
          });
        }
        setKpis(allKpis);

        // 3) Load recent progress updates for these KPI ids (again chunk)
        const kpiIds = allKpis.map(k => k.id);
        const updList: ProgressUpdate[] = [];
        if (kpiIds.length > 0) {
          const kpiChunks = chunkArray(kpiIds);
          for (const ch of kpiChunks) {
            const updRef = collection(db, "progressUpdates");
            // orderBy timestamp desc and limit per chunk
            const q = query(updRef, where("kpiId", "in", ch), orderBy("timestamp", "desc"), limit(20));
            const usnap = await getDocs(q);
            usnap.forEach(d => {
              const data = d.data() as any;
              updList.push({
                id: d.id,
                kpiId: data.kpiId,
                newValue: data.newValue,
                timestamp: data.timestamp,
              });
            });
          }
          // Sort across chunks by timestamp desc and keep top 10
          updList.sort((a, b) => {
            const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp?._seconds || 0) * 1000;
            const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp?._seconds || 0) * 1000;
            return tb - ta;
          });
        }
        setUpdates(updList.slice(0, 10));
      } catch (e: any) {
        console.error("Manager dashboard load error", e);
        setError(e.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, role]);

  if (!user) return <div className="mgr-loading">Please sign in.</div>;
  if (role !== "Manager") return <div className="mgr-loading">You are not a manager.</div>;
  if (loading) return <div className="mgr-loading">Loading manager dashboard...</div>;

  return (
    <div className="manager-dashboard">
      <div className="mgr-header">
        <h1>Welcome, {user.email}</h1>
        <p className="mgr-role">Role: Manager</p>
      </div>

      {error && <div className="mgr-error">Error: {error}</div>}

      <div className="mgr-cards">
        <div className="card">
          <div className="card-icon">👥</div>
          <div className="card-body">
            <div className="card-number">{teamMembers.length}</div>
            <div className="card-label">Team Members</div>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📋</div>
          <div className="card-body">
            <div className="card-number">{totalKPIs}</div>
            <div className="card-label">Team KPIs</div>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">✅</div>
          <div className="card-body">
            <div className="card-number">{completedKPIs}</div>
            <div className="card-label">Completed KPIs</div>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">⚠️</div>
          <div className="card-body">
            <div className="card-number">{pendingApprovals.length}</div>
            <div className="card-label">Pending Approvals</div>
          </div>
        </div>
      </div>

      <div className="mgr-progress-section">
        <h3>Overall Team Progress</h3>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${overallProgressPct}%` }} />
        </div>
        <div className="progress-text">{overallProgressPct}% completed</div>
      </div>

      <div className="mgr-lists">
        <div className="updates-panel">
          <h3>Recent KPI Updates</h3>
          {updates.length === 0 && <div className="muted">No updates yet.</div>}
          {updates.map(u => (
            <div key={u.id} className="update-row">
              <div className="u-left">
                <div className="u-kpi">KPI: {u.kpiId}</div>
                <div className="u-val">New: {u.newValue}</div>
                <div className="u-ts">{u.timestamp?.toDate ? u.timestamp.toDate().toLocaleString() : (u.timestamp?._seconds ? new Date(u.timestamp._seconds * 1000).toLocaleString() : "—")}</div>
              </div>
              <div className="u-actions">
                <button onClick={() => navigate(`/manager/kpis/${/* owner id unknown here */ ""}`)}>Open</button>
              </div>
            </div>
          ))}
        </div>

        <div className="team-panel">
          <h3>Team Members</h3>
          {teamMembers.length === 0 && <div className="muted">No team members assigned.</div>}
          <div className="team-grid">
            {teamMembers.map(m => (
              <div className="team-card" key={m.id}>
                <div className="team-name">{m.displayName}</div>
                <div className="team-actions">
                  <button onClick={() => navigate(`/manager/kpis/${m.id}`)}>View KPIs</button>
                  <button
                      className="secondary"
                      onClick={() => setCreatingFor({ id: m.id, name: m.displayName })}
                    >
                      Create KPI
                    </button>
                </div>
              </div>
            ))}
          </div>
          {creatingFor && (
            <ManagerCreateKPIModal
              ownerId={creatingFor.id}
              ownerName={creatingFor.name}
              onClose={() => setCreatingFor(null)}
              onCreated={() => setCreatingFor(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
