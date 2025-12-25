import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import QuarterFilter from "../components/QuarterFilter";
import "./AdminDashboard.css";

type FinalReview = {
  employeeId: string;
  employeeName: string;
  quarter: string;
  year: number;
  finalScore: number;
  performanceCategory: string;
};

const AdminDashboard: React.FC = () => {
  const [reviews, setReviews] = useState<FinalReview[]>([]);
  const [quarter, setQuarter] = useState("All");
  const [year, setYear] = useState(new Date().getFullYear());

  const availableYears = [2023, 2024, 2025];

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "finalReviews"));
      setReviews(snap.docs.map((d) => d.data() as FinalReview));
    };
    load();
  }, []);

  const visible = useMemo(
    () =>
      reviews.filter(
        (r) => (quarter === "All" || r.quarter === quarter) && r.year === year
      ),
    [reviews, quarter, year]
  );

  const stats = useMemo(() => {
    const total = visible.length;

    const categories = visible.reduce<Record<string, number>>((acc, r) => {
      acc[r.performanceCategory] =
        (acc[r.performanceCategory] || 0) + 1;
      return acc;
    }, {});

    return { total, categories };
  }, [visible]);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p className="muted">
        Organization-wide performance overview (read-only).
      </p>

      <QuarterFilter
        selectedQuarter={quarter}
        setQuarter={setQuarter}
        selectedYear={year}
        setYear={setYear}
        availableYears={availableYears}
      />

      {/* KPI STATS */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Finalized Reviews</span>
          <span className="stat-value">{stats.total}</span>
        </div>

        {Object.entries(stats.categories).map(([cat, count]) => (
          <div key={cat} className="stat-card">
            <span className="stat-label">{cat}</span>
            <span className="stat-value">{count}</span>
          </div>
        ))}
      </div>

      {/* REVIEW CYCLE STATUS */}
      <div className="card">
        <h3>Review Cycle Status</h3>
        <ul className="status-list">
          <li>✔ KPI Setting (Completed)</li>
          <li>✔ Employee Updates</li>
          <li>✔ Manager Review</li>
          <li>✔ HR Finalization</li>
          <li>✔ Rewards Assignment</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
