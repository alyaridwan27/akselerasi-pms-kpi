import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { generateDevelopmentPlan } from "../services/aiService"; 
import { FiCpu, FiBookOpen, FiActivity, FiX, FiAlertCircle, FiEye } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

import QuarterFilter from "../components/QuarterFilter";
import QuarterBadge from "../components/QuarterBadge";
import "./HRDevelopmentPlans.css";

// Prop-based configuration to reuse the page for different roles
interface Props {
  isReadOnly?: boolean;
  viewType?: "hr" | "team" | "personal";
}

const HRDevelopmentPlans: React.FC<Props> = ({ isReadOnly = false, viewType = "hr" }) => {
  const { user, role } = useAuth();
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

      /** * ⭐ ROLE-BASED DATA FILTERING
       */
      if (viewType === "personal") {
        // Employees see their own plans for the cycle
        if (!user) {
          setLoading(false);
          return;
        }
        reviewQuery = query(
          collection(db, "finalReviews"),
          where("employeeId", "==", user.uid),
          where("year", "==", Number(selectedYear)),
          where("quarter", "==", selectedQuarter)
        );
      } else if (viewType === "team") {
        // Managers see "Needs Improvement" staff from the whole company
        // Note: For large apps, filter this further by managerId in a real production environment
        reviewQuery = query(
          collection(db, "finalReviews"),
          where("year", "==", Number(selectedYear)),
          where("quarter", "==", selectedQuarter),
          where("performanceCategory", "==", "Needs Improvement")
        );
      } else {
        // HR sees everyone in remediation
        reviewQuery = query(
          collection(db, "finalReviews"),
          where("year", "==", Number(selectedYear)),
          where("quarter", "==", selectedQuarter),
          where("performanceCategory", "==", "Needs Improvement")
        );
      }

      const reviewSnap = await getDocs(reviewQuery);
      
      if (reviewSnap.empty) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      const reviewData = reviewSnap.docs.map(d => d.data());
      const userSnap = await getDocs(collection(db, "users"));
      const allUsers = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const filteredList = reviewData.map(rev => {
        const userDetails: any = allUsers.find(u => u.id === rev.employeeId);
        return {
          ...userDetails,
          finalScore: rev.finalScore,
          category: rev.performanceCategory
        };
      }).filter(u => u.id && (viewType !== "team" || (user?.uid && u.managerId === user.uid))); 
      // ^ Line above ensures Managers only see THEIR subordinates in 'team' view

      setEmployees(filteredList);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load development data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedQuarter, selectedYear, viewType]);

  const handleAction = async (emp: any) => {
    // If plan exists, open modal
    if (emp.latestDevPlan) {
      setTargetEmp(emp);
      setActivePlan(emp.latestDevPlan);
      return;
    }

    // Block generation if in read-only mode
    if (isReadOnly) return;

    setTargetEmp(emp);
    setGenLoading(true);
    try {
      const perfSummary = `Employee: ${emp.displayName}. Score: ${emp.finalScore}%. Category: Needs Improvement.`;
      const plan = await generateDevelopmentPlan(emp.displayName, emp.role || "Employee", perfSummary);
      
      await updateDoc(doc(db, "users", emp.id), { latestDevPlan: plan });
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, latestDevPlan: plan } : e));
      setActivePlan(plan);
      toast.success("AI roadmap generated!");
    } catch (err) {
      toast.error("AI Generation failed.");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="hr-dev-page">
      <div className="page-header">
        <div className="title-area">
          <h1><FiBookOpen /> {viewType === "personal" ? "My Development Plan" : "Performance Remediation"}</h1>
          <p>{isReadOnly ? "Review assigned growth roadmaps." : "Generate targeted growth plans for remediation."}</p>
        </div>
        <QuarterFilter 
          selectedQuarter={selectedQuarter} setQuarter={setSelectedQuarter}
          selectedYear={selectedYear} setYear={setSelectedYear}
          availableYears={[2025, 2026]}
        />
      </div>

      <div className="employee-dev-table-card">
        <table className="dev-table">
          <thead>
            <tr>
              <th>{viewType === "personal" ? "My Profile" : "Employee Name"}</th>
              <th>Period</th>
              <th>Final Score</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center p-8">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  <FiAlertCircle className="empty-icon" />
                  <p>No development plans found for this period.</p>
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div className="emp-info">
                      <span className="name">{emp.displayName}</span>
                      <span className="role-tag">{emp.role}</span>
                    </div>
                  </td>
                  <td><QuarterBadge quarter={selectedQuarter} year={selectedYear} /></td>
                  <td><span className="low-score">{emp.finalScore}%</span></td>
                  <td>
                    <span className={`status-pill ${emp.latestDevPlan ? 'ready' : 'needed'}`}>
                      {emp.latestDevPlan ? 'Plan Ready' : 'Plan Needed'}
                    </span>
                  </td>
                  <td>
                    {emp.latestDevPlan ? (
                      <button className="ai-gen-btn view-only" onClick={() => handleAction(emp)}>
                        <FiEye /> View Plan
                      </button>
                    ) : (
                      !isReadOnly ? (
                        <button className="ai-gen-btn remediation" onClick={() => handleAction(emp)} disabled={genLoading}>
                          <FiCpu /> {genLoading && targetEmp?.id === emp.id ? "Drafting..." : "Generate AI"}
                        </button>
                      ) : (
                        <span className="muted-text italic">Awaiting HR Action</span>
                      )
                    )}
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
            <div className="modal-header">
              <h3>{targetEmp?.displayName}'s Roadmap</h3>
              <button onClick={() => { setActivePlan(null); setTargetEmp(null); }}><FiX /></button>
            </div>
            <div className="modal-body markdown-content">
              <ReactMarkdown>{activePlan}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDevelopmentPlans;