import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  IndianRupee,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Partner Subscriptions" mockup.
//
// Same technique as DashboardV2 / AnalyticsIntelligenceV2 / InvoicePayoutsV2:
// the layout is built once on a fixed DESIGN_WIDTH canvas and then uniformly
// scaled to whatever width is available, so the arrangement is identical at
// every screen size - nothing reflows, nothing clips, the page never scrolls
// sideways.
//
// Raising the px sizes in T below does NOT make text bigger on screen: it
// forces a wider canvas, which then scales down further and reads smaller.
//
// UI only for now - every number below is static demo data matching the
// mockup. Wire it to partnerManualSubscriptionSlice / partnersubscriptionSlice
// once the design is signed off; the live pages are
// components/data/PartnerManualSubscriptions.jsx (the list) and
// components/data/PartnerSubscription.jsx (the plans).
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#7C3AED";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const ORANGE = "#F97316";
const SLATE = "#CBD5E1";

// Measured card widths from the mockup, used directly as grid fr units.
const PANEL_COLS = "grid-cols-[378fr_398fr_355fr_346fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these. The mockup screenshot was 1536px wide with 1328px of
// content, so every measured size is carried across at ~1.14x to keep the
// design's own proportions on this slightly wider canvas.
const T = {
  tiny: "text-[11px]", // email line, chips, "N bookings", delta sub
  th: "text-[11px]", // uppercase table column headers
  xxs: "text-[12px]", // legend rows, dropdowns, pagination
  xs: "text-[13px]", // KPI label, table body cells, partner names
  sm: "text-[14px]", // amounts
  base: "text-[15px]", // buttons, inputs
  title: "text-[16px]", // card titles
  donut: "text-[26px]", // donut centre total
  kpi: "text-[27px]", // KPI values
};

const CARD = "rounded-2xl border border-[#E6E8F0] bg-white";
const GAP = "gap-3";

const AXIS = { fontSize: 11, fill: "#94A3B8" };
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #E3E7EF",
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  },
  labelStyle: { fontWeight: 700, color: "#0F172A", marginBottom: 2 },
};

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Total Partners",
    value: "1,248",
    delta: "12.6%",
    up: true,
    sub: "vs last 30 days",
    icon: Users,
    color: BLUE,
    tint: "#E1EFFE",
  },
  {
    label: "Active Subscriptions",
    value: "982",
    delta: "9.8%",
    up: true,
    sub: "vs last 30 days",
    icon: ShieldCheck,
    color: GREEN,
    tint: "#DCFCE7",
  },
  {
    label: "Total Bookings (Partners)",
    value: "28,642",
    delta: "14.3%",
    up: true,
    sub: "vs last 30 days",
    icon: CalendarDays,
    color: BLUE,
    tint: "#E1EFFE",
  },
  {
    label: "Subscription Revenue",
    value: "₹12,48,320",
    delta: "16.7%",
    up: true,
    sub: "vs last 30 days",
    icon: IndianRupee,
    color: BRAND,
    tint: "#EDE9FE",
  },
  {
    label: "Outstanding Amount",
    value: "₹2,18,750",
    delta: "8.3%",
    up: false,
    sub: "vs last 30 days",
    icon: AlertTriangle,
    color: AMBER,
    tint: "#FEF3C7",
  },
  {
    label: "Expiring Soon",
    value: "23",
    note: "Next 7 days",
    icon: Clock,
    color: RED,
    tint: "#FEE2E2",
  },
];

const subscriptionOverview = [
  { name: "Active", value: 982, pct: "78.7%", color: GREEN },
  { name: "Expired", value: 178, pct: "14.2%", color: RED },
  { name: "Cancelled", value: 68, pct: "5.4%", color: SLATE },
  { name: "Pending", value: 20, pct: "1.7%", color: AMBER },
];

const planDistribution = [
  { name: "Basic Plan", value: 312, pct: "31.8%", color: "#FACC15" },
  { name: "Standard Plan", value: 428, pct: "43.6%", color: BRAND },
  { name: "Premium Plan", value: 198, pct: "20.2%", color: GREEN },
  { name: "Enterprise Plan", value: 44, pct: "4.4%", color: ORANGE },
];

const subscriptionsTrend = [
  { month: "Jan", subs: 672 },
  { month: "Feb", subs: 721 },
  { month: "Mar", subs: 812 },
  { month: "Apr", subs: 894 },
  { month: "May", subs: 941 },
  { month: "Jun", subs: 982 },
];

const topPartners = [
  { name: "Fresh Men Beauty Salon", bookings: 842 },
  { name: "Cutting Time", bookings: 498 },
  { name: "Your Choice Salon", bookings: 422 },
  { name: "The Waves Salon", bookings: 398 },
  { name: "Adam Affordable Mens Salon", bookings: 359 },
];

// `tone` drives the plan chip colour; `expired` swaps the row's status chip,
// turns the due-date caption red and makes the edit action a renew action.
const subscriptions = [
  {
    id: 1,
    name: "Fresh Men Beauty Salon",
    email: "freshmenbeauty@gmail.com",
    phone: "+91 94441 30546",
    plan: "Standard Plan",
    tone: "violet",
    price: "₹999 / Month",
    bookings: "842",
    amount: "₹1,178.82",
    base: "₹999.00 + GST",
    start: "24 May 2024",
    due: "24 Jun 2024",
    left: "1 day left",
  },
  {
    id: 2,
    name: "Cutting Time",
    email: "cuttingtime@gmail.com",
    phone: "+91 90030 34689",
    plan: "Premium Plan",
    tone: "green",
    price: "₹1,999 / Month",
    bookings: "498",
    amount: "₹2,358.82",
    base: "₹1,999.00 + GST",
    start: "10 May 2024",
    due: "10 Jun 2024",
    left: "17 days left",
  },
  {
    id: 3,
    name: "The Waves Salon",
    email: "thewavessalon@gmail.com",
    phone: "+91 98844 73307",
    plan: "Standard Plan",
    tone: "violet",
    price: "₹999 / Month",
    bookings: "422",
    amount: "₹1,178.82",
    base: "₹999.00 + GST",
    start: "01 May 2024",
    due: "01 Jun 2024",
    left: "8 days left",
  },
  {
    id: 4,
    name: "Adam Affordable Mens Salon",
    email: "adammansalon@gmail.com",
    phone: "+91 78240 31555",
    plan: "Basic Plan",
    tone: "blue",
    price: "₹699 / Month",
    bookings: "359",
    amount: "₹824.82",
    base: "₹699.00 + GST",
    start: "31 May 2024",
    due: "30 Jun 2024",
    left: "7 days left",
  },
  {
    id: 5,
    name: "Musk & Tusk Perungudi",
    email: "musktusk@gmail.com",
    phone: "+91 95977 17354",
    plan: "Basic Plan",
    tone: "blue",
    price: "₹699 / Month",
    bookings: "278",
    amount: "₹824.82",
    base: "₹699.00 + GST",
    start: "16 May 2024",
    due: "16 Jun 2024",
    left: "23 days left",
  },
  {
    id: 6,
    name: "KGF Salon",
    email: "kgfsalon@gmail.com",
    phone: "+91 63820 39948",
    plan: "Premium Plan",
    tone: "green",
    price: "₹1,999 / Month",
    bookings: "271",
    amount: "₹2,358.82",
    base: "₹1,999.00 + GST",
    start: "05 May 2024",
    due: "05 Jun 2024",
    left: "12 days left",
  },
  {
    id: 7,
    name: "B Unique Unisex Salon",
    email: "buniquesalon@gmail.com",
    phone: "+91 93448 50554",
    plan: "Standard Plan",
    tone: "violet",
    price: "₹999 / Month",
    bookings: "245",
    amount: "₹1,178.82",
    base: "₹999.00 + GST",
    start: "02 Apr 2024",
    due: "02 May 2024",
    left: "Expired 21 days",
    expired: true,
  },
];

const PLAN_TONES = {
  violet: "bg-violet-50 text-violet-600",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
};

const PLAN_FILTERS = ["All Plans", "Basic Plan", "Standard Plan", "Premium Plan", "Enterprise Plan"];
const STATUS_FILTERS = ["All Status", "Active", "Expired", "Cancelled", "Pending"];
const CITY_FILTERS = ["All Cities", "Chennai", "Coimbatore", "Madurai", "Bengaluru"];
const EXPIRY_FILTERS = [
  "Expiring: All",
  "Expiring: 7 days",
  "Expiring: 15 days",
  "Expiring: 30 days",
];
const OVERVIEW_PLANS = ["All Plans", "Basic Plan", "Standard Plan", "Premium Plan"];
const TREND_RANGES = ["Last 6 Months", "Last 12 Months", "Last 3 Months"];
const PAGE_SIZES = ["10", "25", "50", "100"];
const HEADER_RANGES = [
  "May 24, 2024 - Jun 23, 2024",
  "Apr 24, 2024 - May 23, 2024",
  "Jan 01, 2024 - Jun 23, 2024",
];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// min-w-0 is what lets these shrink inside the grid instead of forcing overflow.
const Card = ({ children, className = "" }) => (
  <div className={`flex min-w-0 flex-col ${CARD} ${className}`}>{children}</div>
);

const SectionTitle = ({ children, className = "" }) => (
  <h2
    className={`min-w-0 truncate font-bold tracking-tight text-slate-900 ${T.title} ${className}`}
  >
    {children}
  </h2>
);

const Delta = ({ value, up }) => (
  <span className={`whitespace-nowrap font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
    {up ? "▲" : "▼"} {value}
  </span>
);

const Chip = ({ children, className = "" }) => (
  <span
    className={`inline-block shrink-0 whitespace-nowrap rounded-md px-2 py-[3px] font-semibold ${T.tiny} ${className}`}
  >
    {children}
  </span>
);

// The mockup shows each salon's own logo; initials on a dark plate stand in for
// them until the API returns partner logos.
const SalonLogo = ({ name, round = false, size = 34 }) => {
  const initials = name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`grid shrink-0 place-items-center font-bold ${T.tiny} ${
        round ? "rounded-full" : "rounded-lg"
      }`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#2B2118,#4C3C28)",
        color: "#E3B85C",
      }}
    >
      {initials}
    </span>
  );
};

// The small bordered dropdowns in the card headers, the filter bar and the
// table footer.
const Select = ({ value, onChange, options, className = "", size = T.xxs }) => (
  <span className={`relative block shrink-0 ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full cursor-pointer appearance-none rounded-lg border border-[#E6E8F0] bg-white py-2 pl-3 pr-7 font-medium text-slate-600 focus:outline-none ${size}`}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
    <ChevronDown
      size={13}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </span>
);

// Donut + right-hand legend, shared by "Subscription Overview" and
// "Plan Distribution" - same shape, different dataset and centre caption.
const DonutPanel = ({ data, total, caption, size }) => (
  <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2">
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={1}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP} />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center">
        <span className={`font-extrabold leading-none tracking-tight text-slate-900 ${T.donut}`}>
          {total}
        </span>
        <span className={`mt-1 leading-none text-slate-400 ${T.tiny}`}>{caption}</span>
      </div>
    </div>

    <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
      {data.map((slice) => (
        <li key={slice.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
          <span className={`min-w-0 flex-1 truncate text-slate-500 ${T.xxs}`}>{slice.name}</span>
          <span className={`shrink-0 whitespace-nowrap font-semibold text-slate-700 ${T.xxs}`}>
            {slice.value} ({slice.pct})
          </span>
        </li>
      ))}
    </ul>
  </div>
);

// The page title, breadcrumb and the header affordances render into the app's
// own top bar (the #app-header-slot that Header.jsx exposes) rather than being
// drawn a second time inside the canvas: that bar already owns the hamburger
// and the account menu, so repeating them here only cost a row of height.
//
// This deliberately sits OUTSIDE the scaled canvas - the app bar is chrome and
// should keep its own type size no matter how far the canvas is scaled down.
const PageHeaderSlot = ({ title, range, setRange, search, setSearch }) => {
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    setSlot(document.getElementById("app-header-slot"));
  }, []);

  if (!slot) return null;

  return createPortal(
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="hidden items-center gap-1 truncate text-[11px] leading-tight text-slate-400 md:flex">
          Home
          <ChevronRight size={10} className="shrink-0" />
          <span className="text-slate-500">{title}</span>
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 xl:flex">
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium text-slate-600 focus:outline-none"
          >
            {HEADER_RANGES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <ChevronDown size={13} className="shrink-0 text-slate-400" />
        </span>

        <button
          type="button"
          className="hidden shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-slate-400 transition-colors hover:bg-slate-50 xl:block"
          aria-label="More date options"
        >
          <MoreHorizontal size={14} />
        </button>

        <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 lg:flex">
          <Search size={14} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partner or plan..."
            className="w-[150px] bg-transparent text-[12px] text-slate-600 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="shrink-0 rounded border border-gray-200 px-1 text-[10px] font-semibold text-slate-400">
            ⌘K
          </span>
        </span>

        <button type="button" className="relative shrink-0 text-slate-500">
          <Bell size={18} />
          <span
            className="absolute -right-1.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: RED }}
          >
            12
          </span>
        </button>
      </div>
    </div>,
    slot
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PartnerSubscriptionsV2 = ({ title = "Partner Subscriptions" }) => {
  // The filter bar is presentational for now - nothing here narrows the demo
  // dataset.
  const [headerRange, setHeaderRange] = useState(HEADER_RANGES[0]);
  const [headerSearch, setHeaderSearch] = useState("");
  const [overviewPlan, setOverviewPlan] = useState(OVERVIEW_PLANS[0]);
  const [trendRange, setTrendRange] = useState(TREND_RANGES[0]);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState(PLAN_FILTERS[0]);
  const [status, setStatus] = useState(STATUS_FILTERS[0]);
  const [city, setCity] = useState(CITY_FILTERS[0]);
  const [expiry, setExpiry] = useState(EXPIRY_FILTERS[0]);
  const [note, setNote] = useState("");
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const topBookings = topPartners[0].bookings;

  // Scale the fixed design canvas down to whatever width we actually have.
  const outerRef = useRef(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [boxHeight, setBoxHeight] = useState(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const canvas = canvasRef.current;
    if (!outer || !canvas) return;

    const measure = () => {
      const next = Math.min(1, outer.clientWidth / DESIGN_WIDTH);
      // Guard against feedback loops when the height change moves a scrollbar.
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
      setBoxHeight((prev) => {
        const h = Math.round(canvas.offsetHeight * next);
        return prev === h ? prev : h;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full" style={{ height: boxHeight }}>
      <PageHeaderSlot
        title={title}
        range={headerRange}
        setRange={setHeaderRange}
        search={headerSearch}
        setSearch={setHeaderSearch}
      />

      <div
        ref={canvasRef}
        className={`flex flex-col pb-4 ${GAP}`}
        style={{
          width: DESIGN_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Action row - the title row lives in the app bar, see              */}
        {/* PageHeaderSlot above. The mockup wraps these three onto two lines */}
        {/* at its own width; one right-aligned row keeps the same order and  */}
        {/* gives the KPI grid the full canvas.                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
          >
            <Download size={14} className="shrink-0 text-slate-500" />
            Export Report
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
          >
            <Upload size={14} className="shrink-0 text-slate-500" />
            Import Partners
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold text-white shadow-sm ${T.base}`}
            style={{ background: BRAND }}
          >
            <Plus size={14} className="shrink-0" />
            Add Subscription
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <Card key={kpi.label} className="p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ background: kpi.tint }}
                >
                  <Icon size={15} style={{ color: kpi.color }} />
                </span>
                <p className={`min-w-0 flex-1 truncate font-semibold text-slate-600 ${T.xs}`}>
                  {kpi.label}
                </p>
              </div>

              <p className={`mt-2.5 truncate font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>
                {kpi.value}
              </p>

              <p className={`mt-2 truncate ${T.tiny}`}>
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
        {/* Overview / trend / top partners / plan mix                       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${PANEL_COLS} ${GAP}`}>
          {/* Subscription overview -------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-3">
              <SectionTitle>Subscription Overview</SectionTitle>
              <Select
                value={overviewPlan}
                onChange={setOverviewPlan}
                options={OVERVIEW_PLANS}
                className="w-[104px]"
              />
            </div>

            <DonutPanel data={subscriptionOverview} total="982" caption="Active" size={150} />

            <div className="border-t border-[#EDEFF5] px-3.5 py-2.5">
              <span className={`font-bold ${T.xs}`} style={{ color: GREEN }}>
                82.9%
              </span>
              <span className={`ml-1.5 text-slate-500 ${T.xs}`}>Active Subscriptions</span>
            </div>
          </Card>

          {/* Subscriptions trend ---------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-3">
              <SectionTitle>Subscriptions Trend</SectionTitle>
              <Select
                value={trendRange}
                onChange={setTrendRange}
                options={TREND_RANGES}
                className="w-[132px]"
              />
            </div>

            <div className="h-[196px] w-full px-1.5 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={subscriptionsTrend}
                  margin={{ top: 18, right: 14, bottom: 0, left: -14 }}
                >
                  <defs>
                    <linearGradient id="subsTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  <YAxis
                    domain={[0, 1250]}
                    ticks={[0, 250, 500, 750, 1000, 1250]}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={48}
                    tickFormatter={(value) => (value >= 1000 ? `${value / 1000}K` : value)}
                  />
                  <Tooltip {...TOOLTIP} />
                  <Area
                    type="linear"
                    dataKey="subs"
                    name="Subscriptions"
                    stroke={BRAND}
                    strokeWidth={2.5}
                    fill="url(#subsTrendFill)"
                    dot={{ r: 4, fill: BRAND, strokeWidth: 0 }}
                    activeDot={{ r: 5.5 }}
                  >
                    <LabelList
                      dataKey="subs"
                      position="top"
                      offset={9}
                      style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top partners by bookings ----------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-3">
              <SectionTitle>Top Partners by Bookings</SectionTitle>
              <button
                type="button"
                className={`shrink-0 font-semibold ${T.xxs}`}
                style={{ color: BRAND }}
              >
                View All
              </button>
            </div>

            <ul className="flex flex-1 flex-col justify-center gap-2.5 px-3.5 py-2.5">
              {topPartners.map((partner) => (
                <li key={partner.name} className="flex items-center gap-2.5">
                  <SalonLogo name={partner.name} round size={30} />

                  <div className="w-[128px] min-w-0 shrink-0 leading-tight">
                    <p className={`truncate font-semibold text-slate-700 ${T.xs}`}>
                      {partner.name}
                    </p>
                    <p className={`truncate text-slate-400 ${T.tiny}`}>
                      {partner.bookings} bookings
                    </p>
                  </div>

                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEF0F6]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(partner.bookings / topBookings) * 100}%`,
                        background: BRAND,
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Plan distribution ------------------------------------------ */}
          <Card>
            <div className="px-3.5 pb-1 pt-3">
              <SectionTitle>Plan Distribution</SectionTitle>
            </div>

            <DonutPanel data={planDistribution} total="982" caption="Total" size={128} />
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Subscriptions table                                              */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          {/* Filter bar ------------------------------------------------- */}
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="relative block w-[601px] shrink-0">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by partner name, phone, email..."
                className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2 pl-9 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
              />
            </span>

            <Select
              value={plan}
              onChange={setPlan}
              options={PLAN_FILTERS}
              className="w-[142px]"
              size={T.base}
            />
            <Select
              value={status}
              onChange={setStatus}
              options={STATUS_FILTERS}
              className="w-[141px]"
              size={T.base}
            />
            <Select
              value={city}
              onChange={setCity}
              options={CITY_FILTERS}
              className="w-[140px]"
              size={T.base}
            />
            <Select
              value={expiry}
              onChange={setExpiry}
              options={EXPIRY_FILTERS}
              className="w-[141px]"
              size={T.base}
            />

            <button
              type="button"
              className={`flex w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#E6E8F0] bg-white py-2 font-medium text-slate-600 transition-colors hover:bg-slate-50 ${T.base}`}
            >
              <Filter size={13} className="shrink-0 text-slate-500" />
              More Filters
            </button>

            {/* Unlabelled in the mockup - kept as the design draws it rather
                than inventing a filter it doesn't name. */}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Additional filter"
              className={`w-[86px] shrink-0 rounded-lg border border-[#E6E8F0] bg-white px-2.5 py-2 text-slate-700 focus:outline-none ${T.base}`}
            />

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPlan(PLAN_FILTERS[0]);
                setStatus(STATUS_FILTERS[0]);
                setCity(CITY_FILTERS[0]);
                setExpiry(EXPIRY_FILTERS[0]);
                setNote("");
              }}
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50"
              aria-label="Reset filters"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Table ------------------------------------------------------ */}
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: 15 }} />
              <col style={{ width: 69 }} />
              <col style={{ width: 225 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 185 }} />
              <col style={{ width: 105 }} />
              <col style={{ width: 167 }} />
              <col style={{ width: 125 }} />
              <col style={{ width: 143 }} />
              <col style={{ width: 158 }} />
              <col style={{ width: 143 }} />
              <col style={{ width: 25 }} />
            </colgroup>

            <thead>
              <tr className="border-y border-[#EDEFF5] bg-[#F9FAFC]">
                <th />
                {[
                  "#",
                  "Partner",
                  "Contact",
                  "Plan",
                  "Bookings",
                  "Amount (+18% GST)",
                  "Status",
                  "Start Date",
                  "Next Due Date",
                ].map((column) => (
                  <th
                    key={column}
                    className={`whitespace-nowrap py-2.5 pr-2 font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                  >
                    {column}
                  </th>
                ))}
                <th
                  className={`whitespace-nowrap py-2.5 pr-2 text-center font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                >
                  Actions
                </th>
                <th />
              </tr>
            </thead>

            <tbody>
              {subscriptions.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                >
                  <td />

                  <td className={`py-2.5 pr-2 align-middle text-slate-400 ${T.xs}`}>{row.id}</td>

                  <td className="py-2.5 pr-2 align-middle">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <SalonLogo name={row.name} />
                      <span className="min-w-0 leading-tight">
                        <span className={`block truncate font-semibold text-slate-800 ${T.xs}`}>
                          {row.name}
                        </span>
                        <span className={`block truncate text-slate-400 ${T.tiny}`}>
                          {row.email}
                        </span>
                      </span>
                    </span>
                  </td>

                  <td
                    className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}
                  >
                    {row.phone}
                  </td>

                  <td className="py-2.5 pr-2 align-middle leading-tight">
                    <Chip className={PLAN_TONES[row.tone]}>{row.plan}</Chip>
                    <span className={`mt-1 block truncate text-slate-400 ${T.tiny}`}>
                      {row.price}
                    </span>
                  </td>

                  <td
                    className={`whitespace-nowrap py-2.5 pr-2 align-middle font-semibold text-slate-700 ${T.xs}`}
                  >
                    {row.bookings}
                  </td>

                  <td className="py-2.5 pr-2 align-middle leading-tight">
                    <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.sm}`}>
                      {row.amount}
                    </span>
                    <span className={`block truncate text-slate-400 ${T.tiny}`}>{row.base}</span>
                  </td>

                  <td className="py-2.5 pr-2 align-middle">
                    {row.expired ? (
                      <Chip className="bg-rose-50 text-rose-600">Expired</Chip>
                    ) : (
                      <Chip className="bg-emerald-50 text-emerald-600">Active</Chip>
                    )}
                  </td>

                  <td
                    className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}
                  >
                    {row.start}
                  </td>

                  <td className="py-2.5 pr-2 align-middle leading-tight">
                    <span className={`block whitespace-nowrap text-slate-700 ${T.xs}`}>
                      {row.due}
                    </span>
                    <span
                      className={`block whitespace-nowrap font-semibold ${T.tiny}`}
                      style={{ color: row.expired ? RED : AMBER }}
                    >
                      {row.left}
                    </span>
                  </td>

                  <td className="py-2.5 pr-2 align-middle">
                    <span className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
                        aria-label="View subscription"
                      >
                        <Eye size={13} />
                      </button>

                      {row.expired ? (
                        <button
                          type="button"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white transition-colors hover:bg-slate-50"
                          style={{ color: BLUE }}
                          aria-label="Renew subscription"
                        >
                          <RefreshCw size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
                          aria-label="Edit subscription"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
                        aria-label="More actions"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </span>
                  </td>

                  <td />
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer ----------------------------------------------------- */}
          <div className="flex items-center gap-4 border-t border-[#EDEFF5] px-3.5 py-3">
            <span className={`whitespace-nowrap text-slate-400 ${T.xxs}`}>
              Showing 1 to 10 of 982 subscriptions
            </span>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-400 transition-colors hover:bg-slate-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
              </button>

              {[1, 2, 3].map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`h-7 w-7 rounded-lg font-semibold transition-colors ${T.xxs} ${
                    page === number
                      ? "text-white"
                      : "border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={page === number ? { background: BRAND } : undefined}
                >
                  {number}
                </button>
              ))}

              <span className={`px-0.5 text-slate-400 ${T.xxs}`}>...</span>

              <button
                type="button"
                onClick={() => setPage(99)}
                className={`h-7 w-7 rounded-lg font-semibold transition-colors ${T.xxs} ${
                  page === 99
                    ? "text-white"
                    : "border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
                }`}
                style={page === 99 ? { background: BRAND } : undefined}
              >
                99
              </button>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(99, prev + 1))}
                className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
                aria-label="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={`whitespace-nowrap text-slate-400 ${T.xxs}`}>Rows per page</span>
              <Select
                value={pageSize}
                onChange={setPageSize}
                options={PAGE_SIZES}
                className="w-[68px]"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PartnerSubscriptionsV2;
