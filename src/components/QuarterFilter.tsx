import React from "react";
import "./QuarterFilter.css";

interface Props {
  selectedQuarter: string;
  setQuarter: (q: string) => void;

  selectedYear: number;
  setYear: (y: number) => void;

  availableYears: number[];
}

const QuarterFilter: React.FC<Props> = ({
  selectedQuarter,
  setQuarter,
  selectedYear,
  setYear,
  availableYears,
}) => {
  const quarters = ["All", "Q1", "Q2", "Q3", "Q4"];

  return (
    <div className="quarter-filter-container">

      {/* QUARTER BUTTONS */}
      <div className="quarter-buttons">
        {quarters.map((q) => (
          <button
            key={q}
            className={`quarter-btn ${selectedQuarter === q ? "active" : ""}`}
            onClick={() => setQuarter(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* YEAR DROPDOWN */}
      <select
        className="year-select"
        value={selectedYear}
        onChange={(e) => setYear(Number(e.target.value))}
      >
        {availableYears.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

    </div>
  );
};

export default QuarterFilter;
