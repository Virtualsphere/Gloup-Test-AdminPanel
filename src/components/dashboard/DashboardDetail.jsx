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

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Revenue Overview Chart */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
           <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {metricName} Overview (
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)})
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-wrap">
                <select
                  value={viewType}
                  onChange={handleViewTypeChange}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="specific">Specific Date Range</option>
                </select>

                {(viewType === "monthly" ||
                  viewType === "daily" ||
                  viewType === "yearly") && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Years</option>
                    {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                )}

                {viewType === "daily" && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                )}

                {viewType === "specific" && (
                  <>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}

                <div className="flex bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setSelectedMetric("revenue")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      selectedMetric === "revenue"
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setSelectedMetric("appointment_count")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      selectedMetric === "appointment_count"
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Appointment Count
                  </button>
                </div>

                <select
                  value={selectedSalon}
                  onChange={(e) => setSelectedSalon(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Salons</option>
                  {(data?.top_saloons || []).map((salon) => (
                    <option key={salon.id} value={salon.id.toString()}>
                      {salon.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {(data?.sales_by_category || []).map((item, index) => (
                    <option key={index} value={item.category}>
                      {item.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className="select-none"
              style={{ outline: "none", boxShadow: "none" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} tickFormatter={xTickFormatter} />
                    <YAxis
                      tickFormatter={(value) =>
                        selectedMetric === "revenue"
                          ? `₹${value.toLocaleString()}`
                          : value.toLocaleString()
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        selectedMetric === "revenue"
                          ? `₹${value.toLocaleString()}`
                          : value.toLocaleString(),
                        metricName,
                      ]}
                      labelFormatter={labelFormatter}
                      contentStyle={{
                        border: "none",
                        borderRadius: "12px",
                        padding: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#1F2937",
                      }}
                      wrapperStyle={{
                        outline: "none",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={yKey}
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available for selected period.
                </div>
              )}
            </div>
          </div>
          {/* Sales by Category Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sales by Category
            </h3>
            <div
              className="select-none"
              style={{ outline: "none", boxShadow: "none" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) =>
                      `${category} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="sales"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `₹${value.toLocaleString()}`,
                      "Sales",
                    ]}
                    contentStyle={{
                      border: "none",
                      borderRadius: "12px",
                      padding: "10px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1F2937",
                    }}
                    wrapperStyle={{
                      outline: "none",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {/* Top Salons Table */}

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Partner Salons
            </h3>
          </div>

          {/* 🔍 Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Search by Email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="
    px-3 py-2 rounded-xl border border-gray-200
    focus:ring-2 focus:ring-blue-500 focus:outline-none
    text-sm w-full
  "
            />
            <input
              type="text"
              placeholder="Search by Location"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
               className="
    px-3 py-2 rounded-xl border border-gray-200
    focus:ring-2 focus:ring-blue-500 focus:outline-none
    text-sm w-full
  "
            />
            <button
              onClick={resetFilters}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Reset Filters
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="hover:bg-blue-50/40 transition">
                  {[
                    "SNo",
                    "Images",
                    "Salon Name",
                    "Owner Name",
                    "Register Date",
                    "Email",
                    "Phone",
                    "Location",
                    "Appointments",
                    // "Status",
                    "Action",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentSalons.length > 0 ? (
                  currentSalons.map((salon, index) => {
                    let images = [];
                    try {
                      images = salon?.images ? JSON.parse(salon.images) : [];
                    } catch {
                      images = [];
                    }

                    return (
                      <tr key={salon.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {images.length ? (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden">
                              <Swiper
                                modules={[Autoplay]}
                                autoplay={{
                                  delay: 3000,
                                  disableOnInteraction: false,
                                }}
                                loop={true}
                                className="w-full h-full"
                              >
                                {images.map((img, i) => (
                                  <SwiperSlide key={i}>
                                    <img
                                      src={`${
                                        import.meta.env.VITE_API_BASE_URL
                                      }/images/${img}`}
                                      alt={`store-${i}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </SwiperSlide>
                                ))}
                              </Swiper>
                            </div>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 flex items-center justify-center rounded-xl text-gray-500">
                              No Image
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Store className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {salon?.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {salon?.Username}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {formatDate(salon?.register_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {salon?.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {salon?.phone}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {salon?.cityLocation}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {salon?.total_appointments}
                            </span>
                          </div>
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              toggleSalonStatus(salon.id, salon?.status)
                            }
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              salon?.status === "active"
                                ? "bg-red-100 text-red-800 hover:bg-red-200"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            }`}
                          >
                            {salon?.status === "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/partnerdetails/${salon.id}`}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="11"
                      className="text-center text-gray-500 py-6 text-sm"
                    >
                      No salons found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="md:hidden space-y-4">
              {currentSalons.map((salon, index) => (
                <div key={salon.id} className="bg-white p-4 rounded-xl shadow-sm border">
                  <p className="font-semibold">{salon.name}</p>
                  <p className="text-sm text-gray-500">{salon.email}</p>
                  <p className="text-sm">{salon.phone}</p>
                  <p className="text-xs text-gray-400">{salon.cityLocation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {filteredSalons.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500 mb-2 sm:mb-0">
                Showing{" "}
                <span className="font-medium">{indexOfFirstRecord + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastRecord, filteredSalons.length)}
                </span>{" "}
                of <span className="font-medium">{filteredSalons.length}</span>{" "}
                results
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Category Sales Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.sales_by_category || []).map((category, index) => {
              const growthPercent = category?.growth_percent || 0;
              const growthColor =
                growthPercent >= 0 ? "text-green-600" : "text-red-600";
              return (
                <div
                  key={index}
                  className="
                    bg-white rounded-2xl p-4
                    shadow-sm hover:shadow-md
                    transition border border-gray-100
                  "
                >
                  <h4 className="font-medium text-gray-900">
                    {category?.category}
                  </h4>
                  <p className="text-2xl font-bold text-gray-700 mt-2">
                    ₹{parseInt(category?.total_sales || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {category?.appointment_count} appointments
                  </p>
                  <p className={`${growthColor} text-sm mt-1 font-medium`}>
                    {growthPercent >= 0 ? "+" : ""}
                    {growthPercent}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDetail;
