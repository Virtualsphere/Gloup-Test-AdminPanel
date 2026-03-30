import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { Toaster } from "react-hot-toast";

// صفحات (example)
import Dashboard from "./components/dashboard/DashboardPage";

import Auth from "./components/auth/AuthPages";
import AppRoutes from "./routes/AppRoutes";

import "./index.css";

const Layout = () => {
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ✅ Responsive detection
useEffect(() => {
  const handleResize = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    if (!mobile) {
      setIsMobileOpen(false);
    }
  };

  handleResize(); // ✅ important
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

  const isAuth = !!localStorage.getItem("token");

  // ✅ Auth protection
  if (!isAuth && location.pathname !== "/auth") {
    return <Navigate to="/auth" replace />;
  }

  if (isAuth && location.pathname === "/auth") {
    return <Navigate to="/" replace />;
  }

  // ✅ Auth page (no layout)
  if (location.pathname === "/auth") {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
      </Routes>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-gray-50">

      {/* ✅ SIDEBAR */}
      <Sidebar
        collapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* ✅ MOBILE OVERLAY */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ✅ MAIN CONTENT */}
      <div className="flex-1 flex flex-col w-full">

        {/* HEADER */}
        <Header
          toggleSidebar={() => {
              setIsMobileOpen((prev) => !prev);
            }}
        />

        {/* PAGE CONTENT */}
        <main
          className={`pt-[70px] p-4 transition-all duration-300
          ${!isMobile ? (isCollapsed ? "lg:ml-16" : "lg:ml-64") : ""}`}
        >
          <AppRoutes/>
        </main>
      </div>
    </div>
  );
};

// ✅ ROOT APP
const App = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { marginTop: "60px" },
        }}
      />
      <Layout />
    </BrowserRouter>
  );
};

export default App;