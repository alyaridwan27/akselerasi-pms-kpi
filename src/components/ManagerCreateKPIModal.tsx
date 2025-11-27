import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./ManagerCreateKPIModal.css";

interface Props {
  ownerId: string;               // employee uid
  ownerName?: string;            // optional nice-to-have
  onClose: () => void;
  onCreated?: () => void;        // called after successful create to refresh parent
}

const ManagerCreateKPIModal: React.FC<Props> = ({ ownerId, ownerName, onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState<string>("");
  const [unit, setUnit] = useState("");
  const [weight, setWeight] = useState<string>("0.5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetValue("");
    setUnit("");
    setWeight("0.5");
    setError("");
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Please enter a KPI title.");
      return;
    }
    const parsedTarget = Number(targetValue);
    const parsedWeight = Number(weight);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError("Target value must be a positive number.");
      return;
    }
    if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 1) {
      setError("Weight must be a number between 0 and 1.");
      return;
    }

    setLoading(true);
    try {
      const kpiDoc = {
        title: title.trim(),
        description: description.trim(),
        ownerId,
        ownerName: ownerName ?? null,
        targetValue: parsedTarget,
        currentValue: 0,
        unit: unit.trim() || "",
        weight: parsedWeight,
        status: "Active", // default status
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        // optional: managerAssigned: auth.currentUser?.uid (if you want)
      };

      const kpisRef = collection(db, "kpis");
      await addDoc(kpisRef, kpiDoc);

      // success
      resetForm();
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      console.error("Failed to create KPI:", err);
      setError(err?.message || "Failed to create KPI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true">
      <div className="mc-modal">
        <header className="mc-modal-header">
          <h3>Create KPI{ownerName ? ` — ${ownerName}` : ""}</h3>
          <button className="mc-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form className="mc-modal-body" onSubmit={handleCreate}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Close Sales Deals" />
          </label>

          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" />
          </label>

          <div className="mc-row">
            <label>
              Target value
              <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 10" />
            </label>

            <label>
              Unit
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Deals, % (optional)" />
            </label>
          </div>

          <label>
            Weight (0 - 1)
            <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.5" />
            <small>Use a decimal between 0 and 1 (e.g. 0.7)</small>
          </label>

          {error && <div className="mc-error">{error}</div>}

          <footer className="mc-footer">
            <button type="button" className="mc-btn ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="mc-btn primary" disabled={loading}>
              {loading ? "Creating..." : "Create KPI"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ManagerCreateKPIModal;
