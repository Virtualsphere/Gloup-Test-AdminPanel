import { BrowserRouter, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import "./index.css";

const Layout = () => {
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ✅ Handle resize properly
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAuth = !!localStorage.getItem("token");

  // ✅ If not logged in → go to auth
  if (!isAuth && location.pathname !== "/auth") {
    return <Navigate to="/auth" replace />;
  }

  // ✅ If logged in → prevent going back to auth
  if (isAuth && location.pathname === "/auth") {
    return <Navigate to="/" replace />;
  }

  // ✅ Auth page without layout
  if (location.pathname === "/auth") {
    return <AppRoutes />;
  }

  return (
   <div className="w-full min-h-screen bg-gray-50">
      
      {/* SIDEBAR */}
    <Sidebar
      collapsed={isCollapsed}
      isMobileOpen={isMobileOpen}
      setIsMobileOpen={setIsMobileOpen}
    />

      {/* MOBILE OVERLAY */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MOBILE MENU BUTTON 
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="
            fixed top-4 left-3 z-50
            bg-white/80 backdrop-blur-lg
            border border-gray-200
            shadow-md
            p-2 rounded-xl
            hover:scale-105 transition
          "
        >
          ☰
        </button>
      )}*/}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <Header
          collapsed={isCollapsed}
          toggleSidebar={() => {
            if (isMobile) {
              setIsMobileOpen(!isMobileOpen);
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
        />

        {/* PAGE CONTENT */}
       <main
          className={`pt-[70px] p-4 lg:p-6 
          ${!isMobile ? (isCollapsed ? "lg:ml-16" : "lg:ml-64") : ""}
          transition-all duration-300`}
        >
          <AppRoutes />
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { marginTop: "60px" },
        }}
      />
      <Layout />
    </BrowserRouter>
  );
};

export default App;