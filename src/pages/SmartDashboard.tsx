// src/pages/SmartDashboard.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";

import Dashboard from "./Dashboard"; // Employee
import ManagerDashboard from "./ManagerDashboard";
import HRDashboard from "./HRDashboard";
import AdminDashboard from "./AdminDashboard";

const SmartDashboard: React.FC = () => {
  const { role } = useAuth();

  switch (role) {
    case "Manager":
      return <ManagerDashboard />;

    case "HR":
      return <HRDashboard />;
    
    case "Admin":
      return <AdminDashboard />;

    case "Employee":
    default:
      return <Dashboard />;
  }
};

export default SmartDashboard;
