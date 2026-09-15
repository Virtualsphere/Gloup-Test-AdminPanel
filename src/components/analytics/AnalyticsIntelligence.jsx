import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Send,
  Calendar,
  Store,
  RefreshCw,
  ChevronDown,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Rocket,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Static demo data (UI-only for now — will be wired up to the backend later)
// ---------------------------------------------------------------------------

const profitability = {
  totalSales: 2153,
  profitableSalons: 1248,
  lowSaleSalons: 624,
  negativeSalons: 281,
  salons: [
    { name: "Gran Stadio", sales: 232, revenue: 156740, margin: 34.2, tag: "High" },
    { name: "Cuts & Style", sales: 198, revenue: 142310, margin: 29.8, tag: "High" },
    { name: "Be U Salon", sales: 176, revenue: 98420, margin: 18.4, tag: "Medium" },
    { name: "The Hair Lounge", sales: 154, revenue: 84960, margin: 11.6, tag: "Medium" },
    { name: "Magic Touch", sales: 62, revenue: 21580, margin: -4.3, tag: "Negative" },
  ],
};

const gravity = {
  totalCustomers: 1842,
  repeatCustomers: 842,
  repeatPct: 45.7,
  avgDistance: 3.8,
  customerGravity: 45.7,
  segments: [
    { name: "Very Loyal", value: 38, color: "#3B82F6" },
    { name: "Loyal", value: 24, color: "#10B981" },
    { name: "Occasional", value: 18, color: "#F59E0B" },
    { name: "At Risk", value: 13, color: "#F43F5E" },
    { name: "Lost", value: 7, color: "#94A3B8" },
  ],
};

const switching = {
  totalSwitches: 3248,
  last30Days: 1946,
  last30Pct: 60,
  avgSwitchTime: 460,
  reasons: [
    { reason: "Price", value: 38 },
    { reason: "Better Offers", value: 27 },
    { reason: "Location", value: 18 },
    { reason: "Quality Issues", value: 11 },
    { reason: "Staff Change", value: 6 },
  ],
  topSwitchedTo: ["Glam Studio", "Cuts & Style", "Be U Salon", "Magic Touch"],
};

const timeToBook = {
  avg: "11m 42s",
  fastest: "6m 18s",
  slowest: "4m 51s",
  median: "2m 26s",
  distribution: [
    { stage: "Search", value: 3.5 },
    { stage: "Browse", value: 4.2 },
    { stage: "Compare", value: 2.4 },
    { stage: "Select", value: 1.8 },
    { stage: "Confirm", value: 1.1 },
    { stage: "Booked", value: 0.6 },
  ],
};

const uninstalled = {
  totalUninstalled: 2841,
  optedOut: 1932,
  optedOutPct: 68,
  reengaged: 481,
  reengagedPct: 25,
  segments: [
    { label: "Uninstalled 7 days", count: 620, pct: 12 },
    { label: "Uninstalled 30 days", count: 1071, pct: 37 },
    { label: "Uninstalled 90+ days", count: 980, pct: 38 },
  ],
};

const quickMessage = {
  preview:
    "Hey {name} 👋 We miss you on GloUp! Book your favorite services again and get FLAT 30% OFF* this week! Just booking, best salons, best offers. Book before it's too late!",
};

const snapshot = [
  { label: "Bookings", value: "184", change: "+12%", positive: true, icon: Calendar, color: "#3B82F6" },
  { label: "Revenue", value: "₹24,820", change: "+8%", positive: true, icon: TrendingUp, color: "#10B981" },
  { label: "Active Users", value: "1,284", change: "+4%", positive: true, icon: Users, color: "#8B5CF6" },
  { label: "Active Salons", value: "3,820", change: "-1%", positive: false, icon: Store, color: "#F59E0B" },
];

const topProfitableSalons = [
  { name: "Gran Stadio", revenue: "₹1,56,740", growth: "+8.2%", positive: true },
  { name: "Cuts & Style", revenue: "₹1,42,310", growth: "+6.4%", positive: true },
  { name: "Be U Salon", revenue: "₹98,420", growth: "+2.1%", positive: true },
  { name: "The Hair Lounge", revenue: "₹84,960", growth: "-1.8%", positive: false },
  { name: "Magic Touch", revenue: "₹21,580", growth: "-6.3%", positive: false },
];

const topGravitySalons = [
  { name: "Gran Stadio", customers: 412, distance: "2.1 km" },
  { name: "Cuts & Style", customers: 365, distance: "3.4 km" },
  { name: "Be U Salon", customers: 298, distance: "4.0 km" },
  { name: "The Hair Lounge", customers: 210, distance: "4.8 km" },
];

const switchingRiskSalons = [
  { name: "Magic Touch", risk: "High", trend: "up" },
  { name: "The Hair Lounge", risk: "Medium", trend: "up" },
  { name: "Be U Salon", risk: "Medium", trend: "down" },
  { name: "Cuts & Style", risk: "Low", trend: "down" },
];

const timeToBookByCategory = [
  { category: "Hair", time: "5m 10s" },
  { category: "Skin", time: "8m 42s" },
  { category: "Nails", time: "3m 55s" },
  { category: "Facial", time: "9m 08s" },
  { category: "Massage", time: "6m 21s" },
];

// ---------------------------------------------------------------------------
// Shared UI bits
// ---------------------------------------------------------------------------

const RiskBadge = ({ level }) => {
  const styles = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-green-100 text-green-700",
    Negative: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[level] || "bg-gray-100 text-gray-600"}`}>
      {level}
    </span>
  );
};

const CardHeader = ({ index, title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-gray-900">
      <span className="text-gray-400 mr-1">{index}.</span>
      {title}
    </h3>
    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
);

const ViewLink = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
  >
    {children}
    <ArrowRight size={12} />
  </button>
);

const MiniStat = ({ label, value, sub }) => (
  <div>
    <p className="text-[11px] text-gray-400">{label}</p>
    <p className="text-base font-bold text-gray-900">{value}</p>
    {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center gap-2 text-xs font-medium text-gray-500"
  >
    {label}
    <span
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </span>
  </button>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AnalyticsIntelligence = () => {
  const [period, setPeriod] = useState("This Week");
  const [compare, setCompare] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [messageType, setMessageType] = useState("WhatsApp");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Page header / filter bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500" />
            Analytics Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Deep insights to grow smarter, powered by GloUp AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
            25 Aug – 1 Sep 2026
          </span>

          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-2 focus:outline-none"
            >
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
              <option>Last Month</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <Toggle checked={compare} onChange={setCompare} label="Compare" />

          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <RefreshCw size={12} className={autoRefresh ? "text-indigo-500" : "text-gray-400"} />
            Auto refresh
            <Toggle checked={autoRefresh} onChange={setAutoRefresh} label="" />
          </div>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 items-stretch">
        {/* 1. Salon Profitability Intelligence */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <CardHeader index={1} title="Salon Profitability Intelligence" />
          <div className="grid grid-cols-4 gap-2 mb-4">
            <MiniStat label="Total Sales" value={profitability.totalSales.toLocaleString()} />
            <MiniStat label="Profitable" value={profitability.profitableSalons.toLocaleString()} />
            <MiniStat label="Low Sale" value={profitability.lowSaleSalons.toLocaleString()} />
            <MiniStat label="Negative" value={profitability.negativeSalons.toLocaleString()} />
          </div>
          <div className="flex-1 space-y-2">
            {profitability.salons.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate">{s.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-gray-400">{s.sales}</span>
                  <span className="text-gray-600 w-16 text-right">₹{(s.revenue / 1000).toFixed(1)}k</span>
                  <RiskBadge level={s.tag} />
                </div>
              </div>
            ))}
          </div>
          <ViewLink>View Full Profitability Report</ViewLink>
        </div>

        {/* 2. Customer -> Salon Gravity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <CardHeader index={2} title="Customer → Salon Gravity" subtitle="Where do your customers come from" />
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gravity.segments}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                  >
                    {gravity.segments.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              {gravity.segments.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto font-medium text-gray-800">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <MiniStat label="Total Customers" value={gravity.totalCustomers.toLocaleString()} />
            <MiniStat label="Repeat Customers" value={`${gravity.repeatCustomers} (${gravity.repeatPct}%)`} />
            <MiniStat label="Avg Distance" value={`${gravity.avgDistance} km`} />
            <MiniStat label="Customer Gravity" value={`${gravity.customerGravity}%`} />
          </div>
          <ViewLink>View Full Gravity Map</ViewLink>
        </div>

        {/* 3. Salon Switching Intelligence */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <CardHeader index={3} title="Salon Switching Intelligence" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Total Switches" value={switching.totalSwitches.toLocaleString()} />
            <MiniStat label="Last 30 Days" value={`${switching.last30Days.toLocaleString()}`} sub={`${switching.last30Pct}%`} />
            <MiniStat label="Avg Switch Time" value={switching.avgSwitchTime} />
          </div>
          <p className="text-[11px] text-gray-400 mb-1">Why customers switch salons</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={switching.reasons} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={80}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2">
            <p className="text-[11px] text-gray-400 mb-1">Top salons switched to</p>
            <div className="flex flex-wrap gap-1.5">
              {switching.topSwitchedTo.map((name) => (
                <span key={name} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 rounded-full px-2 py-1">
                  {name}
                </span>
              ))}
            </div>
          </div>
          <ViewLink>View Switching Analysis</ViewLink>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 items-stretch">
        {/* 4. Time-to-Book Intelligence */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <CardHeader index={4} title="Time-to-Book Intelligence" />
          <div className="grid grid-cols-4 gap-2 mb-3">
            <MiniStat label="Avg Time" value={timeToBook.avg} />
            <MiniStat label="Fastest" value={timeToBook.fastest} />
            <MiniStat label="Slowest" value={timeToBook.slowest} />
            <MiniStat label="Median" value={timeToBook.median} />
          </div>
          <p className="text-[11px] text-gray-400 mb-1">Time distribution (Search → Booking)</p>
          <div className="h-36 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeToBook.distribution} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ViewLink>View Full Time Analysis</ViewLink>
        </div>

        {/* 5. Uninstalled Users — Re-engagement */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <CardHeader index={5} title="Uninstalled Users — Re-engagement" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Uninstalled (30d)" value={uninstalled.totalUninstalled.toLocaleString()} />
            <MiniStat label="Opted-out" value={uninstalled.optedOut.toLocaleString()} sub={`${uninstalled.optedOutPct}%`} />
            <MiniStat label="Re-engaged" value={uninstalled.reengaged.toLocaleString()} sub={`${uninstalled.reengagedPct}%`} />
          </div>
          <div className="space-y-1.5 mb-3">
            {uninstalled.segments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{seg.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${seg.pct}%` }} />
                  </div>
                  <span className="text-gray-500 w-16 text-right">
                    {seg.count.toLocaleString()} ({seg.pct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2">
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none"
            >
              <option>WhatsApp</option>
              <option>SMS</option>
              <option>Email</option>
            </select>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">1,932 users</span>
          </div>
          <button
            type="button"
            className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            <Send size={14} />
            Send {messageType}
          </button>
          <ViewLink>View Uninstalled Users</ViewLink>
        </div>

        {/* 6. Quick Message Preview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <CardHeader index={6} title="Quick Message Preview" />
          <div className="flex-1 bg-green-50 rounded-2xl p-3 flex flex-col justify-center">
            <div className="bg-white rounded-xl rounded-tl-sm shadow-sm p-3 max-w-[90%]">
              <p className="text-xs text-gray-700 leading-relaxed">{quickMessage.preview}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg py-2 hover:bg-gray-50"
            >
              <MessageCircle size={13} />
              Send SMS
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg py-2 hover:bg-gray-800"
            >
              <Calendar size={13} />
              Schedule Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Today's snapshot + mini tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        {/* Today's Snapshot */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Today's Snapshot</h3>
          <div className="space-y-4">
            {snapshot.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <item.icon size={15} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">{item.label}</p>
                    <p className="text-sm font-bold text-gray-900">{item.value}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${item.positive ? "text-green-600" : "text-red-600"}`}>
                  {item.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Profitable Salons */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Profitable Salons</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="font-medium pb-2">Salon</th>
                <th className="font-medium pb-2 text-right">Revenue</th>
                <th className="font-medium pb-2 text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topProfitableSalons.map((s) => (
                <tr key={s.name}>
                  <td className="py-1.5 text-gray-700 truncate max-w-[90px]">{s.name}</td>
                  <td className="py-1.5 text-gray-600 text-right">{s.revenue}</td>
                  <td className={`py-1.5 text-right font-medium ${s.positive ? "text-green-600" : "text-red-600"}`}>
                    {s.growth}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Customer Gravity (By Salon) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Customer Gravity (By Salon)</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="font-medium pb-2">Salon</th>
                <th className="font-medium pb-2 text-right">Customers</th>
                <th className="font-medium pb-2 text-right">Avg Dist.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topGravitySalons.map((s) => (
                <tr key={s.name}>
                  <td className="py-1.5 text-gray-700 truncate max-w-[90px]">{s.name}</td>
                  <td className="py-1.5 text-gray-600 text-right">{s.customers}</td>
                  <td className="py-1.5 text-gray-600 text-right">{s.distance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Switching Risk Salons */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Switching Risk Salons</h3>
          <div className="space-y-2.5">
            {switchingRiskSalons.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate">{s.name}</span>
                <div className="flex items-center gap-2">
                  <RiskBadge level={s.risk} />
                  {s.trend === "up" ? (
                    <TrendingUp size={13} className="text-red-500" />
                  ) : (
                    <TrendingDown size={13} className="text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time-to-Book by Category */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Time-to-Book by Category</h3>
          <div className="space-y-2.5">
            {timeToBookByCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-400" />
                  {c.category}
                </span>
                <span className="text-gray-600 font-medium">{c.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grow more banner */}
      <div className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Rocket size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Grow more with GloUp</p>
            <p className="text-white/70 text-xs">Unlock new opportunities from your analytics</p>
          </div>
        </div>
        <button
          type="button"
          className="text-xs font-medium bg-white text-indigo-600 rounded-lg px-4 py-2 hover:bg-white/90 flex items-center gap-1.5"
        >
          View Growth Ideas
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default AnalyticsIntelligence;
