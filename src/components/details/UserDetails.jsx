import React, { useState ,useEffect} from "react"
import { Calendar, MapPin, Clock, IndianRupee, Scissors, Sparkles } from "lucide-react"
import { useDispatch,useSelector } from "react-redux"
import { getUserDetail } from "../../redux/slices/allUsersSlice"
import { useParams } from "react-router-dom"
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';

// Badge
const CustomBadge = ({ children, variant = "default" }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  const variantClasses = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    destructive: "bg-red-100 text-red-800",
  }
  return <span className={`${baseClasses} ${variantClasses[variant]}`}>{children}</span>
}

// Button
const CustomButton = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  }
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-6",
  }
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const UserDetails = ({ title }) => {
const [data, setData] = useState({});
const dispatch=useDispatch()
const {id} = useParams()
const [activeTab, setActiveTab] = useState("upcoming")
let userDetail=useSelector((state)=>state.allUsers.userDetail)
const user = data?.userdetails || {};
console.log("userDetail:", userDetail);
const formatDOB = (dob) =>
  dob ? new Date(dob).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) : "--";

  useEffect(() => {
   dispatch(getUserDetail({id:Number(id)}))
  }, [dispatch,id]);
  
 useEffect(() => {
     if (userDetail) {
       setData(userDetail);
     }
   }, [userDetail]);
   
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const formatTime = (timeString) =>
    timeString
      ? new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : null

  // const getServiceIcon = (name) => {
  //   if (name?.toLowerCase().includes("hair") || name?.toLowerCase().includes("cut")) {
  //     return <Scissors className="w-4 h-4" />
  //   }
  //   return <Sparkles className="w-4 h-4" />
  // }

  const BookingCard = ({ booking, isPast = false }) => (
    <div className="bg-white rounded-lg border border-gray-200  h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div >
            {booking?.common_data?.images?.length ? (
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden">
                                        <Swiper
                                          modules={[Autoplay]}
                                          autoplay={{ delay: 3000, disableOnInteraction: false }}
                                          loop={true}
                                          className="w-full h-full"
                                        >
                                          {(booking?.common_data?.images || []).map((img, index) => (
                                            <SwiperSlide key={index}>
                                              <img
                                                src={`${import.meta.env.VITE_API_BASE_URL}/images/${img}`}
                                                alt={`store-image-${index}`}
                                                className="w-full h-full object-cover"
                                              />
                                            </SwiperSlide>
                                          ))}
                                        </Swiper>
                                      </div>
                                        ) : (
                                          <div className="w-28 h-28 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                                            No Image
                                          </div>
        )}
                                  
            <h3 className="text-lg font-semibold text-gray-900">{booking?.common_data?.name}</h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(booking?.common_data?.booking_date)}
              {booking?.common_data?.slot_from && booking?.common_data?.slot_to && (
                <>
                  <Clock className="w-4 h-4 ml-3 mr-1" />
                  {formatTime(booking?.common_data?.slot_from)} - {formatTime(booking?.common_data?.slot_to)}
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center text-lg font-bold text-green-600">
              <IndianRupee className="w-4 h-4" />
              {booking?.common_data?.total_amount}
            </div>
          <CustomBadge
              variant={
                booking?.common_data?.status === "upcomming"
                  ? "default"
                  :  booking?.common_data?.status === "not_completed"
                  ? "destructive"
                  : "success"
              }
            >
              { booking?.common_data?.status === "upcomming"
                ? "Upcoming"
                : booking?.common_data?.status === "not_completed"
                ? "Not Completed"
                : "Completed"}
            </CustomBadge>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Services</h4>
          <div className="space-y-1">
            {booking?.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                <div className="flex items-center">
                  {/* {getServiceIcon(item?.service_name)} */}
                  <span className="ml-2 text-sm">{item?.service_name || "Service"}</span>
                </div>
                <div className="flex items-center text-sm font-medium">
                  <IndianRupee className="w-3 h-3" />
                  {item?.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
          <div className="flex items-start text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
            <div>
              <div>{booking?.common_data?.addressLine1}</div>
              <div>{booking?.common_data?.addressLine2}</div>
              <div>
                {booking?.common_data?.city}, {booking?.common_data?.district} - {booking?.common_data?.zipcode}
              </div>
            </div>
          </div>
        </div>
        {/* <div className="flex gap-2 pt-2">
          {!isPast ? (
            <>
              <CustomButton variant="outline" size="sm" className="flex-1">Reschedule</CustomButton>
              <CustomButton variant="destructive" size="sm" className="flex-1">Cancel</CustomButton>
            </>
          ) : (
            <>
              <CustomButton variant="outline" size="sm" className="flex-1">Book Again</CustomButton>
              <CustomButton variant="outline" size="sm" className="flex-1">Rate & Review</CustomButton>
            </>
          )}
        </div> */}
      </div>
    </div>
  )

  return (
    <div className="mx-auto p-4 space-y-6 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-5">
  
  {/* Profile Image */}
  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
    {user?.profilePic ? (
      <img
        src={`${import.meta.env.VITE_API_BASE_URL}/images/${user.profilePic}`}
        alt="Profile"
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
        👤
      </div>
    )}
  </div>

  {/* User Info */}
  <div className="flex-1">
    <div className="flex items-center gap-3">
      <h3 className="text-xl font-semibold text-gray-800">
        {user.firstname} {user.lastname}
      </h3>

      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {user.status}
      </span>
    </div>

    {/* Contact */}
    <div className="mt-1 text-sm text-gray-600">
      <div>{user.email || "--"}</div>
      <div>{user.phone || "--"}</div>
    </div>
  {/* Meta Info */}
    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
        <div>
          <span className="text-gray-500">Gender 👤:</span>{" "}
          <span className="font-medium capitalize">{user.gender || "--"}</span>
        </div>
        <div>
          <span className="text-gray-500">DOB 🎂:</span>{" "}
          <span className="font-medium">{formatDOB(user.date_of_birth)}</span>
        </div>
        <div>
          <span className="text-gray-500">Age 🔢:</span>{" "}
          <span className="font-medium">{user.age || "--"}</span>
        </div>
    </div>
  </div>

  {/* User ID */}
  <div className="text-sm text-gray-500">
    <div>User ID</div>
    <div className="font-medium text-gray-700">#{user.id}</div>
  </div>
</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{data?.upcoming?.length}</div>
            <div className="text-sm text-gray-600">Upcoming Bookings</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{data?.past?.length}</div>
            <div className="text-sm text-gray-600">Completed Bookings</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center text-2xl font-bold text-purple-600">
              <IndianRupee className="w-6 h-6" />
              {data?.totalspent}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200  overflow-hidden " >
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold">Booking History</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 px-4 py-2 text-center text-sm font-medium ${
                activeTab === "upcoming" ? "bg-black text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Upcoming ({data?.upcoming?.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`flex-1 px-4 py-2 text-center text-sm font-medium ${
                activeTab === "past" ? "bg-black text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Past ({data?.past?.length})
            </button>
          </div>

          <div className="mt-4">
            {activeTab === "upcoming" ? (
              data?.upcoming?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-4 h-full">
                  {data?.upcoming.map((booking) => (
                    <BookingCard key={booking?.common_data?.id} booking={booking} isPast={false} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No upcoming bookings</div>
              )
            ) : data?.past?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                {data?.past?.map((booking) => (
                  <BookingCard key={booking?.common_data?.id} booking={booking} isPast={true} />
                ))}
                {/* {data?.past.length > 10 && (
                  <div className="text-center py-4">
                    <CustomButton variant="outline">Load More ({data?.past.length - 10} more)</CustomButton>
                  </div>
                )} */}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No past bookings</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDetails
