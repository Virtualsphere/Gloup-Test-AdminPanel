import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Store,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  UserCheck,
  TrendingDown,
} from "lucide-react";
import { FaRegMoneyBillAlt, FaMale, FaFemale } from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { Link } from "react-router-dom";
import "swiper/css";
import "swiper/css/autoplay";
import { useNavigate } from "react-router-dom";


const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#3B82F6",
  "#10B981",
  "#EC4899",
];

const DashboardDetail = ({ data }) => {

  const navigate = useNavigate();
  // Chart State
  const [viewType, setViewType] = useState("monthly");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("10");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSalon, setSelectedSalon] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  // Fallback sample/demo data
  const dailyData = data?.dailyRevenue || [
    ...Array.from({ length: 31 }, (_, i) => ({
      day: `2024-10-${(i + 1).toString().padStart(2, "0")}`,
      revenue: 70,
      appointment_count: 7,
      salon_id: 1,
      category: "Haircut",
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      day: `2025-09-${(i + 1).toString().padStart(2, "0")}`,
      revenue: 90,
      appointment_count: 9,
      salon_id: 1,
      category: "Coloring",
    })),
    {
      day: "2025-10-01",
      revenue: 200,
      appointment_count: 20,
      salon_id: 1,
      category: "Haircut",
    },
    {
      day: "2025-10-02",
      revenue: 150,
      appointment_count: 15,
      salon_id: 2,
      category: "Coloring",
    },
    // ... (rest of daily sample data)
  ];

  // Metric calculations
  const getMonthRevenue = (year, month) => {
    return dailyData
      .filter((item) => {
        const [y, m] = item.day.substring(0, 7).split("-");
        return parseInt(y) === year && parseInt(m) === month;
      })
      .reduce((sum, item) => sum + item.revenue, 0);
  };

  const currentYear = parseInt(selectedYear);
  const currentMonth = parseInt(selectedMonth);
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const currentRev = getMonthRevenue(currentYear, currentMonth);
  const prevRev = getMonthRevenue(prevYear, prevMonth);
  const revenueGrowth =
    prevRev > 0 ? (((currentRev - prevRev) / prevRev) * 100).toFixed(1) : 0;
  const revenueGrowthLabel = `${
    revenueGrowth >= 0 ? "+" : ""
  }${revenueGrowth}% vs last month`;

  // Metric name
  const metricName =
    selectedMetric === "revenue" ? "Revenue" : "Appointment Count";

  // Aggregation functions
  const aggregateMonthly = (filteredDaily, metric) => {
    const monthly = {};
    filteredDaily.forEach((item) => {
      const yearMonth = item.day.substring(0, 7);
      if (!monthly[yearMonth]) monthly[yearMonth] = 0;
      monthly[yearMonth] += item[metric];
    });
    return Object.entries(monthly)
      .map(([month, value]) => ({ month, [metric]: Math.round(value) }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const aggregateYearly = (filteredDaily, metric) => {
    const yearly = {};
    filteredDaily.forEach((item) => {
      const year = item.day.substring(0, 4);
      if (!yearly[year]) yearly[year] = 0;
      yearly[year] += item[metric];
    });
    return Object.entries(yearly)
      .map(([year, value]) => ({ year, [metric]: Math.round(value) }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  // Filters
  let filteredDaily = [...dailyData];
  if (
    (viewType === "monthly" || viewType === "daily") &&
    selectedYear !== "all"
  ) {
    filteredDaily = dailyData.filter((item) =>
      item.day.startsWith(selectedYear)
    );
  }
  if (viewType === "daily") {
    filteredDaily = filteredDaily.filter(
      (item) => item.day.substring(5, 7) === selectedMonth
    );
  }
  if (viewType === "specific" && fromDate && toDate) {
    filteredDaily = dailyData.filter((item) => {
      const itemDate = new Date(item.day);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return itemDate >= from && itemDate <= to;
    });
  }
  if (selectedSalon !== "all") {
    filteredDaily = filteredDaily.filter(
      (item) => item.salon_id === parseInt(selectedSalon)
    );
  }
  if (selectedCategory !== "all") {
    filteredDaily = filteredDaily.filter(
      (item) => item.category === selectedCategory
    );
  }

  // Chart data logic
  let chartData = [];
  let xKey = "day";
  let yKey = selectedMetric;
  let labelFormatter = (label) => new Date(label).toLocaleDateString();
  let xTickFormatter = (value) => value;

  switch (viewType) {
    case "daily":
      chartData = filteredDaily;
      xKey = "day";
      labelFormatter = (label) =>
        new Date(label).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      xTickFormatter = (value) => new Date(value).getDate();
      break;
    case "monthly":
      chartData = aggregateMonthly(filteredDaily, selectedMetric);
      xKey = "month";
      labelFormatter = (label) => {
        const date = new Date(`${label}-01`);
        return date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      };
      xTickFormatter = (value) =>
        new Date(`${value}-01`).toLocaleDateString("en-US", { month: "short" });
      break;
    case "yearly":
      const yearlyFiltered =
        selectedYear === "all"
          ? filteredDaily
          : filteredDaily.filter((item) => item.day.startsWith(selectedYear));
      chartData = aggregateYearly(yearlyFiltered, selectedMetric);
      xKey = "year";
      labelFormatter = (label) => label;
      xTickFormatter = (value) => value;
      break;
    case "specific":
      chartData = filteredDaily;
      xKey = "day";
      labelFormatter = (label) => new Date(label).toLocaleDateString();
      xTickFormatter = (value) => new Date(value).getDate();
      break;
    default:
      chartData = aggregateMonthly(dailyData, selectedMetric);
      xTickFormatter = (value) =>
        new Date(`${value}-01`).toLocaleDateString("en-US", { month: "short" });
  }

  // Category chart data from prop, with fallback
  const categoryData = (data?.sales_by_category || [])
    .filter((item) => item?.total_sales !== null)
    .map((item) => ({
      category: item?.category,
      sales: parseInt(item?.total_sales),
    })) || [
    { category: "Electronics", sales: 400 },
    { category: "Clothing", sales: 300 },
    { category: "Books", sales: 300 },
    { category: "Home & Garden", sales: 200 },
  ];

  // Metric Card Component
  const MetricCard = ({ title, value, icon: Icon, color, subtitle, onpress }) => {
    const growthColor =
      subtitle && typeof subtitle === "string"
        ? subtitle.includes("% vs last month")
          ? subtitle.includes("+") ||
            parseFloat(subtitle.replace("% vs last month", "")) >= 0
            ? "text-green-600"
            : "text-red-600"
          : "text-gray-500"
        : "text-gray-500";
    return (
      <div
  onClick={onpress}
  className="
    relative bg-white rounded-2xl p-4 sm:p-5
    shadow-sm hover:shadow-xl
    border border-gray-100
    transition-all duration-300
    hover:-translate-y-1 cursor-pointer
  "
>
  {/* Glow Border */}
  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 hover:opacity-100 transition" />

  <div className="flex items-center justify-between">
    <div className="min-w-0">
      <p className="text-xs sm:text-sm text-gray-500">{title}</p>
      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
        {value}
      </p>

      {subtitle && (
        <p className={`text-xs mt-1 font-medium ${growthColor}`}>
          {subtitle}
        </p>
      )}
    </div>

    <div
      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon size={20} style={{ color }} />
    </div>
  </div>
</div>
    );
  };

  // Month selection options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const date = new Date(2025, i, 1);
    return {
      value: month,
      label: date.toLocaleString("default", { month: "long" }),
    };
  });

  // Salon status filtering
  // const filteredSalons = (data?.top_saloons || []).filter(
  //   (salon) => selectedStatus === "all" || salon.status === selectedStatus
  // );
  const resetFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchLocation("");
    setSelectedStatus("all");
  };
  const filteredSalons = (data?.top_saloons || []).filter((salon) => {
    const matchStatus =
      selectedStatus === "all" || salon?.status === selectedStatus;

    // Check if there are any active search filters
    const hasSearch =
      searchName.trim() !== "" ||
      searchEmail.trim() !== "" ||
      searchLocation.trim() !== "";

    // If no search filters, just filter by status
    if (!hasSearch) {
      return matchStatus;
    }

    // Safe lowercasing & matching (avoid null/undefined errors)
    const name = salon?.name?.toLowerCase() || "";
    const email = salon?.email?.toLowerCase() || "";
    const location = salon?.cityLocation?.toLowerCase() || "";

    const matchName = name.includes(searchName.toLowerCase());
    const matchEmail = email.includes(searchEmail.toLowerCase());
    const matchLocation = location.includes(searchLocation.toLowerCase());

    return matchStatus && matchName && matchEmail && matchLocation;
  });
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentSalons = filteredSalons.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredSalons.length / rowsPerPage);

  // Date strings formatting
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Placeholder API toggle
  const toggleSalonStatus = (salonId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    // TODO: Implement API call here
    alert(`Salon status toggled to ${newStatus.toUpperCase()}`);
  };

  // View type change handler
  const handleViewTypeChange = (e) => {
    const newView = e.target.value;
    setViewType(newView);
    setSelectedYear("2025");
    setSelectedMonth("10");
    setFromDate("");
    setToDate("");
    if (newView === "specific") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        {/* Key Metrics */}
       <div className="
  grid grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4 
  gap-4 sm:gap-6 mb-6
">
          <MetricCard
            title="Total Partners"
            value={data?.total_partners || 0}
            icon={Store}
            color="#10B981"
            onpress={() => navigate("/partner")}
          />
          <MetricCard
            title="Total Users"
            value={data?.total_users || 0}
            icon={Users}
            color="#F43F5E"
            onpress={() => navigate("/allusers")}
          />
          <MetricCard
            title="Total Sales"
            // value={`₹${currentRev.toLocaleString()}`}
            value={`₹${data?.total_sales || 0}`}
            icon={FaRegMoneyBillAlt}
            color="#F59E0B"
            // subtitle={revenueGrowthLabel}
          />
          <MetricCard
            title="Avg Order Value"
            value={`₹${data?.average_order_value || 0}`}
            icon={TrendingUp}
            color="#EF4444"
          />
          <MetricCard
            title="Sales Count"
            value={data?.total_sales_count || 0}
            icon={UserCheck}
            color="#0EA5E9"
          />
          <MetricCard
            title="Men's Sales"
            value={`₹${parseInt(
              data?.totalgendersales?.[0]?.total_men_sales || 0
            ).toLocaleString()}`}
            icon={FaMale}
            color="#3B82F6"
            subtitle={`${
              data?.totalgendersales?.[0]?.total_men_count || 0
            } customers`}
          />
          <MetricCard
            title="Women's Sales"
            value={`₹${parseInt(
              data?.totalgendersales?.[0]?.total_women_sales || 0
            ).toLocaleString()}`}
            icon={FaFemale}
            color="#EC4899"
            subtitle={`${
              data?.totalgendersales?.[0]?.total_women_count || 0
            } customers`}
          />
          <MetricCard
            title="Active Bookings Today"
            value={data?.active_bookings_today || 0}
            icon={Calendar}
            color="#10B981"
            onpress={() => navigate("/bookings")}
          />
          <MetricCard
            title="Cancelled/Refunded Orders"
            value={data?.cancelled_refunded_orders || 0}
            icon={TrendingDown}
            color="#EF4444"
          />
          <MetricCard
            title="Top Performing Salon"
            value={data?.top_salon?.name}
            icon={Store}
            color="#3B82F6"
            subtitle={`₹${(data?.top_salon?.revenue || 0).toLocaleString()}`}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardDetail;
