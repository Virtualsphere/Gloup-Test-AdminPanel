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


const Sidebar = ({ collapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", icon: <BarChart size={18} />, text: "Dashboard" },
    { path: "/partner", icon: <Handshake size={18} />, text: "Partners" },
    { path: "/verifypartner", icon: <User size={18} />, text: "Verify Partner" },
    { path: "/partnersubscriptionplans", icon: <CreditCard size={18} />, text: "Plans" },
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
  className={`
    fixed top-0 left-0 h-screen z-50
    bg-gradient-to-b from-[#0f172a]/95 via-[#020617]/95 to-black/95
    backdrop-blur-xl border-r border-white/10 shadow-2xl
    transition-all duration-300 flex flex-col

    ${collapsed ? "w-20" : "w-64"}

    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
  `}
>
      {/* LOGO */}
       <div className="h-13 flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-lg">G</span>
        </div>

        {!collapsed && (
          <div>
            <h2 className="text-white text-sm font-semibold">GloUp Admin</h2>
            <p className="text-xs text-gray-400">Management Panel</p>
          </div>
        )}
      </div>

      {/* MENU */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto custom-scroll">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);

                // ✅ CLOSE sidebar in mobile
                if (window.innerWidth < 768) {
                  setIsMobileOpen(false);
                }
              }}
              className={`
                relative group flex items-center w-full rounded-xl px-2 py-2
                transition-all duration-200

                ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }

                ${collapsed ? "justify-center" : ""}
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-400 rounded-r-full"></span>
              )}

              {/* Icon */}
              <div
                className={`
                  flex items-center justify-center w-6 h-6 rounded-lg
                  ${
                    isActive
                      ? "bg-white/20"
                      : "bg-white/5 group-hover:bg-white/10"
                  }
                `}
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

      {/* FOOTER */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10 text-xs text-gray-500">
          © 2026 GloUp
        </div>
      )}
    </aside>
  );
};

export default Sidebar;