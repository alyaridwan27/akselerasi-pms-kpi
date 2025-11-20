import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyKPIs from "./pages/MyKPIs";
import MyReports from "./pages/MyReports";
import KPIDetail from "./pages/KPIDetail";



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
                  <Dashboard />
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

          <Route
            path="/kpi/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <KPIDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />

        </Routes>

      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
