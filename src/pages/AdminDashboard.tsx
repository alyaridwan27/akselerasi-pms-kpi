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
      setReviews(snap.docs.map(d => d.data() as FinalReview));
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return reviews.filter(
      r => (quarter === "All" || r.quarter === quarter) && r.year === year
    );
  }, [reviews, quarter, year]);

  const stats = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;

    filtered.forEach(r => {
      map[r.performanceCategory] =
        (map[r.performanceCategory] || 0) + 1;
      total += r.finalScore;
    });

    return {
      distribution: map,
      average: filtered.length
        ? Math.round(total / filtered.length)
        : 0,
      totalEmployees: filtered.length,
    };
  }, [filtered]);

  return (
    <div className="admin-dashboard">
      <h1>Organization Analytics</h1>

      <QuarterFilter
        selectedQuarter={quarter}
        setQuarter={setQuarter}
        selectedYear={year}
        setYear={setYear}
        availableYears={availableYears}
      />

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Employees Reviewed</h3>
          <p>{stats.totalEmployees}</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p>{stats.average}</p>
        </div>
      </div>

      {/* Distribution */}
      <div className="distribution-card">
        <h3>Performance Distribution</h3>
        <ul>
          {Object.entries(stats.distribution).map(([cat, count]) => (
            <li key={cat}>
              <strong>{cat}</strong>: {count}
            </li>
          ))}
        </ul>
      </div>

      {/* Read-only table */}
      <table className="review-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Final Score</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, idx) => (
            <tr key={idx}>
              <td>{r.employeeName}</td>
              <td>{r.finalScore}</td>
              <td>{r.performanceCategory}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
