import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import QuarterFilter from "../components/QuarterFilter";
import "./AdminCalibration.css";

type FinalReview = {
  quarter: string;
  year: number;
  performanceCategory: string;
};

const AdminCalibration: React.FC = () => {
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

  const distribution = useMemo(() => {
    return reviews
      .filter(
        (r) => (quarter === "All" || r.quarter === quarter) && r.year === year
      )
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.performanceCategory] =
          (acc[r.performanceCategory] || 0) + 1;
        return acc;
      }, {});
  }, [reviews, quarter, year]);

  return (
    <div className="admin-calibration">
      <h1>Calibration Overview</h1>
      <p className="muted">
        Performance category distribution (read-only).
      </p>

      <QuarterFilter
        selectedQuarter={quarter}
        setQuarter={setQuarter}
        selectedYear={year}
        setYear={setYear}
        availableYears={availableYears}
      />

      <table className="calibration-table">
        <thead>
          <tr>
            <th>Performance Category</th>
            <th>Employees</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(distribution).map(([cat, count]) => (
            <tr key={cat}>
              <td>{cat}</td>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminCalibration;
