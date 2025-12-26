// src/pages/AdminSettings.tsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FiSettings, FiSave, FiLock } from "react-icons/fi";
import "./AdminSettings.css";

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    activeYear: 2025,
    activeQuarter: "Q4",
    kpiWeight: 70,
    feedbackWeight: 30,
    allowManagerEdits: true,
    systemLocked: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      const docRef = doc(db, "system", "config");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSettings(snap.data() as any);
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "system", "config"), settings);
      alert("System configuration updated successfully.");
    } catch (error) {
      alert("Error updating settings.");
    }
  };

  if (loading) return <div className="admin-settings-page">Loading Configuration...</div>;

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h1><FiSettings /> Configure System Settings</h1>
        <p className="muted">Manage global parameters for the performance management cycle.</p>
      </div>

      <div className="settings-grid">
        {/* CYCLE CONTROL */}
        <div className="settings-card">
          <h3>Active Review Cycle</h3>
          <div className="setting-group">
            <label>Evaluation Year</label>
            <input 
              type="number" 
              value={settings.activeYear} 
              onChange={e => setSettings({...settings, activeYear: Number(e.target.value)})}
            />
          </div>
          <div className="setting-group">
            <label>Current Quarter</label>
            <select 
              value={settings.activeQuarter} 
              onChange={e => setSettings({...settings, activeQuarter: e.target.value})}
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
        </div>

        {/* CALCULATION LOGIC */}
        <div className="settings-card">
          <h3>Score Weightage Configuration</h3>
          <div className="setting-group">
            <label>KPI Contribution (%)</label>
            <input 
              type="range" min="0" max="100" 
              value={settings.kpiWeight} 
              onChange={e => setSettings({...settings, kpiWeight: Number(e.target.value), feedbackWeight: 100 - Number(e.target.value)})}
            />
            <span className="weight-val">{settings.kpiWeight}%</span>
          </div>
          <div className="setting-group">
            <label>360° Feedback Contribution (%)</label>
            <input type="text" disabled value={`${settings.feedbackWeight}%`} />
          </div>
        </div>

        {/* SYSTEM SECURITY */}
        <div className="settings-card">
          <h3>Governance & Access</h3>
          <div className="setting-toggle">
            <label>Allow Manager KPI Edits</label>
            <input 
              type="checkbox" 
              checked={settings.allowManagerEdits} 
              onChange={e => setSettings({...settings, allowManagerEdits: e.target.checked})}
            />
          </div>
          <div className="setting-toggle danger">
            <label><FiLock /> Global System Lock (Freeze Data)</label>
            <input 
              type="checkbox" 
              checked={settings.systemLocked} 
              onChange={e => setSettings({...settings, systemLocked: e.target.checked})}
            />
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="save-settings-btn" onClick={handleSave}>
          <FiSave /> Save Configuration
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;