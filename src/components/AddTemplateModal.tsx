import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { FiX, FiPlus, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const AddTemplateModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [categoryName, setCategoryName] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addGoal = () => {
    if (!goalInput.trim()) return;
    setGoals([...goals, goalInput.trim()]);
    setGoalInput("");
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!categoryName.trim() || goals.length === 0) {
      toast.error("Please provide a category name and at least one goal.");
      return;
    }

    setLoading(false);
    try {
      await addDoc(collection(db, "kpiTemplates"), {
        categoryName: categoryName.trim(),
        goals: goals,
        createdAt: serverTimestamp(),
      });
      toast.success("Standard template created!");
      onCreated();
      onClose();
    } catch (error) {
      toast.error("Failed to create template.");
    }
  };

  return (
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Define New Role Standard</h2>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-body">
          <label className="modal-label">Role Category Name</label>
          <input 
            className="modal-input" 
            placeholder="e.g. Software Engineer" 
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />

          <label className="modal-label">Add Standard Goals</label>
          <div className="inline-edit-row">
            <input 
              className="modal-input" 
              placeholder="e.g. Sprint Velocity" 
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addGoal()}
            />
            <button className="save-mini-btn" onClick={addGoal}><FiPlus /> Add</button>
          </div>

          <div className="template-preview-list">
            {goals.map((g, idx) => (
              <div key={idx} className="template-goal-pill">
                <span>{g}</span>
                <FiTrash2 className="delete-icon" onClick={() => removeGoal(idx)} />
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="create-btn" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTemplateModal;