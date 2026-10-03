import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { Toaster } from "react-hot-toast";
import UseBookingSSE from "./components/data/UseBookingSSE";

// صفحات (example)
import Dashboard from "./components/dashboard/DashboardPage";

import Auth from "./components/auth/AuthPages";
import AppRoutes from "./routes/AppRoutes";
import { PageHeaderSlotProvider } from "./components/layout/PageHeaderSlot";

import "./index.css";

const Layout = () => {
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ✅ Remember the collapsed choice across reloads
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
    } catch {
      /* private mode / blocked storage - not worth failing over */
    }
  }, [isCollapsed]);

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
    <PageHeaderSlotProvider>
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
          collapsed={isCollapsed}
          toggleSidebar={() => {
            if (isMobile) {
              setIsMobileOpen((prev) => !prev);
            } else {
              setIsCollapsed((prev) => !prev);
            }
          }}
        />

        <UseBookingSSE />

        {/* PAGE CONTENT */}
        <main
          className={`pt-[70px] p-4 transition-all duration-300
          ${!isMobile ? (isCollapsed ? "lg:ml-20" : "lg:ml-64") : ""}`}
        >
          <AppRoutes/>
        </main>
      </div>
    </div>
    </PageHeaderSlotProvider>
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