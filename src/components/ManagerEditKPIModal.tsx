// src/components/ManagerEditKPIModal.tsx
import React, { useEffect, useState } from "react";
import "./ManagerCreateKPIModal.css"; 
import {
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

interface Props {
  kpi: any; 
  onClose: () => void;
  onUpdated: () => void;
}

const quarters = ["Q1", "Q2", "Q3", "Q4"];

const ManagerEditKPIModal: React.FC<Props> = ({ kpi, onClose, onUpdated }) => {
  const [title, setTitle] = useState(kpi.title);
  const [description, setDescription] = useState(kpi.description || "");
  const [targetValue, setTargetValue] = useState<number>(kpi.targetValue);
  const [unit, setUnit] = useState(kpi.unit || "");
  const [weight, setWeight] = useState<number>(kpi.weight);
  
  // ⭐ NEW: Rubric state
  const [rubric, setRubric] = useState(kpi.rubric || "");
  
  const [quarter, setQuarter] = useState(kpi.quarter);
  const [year, setYear] = useState(kpi.year);
  const [remainingWeight, setRemainingWeight] = useState(100);
  const [loading, setLoading] = useState(false);

  // Load weights (excluding the current KPI being edited)
  useEffect(() => {
    const loadWeights = async () => {
      const kpiRef = collection(db, "kpis");
      const qKpis = query(
        kpiRef,
        where("ownerId", "==", kpi.ownerId),
        where("quarter", "==", quarter),
        where("year", "==", year)
      );

      const snap = await getDocs(qKpis);
      let usedWeight = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        // Skip current KPI from "used weight" calculation so we don't block ourselves
        if (doc.id !== kpi.id) {
          usedWeight += Number(data.weight || 0);
        }
      });

      setRemainingWeight(100 - usedWeight);
    };

    loadWeights();
  }, [kpi.ownerId, kpi.id, quarter, year]);

  const handleUpdate = async () => {
    if (!title.trim()) return toast.error("Title cannot be empty");
    if (weight <= 0) return toast.error("Weight must be > 0");
    if (weight > remainingWeight)
      return toast.error(`Weight exceeds limit. Max available: ${remainingWeight}%`);
    
    // ⭐ Validation for rubric
    if (!rubric.trim()) return toast.error("Scoring rubric is required for AI auditing.");

    setLoading(true);

    try {
      const ref = doc(db, "kpis", kpi.id);
      await updateDoc(ref, {
        title,
        description,
        targetValue,
        unit,
        weight,
        rubric, // ⭐ Save rubric to Firestore
        quarter,
        year,
        updatedAt: serverTimestamp(),
      });

      toast.success("KPI updated successfully!");
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update KPI");
    }
    setLoading(false);
  };

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit KPI</h2>

        <div className="modal-scroll-area" style={{maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px'}}>
            <label className="modal-label">Title</label>
            <input className="modal-input" value={title} onChange={(e) => setTitle(e.target.value)} />

            <label className="modal-label">Description</label>
            <textarea className="modal-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />

            {/* ⭐ NEW: Rubric Input Field */}
            <label className="modal-label">Scoring Rubric (AI Instructions)</label>
            <textarea 
                className="modal-textarea rubric-input" 
                placeholder="Example: 1-3: Poor, 4-7: Meets Expectation, 8-10: Exceptional..."
                value={rubric} 
                onChange={(e) => setRubric(e.target.value)} 
            />

            <div className="row">
                <div className="col">
                    <label className="modal-label">Target Value</label>
                    <input className="modal-input" type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} />
                </div>
                <div className="col">
                    <label className="modal-label">Unit (e.g., %, USD, Points)</label>
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

            <label className="modal-label">
                Weight (%) <span className="weight-info">• Max available: <strong>{remainingWeight}%</strong></span>
            </label>
            <input
                className={`modal-input ${weight > remainingWeight ? "input-error" : ""}`}
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
            />
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="create-btn" onClick={handleUpdate} disabled={loading || weight > remainingWeight}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerEditKPIModal;