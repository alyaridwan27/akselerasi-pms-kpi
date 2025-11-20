import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import "./KPIDetail.css";
import UpdateKPIModal from "../components/UpdateKPIModal";
import { FiActivity, FiTrendingUp } from "react-icons/fi";

const KPIDetail: React.FC = () => {
  const { id } = useParams(); // KPI ID
  const [kpi, setKpi] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);

      // Load KPI data
      const ref = doc(db, "kpis", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setKpi({ id, ...snap.data() });

      // Load KPI update history
      const updRef = collection(db, "progressUpdates");
      const q = query(updRef, where("kpiId", "==", id), orderBy("timestamp", "desc"));
      const updSnap = await getDocs(q);

      const list: any[] = updSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setUpdates(list);
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading KPI...</div>;
  if (!kpi) return <div style={{ padding: 20 }}>KPI not found.</div>;

  const progress = kpi.currentValue / kpi.targetValue;
  const pct = Math.round(progress * 100);

  return (
    <div className="kpi-detail-container">

      <h2 className="kpi-title">{kpi.title}</h2>
      {kpi.description && <p className="kpi-description">{kpi.description}</p>}

      {/* Progress Card */}
      <div className="kpi-progress-card">
        <div className="kpi-progress-header">
          <FiTrendingUp className="icon" />
          <h3>Progress</h3>
        </div>

        <p className="kpi-progress-number">
          {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
        </p>

        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${pct}%`,
              background: pct >= 80 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626",
            }}
          />
        </div>

        <p className="kpi-progress-percent">{pct}% Complete</p>

        <button className="update-btn" onClick={() => setShowModal(true)}>
          Update KPI
        </button>
      </div>

      {/* KPI Metadata */}
      <div className="kpi-meta">
        <p><strong>Weight:</strong> {kpi.weight}</p>
        <p><strong>Status:</strong> {kpi.status}</p>
      </div>

      {/* Update History */}
      <h3 className="section-title">Update History</h3>

      <div className="updates-list">
        {updates.length === 0 && <p>No updates yet.</p>}

        {updates.map((u) => (
          <div key={u.id} className="update-card">
            <div>
              <div className="update-title">New Value: {u.newValue}</div>
              <div className="update-time">
                {u.timestamp?.toDate().toLocaleString() ?? "—"}
              </div>
            </div>

            <FiActivity className="update-icon" />
          </div>
        ))}
      </div>

      {showModal && (
        <UpdateKPIModal
          kpi={kpi}
          onClose={() => setShowModal(false)}
          onUpdated={() => window.location.reload()}
        />
      )}
    </div>
  );
};

export default KPIDetail;
