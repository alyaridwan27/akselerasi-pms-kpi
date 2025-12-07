import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { FiX, FiTrendingUp, FiActivity, FiTrash2, FiEdit3, FiSave } from "react-icons/fi";
import toast from "react-hot-toast";
import "./KPIDetailModal.css";
import { useAuth } from "../context/AuthContext";
// If you have the Manager Edit modal, import it here:
import ManagerEditKPIModal from "./ManagerEditKPIModal";

interface Props {
  kpiId: string;
  onClose: () => void;
}

const KPIDetailModal: React.FC<Props> = ({ kpiId, onClose }) => {
  const [kpi, setKpi] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manager Edit Modal State
  const [showManagerEdit, setShowManagerEdit] = useState(false);

  // Employee Inline Edit State
  const [editProgress, setEditProgress] = useState<number>(0);

  // Comment State
  const [commentText, setCommentText] = useState("");
  const [commentTag, setCommentTag] = useState("Info");

  const { user, role } = useAuth();
  const isManager = role === "Manager";
  const isApproved = kpi?.status === "Approved";

  // Load Data
  const load = async () => {
    setLoading(true);
    const ref = doc(db, "kpis", kpiId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      setKpi({ id: kpiId, ...data });
      setEditProgress(data.currentValue || 0);
    }

    // Load updates
    const updQ = query(
      collection(db, "progressUpdates"),
      where("kpiId", "==", kpiId),
      orderBy("timestamp", "desc")
    );
    const updSnap = await getDocs(updQ);
    setUpdates(updSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    // Load comments
    const comQ = query(
      collection(doc(db, "kpis", kpiId), "comments"),
      orderBy("createdAt", "asc")
    );
    const comSnap = await getDocs(comQ);
    setComments(comSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [kpiId]);

  // --- ACTIONS ---

  const addComment = async (text: string, tag: string) => {
    if (!text.trim()) return;
    await addDoc(collection(doc(db, "kpis", kpiId), "comments"), {
      userId: user?.uid,
      userRole: role,
      message: text,
      tag: tag,
      createdAt: serverTimestamp(),
    });
    // Refresh comments
    const comQ = query(collection(doc(db, "kpis", kpiId), "comments"), orderBy("createdAt", "asc"));
    const snap = await getDocs(comQ);
    setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Manager Action (Approve/Reject + Auto Comment)
  const performManagerAction = async (newStatus: string) => {
    try {
      if (commentText.trim()) {
        const autoTag = newStatus === "NeedsRevision" ? "Revision Required" : "Info";
        await addComment(commentText, autoTag);
        setCommentText("");
      }

      const ref = doc(db, "kpis", kpiId);
      await updateDoc(ref, { status: newStatus, lastUpdatedAt: new Date() });
      setKpi((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`KPI marked as ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  // Employee: Save Progress Inline
  const saveProgress = async () => {
    if (editProgress < 0 || editProgress > kpi.targetValue) return toast.error("Invalid value");

    try {
      await updateDoc(doc(db, "kpis", kpiId), {
        currentValue: editProgress,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "progressUpdates"), {
        kpiId: kpiId,
        userId: user?.uid,
        newValue: editProgress,
        timestamp: serverTimestamp(),
      });

      setKpi({ ...kpi, currentValue: editProgress });
      toast.success("Progress saved");
      
      // Refresh history
      const updQ = query(collection(db, "progressUpdates"), where("kpiId", "==", kpiId), orderBy("timestamp", "desc"));
      const updSnap = await getDocs(updQ);
      setUpdates(updSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save progress");
    }
  };

  const deleteKPI = async () => {
    if (!confirm("Delete this KPI?")) return;
    await deleteDoc(doc(db, "kpis", kpiId));
    toast.success("KPI deleted");
    onClose();
  };

  if (loading || !kpi) return null;

  const pct = kpi.targetValue > 0 ? Math.round((kpi.currentValue / kpi.targetValue) * 100) : 0;
  const barColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <>
      <div className="kpi-modal-overlay" onClick={onClose}>
        <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
          
          {/* HEADER */}
          <div className="modal-header">
            <h2>{kpi.title}</h2>
            <div className="header-actions">
              {isManager && (
                <>
                  <button className="icon-btn edit" onClick={() => setShowManagerEdit(true)}>
                    <FiEdit3 size={18} />
                  </button>
                  <button className="icon-btn delete" onClick={deleteKPI}>
                    <FiTrash2 size={18} />
                  </button>
                </>
              )}
              <button className="close-btn" onClick={onClose}>
                <FiX size={18} />
              </button>
            </div>
          </div>

          <div className="modal-body">
            {/* SUMMARY BADGES */}
            <div className="summary-row">
              <div className="summary-badge">
                <span className="summary-label">Owner</span>
                <span className="summary-value">{kpi.ownerName || "—"}</span>
              </div>
              <div className="summary-badge">
                <span className="summary-label">Weight</span>
                <span className="summary-value">{kpi.weight}%</span>
              </div>
              <div className="summary-badge">
                <span className="summary-label">Status</span>
                <span className={`status-text ${kpi.status}`}>{kpi.status}</span>
              </div>
            </div>

            {/* PROGRESS TRACKING */}
            <div className="kpi-progress-card">
              <div className="kpi-progress-header">
                <FiTrendingUp size={18} />
                <h3>Progress Tracking</h3>
              </div>

              {/* INLINE EDITING LOGIC */}
              {!isManager && !isApproved ? (
                <div className="inline-edit-row">
                  <input
                    type="number"
                    className="inline-number-input"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                  />
                  <span className="target-text">/ {kpi.targetValue} {kpi.unit}</span>
                  
                  {editProgress !== kpi.currentValue && (
                    <button className="save-mini-btn" onClick={saveProgress}>
                      <FiSave /> Save
                    </button>
                  )}
                </div>
              ) : (
                <p className="progress-number">
                  {kpi.currentValue} <span className="target-text">/ {kpi.targetValue} {kpi.unit}</span>
                </p>
              )}

              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                />
              </div>
              <p className="progress-percent">{pct}% Completed</p>
            </div>

            {/* DISCUSSION */}
            <h3 className="section-title">Discussion</h3>
            <div className="comments-list">
              {comments.length === 0 && <p className="no-comments">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-header">
                    <div className="comment-meta">
                      <span className={`tag-badge ${c.tag === "Revision Required" ? "Revision" : ""}`}>
                        {c.tag}
                      </span>
                      <span className="role-text">• {c.userRole}</span>
                    </div>
                  </div>
                  <p className="comment-msg">{c.message}</p>
                </div>
              ))}
            </div>

            {/* ADD COMMENT */}
            <div className="add-comment-box">
              <select
                className="styled-select"
                value={commentTag}
                onChange={(e) => setCommentTag(e.target.value)}
              >
                <option>Info</option>
                <option>Revision Required</option>
                <option>Blocker</option>
              </select>
              <textarea
                className="styled-textarea"
                value={commentText}
                placeholder="Write a comment..."
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="comment-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    addComment(commentText, commentTag);
                    setCommentText("");
                  }}
                >
                  Post Comment
                </button>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="footer-actions">
              {isManager && (
                <>
                  <button
                    className="btn btn-danger"
                    disabled={isApproved}
                    onClick={() => performManagerAction("NeedsRevision")}
                  >
                    Request Changes
                  </button>
                  <button
                    className="btn btn-success"
                    disabled={isApproved}
                    onClick={() => performManagerAction("Approved")}
                  >
                    Approve KPI
                  </button>
                </>
              )}

              {!isManager && (
                <button
                  className="btn btn-warning"
                  disabled={kpi.status === "PendingReview" || isApproved}
                  onClick={() => performManagerAction("PendingReview")}
                >
                  Submit For Review
                </button>
              )}
            </div>

            {/* HISTORY */}
            <div className="history-section">
              <h3 className="section-title">Update History</h3>
              {updates.map((u) => (
                <div key={u.id} className="history-item">
                  <div>
                    <div className="update-val">Value updated to {u.newValue}</div>
                    <div className="update-ts">
                      {u.timestamp?.toDate?.().toLocaleString()}
                    </div>
                  </div>
                  <FiActivity className="history-icon" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER MANAGER EDIT MODAL IF NEEDED */}
      {showManagerEdit && (
        <ManagerEditKPIModal
          kpi={kpi}
          onClose={() => setShowManagerEdit(false)}
          onUpdated={() => {
            load();
            setShowManagerEdit(false);
          }}
        />
      )}
    </>
  );
};

export default KPIDetailModal;