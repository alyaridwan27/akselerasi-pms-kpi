import React from "react";
import "./StatusBadge.css";

interface Props {
  status: string;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  const normalized = status?.trim() || "Active";

  const COLORS: Record<string, string> = {
    Active: "#3B82F6",            // blue
    PendingReview: "#CA8A04",     // yellow
    NeedsRevision: "#DC2626",     // red
    Approved: "#16A34A",          // green
  };

  const LABELS: Record<string, string> = {
    Active: "Active",
    PendingReview: "Pending Review",
    NeedsRevision: "Needs Revision",
    Approved: "Approved",
  };

  const color = COLORS[normalized] || "#6B7280"; // fallback gray
  const label = LABELS[normalized] || normalized;

  return (
    <span className="status-badge" style={{ backgroundColor: color }}>
      {label}
    </span>
  );
};

export default StatusBadge;
