import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useParams } from "react-router-dom";
import QuarterFilter from "../components/QuarterFilter";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
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

const MyReports: React.FC = () => {
  const { user, role } = useAuth();
  const { employeeId } = useParams(); // for manager / HR
  const reportRef = useRef<HTMLDivElement>(null);

  const targetEmployeeId =
    role === "Employee" ? user?.uid : employeeId;

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [review, setReview] = useState<FinalReview | null>(null);
  const [quarter, setQuarter] = useState("Q1");
  const [year, setYear] = useState(new Date().getFullYear());

  const availableYears = [2023, 2024, 2025];

  useEffect(() => {
    if (!targetEmployeeId) return;

    const load = async () => {
      // Final Review (must exist or report is locked)
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
        return;
      }

      const reviewData = reviewSnap.docs[0].data() as FinalReview;
      setReview(reviewData);

      // KPIs for breakdown
      const kpiSnap = await getDocs(
        query(
          collection(db, "kpis"),
          where("ownerId", "==", targetEmployeeId),
          where("quarter", "==", quarter),
          where("year", "==", year)
        )
      );

      setKpis(kpiSnap.docs.map((d) => d.data() as KPI));
    };

    load();
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

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
    pdf.save(`Performance_Report_${quarter}_${year}.pdf`);
  };

  if (!review) {
    return (
      <div className="report-page">
        <h1>Performance Report</h1>
        <QuarterFilter
          selectedQuarter={quarter}
          setQuarter={setQuarter}
          selectedYear={year}
          setYear={setYear}
          availableYears={availableYears}
        />
        <div className="empty-state">
          Report is not available for {quarter} {year}.
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="page-header-actions">
        <QuarterFilter
          selectedQuarter={quarter}
          setQuarter={setQuarter}
          selectedYear={year}
          setYear={setYear}
          availableYears={availableYears}
        />

        <button className="export-btn" onClick={exportToPDF}>
          Export PDF
        </button>
      </div>

      <div ref={reportRef} className="report-container">
        <div className="pdf-only-header">
          <h1>Performance Report</h1>
          <p>
            <strong>Employee:</strong>{" "}
            {review.employeeName}
          </p>
          <p>
            <strong>Period:</strong> {quarter} {year}
          </p>
          <hr />
        </div>

        <div className="summary-layout">
          <div className="summary-stats">
            <div className="summary-card">
              <h3>Final Score</h3>
              <div className="score-val">{review.finalScore}</div>
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
                <th>Weighted Score</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k, i) => {
                const pct =
                  k.targetValue > 0
                    ? Math.round((k.currentValue / k.targetValue) * 100)
                    : 0;
                return (
                  <tr key={i}>
                    <td>{k.title}</td>
                    <td>
                      {k.currentValue} / {k.targetValue} ({pct}%)
                    </td>
                    <td>{k.weight}%</td>
                    <td>{Math.round(pct * (k.weight / 100))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="report-section">
          <h2>360° Feedback</h2>
          <p className="placeholder-text">
            360° feedback will be integrated in the next evaluation cycle.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyReports;
