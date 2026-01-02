// src/pages/HRDevelopmentPlans.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { generateDevelopmentPlan } from "../services/aiService"; 
import { FiCpu, FiBookOpen, FiX, FiAlertCircle, FiEye, FiTrash2 } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import QuarterFilter from "../components/QuarterFilter";
import QuarterBadge from "../components/QuarterBadge";
import "./HRDevelopmentPlans.css";

interface Props {
  isReadOnly?: boolean;
  viewType?: "hr" | "team" | "personal";
}

const HRDevelopmentPlans: React.FC<Props> = ({ isReadOnly = false, viewType = "hr" }) => {
  const { user } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [targetEmp, setTargetEmp] = useState<any>(null);
  const [genLoading, setGenLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let reviewQuery;
      // Filter for only "Needs Improvement" to keep Emp5 (94%) off the list
      const constraints = [
        where("year", "==", Number(selectedYear)),
        where("quarter", "==", selectedQuarter),
        where("performanceCategory", "==", "Needs Improvement")
      ];

      if (viewType === "personal") {
        if (!user) return;
        reviewQuery = query(collection(db, "finalReviews"), where("employeeId", "==", user.uid), ...constraints);
      } else {
        reviewQuery = query(collection(db, "finalReviews"), ...constraints);
      }

      const reviewSnap = await getDocs(reviewQuery);
      if (reviewSnap.empty) {
        setEmployees([]);
        return;
      }

      const reviewData = reviewSnap.docs.map(d => d.data());
      const userSnap = await getDocs(collection(db, "users"));
      const allUsers = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const filteredList = reviewData.map(rev => {
        const u: any = allUsers.find(usr => usr.id === rev.employeeId);
        return { ...u, finalScore: rev.finalScore, category: rev.performanceCategory };
      }).filter(u => u.id && (viewType !== "team" || (user?.uid && u.managerId === user.uid)));

      setEmployees(filteredList);
    } catch (err) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedQuarter, selectedYear, viewType, user?.uid]);

  const handleAction = async (emp: any) => {
    if (emp.latestDevPlan) {
      setTargetEmp(emp);
      setActivePlan(emp.latestDevPlan);
      return;
    }

    if (isReadOnly) return;
    setTargetEmp(emp);
    setGenLoading(true);

    try {
      // Fetch multi-KPI comments to build the detailed summary
      const kpiSnap = await getDocs(query(
        collection(db, "kpis"), 
        where("ownerId", "==", emp.id),
        where("year", "==", Number(selectedYear)),
        where("quarter", "==", selectedQuarter)
      ));
      
      const kpiInsights = kpiSnap.docs.map(doc => {
        const d = doc.data();
        return `KPI: ${d.title} | Manager Note: ${d.managerComment || 'No specific note'}`;
      }).join("\n");

      const enrichedSummary = `Overall Score: ${emp.finalScore}%. Detailed Findings:\n${kpiInsights}`;

      const plan = await generateDevelopmentPlan(emp.displayName, emp.role || "Employee", enrichedSummary);
      await updateDoc(doc(db, "users", emp.id), { latestDevPlan: plan });
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, latestDevPlan: plan } : e));
      setActivePlan(plan);
      toast.success("Detailed roadmap generated!");
    } catch (err) {
      toast.error("AI Generation failed.");
    } finally {
      setGenLoading(false);
    }
  };

  // ⭐ New Feature: Clear Plan to allow re-generation
  const clearPlan = async (empId: string) => {
    if (!window.confirm("Are you sure you want to delete this plan? You will need to re-generate it.")) return;
    try {
      await updateDoc(doc(db, "users", empId), { latestDevPlan: null });
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, latestDevPlan: null } : e));
      toast.success("Plan cleared.");
    } catch (err) {
      toast.error("Failed to clear plan.");
    }
  };

  return (
    <div className="hr-dev-page">
      <div className="page-header">
        <div className="title-area">
          <h1><FiBookOpen /> {viewType === "personal" ? "My Development Plan" : "Performance Remediation"}</h1>
          <p>Targeted growth based on specific manager feedback.</p>
        </div>
        <QuarterFilter selectedQuarter={selectedQuarter} setQuarter={setSelectedQuarter} selectedYear={selectedYear} setYear={setSelectedYear} availableYears={[2025, 2026]} />
      </div>

      <div className="employee-dev-table-card">
        <table className="dev-table">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Period</th>
              <th>Score</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && employees.length === 0 ? (
              <tr><td colSpan={5} className="empty-state"><FiAlertCircle className="empty-icon" /><p>No remediation required!</p></td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td><div className="emp-info"><span className="name">{emp.displayName}</span><span className="role-tag">{emp.role}</span></div></td>
                  <td><QuarterBadge quarter={selectedQuarter} year={selectedYear} /></td>
                  <td><span className="low-score">{emp.finalScore}%</span></td>
                  <td><span className={`status-pill ${emp.latestDevPlan ? 'ready' : 'needed'}`}>{emp.latestDevPlan ? 'Plan Ready' : 'Plan Needed'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className={`ai-gen-btn ${emp.latestDevPlan ? 'view-only' : 'remediation'}`} onClick={() => handleAction(emp)} disabled={genLoading}>
                        {emp.latestDevPlan ? <><FiEye /> View</> : <><FiCpu /> Generate</>}
                      </button>
                      {emp.latestDevPlan && !isReadOnly && (
                        <button className="clear-plan-btn" onClick={() => clearPlan(emp.id)} title="Delete and Re-generate"><FiTrash2 /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activePlan && (
        <div className="plan-modal-overlay">
          <div className="plan-modal">
            <div className="modal-header"><h3>Roadmap: {targetEmp?.displayName}</h3><button onClick={() => { setActivePlan(null); setTargetEmp(null); }}><FiX /></button></div>
            <div className="modal-body markdown-content"><ReactMarkdown>{activePlan}</ReactMarkdown></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDevelopmentPlans;