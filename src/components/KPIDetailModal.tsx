import React, { useEffect, useState } from "react";
import {
  doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, addDoc, serverTimestamp, deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { FiX, FiTrendingUp, FiTrash2, FiEdit3, FiFileText, FiCpu, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import "./KPIDetailModal.css";
import { useAuth } from "../context/AuthContext";
import { analyzeKPIEvidence } from "../services/aiService"; 
import ManagerEditKPIModal from "./ManagerEditKPIModal";

interface Props {
  kpiId: string;
  onClose: () => void;
  readOnly?: boolean;
}

const KPIDetailModal: React.FC<Props> = ({ kpiId, onClose, readOnly }) => {
  const { user, role } = useAuth();
  const isEmployee = role === "Employee";
  const isManager = role === "Manager";

  const [kpi, setKpi] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [showManagerEdit, setShowManagerEdit] = useState(false);

  const isApproved = kpi?.status === "Approved";
  const isPending = kpi?.status === "PendingReview";

  const loadData = async () => {
    setLoading(true);
    try {
      const kpiRef = doc(db, "kpis", kpiId);
      const snap = await getDoc(kpiRef);

      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = snap.data();
      setKpi({ id: kpiId, ...data });

      const reviewQ = query(
        collection(db, "finalReviews"), 
        where("employeeId", "==", data.ownerId), 
        where("quarter", "==", data.quarter), 
        where("year", "==", data.year)
      );
      const reviewSnap = await getDocs(reviewQ);
      setIsFinalized(!reviewSnap.empty);

      const comQ = query(collection(doc(db, "kpis", kpiId), "comments"), orderBy("createdAt", "asc"));
      const comSnap = await getDocs(comQ);
      setComments(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading KPI:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [kpiId]);

  /* ---------------- EVIDENCE UPLOAD (Employee Only) ---------------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || readOnly || isApproved) return;

    setUploading(true);
    try {
      // 1. Read file as text locally to bypass CORS later
      const reader = new FileReader();
      const fileContentPromise = new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsText(file);
      });
      const textContent = await fileContentPromise;

      // 2. Upload to Storage for visual reference
      const storageRef = ref(storage, `evidence/${kpiId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // 3. Update Doc with URL and the Raw Text for AI
      await updateDoc(doc(db, "kpis", kpiId), {
        evidenceUrl: url,
        evidenceName: file.name,
        evidenceRawText: textContent, // ⭐ Stored for AI access
        status: "Active" 
      });

      toast.success("Evidence uploaded and processed!");
      loadData();
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- AI SCORING (Manager Only) ---------------- */
  const runAIScoring = async () => {
    // Rubric is NOT hardcoded; it comes from the kpi document
    if (!kpi.rubric || !kpi.evidenceRawText) {
      toast.error("Manager must define a rubric and Employee must upload evidence.");
      return;
    }

    setAiLoading(true);
    const loadingToast = toast.loading("Gemini AI is auditing evidence...");

    try {
      // Passes the rubric from Firestore and the text from Firestore
      const result = await analyzeKPIEvidence(kpi.rubric, kpi.title, kpi.evidenceRawText);
      
      await updateDoc(doc(db, "kpis", kpiId), { 
        currentValue: result.score,
        updatedAt: serverTimestamp() 
      });

      await addDoc(collection(doc(db, "kpis", kpiId), "comments"), {
        userId: "AI_SYSTEM",
        userRole: "Gemini AI",
        message: `Calculated Score: ${result.score}. Reasoning: ${result.justification}`,
        tag: "AI Audit",
        createdAt: serverTimestamp(),
      });
      
      toast.success("AI Analysis Complete!", { id: loadingToast });
      loadData();
    } catch (err) {
      toast.error("AI Analysis failed.", { id: loadingToast });
    } finally {
      setAiLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (readOnly || isFinalized) return;
    await updateDoc(doc(db, "kpis", kpiId), { status: newStatus });
    toast.success(`KPI marked as ${newStatus}`);
    loadData();
  };

  if (loading || !kpi) return null;
  const pct = kpi.targetValue > 0 ? Math.round((kpi.currentValue / kpi.targetValue) * 100) : 0;

  return (
    <>
      <div className="kpi-modal-overlay" onClick={onClose}>
        <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="title-group">
              <h2>{kpi.title}</h2>
              <span className={`status-pill ${kpi.status.toLowerCase()}`}>{kpi.status}</span>
            </div>
            <div className="header-actions">
              {isManager && !isApproved && !readOnly && !isFinalized && (
                <button className="icon-btn edit" onClick={() => setShowManagerEdit(true)}><FiEdit3 /></button>
              )}
              <button className="close-btn" onClick={onClose}><FiX /></button>
            </div>
          </div>

          <div className="modal-body">
            <div className="evidence-section-card">
              <div className="section-header"><FiFileText /><h3>Evidence & AI Audit</h3></div>
              <div className="rubric-box">
                <label>Scoring Rubric</label>
                <p>{kpi.rubric || "No rubric defined."}</p>
              </div>
              
              <div className="evidence-controls">
                {isEmployee && !isApproved && !readOnly && !isFinalized && (
                  <label className="upload-btn">
                    {uploading ? "Uploading..." : "Upload Evidence"}
                    <input type="file" hidden onChange={handleFileUpload} />
                  </label>
                )}

                {kpi.evidenceUrl && (
                  <div className="evidence-status-row">
                    <a href={kpi.evidenceUrl} target="_blank" rel="noreferrer" className="file-link">📄 {kpi.evidenceName}</a>
                    {isManager && !isApproved && !readOnly && !isFinalized && (
                      <button className="ai-btn" onClick={runAIScoring} disabled={aiLoading}>
                        <FiCpu /> {aiLoading ? "Auditing..." : "Calculate AI Score"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="kpi-progress-card">
              <div className="kpi-progress-header"><FiTrendingUp /><h3>Current Performance</h3></div>
              <div className="score-display">
                <span className="current-val">{kpi.currentValue}</span>
                <span className="target-val">/ {kpi.targetValue} {kpi.unit}</span>
                <span className="normalized-label">({pct}% Normalized)</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: '#2563eb' }} />
              </div>
            </div>

            <h3 className="section-title">Audit Trail & Discussion</h3>
            <div className="comments-list">
              {comments.length === 0 && <p className="empty-msg">No entries yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className={`comment-item ${c.tag === "AI Audit" ? "ai-style" : ""}`}>
                  <div className="comment-meta">
                    <span className="tag-badge">{c.tag}</span>
                    <span className="role-text">• {c.userRole}</span>
                  </div>
                  <p className="comment-msg">{c.message}</p>
                </div>
              ))}
            </div>
            
            <div className="footer-actions">
              {isEmployee && kpi.status === "Active" && kpi.evidenceUrl && !readOnly && !isFinalized && (
                <button className="btn btn-primary" onClick={() => updateStatus("PendingReview")}>
                   Submit for Review
                </button>
              )}

              {isManager && isPending && !readOnly && !isFinalized && (
                <div className="manager-decision-group">
                  <button className="btn btn-outline-danger" onClick={() => updateStatus("Active")}>
                    <FiAlertCircle /> Request Revision
                  </button>
                  <button className="btn btn-success" onClick={() => updateStatus("Approved")}>
                    <FiCheckCircle /> Approve Score
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showManagerEdit && <ManagerEditKPIModal kpi={kpi} onClose={() => setShowManagerEdit(false)} onUpdated={loadData} />}
    </>
  );
};

export default KPIDetailModal;