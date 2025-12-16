import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import "./index.css";

import Login from "./pages/Login";
import MyKPIs from "./pages/MyKPIs";
import MyReports from "./pages/MyReports";
import ManagerTeam from "./pages/ManagerTeam";
import ManagerEmployeeKPIs from "./pages/ManagerEmployeeKPIs";
import SmartDashboard from "./pages/SmartDashboard";
import HRKPIs from "./pages/HRKPIs";
import HRFinalReview from "./pages/HRFinalReview";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>

        <Routes>

          {/* Public page */}
          <Route path="/login" element={<Login />} />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected pages (inside AppLayout) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SmartDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />


          <Route
            path="/my-kpis"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MyKPIs />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-reports"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MyReports />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Manager Team Page */}
          <Route
            path="/manager/team"
            element={
              <ProtectedRoute allowedRoles={["Manager"]}>
                <AppLayout>
                  <ManagerTeam />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Manager View KPIs for Employee */}
          <Route
            path="/manager/kpis/:employeeId"
            element={
              <ProtectedRoute allowedRoles={["Manager"]}>
                <AppLayout>
                  <ManagerEmployeeKPIs />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr/kpis"
            element={
              <ProtectedRoute allowedRoles={["HR", "Admin"]}>
                <AppLayout>
                  <HRKPIs />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/final-review"
            element={
              <ProtectedRoute allowedRoles={["HR", "Admin"]}>
                <AppLayout>
                  <HRFinalReview />
                </AppLayout>
              </ProtectedRoute>
            }
          />

        </Routes>

      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
