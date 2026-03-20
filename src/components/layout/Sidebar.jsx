import {
  BarChart,
  User,
  CreditCard,
  Handshake,
  Image,
  Star,
  Bell,
  CalendarCheck,
  Layers,
  Ticket,
} from "lucide-react";
import { FaRegMoneyBillAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", icon: <BarChart size={18} />, text: "Dashboard" },
    { path: "/partner", icon: <Handshake size={18} />, text: "Partners" },
    { path: "/verifypartner", icon: <User size={18} />, text: "Verify Partner" },
    {
      path: "/partnersubscriptionplans",
      icon: <CreditCard size={18} />,
      text: "Plans",
    },
    { path: "/bookings", icon: <CalendarCheck size={18} />, text: "Bookings" },
    { path: "/subscription", icon: <CreditCard size={18} />, text: "Subscription" },
    { path: "/category", icon: <Layers size={18} />, text: "Category" },
    { path: "/refund", icon: <FaRegMoneyBillAlt size={18} />, text: "Refund" },
    { path: "/coupon", icon: <Ticket size={18} />, text: "Coupon" },
    { path: "/banner", icon: <Image size={18} />, text: "Banner" },
    { path: "/review", icon: <Star size={18} />, text: "Reviews" },
    { path: "/notification", icon: <Bell size={18} />, text: "Notification" },
    { path: "/allusers", icon: <User size={18} />, text: "Users" },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 
      bg-gradient-to-b from-[#0f172a] via-[#020617] to-black 
      backdrop-blur-xl border-r border-white/10
      ${collapsed ? "w-16" : "w-64"} 
      transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        {!collapsed && (
          <h2 className="text-lg font-semibold tracking-wide text-white">
            GloUp Admin
          </h2>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`group flex items-center w-full rounded-xl px-3 py-2.5 transition-all duration-200
              
              ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }

              ${collapsed ? "justify-center" : ""}
              `}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition
                ${
                  isActive
                    ? "bg-white/20"
                    : "bg-white/5 group-hover:bg-white/10"
                }`}
              >
                {item.icon}
              </div>

              {/* Text */}
              {!collapsed && (
                <span className="ml-3 text-sm font-medium">
                  {item.text}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10 text-xs text-gray-500">
          © 2026 GloUp
        </div>
      )}
    </aside>
  );
};

export default Sidebar;