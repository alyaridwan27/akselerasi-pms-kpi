import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./HRFinalReview.css";
import {
  calculateKPIScore,
  calculateFinalScore,
  mapPerformanceCategory,
} from "../utils/reviewUtils";

type ReviewRow = {
  employeeId: string;
  employeeName: string;
  kpiScore: number;
  feedback360Score: number;
  finalScore: number;
  category: string;
  status: "Draft" | "Finalized";
};

const HRFinalReview: React.FC = () => {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const year = new Date().getFullYear();
  const quarter = "Q4"; // fixed for now (can be dropdown later)

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. Load employees
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "Employee"))
      );

      // 2. Load KPIs
      const kpisSnap = await getDocs(
        query(
          collection(db, "kpis"),
          where("year", "==", year),
          where("quarter", "==", quarter)
        )
      );

      const kpisByEmployee: Record<string, any[]> = {};
      kpisSnap.forEach((d) => {
        const k = d.data();
        if (!kpisByEmployee[k.ownerId]) kpisByEmployee[k.ownerId] = [];
        kpisByEmployee[k.ownerId].push(k);
      });

      // 3. Build rows
      const data: ReviewRow[] = usersSnap.docs.map((u) => {
        const empId = u.id;
        const empName = u.data().displayName || u.data().email;

        const kpis = kpisByEmployee[empId] || [];
        const kpiScore = calculateKPIScore(kpis);

        const feedback360Score = 80; // PLACEHOLDER
        const finalScore = calculateFinalScore(
          kpiScore,
          feedback360Score
        );

        return {
          employeeId: empId,
          employeeName: empName,
          kpiScore,
          feedback360Score,
          finalScore,
          category: mapPerformanceCategory(finalScore),
          status: "Draft",
        };
      });

      setRows(data);
      setLoading(false);
    };

    load();
  }, []);

  const finalize = async (row: ReviewRow) => {
    await setDoc(
      doc(db, "finalReviews", `${row.employeeId}_${year}_${quarter}`),
      {
        ...row,
        year,
        quarter,
        status: "Finalized",
        finalizedAt: serverTimestamp(),
      }
    );

    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === row.employeeId
          ? { ...r, status: "Finalized" }
          : r
      )
    );
  };

  if (loading) return <div>Loading final reviews...</div>;

  return (
    <div className="hr-final-review">
      <h1>Final Performance Review</h1>
      <p className="muted">
        Quarter {quarter} • {year}
      </p>

      <table className="review-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>KPI Score</th>
            <th>360 Feedback</th>
            <th>Final Score</th>
            <th>Category</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.employeeId}>
              <td>{r.employeeName}</td>
              <td>{r.kpiScore}%</td>
              <td>{r.feedback360Score}%</td>
              <td><strong>{r.finalScore}%</strong></td>
              <td>{r.category}</td>
              <td>{r.status}</td>
              <td>
                {r.status === "Draft" && (
                  <button onClick={() => finalize(r)}>
                    Finalize
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HRFinalReview;
