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
    <div className="quarter-filter-wrapper">
      <div className="quarter-buttons-group">
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

      <div className="year-select-container">
        <select
          className="year-dropdown"
          value={selectedYear}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default QuarterFilter;