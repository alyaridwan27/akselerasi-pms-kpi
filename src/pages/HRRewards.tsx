import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import QuarterFilter from "../components/QuarterFilter";
import { Link } from "react-router-dom"; // Import Link for routing
import "./HRRewards.css";

type FinalReview = {
  id: string;
  employeeId: string;
  employeeName: string;
  quarter: string;
  year: number;
  finalScore: number;
  performanceCategory: string;
};

const allowedRewards = (category: string) => {
  switch (category) {
    case "Outstanding":
      return ["Bonus", "Promotion", "Recognition"];
    case "Good":
      return ["Bonus", "Recognition"];
    case "Satisfactory":
      return ["Recognition"];
    default:
      return [];
  }
};

const HRRewards: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<FinalReview[]>([]);
  const [quarter, setQuarter] = useState("All");
  const [year, setYear] = useState(new Date().getFullYear());

  const availableYears = [2023, 2024, 2025];

  const load = async () => {
    const snap = await getDocs(collection(db, "finalReviews"));
    setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinalReview)));
  };

  useEffect(() => { load(); }, []);

  const visible = reviews.filter(
    (r) => (quarter === "All" || r.quarter === quarter) && r.year === year
  );

  const assignReward = async (r: FinalReview, type: string) => {
    await addDoc(collection(db, "rewards"), {
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      quarter: r.quarter,
      year: r.year,
      finalScore: r.finalScore,
      performanceCategory: r.performanceCategory,
      rewardType: type,
      decidedBy: user?.uid,
      decidedAt: serverTimestamp(),
    });
    alert(`${type} assigned to ${r.employeeName}`);
  };

  return (
    <div className="hr-rewards-page">
      <div className="page-header">
        <h1>Rewards & Recognition</h1>
        <p className="muted">Rewards are enabled based on finalized performance categories.</p>
      </div>

      <div className="filters">
        <QuarterFilter
          selectedQuarter={quarter}
          setQuarter={setQuarter}
          selectedYear={year}
          setYear={setYear}
          availableYears={availableYears}
        />
      </div>

      <div className="table-card">
        <table className="review-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Final Score</th>
              <th>Category</th>
              <th>Report</th> {/* New Column */}
              <th>Available Rewards</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">No finalized reviews found for this period.</td>
              </tr>
            ) : (
              visible.map((r) => {
                const allowed = allowedRewards(r.performanceCategory);
                return (
                  <tr key={r.id}>
                    <td>{r.employeeName}</td>
                    <td><strong>{r.finalScore}</strong></td>
                    <td>
                      <span className={`badge category-${r.performanceCategory.toLowerCase().replace(" ", "-")}`}>
                        {r.performanceCategory}
                      </span>
                    </td>
                    <td>
                      {/* View Report Link targeting your HR route */}
                      <Link to={`/hr/reports/${r.employeeId}`} className="view-report-link">
                        View Report
                      </Link>
                    </td>
                    <td>
                      <div className="reward-button-group">
                        {["Bonus", "Promotion", "Recognition"].map((type) => {
                          const isAllowed = allowed.includes(type);
                          return (
                            <button
                              key={type}
                              className={`reward-btn ${isAllowed ? 'active' : 'disabled'}`}
                              disabled={!isAllowed}
                              onClick={() => assignReward(r, type)}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRRewards;