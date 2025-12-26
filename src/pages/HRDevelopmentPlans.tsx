import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./HRDevelopmentPlans.css";
import dayjs from "dayjs";

interface FinalReview {
  employeeId: string;
  employeeName: string;
  quarter: string;
  year: number;
  performanceCategory: string;
}

interface DevPlan {
  id: string;
  employeeId: string;
  planTitle: string;
  quarter: string;
  year: number;
}

const HRDevelopmentPlans: React.FC = () => {
  // Default to real-time quarter and year
  const [quarter, setQuarter] = useState(`Q${Math.floor(dayjs().month() / 3) + 1}`);
  const [year, setYear] = useState(dayjs().year());
  
  const [reviews, setReviews] = useState<FinalReview[]>([]);
  const [plans, setPlans] = useState<DevPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [planTitle, setPlanTitle] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all finalized reviews to find "Needs Improvement" cases
      const reviewSnap = await getDocs(collection(db, "finalReviews"));
      setReviews(reviewSnap.docs.map(d => d.data() as FinalReview));

      // Load existing development plans to check for badges
      const planSnap = await getDocs(collection(db, "developmentPlans"));
      setPlans(planSnap.docs.map(d => ({ id: d.id, ...d.data() } as DevPlan)));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filter employees who "Need Improvement" for the SPECIFIC selected period
  const candidates = useMemo(() => {
    return reviews.filter(r => 
      r.performanceCategory === "Needs Improvement" && 
      r.quarter === quarter && 
      r.year === year
    );
  }, [reviews, quarter, year]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !planTitle) {
      alert("Please select an employee and enter a plan title.");
      return;
    }

    const empObj = candidates.find(c => c.employeeId === selectedEmpId);

    await addDoc(collection(db, "developmentPlans"), {
      employeeId: selectedEmpId,
      employeeName: empObj?.employeeName,
      planTitle,
      quarter,
      year,
      status: "Assigned",
      createdAt: serverTimestamp()
    });

    alert(`Development plan assigned to ${empObj?.employeeName}`);
    setPlanTitle("");
    setSelectedEmpId("");
    loadData();
  };

  if (loading) return <div className="hr-dev-page">Loading Development Module...</div>;

  return (
    <div className="hr-dev-page">
      <div className="page-header">
        <h1>Development Management</h1>
        <p className="muted">Targeted growth for employees in 'Needs Improvement' category.</p>
      </div>

      <div className="dev-layout">
        {/* LEFT: REFINED ASSIGNMENT FORM */}
        <div className="card assign-card">
          <h3>Create Assignment</h3>
          <form onSubmit={handleAssign}>
            {/* Direct Period Selection in the Form */}
            <div className="form-group">
              <label>Target Period</label>
              <div className="compact-filter">
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="dev-input half">
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="dev-input half">
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Employee (Needs Improvement)</label>
              <select 
                value={selectedEmpId} 
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="dev-input"
              >
                <option value="">-- Choose Candidate --</option>
                {candidates.map(c => (
                  <option key={c.employeeId} value={c.employeeId}>{c.employeeName}</option>
                ))}
              </select>
              {candidates.length === 0 && <p className="small-error">No candidates for {quarter} {year}</p>}
            </div>

            <div className="form-group">
              <label>Development Goal</label>
              <input 
                type="text" 
                value={planTitle} 
                onChange={(e) => setPlanTitle(e.target.value)} 
                placeholder="e.g. Technical Skills Workshop"
                className="dev-input"
              />
            </div>

            <button type="submit" className="assign-btn" disabled={candidates.length === 0}>
              Assign Plan
            </button>
          </form>
        </div>

        {/* RIGHT: NEEDS DEVELOPMENT TABLE */}
        <div className="card table-card">
          <div className="table-header">
            <h3>Needs Development List - {quarter} {year}</h3>
          </div>

          <table className="review-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr><td colSpan={3} className="empty-row">No employees currently need improvement in this period.</td></tr>
              ) : (
                candidates.map(c => {
                  const hasPlan = plans.some(p => p.employeeId === c.employeeId && p.quarter === quarter && p.year === year);
                  return (
                    <tr key={c.employeeId}>
                      <td>{c.employeeName}</td>
                      <td><span className="badge category-needs-improvement">Needs Improvement</span></td>
                      <td>
                        {hasPlan ? (
                          <span className="badge status-added">Plan Added</span>
                        ) : (
                          <span className="badge status-pending">Pending Plan</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDevelopmentPlans;