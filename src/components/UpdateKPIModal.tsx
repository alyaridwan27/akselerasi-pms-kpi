import React, { useState } from "react";
import "./UpdateKPIModal.css";
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

interface Props {
  kpi: any;
  onClose: () => void;
  onUpdated: () => void;
}

const UpdateKPIModal: React.FC<Props> = ({ kpi, onClose, onUpdated }) => {
  const { user } = useAuth();
  const [newValue, setNewValue] = useState(kpi.currentValue);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!user) return;

    if (newValue < 0) {
      alert("Progress cannot be negative.");
      return;
    }

    if (newValue > kpi.targetValue) {
      alert("Progress cannot exceed the target value.");
      return;
    }

    setLoading(true);

    try {
      // Update KPI main value
      await updateDoc(doc(db, "kpis", kpi.id), {
        currentValue: newValue,
        updatedAt: serverTimestamp(),
      });

      // Add to progress history
      await addDoc(collection(db, "progressUpdates"), {
        kpiId: kpi.id,
        userId: user.uid,
        newValue,
        timestamp: serverTimestamp(),
      });

      onUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating KPI:", error);
      alert("Failed to update KPI. Check console.");
    }

    setLoading(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Update KPI</h2>
        <h3>{kpi.title}</h3>

        <p>
          Target: <b>{kpi.targetValue}</b> {kpi.unit}
        </p>

        <label>New Progress Value:</label>
        <input
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(Number(e.target.value))}
        />

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>

          <button onClick={handleUpdate} disabled={loading} className="update-btn">
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateKPIModal;
