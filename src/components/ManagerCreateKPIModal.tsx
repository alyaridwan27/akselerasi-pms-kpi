import React, { useEffect, useState } from "react";
import "./ManagerCreateKPIModal.css";
import {
  addDoc,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

interface Props {
  ownerId: string;
  ownerName?: string;
  onClose: () => void;
  onCreated?: () => void;
}

const quarters = ["Q1", "Q2", "Q3", "Q4"];

// ⭐ Role-based templates for SWE and BA personas
const ROLE_TEMPLATES: Record<string, string[]> = {
  "Software Engineer": [
    "Sprint Velocity Improvement",
    "Code Quality / PR Approval Rate",
    "Technical Debt Reduction",
    "System Uptime / Reliability",
    "Unit Test Coverage %"
  ],
  "Business Analyst": [
    "Requirement Document Accuracy",
    "Stakeholder Satisfaction Score",
    "UAT Success Rate",
    "User Story Completion Rate",
    "Process Efficiency Improvement"
  ],
  "Default": ["Custom Performance Goal"]
};

const ManagerCreateKPIModal: React.FC<Props> = ({
  ownerId,
  ownerName,
  onClose,
  onCreated,
}) => {
  const currentYear = new Date().getFullYear();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState<number>(0);
  const [unit, setUnit] = useState("");
  const [weight, setWeight] = useState<number>(0);

  const [quarter, setQuarter] = useState(quarters[0]);
  const [year, setYear] = useState(currentYear);
  const [remainingWeight, setRemainingWeight] = useState(100);
  const [employeeType, setEmployeeType] = useState<string>("Default"); // ⭐ Track role

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      // 1. Fetch employee role to determine templates
      const userRef = doc(db, "users", ownerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setEmployeeType(userSnap.data().employeeType || "Default");
      }

      // 2. Load existing weights
      const kpiRef = collection(db, "kpis");
      const qKpis = query(
        kpiRef,
        where("ownerId", "==", ownerId),
        where("quarter", "==", quarter),
        where("year", "==", year)
      );

      const snap = await getDocs(qKpis);
      let usedWeight = 0;
      snap.forEach((doc) => {
        usedWeight += Number(doc.data().weight || 0);
      });
      setRemainingWeight(100 - usedWeight);
    };

    loadContext();
  }, [ownerId, quarter, year]);

  const handleCreate = async () => {
    if (!title.trim()) return alert("Title cannot be empty");
    if (weight <= 0) return alert("Weight must be greater than 0");
    if (weight > remainingWeight)
      return alert(`Weight exceeds allowed limit. Remaining weight is ${remainingWeight}%`);

    setLoading(true);

    try {
      const ref = collection(db, "kpis");
      await addDoc(ref, {
        ownerId,
        ownerName: ownerName || "",
        employeeType, // ⭐ Store role in the KPI for filtering
        title,
        description,
        targetValue,
        currentValue: 0,
        unit,
        weight,
        quarter,
        year,
        status: "Active",
        createdAt: serverTimestamp(),
      });

      alert("KPI created successfully!");
      onCreated && onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create KPI");
    }
    setLoading(false);
  };

  const templates = ROLE_TEMPLATES[employeeType] || ROLE_TEMPLATES["Default"];

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create KPI for {ownerName}</h2>
        <p className="role-subtext">Role: <strong>{employeeType}</strong></p>

        {/* ⭐ Template Dropdown for SWE/BA context */}
        <label className="modal-label">Quick Template</label>
        <select 
          className="modal-input" 
          onChange={(e) => setTitle(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>-- Select a {employeeType} template --</option>
          {templates.map(t => <option key={t} value={t}>{t}</option>)}
          <option value="">Custom Goal...</option>
        </select>

        <label className="modal-label">Title</label>
        <input
          className="modal-input"
          placeholder="KPI Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="modal-label">Description</label>
        <textarea
          className="modal-textarea"
          placeholder="Describe the objective..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="row">
           <div className="col">
              <label className="modal-label">Target Value</label>
              <input
                className="modal-input"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
           </div>
           <div className="col">
              <label className="modal-label">Unit</label>
              <input
                className="modal-input"
                placeholder="e.g. % or points"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
           </div>
        </div>

        <div className="row">
          <div className="col">
            <label className="modal-label">Quarter</label>
            <select className="modal-input" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
              {quarters.map((q) => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div className="col">
            <label className="modal-label">Year</label>
            <input className="modal-input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </div>

        <label className="modal-label">
          Weight (%)
          <span className="weight-info">• Max: <strong>{remainingWeight}%</strong></span>
        </label>
        <input
          className={`modal-input ${weight > remainingWeight ? "input-error" : ""}`}
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
        />

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="create-btn"
            onClick={handleCreate}
            disabled={loading || weight > remainingWeight}
          >
            {loading ? "Creating..." : "Create KPI"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerCreateKPIModal;