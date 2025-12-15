import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import AuthPages from "./components/auth/AuthPages"; 
import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { useState, useEffect } from "react";

const App = () => {
  const { pathname } = window.location;
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            marginTop: "55px",
            transition: "all 0.3s ease-in-out",
          },
        }}
      />
      {pathname !== "/auth" ? (
          <div className="flex bg-slate-50" style={{ minHeight: "100vh" }}>
          <Sidebar collapsed={collapsed} />

          <button
            className="md:hidden fixed top-4 left-3 z-50 bg-black text-white p-1 rounded"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            ☰
          </button>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header collapsed={collapsed} toggleSidebar={() => setCollapsed(!collapsed)} />

            <main
              className={`flex-1 overflow-x-auto overflow-y-auto p-4 lg:p-6 bg-slate-50 mt-16 transition-all duration-300 ${
                collapsed ? "ml-10 md:ml-20" : "ml-64"
              }`}
            >
              <div className="min-w-full">
                <AppRoutes />
              </div>
            </main>
          </div>
        </div>

      ) : (
        <AppRoutes />
      )}
    </BrowserRouter>
  );
};

export default App;
