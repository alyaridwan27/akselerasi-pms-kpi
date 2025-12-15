// src/pages/SmartDashboard.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";

import Dashboard from "./Dashboard"; // Employee
import ManagerDashboard from "./ManagerDashboard";
import HRDashboard from "./HRDashboard";

const SmartDashboard: React.FC = () => {
  const { role } = useAuth();

  switch (role) {
    case "Manager":
      return <ManagerDashboard />;

    case "HR":
    case "Admin":
      return <HRDashboard />;

    case "Employee":
    default:
      return <Dashboard />;
  }
};

export default SmartDashboard;
