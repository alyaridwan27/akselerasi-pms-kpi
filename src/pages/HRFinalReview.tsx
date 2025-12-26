// src/pages/HRFinalReview.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import QuarterFilter from "../components/QuarterFilter";
import "./HRFinalReview.css";

// Import centralized logic
import { 
  calculateKPIScore, 
  calculateFinalScore, 
  mapPerformanceCategory 
} from "../utils/reviewUtils";

type KPI = {
  ownerId: string;
  ownerName: string;
  quarter: string;
  year: number;
  currentValue: number;
  targetValue: number;
  weight: number;
  status: string; // Required for approval check
};

type FinalReviewRecord = {
  employeeId: string;
  quarter: string;
  year: number;
};

const HRFinalReview: React.FC = () => {
  const { user } = useAuth();

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [finalized, setFinalized] = useState<FinalReviewRecord[]>([]);
  const [quarter, setQuarter] = useState("All");
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Admin Configuration state
  const [config, setConfig] = useState({
    kpiWeight: 70,
    feedbackWeight: 30,
    activeQuarter: "Q1",
    activeYear: 2025
  });

  const loadData = async () => {
    // Load Admin Settings
    const configSnap = await getDoc(doc(db, "system", "config"));
    if (configSnap.exists()) {
      const data = configSnap.data();
      setConfig({
        kpiWeight: data.kpiWeight,
        feedbackWeight: data.feedbackWeight,
        activeQuarter: data.activeQuarter,
        activeYear: data.activeYear
      });
      // Default filters to active cycle
      setQuarter(data.activeQuarter);
      setYear(data.activeYear);
    }

    const kpiSnap = await getDocs(collection(db, "kpis"));
    setKpis(kpiSnap.docs.map((d) => d.data() as KPI));

    const reviewSnap = await getDocs(collection(db, "finalReviews"));
    setFinalized(reviewSnap.docs.map((d) => d.data() as FinalReviewRecord));
  };

  useEffect(() => {
    loadData();
  }, []);

  // ⭐ Updated Memo: Tracks KPI list and approval status per employee
  const employees = useMemo(() => {
    const map = new Map<string, { 
      list: KPI[], 
      approvedCount: number, 
      totalCount: number,
      allApproved: boolean 
    }>();

    kpis
      .filter((k) => (quarter === "All" || k.quarter === quarter) && k.year === year)
      .forEach((k) => {
        if (!map.has(k.ownerId)) {
          map.set(k.ownerId, { list: [], approvedCount: 0, totalCount: 0, allApproved: true });
        }
        const entry = map.get(k.ownerId)!;
        entry.list.push(k);
        entry.totalCount += 1;
        
        if (k.status === "Approved") {
          entry.approvedCount += 1;
        } else {
          entry.allApproved = false; // Block finalization if any KPI is unapproved
        }
      });
    return Array.from(map.entries());
  }, [kpis, quarter, year]);

  const finalizeReview = async (
    employeeId: string, 
    employeeName: string, 
    employeeKpis: KPI[],
    allApproved: boolean
  ) => {
    // Double check approval status
    if (!allApproved) {
      alert("Error: All KPIs must be approved by the manager before finalization.");
      return;
    }

    const targetQuarter = quarter === "All" ? config.activeQuarter : quarter;

    const kpiScore = calculateKPIScore(employeeKpis);
    const feedbackScore = 80; // Placeholder for future integration
    
    // Use dynamic weights from Admin Settings
    const finalScore = calculateFinalScore(
      kpiScore, 
      feedbackScore, 
      config.kpiWeight, 
      config.feedbackWeight
    );
    const category = mapPerformanceCategory(finalScore);

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
      // Audit trail
      appliedKpiWeight: config.kpiWeight,
      appliedFeedbackWeight: config.feedbackWeight
    });

    alert(`Success: ${employeeName}'s review finalized.`);
    loadData();
  };

  return (
    <div className="hr-final-review">
      <div className="page-header">
        <h1>Final Performance Reviews</h1>
        <p className="muted">
          Current Weightage: <strong>{config.kpiWeight}% KPI / {config.feedbackWeight}% Feedback</strong>
        </p>
      </div>

      <QuarterFilter
        selectedQuarter={quarter}
        setQuarter={setQuarter}
        selectedYear={year}
        setYear={setYear}
        availableYears={[2024, 2025]}
      />

      <table className="review-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>KPI Status</th> {/* ⭐ New Status Column */}
            <th>KPI Score</th>
            <th>360°</th>
            <th>Final Score</th>
            <th>Category</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(([id, data]) => {
            const { list, approvedCount, totalCount, allApproved } = data;
            const kpiWeightedScore = calculateKPIScore(list);
            const feedbackScore = 80;
            const finalScore = calculateFinalScore(kpiWeightedScore, feedbackScore, config.kpiWeight, config.feedbackWeight);
            const category = mapPerformanceCategory(finalScore);
            
            const isFinalized = finalized.some(
              (f) => f.employeeId === id && f.quarter === (quarter === "All" ? config.activeQuarter : quarter) && f.year === year
            );

            return (
              <tr key={id}>
                <td><strong>{list[0].ownerName}</strong></td>
                <td>
                  <span className={`status-summary ${allApproved ? 'all-done' : 'pending'}`}>
                    {approvedCount}/{totalCount} Approved
                  </span>
                </td>
                <td>{kpiWeightedScore}%</td>
                <td>{feedbackScore}%</td>
                <td><strong>{finalScore}</strong></td>
                <td>
                   <span className={`badge category-${category.toLowerCase().replace(" ", "-")}`}>
                    {category}
                  </span>
                </td>
                <td>
                  <button
                    disabled={isFinalized || !allApproved}
                    onClick={() => finalizeReview(id, list[0].ownerName, list, allApproved)}
                    className={isFinalized ? "btn-finalized" : !allApproved ? "btn-locked" : "btn-finalize"}
                    title={!allApproved ? "All KPIs must be approved by the manager first" : ""}
                  >
                    {isFinalized ? "Finalized" : !allApproved ? "Pending Approval" : "Finalize"}
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