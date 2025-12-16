import React, { useEffect, useState } from "react";
import "./ManagerCreateKPIModal.css";
import {
  addDoc,
  collection,
  getDocs,
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState<number>(0);
  const [unit, setUnit] = useState("");
  const [weight, setWeight] = useState<number>(0);

  const [quarter, setQuarter] = useState(quarters[0]);
  const [year, setYear] = useState(currentYear);
  const [remainingWeight, setRemainingWeight] = useState(100);

  const [loading, setLoading] = useState(false);

  // Load existing KPIs
  useEffect(() => {
    const loadWeights = async () => {
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
        const data = doc.data();
        usedWeight += Number(data.weight || 0);
      });

      setRemainingWeight(100 - usedWeight);

    };

    loadWeights();
  }, [ownerId, quarter, year]);

  const handleCreate = async () => {
    if (!title.trim()) return alert("Title cannot be empty");
    if (weight <= 0) return alert("Weight must be greater than 0");
    if (weight > remainingWeight)
      return alert(
        `Weight exceeds allowed limit. Remaining weight is ${remainingWeight}%`
      );

    setLoading(true);

    try {
      const ref = collection(db, "kpis");
      await addDoc(ref, {
        ownerId,
        ownerName: ownerName || "",
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

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create KPI for {ownerName}</h2>

        {/* Title */}
        <label className="modal-label">Title</label>
        <input
          className="modal-input"
          placeholder="e.g. Increase Sales"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        {/* Description */}
        <label className="modal-label">Description</label>
        <textarea
          className="modal-textarea"
          placeholder="Describe the objective..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Target & Unit Row (Optional: You could also put these in a row if you want) */}
        <label className="modal-label">Target Value</label>
        <input
          className="modal-input"
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(Number(e.target.value))}
        />

        <label className="modal-label">Unit (%, deals, points...)</label>
        <input
          className="modal-input"
          placeholder="e.g. Deals closed"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />

        {/* Quarter + Year Row */}
        <div className="row">
          <div className="col">
            <label className="modal-label">Quarter</label>
            <select
              className="modal-input"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            >
              {quarters.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </div>

          <div className="col">
            <label className="modal-label">Year</label>
            <input
              className="modal-input"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2020}
              max={2100}
            />
          </div>
        </div>

        {/* Weight */}
        <label className="modal-label">
          Weight (%)
          <span className="weight-info">
            • Remaining: <strong>{remainingWeight}%</strong>
          </span>
        </label>

        <input
          className={`modal-input ${
            weight > remainingWeight ? "input-error" : ""
          }`}
          type="number"
          min={1}
          max={remainingWeight}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
        />

        {weight > remainingWeight && (
          <p className="error-text">
            ❌ Weight cannot exceed {remainingWeight}%
          </p>
        )}

        {/* Buttons */}
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

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