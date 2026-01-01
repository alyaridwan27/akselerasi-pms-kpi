import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { FiBarChart2, FiUsers, FiCheckCircle, FiClock, FiActivity } from "react-icons/fi";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';

// Reusable Components
import StatusBadge from "../components/StatusBadge";
import QuarterBadge from "../components/QuarterBadge";
import QuarterFilter from "../components/QuarterFilter";
import "./ManagerAnalytics.css";

const ManagerAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = useState("Q4");
  const [selectedYear, setSelectedYear] = useState(2025); // Set to 2025 to match your existing data
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch employees managed by this user
      const empSnap = await getDocs(query(collection(db, "users"), where("managerId", "==", user.uid)));
      const employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Fetch all KPIs for the selected period
      const kpiSnap = await getDocs(query(
        collection(db, "kpis"), 
        where("year", "==", selectedYear),
        where("quarter", "==", selectedQuarter)
      ));
      const allKpis = kpiSnap.docs.map(d => d.data());

      // 3. Fetch Finalized Reviews to track completion
      const reviewSnap = await getDocs(query(
        collection(db, "finalReviews"),
        where("year", "==", selectedYear),
        where("quarter", "==", selectedQuarter)
      ));
      const finalizedIds = reviewSnap.docs.map(d => d.data().employeeId);

      // 4. Map data for the table and chart
      const stats = employees.map((emp: any) => {
        const empKpis = allKpis.filter(k => k.ownerId === emp.id);
        
        // Calculate weighted score based on KPI current vs target
        const totalScore = empKpis.reduce((acc, k) => {
          const pct = k.targetValue > 0 ? (k.currentValue / k.targetValue) : 0;
          return acc + (pct * (k.weight || 0));
        }, 0);

        return {
          id: emp.id,
          name: emp.displayName || "Unknown",
          score: Math.round(totalScore),
          isFinalized: finalizedIds.includes(emp.id),
          kpiCount: empKpis.length,
          // Use StatusBadge logic for individual status
          status: finalizedIds.includes(emp.id) ? "Approved" : (empKpis.length > 0 ? "PendingReview" : "Active")
        };
      });

      setTeamStats(stats);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [user, selectedQuarter, selectedYear]);

  if (loading) return <div className="analytics-loading-state">Analyzing team performance...</div>;

  return (
    <div className="manager-analytics-page">
      <div className="analytics-container">
        <div className="analytics-header-section">
          <div>
            <h1><FiBarChart2 /> Team Analytics</h1>
            <p className="subtitle">Performance overview for managed subordinates</p>
          </div>
          <QuarterFilter 
            selectedQuarter={selectedQuarter} 
            setQuarter={setSelectedQuarter}
            selectedYear={selectedYear} 
            setYear={setSelectedYear}
            availableYears={[2024, 2025, 2026]}
          />
        </div>

        <div className="summary-cards-grid">
          <div className="stat-card-item">
            <div className="stat-icon-wrapper blue"><FiUsers /></div>
            <div className="stat-content">
              <span className="stat-label">Total Team</span>
              <span className="stat-number">{teamStats.length} Members</span>
            </div>
          </div>
          <div className="stat-card-item">
            <div className="stat-icon-wrapper green"><FiCheckCircle /></div>
            <div className="stat-content">
              <span className="stat-label">Finalized Reviews</span>
              <span className="stat-number">{teamStats.filter(s => s.isFinalized).length} Completed</span>
            </div>
          </div>
          <div className="stat-card-item">
            <div className="stat-icon-wrapper orange"><FiActivity /></div>
            <div className="stat-content">
              <span className="stat-label">Avg. Performance</span>
              <span className="stat-number">
                {teamStats.length > 0 
                  ? Math.round(teamStats.reduce((a, b) => a + b.score, 0) / teamStats.length) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="analytics-content-grid">
          <div className="chart-wrapper-card">
            <h3>Performance Distribution (%)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                    {teamStats.map((entry, index) => (
                      <Cell key={index} fill={entry.isFinalized ? "#10b981" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-wrapper-card">
            <div className="card-header">
              <h3>Employee Status Tracker</h3>
            </div>
            <div className="table-responsive">
              <table className="analytics-data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Period</th>
                    <th>Score</th>
                    <th>Review Status</th>
                    <th>Finalized</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.length === 0 ? (
                    <tr><td colSpan={5} className="empty-table">No data found for this period.</td></tr>
                  ) : (
                    teamStats.map(emp => (
                      <tr key={emp.id}>
                        <td><span className="emp-name">{emp.name}</span></td>
                        <td><QuarterBadge quarter={selectedQuarter} year={selectedYear} /></td>
                        <td><span className="score-badge">{emp.score}%</span></td>
                        <td><StatusBadge status={emp.status} /></td>
                        <td>
                          {emp.isFinalized ? 
                            <span className="completion-tag done">Finalized</span> : 
                            <span className="completion-tag pending"><FiClock /> In Progress</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerAnalytics;