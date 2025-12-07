import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Toaster } from "react-hot-toast";  // ← ADD THIS

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {/* Global toast notifications (available everywhere) */}
      <Toaster position="top-right" />   {/* ← ADD THIS */}

      {/* Sidebar stays fixed */}
      <Sidebar />

      {/* MAIN CONTENT AREA (shifts right) */}
      <div style={{ marginLeft: "230px" }}>

        {/* Topbar stays fixed INSIDE the content area */}
        <Topbar />

        {/* Page content sits BELOW the topbar */}
        <div
          style={{
            padding: "90px 30px 30px 30px",
            minHeight: "100vh",
            background: "#f7f9fc"
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default AppLayout;
