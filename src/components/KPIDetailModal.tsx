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
import {
  FiX,
  FiTrendingUp,
  FiActivity,
  FiTrash2,
  FiEdit3,
  FiSave,
} from "react-icons/fi";
import toast from "react-hot-toast";
import "./KPIDetailModal.css";
import { useAuth } from "../context/AuthContext";
import ManagerEditKPIModal from "./ManagerEditKPIModal";

interface Props {
  kpiId: string;
  onClose: () => void;
}

const KPIDetailModal: React.FC<Props> = ({ kpiId, onClose }) => {
  const { user, role } = useAuth();

  /* ---------------- ROLE FLAGS ---------------- */
  const isEmployee = role === "Employee";
  const isManager = role === "Manager";
  const isHR = role === "HR";
  const isAdmin = role === "Admin";

  /* ---------------- STATE ---------------- */
  const [kpi, setKpi] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinalized, setIsFinalized] = useState(false);

  // Inline edit
  const [editProgress, setEditProgress] = useState(0);

  // Manager edit modal
  const [showManagerEdit, setShowManagerEdit] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState("");
  const [commentTag, setCommentTag] = useState("Info");

  const isApproved = kpi?.status === "Approved";

  /* ---------------- LOAD DATA ---------------- */
  const load = async () => {
    setLoading(true);

    const ref = doc(db, "kpis", kpiId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      setLoading(false);
      return;
    }

    const data = snap.data();
    setKpi({ id: kpiId, ...data });
    setEditProgress(data.currentValue ?? 0);

    // ---- Check FINAL REVIEW (LOCK) ----
    const reviewQ = query(
      collection(db, "finalReviews"),
      where("employeeId", "==", data.ownerId),
      where("quarter", "==", data.quarter),
      where("year", "==", data.year)
    );
    const reviewSnap = await getDocs(reviewQ);
    setIsFinalized(!reviewSnap.empty);

    // ---- Progress History ----
    const updQ = query(
      collection(db, "progressUpdates"),
      where("kpiId", "==", kpiId),
      orderBy("timestamp", "desc")
    );
    const updSnap = await getDocs(updQ);
    setUpdates(updSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    // ---- Comments ----
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

  /* ---------------- COMMENTS ---------------- */
  const addComment = async (text: string, tag: string) => {
    if (!text.trim()) return;

    await addDoc(collection(doc(db, "kpis", kpiId), "comments"), {
      userId: user?.uid,
      userRole: role,
      message: text,
      tag,
      createdAt: serverTimestamp(),
    });

    setCommentText("");
    load();
  };

  /* ---------------- MANAGER ACTION ---------------- */
  const performManagerAction = async (newStatus: string) => {
    if (isFinalized) {
      toast.error("This KPI is locked after final review");
      return;
    }

    try {
      if (commentText.trim()) {
        await addComment(
          commentText,
          newStatus === "NeedsRevision" ? "Revision Required" : "Info"
        );
      }

      await updateDoc(doc(db, "kpis", kpiId), {
        status: newStatus,
        lastUpdatedAt: new Date(),
      });

      toast.success(`KPI marked as ${newStatus}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  /* ---------------- EMPLOYEE PROGRESS ---------------- */
  const saveProgress = async () => {
    if (isFinalized) {
      toast.error("This KPI is locked after final review");
      return;
    }

    if (editProgress < 0 || editProgress > kpi.targetValue) {
      toast.error("Invalid value");
      return;
    }

    await updateDoc(doc(db, "kpis", kpiId), {
      currentValue: editProgress,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "progressUpdates"), {
      kpiId,
      userId: user?.uid,
      newValue: editProgress,
      timestamp: serverTimestamp(),
    });

    toast.success("Progress saved");
    load();
  };

  /* ---------------- DELETE KPI ---------------- */
  const deleteKPI = async () => {
    if (isFinalized) {
      toast.error("This KPI is locked after final review");
      return;
    }

    if (!confirm("Delete this KPI?")) return;
    await deleteDoc(doc(db, "kpis", kpiId));
    toast.success("KPI deleted");
    onClose();
  };

  if (loading || !kpi) return null;

  const pct =
    kpi.targetValue > 0
      ? Math.round((kpi.currentValue / kpi.targetValue) * 100)
      : 0;

  const barColor =
    pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <>
      <div className="kpi-modal-overlay" onClick={onClose}>
        <div className="kpi-modal" onClick={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <div className="modal-header">
            <h2>{kpi.title}</h2>
            <div className="header-actions">
              {isManager && !isFinalized && (
                <>
                  <button className="icon-btn edit" onClick={() => setShowManagerEdit(true)}>
                    <FiEdit3 />
                  </button>
                  <button className="icon-btn delete" onClick={deleteKPI}>
                    <FiTrash2 />
                  </button>
                </>
              )}
              <button className="close-btn" onClick={onClose}>
                <FiX />
              </button>
            </div>
          </div>

          {/* FINALIZED BANNER */}
          {isFinalized && (
            <div className="finalized-banner">
              🔒 This KPI is locked because the final performance review has been completed.
            </div>
          )}

          <div className="modal-body">
            {/* SUMMARY */}
            <div className="summary-row">
              <div className="summary-badge">
                <span className="summary-label">Owner</span>
                <span className="summary-value">{kpi.ownerName}</span>
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

            {/* PROGRESS */}
            <div className="kpi-progress-card">
              <div className="kpi-progress-header">
                <FiTrendingUp />
                <h3>Progress Tracking</h3>
              </div>

              {isEmployee && !isApproved && !isFinalized ? (
                <div className="inline-edit-row">
                  <input
                    type="number"
                    className="inline-number-input"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                  />
                  <span className="target-text">
                    / {kpi.targetValue} {kpi.unit}
                  </span>
                  {editProgress !== kpi.currentValue && (
                    <button className="save-mini-btn" onClick={saveProgress}>
                      <FiSave /> Save
                    </button>
                  )}
                </div>
              ) : (
                <p className="progress-number">
                  {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                </p>
              )}

              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              <p className="progress-percent">{pct}% Completed</p>
            </div>

            {/* COMMENTS */}
            <h3 className="section-title">Discussion</h3>
            <div className="comments-list">
              {comments.length === 0 && <p className="no-comments">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-meta">
                    <span className={`tag-badge ${c.tag === "Revision Required" ? "Revision" : ""}`}>
                      {c.tag}
                    </span>
                    <span className="role-text">• {c.userRole}</span>
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
                <button className="btn btn-primary" onClick={() => addComment(commentText, commentTag)}>
                  Post Comment
                </button>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="footer-actions">
              {isManager && !isFinalized && (
                <>
                  <button className="btn btn-danger" onClick={() => performManagerAction("NeedsRevision")}>
                    Request Changes
                  </button>
                  <button className="btn btn-success" onClick={() => performManagerAction("Approved")}>
                    Approve KPI
                  </button>
                </>
              )}

              {isEmployee && !isFinalized && (
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
