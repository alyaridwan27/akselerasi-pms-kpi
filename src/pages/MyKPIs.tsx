// src/pages/MyKPIs.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./MyKPIs.css";

interface KPI {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  weight?: number;
  status?: string;
}

const MyKPIs: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setKpis([]);
      setLoading(false);
      return;
    }

    // capture uid synchronously so TS knows it's defined
    const uid = user.uid;

    const fetchKPIs = async () => {
      setLoading(true);
      try {
        const kpiRef = collection(db, "kpis");
        const q = query(kpiRef, where("ownerId", "==", uid));
        const snap = await getDocs(q);

        const items: KPI[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          items.push({
            id: doc.id,
            title: data.title ?? "Untitled KPI",
            description: data.description ?? "",
            targetValue: data.targetValue ?? 0,
            currentValue: data.currentValue ?? 0,
            unit: data.unit ?? "",
            weight: data.weight ?? 0,
            status: data.status ?? "Draft",
          });
        });

        setKpis(items);
      } catch (err) {
        console.error("Error fetching KPIs:", err);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [user]);

  if (loading) return <div style={{ padding: 20 }}>Loading KPIs...</div>;

  return (
    <div className="kpi-container">
      <h2>My KPIs</h2>

      {kpis.length === 0 && <p>No KPIs found for your account.</p>}

      {kpis.map((kpi) => (
        <div key={kpi.id} className="kpi-card">
          <h3>{kpi.title}</h3>
          {kpi.description && <p>{kpi.description}</p>}
          <div className="kpi-stats">
            <span>
              Progress: {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
            </span>
            <span>Weight: {kpi.weight}</span>
            <span>Status: {kpi.status}</span>
          </div>
          <button>Update KPI</button>
        </div>
      ))}
    </div>
  );
};

export default MyKPIs;
