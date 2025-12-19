// src/pages/HRFinalReview.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import QuarterFilter from "../components/QuarterFilter";
import "./HRFinalReview.css";

type KPI = {
  ownerId: string;
  ownerName: string;
  quarter: string;
  year: number;
  currentValue: number;
  targetValue: number;
};

type FinalReview = {
  employeeId: string;
  quarter: string;
  year: number;
};

const getPerformanceCategory = (score: number) => {
  if (score >= 90) return "Outstanding";
  if (score >= 75) return "Good";
  if (score >= 60) return "Satisfactory";
  return "Needs Improvement";
};

const HRFinalReview: React.FC = () => {
  const { user } = useAuth();

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [finalized, setFinalized] = useState<FinalReview[]>([]);
  const [quarter, setQuarter] = useState("All");
  const [year, setYear] = useState(new Date().getFullYear());

  const availableYears = [2023, 2024, 2025];

  const getCurrentQuarter = () => {
    const m = new Date().getMonth();
    return `Q${Math.floor(m / 3) + 1}`;
  };

  const loadData = async () => {
    const kpiSnap = await getDocs(collection(db, "kpis"));
    setKpis(kpiSnap.docs.map((d) => d.data() as KPI));

    const reviewSnap = await getDocs(collection(db, "finalReviews"));
    setFinalized(reviewSnap.docs.map((d) => d.data() as FinalReview));
  };

  useEffect(() => {
    loadData();
  }, []);

  const employees = useMemo(() => {
    const map = new Map<string, KPI[]>();

    kpis
      .filter(
        (k) =>
          (quarter === "All" || k.quarter === quarter) && k.year === year
      )
      .forEach((k) => {
        if (!map.has(k.ownerId)) map.set(k.ownerId, []);
        map.get(k.ownerId)!.push(k);
      });

    return Array.from(map.entries());
  }, [kpis, quarter, year]);

  const finalizeReview = async (
    employeeId: string,
    employeeName: string,
    employeeKpis: KPI[]
  ) => {
    const targetQuarter = quarter === "All" ? getCurrentQuarter() : quarter;

    const kpiScore =
      Math.round(
        employeeKpis.reduce((sum, k) => {
          const pct =
            k.targetValue > 0
              ? Math.min(100, (k.currentValue / k.targetValue) * 100)
              : 0;
          return sum + pct;
        }, 0) / employeeKpis.length
      ) || 0;

    const feedbackScore = 80; // Placeholder (360 integration later)
    const finalScore = Math.round(kpiScore * 0.7 + feedbackScore * 0.3);
    const category = getPerformanceCategory(finalScore);

    await addDoc(collection(db, "finalReviews"), {
      employeeId,
      employeeName,
      quarter: targetQuarter,
      year,
      kpiScore,
      feedbackScore,
      finalScore,
      performanceCategory: category,
      finalizedBy: user?.uid,
      finalizedAt: serverTimestamp(),
    });

    alert(`Final review finalized for ${employeeName}`);
    loadData();
  };

  return (
    <div className="hr-final-review">
      <h1>Final Performance Reviews</h1>

      <QuarterFilter
        selectedQuarter={quarter}
        setQuarter={setQuarter}
        selectedYear={year}
        setYear={setYear}
        availableYears={availableYears}
      />

      <table className="review-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>KPI Avg</th>
            <th>360°</th>
            <th>Final Score</th>
            <th>Category</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(([id, list]) => {
            const kpiAvg =
              Math.round(
                list.reduce((s, k) => {
                  const pct =
                    k.targetValue > 0
                      ? Math.min(100, (k.currentValue / k.targetValue) * 100)
                      : 0;
                  return s + pct;
                }, 0) / list.length
              ) || 0;

            const finalScore = Math.round(kpiAvg * 0.7 + 80 * 0.3);
            const category = getPerformanceCategory(finalScore);
            const targetQ = quarter === "All" ? getCurrentQuarter() : quarter;

            const isFinalized = finalized.some(
              (f) =>
                f.employeeId === id &&
                f.quarter === targetQ &&
                f.year === year
            );

            return (
              <tr key={id}>
                <td>{list[0].ownerName}</td>
                <td>{kpiAvg}%</td>
                <td>80%</td>
                <td>
                  <strong>{finalScore}</strong>
                </td>
                <td>{category}</td>
                <td>
                  <button
                    disabled={isFinalized}
                    onClick={() =>
                      finalizeReview(id, list[0].ownerName, list)
                    }
                    style={{
                      opacity: isFinalized ? 0.6 : 1,
                      cursor: isFinalized ? "not-allowed" : "pointer",
                    }}
                  >
                    {isFinalized ? "Finalized" : "Finalize"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default HRFinalReview;
