import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router-dom";
import QuarterFilter from "../components/QuarterFilter";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { FiAward, FiDownload, FiStar, FiShield, FiTrendingUp } from "react-icons/fi";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./MyReports.css";

ChartJS.register(ArcElement, Tooltip, Legend);

type KPI = {
  title: string;
  currentValue: number;
  targetValue: number;
  weight: number;
};

type FinalReview = {
  employeeId: string;
  employeeName: string;
  quarter: string;
  year: number;
  finalScore: number;
  performanceCategory: string;
};

type Reward = {
  rewardType: string;
  performanceCategory: string;
  quarter: string;
  year: number;
};

const MyReports: React.FC = () => {
  const { user, role } = useAuth();
  const { employeeId } = useParams(); 
  const reportRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null); // ⭐ Ref for certificate

  const targetEmployeeId = role === "Employee" ? user?.uid : employeeId;

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [review, setReview] = useState<FinalReview | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [quarter, setQuarter] = useState("Q1");
  const [year, setYear] = useState(2026); // Default to current test year

  const availableYears = [2024, 2025, 2026];

  useEffect(() => {
    if (!targetEmployeeId) return;

    const loadData = async () => {
      // 1. Fetch Final Review
      const reviewSnap = await getDocs(
        query(
          collection(db, "finalReviews"),
          where("employeeId", "==", targetEmployeeId),
          where("quarter", "==", quarter),
          where("year", "==", year)
        )
      );

      if (reviewSnap.empty) {
        setReview(null);
        setKpis([]);
        setRewards([]);
        return;
      }

      const reviewData = reviewSnap.docs[0].data() as FinalReview;
      setReview(reviewData);

      // 2. Fetch KPIs
      const kpiSnap = await getDocs(
        query(
          collection(db, "kpis"),
          where("ownerId", "==", targetEmployeeId),
          where("quarter", "==", quarter),
          where("year", "==", year)
        )
      );
      setKpis(kpiSnap.docs.map((d) => d.data() as KPI));

      // 3. Fetch Rewards for this period
      const rewardSnap = await getDocs(
        query(
          collection(db, "rewards"),
          where("employeeId", "==", targetEmployeeId),
          where("quarter", "==", quarter),
          where("year", "==", year)
        )
      );
      setRewards(rewardSnap.docs.map((d) => d.data() as Reward));
    };

    loadData();
  }, [targetEmployeeId, quarter, year]);

  const donutData = useMemo(() => {
    if (!review) return null;
    return {
      labels: ["Score", "Remaining"],
      datasets: [
        {
          data: [review.finalScore, 100 - review.finalScore],
          backgroundColor: ["#2563eb", "#e5e7eb"],
          borderWidth: 0,
          cutout: "70%",
        },
      ],
    };
  }, [review]);

  // Standard PDF Export
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
    pdf.save(`Performance_Report_${review?.employeeName}_${quarter}_${year}.pdf`);
  };

  // ⭐ Certificate Export Logic
  const exportCertificate = async () => {
    if (!certificateRef.current) return;
    const canvas = await html2canvas(certificateRef.current, { scale: 3, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4"); // Landscape orientation
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    pdf.save(`Certificate_Excellence_${review?.employeeName}.pdf`);
  };

  if (!review) {
    return (
      <div className="report-page">
        <h1>Performance Report</h1>
        <QuarterFilter selectedQuarter={quarter} setQuarter={setQuarter} selectedYear={year} setYear={setYear} availableYears={availableYears} />
        <div className="empty-state">No finalized report found for {quarter} {year}.</div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="page-header-actions">
        <QuarterFilter selectedQuarter={quarter} setQuarter={setQuarter} selectedYear={year} setYear={setYear} availableYears={availableYears} />
        
        <div className="action-buttons">
          {/* ⭐ Button only appears for Outstanding performers */}
          {review.performanceCategory === "Outstanding" && (
            <button className="cert-btn" onClick={exportCertificate}>
              <FiAward /> Claim Certificate
            </button>
          )}
          <button className="export-btn" onClick={exportToPDF}>
            <FiDownload /> Export Report
          </button>
        </div>
      </div>

      <div ref={reportRef} className="report-container">
        <div className="pdf-only-header">
          <h1>Performance Report</h1>
          <p><strong>Employee:</strong> {review.employeeName} | <strong>Period:</strong> {quarter} {year}</p>
          <hr />
        </div>

        {/* Rewards Section */}
        {rewards.length > 0 && (
          <div className="report-section rewards-highlight">
            <h2 className="flex items-center gap-2"><FiAward /> Recognition & Rewards</h2>
            <div className="rewards-report-list">
              {rewards.map((r, i) => (
                <div key={i} className="reward-report-item">
                  <FiStar className="text-yellow-400" />
                  <div>
                    <strong>{r.rewardType} Granted</strong>
                    <p>Awarded for reaching {r.performanceCategory} status.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="summary-layout">
          <div className="summary-stats">
            <div className="summary-card">
              <h3>Final Score</h3>
              <div className="score-val">{review.finalScore}%</div>
            </div>
            <div className="summary-card">
              <h3>Category</h3>
              <span className={`badge ${review.performanceCategory.split(" ")[0]}`}>
                {review.performanceCategory}
              </span>
            </div>
          </div>
          <div className="chart-card">
            <h3>Score Distribution</h3>
            <div className="donut-wrapper">
              {donutData && <Doughnut data={donutData} />}
              <div className="donut-center-text">{review.finalScore}%</div>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h2>KPI Breakdown</h2>
          <table className="kpi-table">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Actual / Target</th>
                <th>Weight</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k, i) => {
                const pct = k.targetValue > 0 ? Math.round((k.currentValue / k.targetValue) * 100) : 0;
                return (
                  <tr key={i}>
                    <td>{k.title}</td>
                    <td>{k.currentValue} / {k.targetValue} ({pct}%)</td>
                    <td>{k.weight}%</td>
                    <td>{Math.round(pct * (k.weight / 100))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⭐ HIDDEN CERTIFICATE TEMPLATE ⭐ */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div ref={certificateRef} className="certificate-template">
          <div className="cert-border">
            <div className="cert-content">
              <FiShield className="cert-logo-icon" />
              <h1 className="cert-title">Certificate of Excellence</h1>
              <p className="cert-subtitle">This honor is bestowed upon</p>
              <h2 className="cert-employee-name">{review.employeeName}</h2>
              <p className="cert-body">
                For demonstrating exceptional professional standards and achieving an 
                <strong> Outstanding</strong> performance rating during the 
                <strong> {quarter} {year}</strong> evaluation period.
              </p>
              <div className="cert-footer">
                <div className="cert-sig">
                  <div className="sig-line"></div>
                  <p>Head of Human Resources</p>
                </div>
                <div className="cert-score-seal">
                  <div className="seal-circle">
                    <span>{review.finalScore}%</span>
                  </div>
                  <p>Final Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyReports;