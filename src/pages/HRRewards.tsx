import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import QuarterFilter from "../components/QuarterFilter";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiAward, FiGift, FiTrendingUp } from "react-icons/fi";
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

// ⭐ UPDATED: Matches your specific grading scale
const allowedRewards = (category: string) => {
  switch (category) {
    case "Outstanding":
      return ["Bonus", "Promotion", "Recognition"];
    case "Good":
      return ["Bonus", "Recognition"];
    case "Satisfactory":
      return ["Recognition"];
    case "Needs Improvement":
      return []; // No rewards for remediation status
    default:
      return [];
  }
};

const HRRewards: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<FinalReview[]>([]);
  const [quarter, setQuarter] = useState("Q1"); // Default to current
  const [year, setYear] = useState(2026);      // Default to current
  const [loading, setLoading] = useState(false);

  const availableYears = [2024, 2025, 2026];

  const loadData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "finalReviews"));
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinalReview)));
    } catch (err) {
      toast.error("Error loading finalized reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const visible = reviews.filter(
    (r) => (quarter === "All" || r.quarter === quarter) && r.year === year
  );

  const assignReward = async (r: FinalReview, type: string) => {
    try {
      await addDoc(collection(db, "rewards"), {
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        quarter: r.quarter,
        year: r.year,
        rewardType: type,
        performanceCategory: r.performanceCategory,
        finalScore: r.finalScore,
        decidedBy: user?.uid,
        decidedAt: serverTimestamp(),
        status: "Pending Payroll" // Future-proofing for payroll system
      });
      toast.success(`${type} assigned to ${r.employeeName}!`);
    } catch (err) {
      toast.error("Failed to assign reward.");
    }
  };

  return (
    <div className="hr-rewards-page">
      <div className="page-header">
        <h1><FiAward /> Rewards & Recognition</h1>
        <p className="muted">Incentives are unlocked based on the {year} {quarter} finalized results.</p>
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
              <th>Performance Report</th>
              <th>Available Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="empty-state">Loading records...</td></tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">No finalized reviews found for this period.</td>
              </tr>
            ) : (
              visible.map((r) => {
                const allowed = allowedRewards(r.performanceCategory);
                return (
                  <tr key={r.id}>
                    <td>
                        <div className="emp-name-cell">
                            <strong>{r.employeeName}</strong>
                            <span className="text-xs text-gray-400">ID: {r.employeeId.substring(0,6)}</span>
                        </div>
                    </td>
                    <td><span className="score-val">{r.finalScore}%</span></td>
                    <td>
                      <span className={`badge category-${r.performanceCategory.toLowerCase().replace(" ", "-")}`}>
                        {r.performanceCategory}
                      </span>
                    </td>
                    <td>
                      <Link to={`/hr/reports/${r.employeeId}`} className="view-report-link">
                        Analyze Details
                      </Link>
                    </td>
                    <td>
                      <div className="reward-button-group">
                        <RewardAction 
                            type="Bonus" 
                            isAllowed={allowed.includes("Bonus")} 
                            onAction={() => assignReward(r, "Bonus")} 
                            icon={<FiGift />}
                        />
                        <RewardAction 
                            type="Promotion" 
                            isAllowed={allowed.includes("Promotion")} 
                            onAction={() => assignReward(r, "Promotion")} 
                            icon={<FiTrendingUp />}
                        />
                        <RewardAction 
                            type="Recognition" 
                            isAllowed={allowed.includes("Recognition")} 
                            onAction={() => assignReward(r, "Recognition")} 
                            icon={<FiAward />}
                        />
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

// Helper component for cleaner button rendering
const RewardAction = ({ type, isAllowed, onAction, icon }: any) => (
    <button
      className={`reward-btn ${isAllowed ? 'active' : 'disabled'}`}
      disabled={!isAllowed}
      onClick={onAction}
      title={isAllowed ? `Grant ${type}` : `${type} not available for this score`}
    >
      {icon} {type}
    </button>
);

export default HRRewards;