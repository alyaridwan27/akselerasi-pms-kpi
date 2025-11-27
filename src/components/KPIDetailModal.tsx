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
} from "firebase/firestore";
import { db } from "../firebase";
import { FiX, FiTrendingUp, FiActivity } from "react-icons/fi";
import "./KPIDetailModal.css";
import UpdateKPIModal from "./UpdateKPIModal";
import { useAuth } from "../context/AuthContext";

interface Props {
  kpiId: string;
  onClose: () => void;
}

const KPIDetailModal: React.FC<Props> = ({ kpiId, onClose }) => {
  const [kpi, setKpi] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { role } = useAuth();

  const isApproved = kpi?.status === "Approved";

  // ---------------------
  // Update KPI Status
  // ---------------------
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const ref = doc(db, "kpis", kpiId);
      await updateDoc(ref, {
        status: newStatus,
        lastUpdatedAt: new Date(),
      });

      setKpi((prev: any) => ({
        ...prev,
        status: newStatus,
      }));

      alert(`KPI marked as: ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  // ---------------------
  // Save Manager Comment
  // ---------------------
  const handleSaveComment = async () => {
    try {
      setSavingComment(true);
      const ref = doc(db, "kpis", kpiId);
      await updateDoc(ref, {
        managerComment: comment,
      });

      alert("Comment saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save comment.");
    } finally {
      setSavingComment(false);
    }
  };

  // ---------------------
  // Load KPI + History
  // ---------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const ref = doc(db, "kpis", kpiId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setKpi({ id: kpiId, ...snap.data() });
        setComment(snap.data()?.managerComment ?? "");
      }

      const updRef = collection(db, "progressUpdates");
      const q = query(
        updRef,
        where("kpiId", "==", kpiId),
        orderBy("timestamp", "desc")
      );
      const updSnap = await getDocs(q);

      setUpdates(
        updSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

      setLoading(false);
    };

    load();
  }, [kpiId]);

  if (loading) return null;
  if (!kpi) return null;

  const pct = Math.round((kpi.currentValue / kpi.targetValue) * 100);
  const barColor =
    pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626";

  return (
    <>
      <div className="kpi-modal-overlay" onClick={onClose}></div>

      <div className="kpi-modal">
        <div className="modal-header">
          <h2>{kpi.title}</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {kpi.description && <p className="kpi-description">{kpi.description}</p>}

        {/* Progress Section */}
        <div className="kpi-progress-card">
          <div className="kpi-progress-header">
            <FiTrendingUp className="progress-icon" />
            <h3>Progress</h3>
          </div>

          <p className="progress-number">
            {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
          </p>

          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${pct}%`,
                background: barColor,
              }}
            />
          </div>

          <p className="progress-percent">{pct}% Complete</p>

          {/* Role-based buttons */}
          {role === "Employee" && (
            <button
              className="update-btn"
              disabled={isApproved}
              onClick={() => setShowUpdateModal(true)}
            >
              Update KPI
            </button>
          )}

          {role === "Manager" && (
            <div className="approval-row">
              <button
                className="approve-btn"
                disabled={isApproved}
                onClick={() => handleUpdateStatus("Approved")}
              >
                Approve
              </button>

              <button
                className="reject-btn"
                disabled={isApproved}
                onClick={() => handleUpdateStatus("NeedsRevision")}
              >
                Request Changes
              </button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="kpi-metadata">
          <p><strong>Weight:</strong> {kpi.weight}</p>
          <p><strong>Status:</strong> {kpi.status}</p>
        </div>

        {/* Manager Comment */}
        {role === "Manager" && (
          <div className="comment-section">
            <label><strong>Manager comment</strong></label>
            <textarea
              placeholder="Add a comment for the employee (optional)"
              value={comment}
              disabled={isApproved}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>

            <button
              className="comment-save-btn"
              disabled={isApproved || savingComment}
              onClick={handleSaveComment}
            >
              {savingComment ? "Saving..." : "Save Comment"}
            </button>
          </div>
        )}

        {/* History */}
        <h3 className="history-title">Update History</h3>
        <div className="history-list">
          {updates.length === 0 && <p>No updates yet.</p>}

          {updates.map((u) => (
            <div key={u.id} className="history-item">
              <div>
                <div className="update-text">New Value: {u.newValue}</div>
                <div className="update-time">
                  {u.timestamp?.toDate?.().toLocaleString()}
                </div>
              </div>
              <FiActivity className="history-icon" />
            </div>
          ))}
        </div>

        {showUpdateModal && (
          <UpdateKPIModal
            kpi={kpi}
            onClose={() => setShowUpdateModal(false)}
            onUpdated={() => window.location.reload()}
          />
        )}
      </div>
    </>
  );
};

export default KPIDetailModal;
