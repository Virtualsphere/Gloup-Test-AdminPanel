

import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Mail,
  Phone,
} from "lucide-react";

import { useState, useRef, useEffect } from "react";
import logo from "../../assets/images/logo1.svg";
import api from "../../utils/api";
import { useSelector, useDispatch } from "react-redux";
// import { getProfile } from "../../redux/slices/profileSlice";
import { toast } from "react-hot-toast";

const Header = ({ collapsed,toggleSidebar }) => {
  const dispatch = useDispatch();
  // const [collapsed, setCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const modalRef = useRef(null);

  const toggleProfileModal = () => {
    setShowProfileModal(!showProfileModal);
  };
  let profile = useSelector((state) => state.profile.profileList);
  let username = localStorage.getItem("name");
  let email = localStorage.getItem("email");
  // useEffect(() => {
  //   dispatch(getProfile());
  // }, [dispatch]);

  // const handleLogout = () => {
  //   setShowProfileModal(false);
  //   onLogout();
  // };
  const handleLogout = async () => {
    try {
      const response =await api.post("/admin/auth/logout",{}, {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: false,
          });
         
      if (response.data.data=="logout successful") {
          localStorage.removeItem("token");
           window.location.href = "/auth";          
        }

    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setShowProfileModal(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowProfileModal(false);
      }
    }

    if (showProfileModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileModal]);

  return (
  <header
      className={`
        fixed top-0 right-0 z-40 h-13
        bg-white/70 backdrop-blur-xl
        border-b border-gray-200/50
        transition-all duration-300

        ${collapsed ? "md:left-20" : "md:left-64"} left-0
      `}
    >
      <div className="h-13 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button> 
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            {/* <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button> */}
          </div>

          {/* User Profile */}
          <div
            className="flex items-center relative cursor-pointer"
            onClick={toggleProfileModal}
          >
            <div className="relative">
              <img
                src={logo}
                alt="User"
                className="w-8 h-8 rounded-full border-2 border-blue-500 object-cover"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            <div className="ml-2 hidden md:block">
              <p className="text-sm font-medium text-gray-700 capitalize">
                {username}
              </p>
              <p className="text-xs text-gray-500">{profile?.email}</p>
            </div>

            <button className="ml-2 text-gray-500 focus:outline-none cursor-pointer">
              <ChevronDown size={16} />
            </button>

            {/* Profile Modal */}
            {showProfileModal && (
              <div
                ref={modalRef}
                className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
              >
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <img
                      src={logo}
                      alt="User"
                      className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {username}
                      </p>
                      {/* <p className="text-xs text-gray-500">Administrator</p> */}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center text-gray-700">
                    <User size={16} className="mr-3 text-blue-600" />
                    <p className="text-sm capitalize">{username}</p>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <Mail size={16} className="mr-3 text-blue-600" />
                    <p className="text-sm">{email}</p>
                  </div>

                  {/* <div className="flex items-center text-gray-700">
                    <Phone size={16} className="mr-3 text-blue-600" />
                    <p className="text-sm">+1 123-456-7890</p>
                  </div> */}
                </div>

                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center p-2 text-red-600 cursor-pointer hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut size={16} className="mr-2" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
