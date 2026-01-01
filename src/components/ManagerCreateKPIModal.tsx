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

const ManagerCreateKPIModal: React.FC<Props> = ({
  ownerId,
  ownerName,
  onClose,
  onCreated,
}) => {
  const currentYear = new Date().getFullYear();

  /* ---------------- STATE ---------------- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rubric, setRubric] = useState(""); // ⭐ NEW: Rubric for AI Logic
  const [targetValue, setTargetValue] = useState<number>(0);
  const [unit, setUnit] = useState("");
  const [weight, setWeight] = useState<number>(0);
  const [quarter, setQuarter] = useState(quarters[0]);
  const [year, setYear] = useState(currentYear);
  
  const [remainingWeight, setRemainingWeight] = useState(100);
  const [employeeType, setEmployeeType] = useState<string>("Default");
  const [dynamicTemplates, setDynamicTemplates] = useState<string[]>([]); // ⭐ NEW: Firestore templates
  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD CONTEXT ---------------- */
  useEffect(() => {
    const loadContext = async () => {
      // 1. Fetch employee role
      const userRef = doc(db, "users", ownerId);
      const userSnap = await getDoc(userRef);
      let roleType = "Default";
      
      if (userSnap.exists()) {
        roleType = userSnap.data().employeeType || "Default";
        setEmployeeType(roleType);
      }

      // 2. Fetch Dynamic Templates from Firestore (Non-hardcoded)
      try {
        const q = query(collection(db, "kpiTemplates"), where("categoryName", "==", roleType));
        const tSnap = await getDocs(q);
        if (!tSnap.empty) {
          setDynamicTemplates(tSnap.docs[0].data().goals || []);
        }
      } catch (err) {
        console.error("Template fetch failed:", err);
      }

      // 3. Load existing weights
      const qKpis = query(
        collection(db, "kpis"),
        where("ownerId", "==", ownerId),
        where("quarter", "==", quarter),
        where("year", "==", year)
      );
      const snap = await getDocs(qKpis);
      let usedWeight = 0;
      snap.forEach((doc) => { usedWeight += Number(doc.data().weight || 0); });
      setRemainingWeight(100 - usedWeight);
    };

    loadContext();
  }, [ownerId, quarter, year]);

  /* ---------------- CREATE HANDLER ---------------- */
  const handleCreate = async () => {
    if (!title.trim()) return alert("Title cannot be empty");
    if (weight <= 0) return alert("Weight must be greater than 0");
    if (weight > remainingWeight) return alert(`Weight exceeds limit (${remainingWeight}% available)`);

    setLoading(true);
    try {
      await addDoc(collection(db, "kpis"), {
        ownerId,
        ownerName: ownerName || "",
        employeeType,
        title,
        description,
        rubric, // ⭐ NEW: Stored for Gemini API processing
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

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create KPI for {ownerName}</h2>
        <p className="role-subtext">Role Context: <strong>{employeeType}</strong></p>

        {/* ⭐ DYNAMIC TEMPLATE SELECTOR */}
        <label className="modal-label">Organization Templates</label>
        <select 
          className="modal-input" 
          onChange={(e) => setTitle(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>-- Select a Cloud-Managed Goal --</option>
          {dynamicTemplates.map(t => <option key={t} value={t}>{t}</option>)}
          <option value="">Custom Goal (Type below)...</option>
        </select>

        <label className="modal-label">Title</label>
        <input
          className="modal-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="modal-label">Description</label>
        <textarea
          className="modal-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* ⭐ NEW: SCORING RUBRIC (For Gemini AI) */}
        <label className="modal-label">Scoring Rubric (AI Evaluation Rules)</label>
        <textarea
          className="modal-textarea"
          placeholder="e.g. 1-2 bugs: 2 pts, 3-6 bugs: 5 pts, 7-10 bugs: 10 pts"
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
        />

        <div className="row">
           <div className="col">
              <label className="modal-label">Target Value</label>
              <input className="modal-input" type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} />
           </div>
           <div className="col">
              <label className="modal-label">Unit</label>
              <input className="modal-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
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

        <label className="modal-label">Weight (%) <span className="weight-info">• Remaining: {remainingWeight}%</span></label>
        <input
          className={`modal-input ${weight > remainingWeight ? "input-error" : ""}`}
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
        />

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="create-btn" onClick={handleCreate} disabled={loading || weight > remainingWeight}>
            {loading ? "Creating..." : "Create KPI"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerCreateKPIModal;