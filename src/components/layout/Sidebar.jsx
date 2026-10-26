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
  FileText,
  Receipt,
  PieChart,
  Percent,
  Sparkles,
  LayoutDashboard,
  Gauge,
  MessageSquareText,
  Users,
  Activity,
  MapPinned,
  TrendingUp,
  MousePointerClick,
  ChartColumn,
  Scissors,
  Brain,
  Orbit,
  Flame,
  CalendarClock,
  Store,
  Shapes,
  ChevronDown,
  FileChartColumn,
} from "lucide-react";
import { FaRegMoneyBillAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getVerifiedPartnersList } from "../../redux/slices/partnersSlice";


const Sidebar = ({ collapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const pendingPartnerCount = useSelector(
    (state) => state.allPartners.verifiedPartners?.length || 0
  );

  useEffect(() => {
    dispatch(getVerifiedPartnersList());
  }, [dispatch]);

  // Dropdown groups start open when they hold the current page; once the
  // user toggles one, their choice wins.
  const [openGroups, setOpenGroups] = useState({});

  const menuItems = [
    { path: "/", icon: <BarChart size={18} />, text: "Dashboard" },
    { path: "/analytics-intelligence", icon: <Sparkles size={18} />, text: "Analytics Intelligence" },
    { path: "/partner", icon: <Handshake size={18} />, text: "Partners" },
    { path: "/verifypartner", icon: <User size={18} />, text: "Verify Partner" },
    { path: "/partnersubscriptionplans", icon: <CreditCard size={18} />, text: "Plans" },
    { path: "/bookings", icon: <CalendarCheck size={18} />, text: "Bookings" },
    { path: "/bookings-by-order-date", icon: <CalendarCheck size={18} />, text: "Bookings by Order Date" },
    { path: "/monthly-report", icon: <FileText size={18} />, text: "Monthly Report" },
    { path: "/invoice", icon: <FileText size={18} />, text: "Invoice" },
    { path: "/partner-subscriptions", icon: <Receipt size={18} />, text: "Partner Subscriptions" },
    { path: "/subscription", icon: <CreditCard size={18} />, text: "Subscription" },
    { path: "/category", icon: <Layers size={18} />, text: "Category" },
    { path: "/refund", icon: <FaRegMoneyBillAlt size={18} />, text: "Refund" },
    { path: "/coupon", icon: <Ticket size={18} />, text: "Coupon" },
    { path: "/banner", icon: <Image size={18} />, text: "Banner" },
    { path: "/review", icon: <Star size={18} />, text: "Reviews" },
    { path: "/marketing", icon: <Star size={18} />, text: "Marketing" },
    { path: "/notification", icon: <Bell size={18} />, text: "Notification" },
    { path: "/allusers", icon: <User size={18} />, text: "Users" },
    { path: "/gender-probability", icon: <PieChart size={18} />, text: "Gender Probability" },
    { path: "/category-discount", icon: <Percent size={18} />, text: "Category Discount" },

    // Collapsible dropdown: { group, icon, children }.
    {
      group: "Report Dashboard",
      icon: <FileChartColumn size={18} />,
      children: [
        { path: "/analytics-intelligence-v2", icon: <LayoutDashboard size={18} />, text: "Analytics Intelligence V2" },
        { path: "/dashboard-v2", icon: <Gauge size={18} />, text: "Dashboard V2" },
        { path: "/growth-dashboard-v2", icon: <TrendingUp size={18} />, text: "Growth Dashboard V2" },
        { path: "/user-analytics-v2", icon: <Activity size={18} />, text: "User Analytics V2" },
        { path: "/user-analytics-overview-v2", icon: <ChartColumn size={18} />, text: "User Analytics Overview V2" },
        { path: "/user-analytics-360-v2", icon: <Orbit size={18} />, text: "User Analytics 360 V2" },
        { path: "/deep-user-insights-v2", icon: <MapPinned size={18} />, text: "Deep User Insights V2" },
        { path: "/behavior-analytics-v2", icon: <Brain size={18} />, text: "Behavior Analytics V2" },
        { path: "/click-interaction-v2", icon: <MousePointerClick size={18} />, text: "Click & Interaction V2" },
        { path: "/service-intelligence-v2", icon: <Scissors size={18} />, text: "Service Intelligence V2" },
        { path: "/booking-intelligence-v2", icon: <CalendarClock size={18} />, text: "Booking Intelligence V2" },
        { path: "/salon-heatmap-v2", icon: <Flame size={18} />, text: "Salon Heatmap V2" },
        { path: "/salon-category-intelligence-v2", icon: <Shapes size={18} />, text: "Salon Category V2" },
        { path: "/partner-details-v2", icon: <Store size={18} />, text: "Partner Details V2" },
      ],
    },

    // New / in-progress pages live below this divider.
    { section: "New Pages" },
    { path: "/bookings-by-order-date-v2", icon: <CalendarCheck size={18} />, text: "Bookings by Order Date V2" },
    { path: "/invoice-payouts-v2", icon: <Receipt size={18} />, text: "Invoices & Payouts V2" },
    { path: "/monthly-report-v2", icon: <FileText size={18} />, text: "Monthly Report V2" },
    { path: "/partner-subscriptions-v2", icon: <Receipt size={18} />, text: "Partner Subscriptions V2" },
    { path: "/reviews-ratings-v2", icon: <Star size={18} />, text: "Reviews & Ratings V2" },
    { path: "/marketing-sms-v2", icon: <MessageSquareText size={18} />, text: "Marketing SMS V2" },
    { path: "/users-v2", icon: <Users size={18} />, text: "Users V2" },
  ];

  const renderLink = (item, nested = false) => {
    const isActive = location.pathname === item.path;

    return (
      <button
        key={item.path}
        title={collapsed ? item.text : undefined}
        onClick={() => {
          navigate(item.path);

          // ✅ CLOSE sidebar in mobile
          if (window.innerWidth < 768) {
            setIsMobileOpen(false);
          }
        }}
        className={`
          relative group flex items-center w-full rounded-xl px-2
          transition-all duration-200
          ${nested ? "py-1.5" : "py-2"}

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
          <span
            className={`ml-3 text-sm font-medium flex-1 text-left ${
              nested ? "leading-snug" : ""
            }`}
          >
            {item.text}
          </span>
        )}

        {/* Pending count badge */}
        {item.path === "/verifypartner" && pendingPartnerCount > 0 && (
          <span
            className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold ${
              collapsed ? "absolute -top-1 -right-1" : "ml-2"
            }`}
          >
            {pendingPartnerCount > 99 ? "99+" : pendingPartnerCount}
          </span>
        )}
      </button>
    );
  };

  const renderGroup = (item) => {
    const hasActive = item.children.some((c) => c.path === location.pathname);
    const isOpen = openGroups[item.group] ?? hasActive;

    return (
      <div key={item.group}>
        <button
          type="button"
          title={collapsed ? item.group : undefined}
          aria-expanded={isOpen}
          onClick={() =>
            setOpenGroups((groups) => ({ ...groups, [item.group]: !isOpen }))
          }
          className={`
            relative group flex items-center w-full rounded-xl px-2 py-2
            transition-all duration-200

            ${
              hasActive && !isOpen
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }

            ${collapsed ? "justify-center" : ""}
          `}
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 group-hover:bg-white/10">
            {item.icon}
          </div>

          {!collapsed && (
            <>
              <span className="ml-3 text-sm font-medium flex-1 text-left">
                {item.group}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>

        {isOpen && (
          <div
            className={`mt-1 space-y-1 ${
              collapsed ? "" : "ml-4 pl-2 border-l border-white/10"
            }`}
          >
            {item.children.map((child) => renderLink(child, true))}
          </div>
        )}
      </div>
    );
  };

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
          // Section heading — a plain label, or just a divider when collapsed.
          if (item.section) {
            return collapsed ? (
              <div
                key={item.section}
                className="mx-2 my-3 border-t border-white/10"
              />
            ) : (
              <p
                key={item.section}
                className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500"
              >
                {item.section}
              </p>
            );
          }

          return item.group ? renderGroup(item) : renderLink(item);
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