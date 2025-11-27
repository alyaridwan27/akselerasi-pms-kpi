import React from "react";
import { useAuth } from "../context/AuthContext";
import Dashboard from "./Dashboard"; // employee dashboard
import ManagerDashboard from "./ManagerDashboard";

const SmartDashboard: React.FC = () => {
  const { role } = useAuth();

  if (role === "Manager") {
    return <ManagerDashboard />;
  }

  return <Dashboard />;
};

export default SmartDashboard;
