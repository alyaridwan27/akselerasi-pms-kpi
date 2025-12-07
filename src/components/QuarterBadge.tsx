import React from "react";
import "./QuarterBadge.css";

interface Props {
  quarter: string;
  year: number;
}

const QuarterBadge: React.FC<Props> = ({ quarter, year }) => {
  return (
    <span className="quarter-badge">
      {quarter} {year}
    </span>
  );
};

export default QuarterBadge;
