import React, { useEffect, useState } from "react";
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
import "./Dashboard.css";
import { FiTrendingUp, FiCheckCircle, FiPercent, FiActivity } from "react-icons/fi";


interface KPI {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

interface UpdateLog {
  id: string;
  kpiId: string;
  newValue: number;
  timestamp: any;
}

const Dashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [updates, setUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      // Load KPIs
      const kpiRef = collection(db, "kpis");
      const q1 = query(kpiRef, where("ownerId", "==", user.uid));
      const snap = await getDocs(q1);

      const kpiList: KPI[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          title: d.title,
          currentValue: d.currentValue,
          targetValue: d.targetValue,
          unit: d.unit ?? "",
        };
      });

      setKpis(kpiList);

      // Load recent progress updates
      const updatesRef = collection(db, "progressUpdates");
      const q2 = query(
        updatesRef,
        where("userId", "==", user.uid),
        limit(5)
      );

      const updSnap = await getDocs(q2);


      const updatesList: UpdateLog[] = updSnap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          kpiId: d.kpiId,
          newValue: d.newValue,
          timestamp: d.timestamp?.toDate() ?? null,
        };
      });

      setUpdates(updatesList);
      setLoading(false);
    };

    loadData();
  }, [user]);

  if (loading) return <div>Loading dashboard...</div>;

  // KPI Aggregates
  const totalKPIs = kpis.length;
  const completedKPIs = kpis.filter(
    (k) => k.currentValue >= k.targetValue
  ).length;

  const progressAvg =
    totalKPIs > 0
      ? Math.round(
          (kpis.reduce(
            (sum, k) => sum + k.currentValue / k.targetValue,
            0
          ) /
            totalKPIs) *
            100
        )
      : 0;

  let progressColor = "#DC2626"; // red
  if (progressAvg >= 80) progressColor = "#16A34A"; // green
  else if (progressAvg >= 50) progressColor = "#CA8A04"; // yellow

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h2>Welcome, {user?.email}</h2>
          <p>Role: {role}</p>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <div className="summary-cards">

        <div className="summary-card">
          <FiActivity className="summary-icon" />
          <div className="summary-text">
            <h3>{totalKPIs}</h3>
            <p>Total KPIs</p>
          </div>
        </div>

        <div className="summary-card">
          <FiCheckCircle className="summary-icon" />
          <div className="summary-text">
            <h3>{completedKPIs}</h3>
            <p>Completed KPIs</p>
          </div>
        </div>

        <div className="summary-card">
          <FiTrendingUp className="summary-icon" />
          <div className="summary-text">
            <h3 style={{ color: progressColor }}>{progressAvg}%</h3>
            <p>Overall Progress</p>
          </div>
        </div>

      </div>


      {/* Overall Progress Bar */}
      <div className="progress-section">
        <div className="progress-title">Overall Completion</div>

        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${progressAvg}%`,
              background: progressColor,
            }}
          />
        </div>

        <div className="progress-label">{progressAvg}% completed</div>
      </div>


      {/* Recent Updates */}
      <h3 className="section-title">Recent KPI Updates</h3>

      <div className="updates-list">
        {updates.length === 0 && <p>No updates yet.</p>}

        {updates.map((u) => (
          <div className="update-card" key={u.id}>
            
            <div className="update-info">
              <div className="update-title">Updated KPI {u.kpiId}</div>
              <div className="update-meta">
                New Value: {u.newValue} •{" "}
                {u.timestamp ? u.timestamp.toLocaleString() : "—"}
              </div>
            </div>

            <FiActivity className="update-icon" />

          </div>
        ))}
      </div>


      {/* Quick Links */}
      <div className="quick-links">
        <button onClick={() => (window.location.href = "/my-kpis")}>
          View My KPIs →
        </button>

        <button onClick={() => (window.location.href = "/my-reports")}>
          My Reports →
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
