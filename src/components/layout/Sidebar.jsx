import {
  BarChart,
  User,
  CreditCard,
  Handshake,
  DollarSign,
  Image,
  Star,
  Bell,
  CalendarDays,
  CalendarCheck,
  CalendarRange,  
  BookOpen,
  BookCopy, 
  Megaphone,
  NotebookPen,
  School, 
  Presentation,
  Users,
  Layers,
  Ticket,
  IndianRupee,
  
  
} from "lucide-react";
import {  FaRegMoneyBillAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo2.svg";
import { Scissors } from "lucide-react";

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Define menu items with path
  const menuItems = [
    { path: "/",
      icon: <BarChart size={20} />, 
      text: "Dashboard" },
         
    { 
     path: "/partner",
      icon: <Handshake size={20} />, 
      text: "Partners" },
    // { 
    //  path: "/appointments",
    //   icon: <CalendarDays size={20} />, 
    //   text: "Appointments" },
    // { 
    //  path: "/services",
    //   icon: <Scissors size={20} />, 
    //   text: "Services" },
    { path: "/verifypartner",
      icon: <User size={20} />,
      text: "Verify Partner" },
    {
      path: "/bookings",
      icon: <CalendarCheck size={20} />,
      text: "Bookings",
    },
    { path: "/subscription", 
      icon: <CreditCard size={20} />, 
      text: "Subscription" },
    { 
     path: "/category",
      icon: <Layers size={20} />, 
      text: "Category" },

    { path: "/refund",
       icon: <  FaRegMoneyBillAlt size={20} />,
       text: "Refund" },
    {
      path: "/coupon",
      icon: <Ticket size={20} />,
      text: "Coupon"
    },
    { path: "/banner",
      icon: <Image size={20} />, 
      text: "Banner" },
    { path: "/review",
       icon: <Star size={20} />, 
       text: "Reviews" },
    { path: "/notification",
       icon: <Bell size={20} />, 
       text: "Notification" },
    { 
      path: "/allusers",
      icon: <User size={20} />,
      text: "Users",
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50  bg-gradient-to-b from-black to-gray-900 text-white ${
        collapsed ? "w-10" : "w-64"
      } transition-all duration-300 flex flex-col`}
    >
      <div className="p-4 flex items-center justify-center h-13 border-b border-[f8f9fa]">
        {/* <div className="bg-white p-1 rounded">
          <Home size={20} className="text-blue-700" />
        </div> */}
        <div>
          {/* <img
            src={logo}
            alt=""
            width={50}
            height={50}
            style={{ borderRadius: "3px" }}
          /> */}
        </div>
        {!collapsed && (
          <h2 className="text-xl font-bold ml-3 text-white">GloUp Admin</h2>
        )}
      </div>

      <div className="mt-6 px-2 lg:px-6">
        {!collapsed && (
          <div className="mb-2 px-4 text-xs font-medium text-blue-200 uppercase tracking-wider">
            Main Menu
          </div>
        )}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? "bg-white bg-opacity-10 text-black font-medium"
                    : "hover:bg-opacity-10"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className="p-1.5 rounded-md bg-opacity-20">
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="ml-3 text-left flex-1">{item.text}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

