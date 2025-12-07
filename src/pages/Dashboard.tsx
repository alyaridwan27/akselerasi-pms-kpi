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
import "./Dashboard.css";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import dayjs from "dayjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface KPI {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
}

interface UpdateLog {
  id: string;
  kpiId: string;
  newValue: number;
  timestamp: any;
}

const MONTH_COUNT = 6;

const Dashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [updates, setUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load Data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      try {
        // Load KPIs
        const kpiRef = collection(db, "kpis");
        const q1 = query(kpiRef, where("ownerId", "==", user.uid));
        const snap = await getDocs(q1);

        const kpiList: KPI[] = snap.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            title: d.title ?? "Untitled KPI",
            currentValue: d.currentValue ?? 0,
            targetValue: d.targetValue ?? 0,
            unit: d.unit ?? "",
          };
        });

        setKpis(kpiList);

        // Load Updates
        const updatesRef = collection(db, "progressUpdates");
        if (kpiList.length > 0) {
          const updQuery = query(
            updatesRef,
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(10)
          );
          const updSnap = await getDocs(updQuery);

          const updatesList: UpdateLog[] = updSnap.docs.map((doc) => {
            const d = doc.data() as any;
            return {
              id: doc.id,
              kpiId: d.kpiId,
              newValue: d.newValue,
              timestamp: d.timestamp ?? null,
            };
          });

          setUpdates(updatesList);
        } else {
          setUpdates([]);
        }
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // 2. Stats Calculation
  const stats = useMemo(() => {
    const total = kpis.length;
    const completed = kpis.filter(
      (k) => k.targetValue > 0 && k.currentValue >= k.targetValue
    ).length;

    const avgProgress =
      total > 0
        ? Math.round(
            (kpis.reduce((sum, k) => {
              const pct =
                k.targetValue === 0
                  ? 0
                  : Math.min(1, k.currentValue / k.targetValue);
              return sum + pct;
            }, 0) /
              total) *
              100
          )
        : 0;

    let color = "#DC2626";
    if (avgProgress >= 80) color = "#16A34A";
    else if (avgProgress >= 50) color = "#CA8A04";

    return { total, completed, avgProgress, color };
  }, [kpis]);

  // 3. Chart Data
  const { chartData, chartOptions } = useMemo(() => {
    const months = [];
    const now = dayjs();
    for (let i = MONTH_COUNT - 1; i >= 0; i--) {
      months.push(now.subtract(i, "month").format("YYYY-MM"));
    }

    const getTs = (ts: any) =>
      ts?.toDate
        ? ts.toDate().getTime()
        : ts?._seconds
        ? ts._seconds * 1000
        : Date.now();

    const updatesMap = new Map<string, { ts: number; value: number }[]>();
    updates
      .slice()
      .reverse()
      .forEach((u) => {
        const ts = getTs(u.timestamp);
        if (!updatesMap.has(u.kpiId)) updatesMap.set(u.kpiId, []);
        updatesMap.get(u.kpiId)!.push({ ts, value: u.newValue });
      });

    const monthBoundaries = months.map((m) => ({
      end: dayjs(m + "-01")
        .endOf("month")
        .valueOf(),
    }));

    const monthlyAvg = months.map((_, idx) => {
      if (kpis.length === 0) return 0;

      const { end } = monthBoundaries[idx];

      const sumPct = kpis.reduce((acc, kpi) => {
        const kpiUpdates = updatesMap.get(kpi.id) ?? [];
        const lastUpdate = [...kpiUpdates].reverse().find((u) => u.ts <= end);
        const val = lastUpdate ? lastUpdate.value : kpi.currentValue ?? 0;
        const pct =
          kpi.targetValue > 0 ? Math.min(100, (val / kpi.targetValue) * 100) : 0;
        return acc + pct;
      }, 0);

      return Math.round(sumPct / kpis.length);
    });

    return {
      chartData: {
        labels: months.map((m) => dayjs(m + "-01").format("MMM")),
        datasets: [
          {
            label: "Avg Completion %",
            data: monthlyAvg,
            fill: true,
            tension: 0.4,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            pointRadius: 4,
            pointBackgroundColor: "#fff",
            pointBorderColor: "#2563eb",
            pointBorderWidth: 2,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "#1e293b",
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx: any) => `${ctx.parsed.y}% Avg. Completion`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
          y: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20, callback: (v: any) => `${v}%` },
            border: { display: false },
            grid: { color: "#f1f5f9" },
          },
        },
      },
    };
  }, [kpis, updates]);

  const getKpiName = (id: string) =>
    kpis.find((k) => k.id === id)?.title || "Unknown KPI";

  if (!user)
    return <div className="dashboard-container"><p>Please sign in.</p></div>;
  if (loading)
    return <div className="dashboard-container"><p>Loading dashboard...</p></div>;

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="header">
        <div>
          <h2>Hello, {user.displayName || user.email} 👋</h2>
          <p className="subtitle">Here is what's happening today.</p>
        </div>

        <div className="header-stats">
          <div className="stat-pill">
            <span className="stat-val">{stats.total}</span>
            <span className="stat-lbl">Total</span>
          </div>
          <div className="stat-pill">
            <span className="stat-val">{stats.completed}</span>
            <span className="stat-lbl">Done</span>
          </div>
          <div className="stat-pill">
            <span className="stat-val" style={{ color: stats.color }}>
              {stats.avgProgress}%
            </span>
            <span className="stat-lbl">Avg</span>
          </div>
        </div>
      </header>

      {/* SECTION 1: CHART (Full Width) */}
      <div className="card chart-card">
        <div className="card-header">
          <h3>Performance Trend</h3>
          <p className="muted">Average completion rate (Last 6 Months)</p>
        </div>
        <div className="chart-wrapper">
          <Line data={chartData} options={chartOptions as any} />
        </div>
      </div>

      {/* SECTION 2: QUICK ACTIONS (Horizontal Bar) */}
      <div className="card quick-actions-bar">
        <div className="qa-text">
          <h3>Quick Actions</h3>
          <p>
            You have <strong>{stats.total - stats.completed}</strong> active KPIs
            pending.
          </p>
        </div>

        <div className="qa-buttons">
          <button
            className="btn-primary"
            onClick={() => (window.location.href = "/my-kpis")}
          >
            Update KPIs
          </button>
          <button
            className="btn-secondary"
            onClick={() => (window.location.href = "/my-reports")}
          >
            Reports
          </button>
        </div>

        <div className="qa-tip">
          <span className="tip-icon">💡</span>
          <p>Weekly updates improve approval rates.</p>
        </div>
      </div>

      {/* SECTION 3: RECENT UPDATES */}
      <section className="recent-section">
        <h3>Recent Updates</h3>
        {updates.length === 0 ? (
          <div className="empty-state">No recent activity found.</div>
        ) : (
          <div className="updates-list">
            {updates.map((u) => {
              const dateObj = u.timestamp?.toDate
                ? u.timestamp.toDate()
                : new Date();
              return (
                <div className="update-item" key={u.id}>
                  <div className="update-icon">📝</div>
                  <div className="update-content">
                    <div className="update-header">
                      <span className="kpi-name">{getKpiName(u.kpiId)}</span>
                      <span className="update-date">
                        {dayjs(dateObj).format("MMM D, h:mm A")}
                      </span>
                    </div>
                    <div className="update-detail">
                      Updated progress to{" "}
                      <span className="highlight-val">{u.newValue}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;