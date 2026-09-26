import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  IndianRupee,
  Lightbulb,
  MoreVertical,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD } from "../v2/tokens";
import { Card, Chip as BaseChip, HeaderBell, HeaderSearch } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Bookings by Order Date" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number below is static demo data matching the
// mockup. Wire it to bookingSlice (getbDetailByOrderDate) once the design is
// signed off; the live page is components/data/BookingsByOrderDate.jsx.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1320;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const AMBER = "#F5A623";
const YELLOW = "#FACC15";
const VIOLET = "#7C3AED";

// Measured card widths from the mockup, used directly as grid fr units.
const MAIN_COLS = "grid-cols-[1040fr_267fr]";
const BOTTOM_COLS = "grid-cols-[372fr_356fr_592fr]";

// Type scale in design px on the 1320px canvas. See the note above before
// changing these.
const T = {
  xxs: "text-[9px]", // GST sub-line, donut caption
  xs: "text-[10px]", // chips, legend, breadcrumb
  sm: "text-[11px]", // table headers, secondary cell text
  base: "text-[12px]", // body, buttons, card headings
  md: "text-[13px]", // emphasised body
  kpi: "text-[26px]", // KPI values
  h1: "text-[20px]", // page title
};

const GAP = "gap-3";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Total Bookings",
    value: "12,842",
    delta: "14.3%",
    up: true,
    sub: "vs last 30 days",
    icon: Users,
    color: BLUE,
    tint: "#E6EFFF",
  },
  {
    label: "Completed",
    value: "8,750",
    note: "68.1% of total",
    icon: CheckCircle2,
    color: GREEN,
    solid: true,
    round: true,
  },
  {
    label: "Booked",
    value: "3,562",
    note: "27.7% of total",
    icon: Package,
    color: AMBER,
    solid: true,
  },
  {
    label: "Cancelled",
    value: "352",
    note: "2.7% of total",
    icon: XCircle,
    color: RED,
    solid: true,
    round: true,
  },
  {
    label: "Total Revenue",
    value: "₹18,96,240",
    delta: "16.8%",
    up: true,
    sub: "vs last 30 days",
    icon: Building2,
    color: GREEN,
    solid: true,
  },
  {
    label: "Avg. Order Value",
    value: "₹1,475.36",
    delta: "2.6%",
    up: true,
    sub: "vs last 30 days",
    icon: Wallet,
    color: VIOLET,
    solid: true,
  },
];

const bookings = [
  {
    id: "BK12984",
    user: "Rakesh Kumar",
    phone: "+91 91701 14075",
    salon: "Fresh Men Beauty Salon",
    city: "Chennai",
    type: "Haircut",
    status: "Completed",
    payment: "Paid",
    amount: "₹824.82",
    gst: "₹148.47",
    orderDate: "01 Sep, 2026",
    orderTime: "10:30 AM",
    bookingDate: "03 Sep, 2026",
    bookingTime: "11:00 AM",
  },
  {
    id: "BK12983",
    user: "Anita Sharma",
    phone: "+91 63826 41774",
    salon: "Cutting Time",
    city: "Bangalore",
    type: "Hair Color",
    status: "Booked",
    payment: "Paid",
    amount: "₹2,358.82",
    gst: "₹424.59",
    orderDate: "01 Sep, 2026",
    orderTime: "09:15 AM",
    bookingDate: "05 Sep, 2026",
    bookingTime: "03:00 PM",
  },
  {
    id: "BK12982",
    user: "Vikram Iyer",
    phone: "+91 72007 75090",
    salon: "Musk & Tusk Perungudi",
    city: "Chennai",
    type: "Beard Trim",
    status: "Booked",
    payment: "Unpaid",
    amount: "₹750.75",
    gst: "₹135.14",
    orderDate: "01 Sep, 2026",
    orderTime: "09:02 AM",
    bookingDate: "02 Sep, 2026",
    bookingTime: "05:30 PM",
  },
  {
    id: "BK12981",
    user: "Suresh Babu",
    phone: "+91 80155 41529",
    salon: "Adam Affordable Mens Salon",
    city: "Hyderabad",
    type: "Haircut",
    status: "Completed",
    payment: "Paid",
    amount: "₹71.40",
    gst: "₹12.86",
    orderDate: "31 Aug, 2026",
    orderTime: "07:45 PM",
    bookingDate: "31 Aug, 2026",
    bookingTime: "08:00 PM",
  },
  {
    id: "BK12980",
    user: "Deepak Raj",
    phone: "+91 93456 78912",
    salon: "B Unique Unisex Salon",
    city: "Coimbatore",
    type: "Hair Spa",
    status: "Booked",
    payment: "Paid",
    amount: "₹1,178.82",
    gst: "₹212.18",
    orderDate: "31 Aug, 2026",
    orderTime: "06:20 PM",
    bookingDate: "01 Sep, 2026",
    bookingTime: "01:00 PM",
  },
  {
    id: "BK12979",
    user: "Megha R",
    phone: "+91 98844 73307",
    salon: "The Waves Salon",
    city: "Pune",
    type: "Haircut",
    status: "Cancelled",
    payment: "Refunded",
    amount: "₹824.82",
    gst: "₹148.47",
    orderDate: "31 Aug, 2026",
    orderTime: "05:10 PM",
    bookingDate: "01 Sep, 2026",
    bookingTime: "02:30 PM",
  },
  {
    id: "BK12978",
    user: "Arun Kumar",
    phone: "+91 95661 99164",
    salon: "Sunshine Salon",
    city: "Mumbai",
    type: "Haircut",
    status: "Completed",
    payment: "Paid",
    amount: "₹51.45",
    gst: "₹9.26",
    orderDate: "31 Aug, 2026",
    orderTime: "04:30 PM",
    bookingDate: "31 Aug, 2026",
    bookingTime: "05:00 PM",
  },
  {
    id: "BK12977",
    user: "Priya Nair",
    phone: "+91 90431 10958",
    salon: "Kgf Salon",
    city: "Kochi",
    type: "Hair Color",
    status: "Booked",
    payment: "Paid",
    amount: "₹2,358.82",
    gst: "₹424.59",
    orderDate: "31 Aug, 2026",
    orderTime: "04:15 PM",
    bookingDate: "02 Sep, 2026",
    bookingTime: "12:00 PM",
  },
  {
    id: "BK12976",
    user: "Sneha Pillai",
    phone: "+91 99406 22187",
    salon: "Glam Studio Salon",
    city: "Chennai",
    type: "Hair Spa",
    status: "Completed",
    payment: "Paid",
    amount: "₹1,178.82",
    gst: "₹212.18",
    orderDate: "31 Aug, 2026",
    orderTime: "03:40 PM",
    bookingDate: "31 Aug, 2026",
    bookingTime: "04:30 PM",
  },
  {
    id: "BK12975",
    user: "Rohit Menon",
    phone: "+91 88617 40025",
    salon: "Style Hub Unisex Salon",
    city: "Bangalore",
    type: "Beard Trim",
    status: "Booked",
    payment: "Unpaid",
    amount: "₹350.00",
    gst: "₹63.00",
    orderDate: "31 Aug, 2026",
    orderTime: "02:55 PM",
    bookingDate: "03 Sep, 2026",
    bookingTime: "10:30 AM",
  },
];

const statusSplit = [
  { label: "Completed", value: 8750, pct: "68.1%", color: GREEN },
  { label: "Booked", value: 3562, pct: "27.7%", color: AMBER },
  { label: "Cancelled", value: 352, pct: "2.7%", color: RED },
  { label: "No Show", value: 178, pct: "1.4%", color: YELLOW },
];

const paymentSplit = [
  { label: "Paid", value: 10986, pct: "85.5%", color: GREEN },
  { label: "Unpaid", value: 1503, pct: "11.7%", color: AMBER },
  { label: "Refunded", value: 353, pct: "2.8%", color: VIOLET },
];

const todayActivity = [
  { label: "New Bookings", value: "186", icon: CalendarPlus, color: BLUE },
  { label: "Completed", value: "142", icon: CheckCircle2, color: GREEN },
  { label: "Cancelled", value: "09", icon: XCircle, color: RED },
  { label: "Revenue", value: "₹2,48,750", icon: IndianRupee, color: GREEN },
];

// Relative booking volume per hour (0-23) - drives the heat bar.
const peakHours = [
  0.06, 0.04, 0.03, 0.03, 0.05, 0.09, 0.17, 0.27, 0.39, 0.53, 0.69, 0.89, 0.96,
  1, 0.87, 0.71, 0.6, 0.63, 0.67, 0.58, 0.44, 0.3, 0.18, 0.1,
];

const HOUR_TICKS = ["0", "6AM", "9AM", "12PM", "3PM", "6PM", "9PM", "12AM"];

// The mockup uses photo avatars; initials on a tinted disc stand in for them
// until the API returns user images.
const AVATAR_TINTS = [
  ["#E6EFFF", BLUE],
  ["#FDE6F0", "#DB2777"],
  ["#E1F7EC", "#0E9384"],
  ["#FFF2DC", "#E08700"],
  ["#EDE7FF", BRAND],
];

const TYPE_STYLES = {
  Haircut: "bg-slate-100 text-slate-600",
  "Hair Color": "bg-indigo-50 text-indigo-600",
  "Beard Trim": "bg-slate-100 text-slate-600",
  "Hair Spa": "bg-sky-50 text-sky-600",
};

const STATUS_STYLES = {
  Completed: "bg-emerald-50 text-emerald-600",
  Booked: "bg-amber-50 text-amber-600",
  Cancelled: "bg-rose-50 text-rose-500",
};

const PAYMENT_STYLES = {
  Paid: "bg-emerald-50 text-emerald-600",
  Unpaid: "bg-rose-50 text-rose-500",
  Refunded: "bg-violet-50 text-violet-600",
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardTitle = ({ children, right }) => (
  <div className="mb-2.5 flex items-center justify-between gap-2">
    <h2 className={`font-bold text-slate-900 ${T.base}`}>{children}</h2>
    {right}
  </div>
);

const Delta = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${
      up ? "text-emerald-500" : "text-rose-500"
    }`}
  >
    {up ? "↑" : "↓"} {value}
  </span>
);

const Chip = (props) => <BaseChip size={`px-1.5 py-[3px] ${T.xs}`} {...props} />;

const Checkbox = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border transition-colors ${
      checked ? "border-transparent" : "border-slate-300 bg-white"
    }`}
    style={checked ? { background: BRAND } : undefined}
  >
    {checked && (
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
        <path
          d="M2.5 6.2 5 8.6l4.5-5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);

const IconButton = ({ children, label }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
  >
    {children}
  </button>
);

const Avatar = ({ name, index }) => {
  const [tint, color] = AVATAR_TINTS[index % AVATAR_TINTS.length];
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-bold ${T.xs}`}
      style={{ background: tint, color }}
    >
      {initials}
    </span>
  );
};

// Donut + legend, shared by the two breakdown cards on the right rail.
const DonutCard = ({ title, total, slices }) => (
  <Card className="p-3.5">
    <CardTitle>{title}</CardTitle>

    <div className="flex items-center gap-2.5">
      <div className="relative h-[96px] w-[96px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              innerRadius={29}
              outerRadius={46}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-extrabold tracking-tight text-slate-900 ${T.base}`}>
            {total}
          </span>
          <span className={`text-slate-400 ${T.xxs}`}>Total</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between gap-1.5">
            <span className={`flex min-w-0 items-center gap-1.5 text-slate-600 ${T.xs}`}>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className={`shrink-0 whitespace-nowrap text-slate-400 ${T.xxs}`}>
              {slice.value.toLocaleString("en-IN")} ({slice.pct})
            </span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

// Title, breadcrumb and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, search, setSearch }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="hidden items-center gap-1 truncate text-[11px] leading-tight text-slate-400 md:flex">
          Home
          <ChevronRight size={10} className="shrink-0" />
          Bookings
          <ChevronRight size={10} className="shrink-0" />
          <span className="font-semibold" style={{ color: BRAND }}>
            By Order Date
          </span>
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="hidden items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 xl:flex"
        >
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          May 24, 2024 - Jun 23, 2024
          <ChevronDown size={13} className="shrink-0 text-slate-400" />
        </button>

        <HeaderSearch
          value={search}
          onChange={setSearch}
          placeholder="Search booking ID, user, salon..."
          width={180}
          shortcut
        />

        <HeaderBell count={12} color={RED} className="text-slate-500" />
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BookingsByOrderDateV2 =({ title = "Bookings by Order Date" }) => {
  // The payment tabs, filters and pagination are presentational for now - the
  // mockup shows "Paid" selected while still listing unpaid/refunded rows, so
  // nothing here narrows the demo dataset.
  const [paymentTab, setPaymentTab] = useState("Paid");
  const [bookingType, setBookingType] = useState("All Booking Types");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const allSelected = selected.length === bookings.length;

  const toggleRow = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected(allSelected ? [] : bookings.map((booking) => booking.id));

  return (
    <>
      <PageHeader title={title} search={search} setSearch={setSearch} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Export / refresh                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
          >
            <Download size={13} className="shrink-0 text-slate-500" />
            Export Report
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-white shadow-sm ${T.base}`}
            style={{ background: BRAND }}
          >
            <RefreshCw size={13} className="shrink-0" />
            Refresh
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <Card key={kpi.label} className="p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center ${
                    kpi.round ? "rounded-full" : "rounded-lg"
                  }`}
                  style={{ background: kpi.solid ? kpi.color : kpi.tint }}
                >
                  <Icon size={14} style={{ color: kpi.solid ? "#fff" : kpi.color }} />
                </span>
                <span className={`truncate font-semibold text-slate-600 ${T.base}`}>
                  {kpi.label}
                </span>
              </div>

              <p
                className={`mt-2.5 truncate font-extrabold tracking-tight text-slate-900 ${T.kpi}`}
              >
                {kpi.value}
              </p>

              <p className={`mt-1 whitespace-nowrap ${T.sm}`}>
                {kpi.delta ? (
                  <>
                    <Delta value={kpi.delta} up={kpi.up} />{" "}
                    <span className="text-slate-400">{kpi.sub}</span>
                  </>
                ) : (
                  <span className="text-slate-400">{kpi.note}</span>
                )}
              </p>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`flex items-center gap-2.5 px-3 py-2.5 ${CARD}`}>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#E6E8F0] p-0.5">
            {["All", "Paid", "Unpaid"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPaymentTab(tab)}
                className={`rounded-lg px-3 py-1 font-semibold transition-colors ${T.base} ${
                  paymentTab === tab
                    ? "text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                style={paymentTab === tab ? { background: GREEN } : undefined}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Search booking ID, user, salon, phone..."
              className={`w-full rounded-xl border border-[#E6E8F0] bg-white py-1.5 pl-8 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
              className={`w-[150px] appearance-none rounded-xl border border-[#E6E8F0] bg-white py-1.5 pl-3 pr-7 font-medium text-slate-700 focus:outline-none ${T.base}`}
            >
              {["All Booking Types", "Haircut", "Hair Color", "Beard Trim", "Hair Spa"].map(
                (option) => (
                  <option key={option}>{option}</option>
                )
              )}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div
            className={`flex w-[118px] shrink-0 items-center justify-between rounded-xl border border-[#E6E8F0] bg-white px-2.5 py-1.5 text-slate-700 ${T.base}`}
          >
            24/05/2024
            <CalendarDays size={13} className="shrink-0 text-slate-400" />
          </div>

          <span className={`shrink-0 text-slate-400 ${T.base}`}>to</span>

          <div
            className={`flex w-[118px] shrink-0 items-center justify-between rounded-xl border border-[#E6E8F0] bg-white px-2.5 py-1.5 text-slate-700 ${T.base}`}
          >
            23/06/2024
            <CalendarDays size={13} className="shrink-0 text-slate-400" />
          </div>

          <button
            type="button"
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3 py-1.5 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.base}`}
          >
            <SlidersHorizontal size={13} className="shrink-0 text-slate-400" />
            More Filters
            <ChevronDown size={13} className="shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            className={`shrink-0 px-1 font-semibold text-slate-500 hover:text-slate-700 ${T.base}`}
          >
            Clear
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Table + right rail                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${MAIN_COLS} ${GAP}`}>
          <Card>
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: 34 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 128 }} />
                <col style={{ width: 142 }} />
                <col style={{ width: 84 }} />
                <col style={{ width: 74 }} />
                <col style={{ width: 74 }} />
                <col style={{ width: 98 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 116 }} />
                <col style={{ width: 66 }} />
              </colgroup>

              <thead>
                <tr className="border-b border-[#EDEFF5]">
                  <th className="py-2.5 pl-4">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </th>
                  {[
                    "Booking ID",
                    "User",
                    "Salon",
                    "Booking Type",
                    "Status",
                    "Payment",
                    "Amount",
                    "Order Date",
                    "Booking Date & Time",
                    "Actions",
                  ].map((column) => (
                    <th
                      key={column}
                      // "Booking Type" is the column the mockup shows as the
                      // active sort.
                      className={`whitespace-nowrap py-2.5 pr-2 font-semibold ${T.sm} ${
                        column === "Booking Type" ? "" : "text-slate-500"
                      }`}
                      style={column === "Booking Type" ? { color: BLUE } : undefined}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking, index) => (
                  <tr
                    key={booking.id}
                    className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="py-2.5 pl-4 align-middle">
                      <Checkbox
                        checked={selected.includes(booking.id)}
                        onChange={() => toggleRow(booking.id)}
                      />
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <span className="flex items-center gap-1">
                        <span className={`truncate font-semibold text-slate-800 ${T.sm}`}>
                          #{booking.id}
                        </span>
                        <Copy size={11} className="shrink-0 text-slate-300" />
                      </span>
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <span className="flex items-center gap-2">
                        <Avatar name={booking.user} index={index} />
                        <span className="min-w-0 leading-tight">
                          <span
                            className={`block truncate font-semibold text-slate-800 ${T.sm}`}
                          >
                            {booking.user}
                          </span>
                          <span className={`block truncate text-slate-400 ${T.xxs}`}>
                            {booking.phone}
                          </span>
                        </span>
                      </span>
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <span className="flex items-start gap-1.5">
                        <Store size={12} className="mt-[1px] shrink-0 text-slate-400" />
                        <span className="min-w-0 leading-tight">
                          <span
                            className={`block truncate font-semibold text-slate-700 ${T.sm}`}
                          >
                            {booking.salon}
                          </span>
                          <span className={`block truncate text-slate-400 ${T.xxs}`}>
                            {booking.city}
                          </span>
                        </span>
                      </span>
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <Chip className={TYPE_STYLES[booking.type]}>{booking.type}</Chip>
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <Chip className={STATUS_STYLES[booking.status]}>{booking.status}</Chip>
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <Chip className={PAYMENT_STYLES[booking.payment]}>
                        {booking.payment}
                      </Chip>
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      <span className={`block truncate font-bold text-slate-900 ${T.sm}`}>
                        {booking.amount}
                      </span>
                      <span className={`block truncate text-slate-400 ${T.xxs}`}>
                        + {booking.gst} GST
                      </span>
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      <span className={`block truncate text-slate-700 ${T.sm}`}>
                        {booking.orderDate}
                      </span>
                      <span className={`block truncate text-slate-400 ${T.xxs}`}>
                        {booking.orderTime}
                      </span>
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      <span className={`block truncate text-slate-700 ${T.sm}`}>
                        {booking.bookingDate}
                      </span>
                      <span className={`block truncate text-slate-400 ${T.xxs}`}>
                        {booking.bookingTime}
                      </span>
                    </td>

                    <td className="py-2.5 pr-4 align-middle">
                      <span className="flex items-center justify-end gap-1.5">
                        <IconButton label="View booking">
                          <Eye size={12} />
                        </IconButton>
                        <IconButton label="More actions">
                          <MoreVertical size={12} />
                        </IconButton>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-3 border-t border-[#EDEFF5] px-4 py-2.5">
              <p className={`whitespace-nowrap text-slate-500 ${T.sm}`}>
                Showing 1 to 10 of 12,842 bookings
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>

                {[1, 2, 3, 4, 5].map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`grid h-6 min-w-[24px] place-items-center rounded-lg px-1 font-semibold transition-colors ${T.sm} ${
                      page === pageNumber
                        ? "text-white"
                        : "border border-[#E6E8F0] text-slate-500 hover:bg-slate-50"
                    }`}
                    style={page === pageNumber ? { background: BRAND } : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}

                <span className={`px-0.5 text-slate-400 ${T.sm}`}>...</span>

                <button
                  type="button"
                  onClick={() => setPage(1285)}
                  className={`grid h-6 place-items-center rounded-lg border border-[#E6E8F0] px-1.5 font-semibold text-slate-500 transition-colors hover:bg-slate-50 ${T.sm}`}
                >
                  1285
                </button>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(1285, prev + 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50"
                  aria-label="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`whitespace-nowrap text-slate-500 ${T.sm}`}>
                  Rows per page
                </span>
                <div className="relative">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(e.target.value)}
                    className={`appearance-none rounded-lg border border-[#E6E8F0] bg-white py-1 pl-2 pr-6 font-medium text-slate-700 focus:outline-none ${T.sm}`}
                  >
                    {["10", "25", "50", "100"].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={11}
                    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Right rail */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <DonutCard title="Bookings by Status" total="12,842" slices={statusSplit} />
            <DonutCard title="Bookings by Payment" total="12,842" slices={paymentSplit} />

            <Card className="p-3.5">
              <CardTitle>Today&apos;s Activity</CardTitle>
              <div className="flex flex-col gap-2.5">
                {todayActivity.map(({ icon: Icon, ...row }) => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className={`flex min-w-0 items-center gap-2 text-slate-600 ${T.sm}`}>
                      <Icon size={14} className="shrink-0" style={{ color: row.color }} />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span
                      className={`shrink-0 whitespace-nowrap font-bold text-slate-900 ${T.sm}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Insights / top salon / peak hours                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${BOTTOM_COLS} ${GAP}`}>
          <Card className="p-3.5">
            <CardTitle>
              <span className="flex items-center gap-1.5">
                Insights
                <Lightbulb size={13} style={{ color: AMBER }} />
              </span>
            </CardTitle>
            <p className={`text-slate-600 ${T.base}`}>
              Bookings are <span className="font-bold text-emerald-500">14.3%</span> higher
              than last 30 days.
            </p>
          </Card>

          <Card className="p-3.5">
            <CardTitle>Top Performing Salon</CardTitle>
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{ background: "#EDE7FF" }}
              >
                <Store size={18} style={{ color: BRAND }} />
              </span>
              <div className="min-w-0 leading-tight">
                <p className={`truncate font-bold text-slate-900 ${T.md}`}>
                  Fresh Men Beauty Salon
                </p>
                <p className={`mt-1 flex items-center gap-3 ${T.sm}`}>
                  <span className="text-slate-500">842 bookings</span>
                  <span className="font-semibold text-emerald-500">₹1,78,240 revenue</span>
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3.5">
            <CardTitle
              right={
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E6E8F0] px-1.5 py-1 text-slate-400 transition-colors hover:bg-slate-50"
                >
                  <BarChart3 size={13} />
                  <ChevronDown size={11} />
                </button>
              }
            >
              Peak Booking Hours
            </CardTitle>

            <p className={`text-slate-500 ${T.sm}`}>
              Most bookings happen between{" "}
              <span className="font-bold text-slate-800">11:00 AM – 2:00 PM</span>
            </p>

            <div className="mt-2.5 flex h-2.5 w-full items-stretch gap-[2px] overflow-hidden rounded-full">
              {peakHours.map((intensity, hour) => (
                <span
                  key={hour}
                  className="flex-1"
                  style={{ background: `rgba(245, 166, 35, ${0.12 + intensity * 0.88})` }}
                />
              ))}
            </div>

            <div className={`mt-1.5 flex items-center justify-between text-slate-400 ${T.xs}`}>
              {HOUR_TICKS.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </Card>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default BookingsByOrderDateV2;
