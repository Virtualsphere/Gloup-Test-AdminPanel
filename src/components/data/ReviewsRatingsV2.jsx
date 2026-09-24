import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Frown,
  ListFilter,
  Meh,
  MessageSquare,
  MessageSquareText,
  MoreVertical,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Smile,
  Star,
} from "lucide-react";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Reviews & Ratings" mockup.
//
// Same technique as DashboardV2 / PartnerSubscriptionsV2: the layout is built
// once on a fixed DESIGN_WIDTH canvas and then uniformly scaled to whatever
// width is available, so the arrangement is identical at every screen size -
// nothing reflows, nothing clips, the page never scrolls sideways.
//
// Raising the px sizes in T below does NOT make text bigger on screen: it
// forces a wider canvas, which then scales down further and reads smaller.
//
// UI only for now - every number below is static demo data matching the
// mockup. The search box, the three filter dropdowns and the tabs do narrow /
// reorder the demo rows so the table can be exercised. Wire it to
// reviewSlice (getAllSalonReviews returns reviews + salonSummaries) once the
// design is signed off; the live page is components/data/Review.jsx.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const ROSE = "#F0445F";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const YELLOW = "#FBBF24";
const ORANGE = "#F97316";
const VIOLET = "#6D4AE0";

// Measured card widths from the mockup, used directly as grid fr units. The
// sixth KPI column is deliberately wider: it has to hold the two page action
// buttons side by side above "Salons Reviewed".
const KPI_COLS = "grid-cols-[196fr_200fr_198fr_196fr_200fr_239fr]";
const PANEL_COLS = "grid-cols-[338fr_382fr_294fr_256fr]";

// Type scale in design px on the 1520px canvas. The mockup screenshot was
// 1536px wide with ~1306px of content, so every measured size is carried
// across at ~1.16x to keep the design's own proportions.
const T = {
  tiny: "text-[11px]", // email line, chips, delta sub
  th: "text-[11px]", // uppercase table column headers
  xxs: "text-[12px]", // legend rows, dropdowns, pagination
  xs: "text-[13px]", // KPI label, table body cells
  sm: "text-[14px]", // tabs, summary values
  base: "text-[15px]", // buttons, inputs
  title: "text-[16px]", // card titles
  donut: "text-[24px]", // donut centre total
  kpi: "text-[28px]", // KPI values
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

// Turns a list of numbers into the {i, v} rows recharts wants for a sparkline.
const spark = (values) => values.map((v, i) => ({ i, v }));

// `good` colours the delta independently of its direction: fewer negative
// reviews is a green down-arrow, fewer neutral reviews is a red one.
const kpis = [
  {
    label: "Average Rating",
    value: "4.7",
    stars: true,
    delta: "0.3",
    up: true,
    good: true,
    icon: Star,
    color: "#4F46E5",
    tint: "#E0E7FF",
    line: "#4F46E5",
    trend: spark([12, 13, 11, 14, 13, 15, 14, 17, 13, 16, 18, 15, 17, 19, 17, 18, 21]),
  },
  {
    label: "Total Reviews",
    value: "18,294",
    delta: "14.8%",
    up: true,
    good: true,
    icon: MessageSquareText,
    color: "#16A34A",
    tint: "#DCFCE7",
    line: GREEN,
    trend: spark([10, 12, 11, 13, 12, 11, 14, 13, 12, 15, 14, 13, 16, 12, 15, 17, 18]),
  },
  {
    label: "Positive Reviews",
    value: "16,102",
    pct: "(88.0%)",
    delta: "15.2%",
    up: true,
    good: true,
    icon: Smile,
    color: AMBER,
    tint: "#FEF3C7",
    line: YELLOW,
    trend: spark([10, 12, 11, 13, 12, 14, 12, 13, 15, 13, 14, 16, 14, 15, 17, 16, 18]),
  },
  {
    label: "Neutral Reviews",
    value: "1,381",
    pct: "(7.6%)",
    delta: "2.1%",
    up: false,
    good: false,
    icon: Meh,
    color: ORANGE,
    tint: "#FFEDD5",
    line: ORANGE,
    trend: spark([14, 16, 13, 15, 14, 16, 13, 15, 14, 13, 15, 14, 18, 13, 15, 14, 13]),
  },
  {
    label: "Negative Reviews",
    value: "811",
    pct: "(4.4%)",
    delta: "8.7%",
    up: false,
    good: true,
    icon: Frown,
    color: RED,
    tint: "#FEE2E2",
    line: RED,
    trend: spark([12, 14, 13, 15, 12, 14, 16, 13, 15, 14, 13, 16, 14, 15, 17, 18, 14]),
  },
];

const salonsReviewed = {
  label: "Salons Reviewed",
  value: "3,842",
  delta: "11.3%",
  up: true,
  good: true,
  icon: Building2,
  color: VIOLET,
  tint: "#EDE9FE",
  line: VIOLET,
  trend: spark([12, 13, 12, 14, 13, 12, 14, 13, 15, 13, 14, 13, 15, 14, 16, 15, 16]),
};

const ratingDistribution = [
  { name: "5 Stars", value: 13280, pct: "72.6%", color: GREEN },
  { name: "4 Stars", value: 2822, pct: "15.4%", color: BLUE },
  { name: "3 Stars", value: 1104, pct: "6.0%", color: YELLOW },
  { name: "2 Stars", value: 628, pct: "3.4%", color: ORANGE },
  { name: "1 Star", value: 460, pct: "2.5%", color: RED },
];

const reviewsTrend = [
  { month: "Jan", reviews: 2145 },
  { month: "Feb", reviews: 2652 },
  { month: "Mar", reviews: 2984 },
  { month: "Apr", reviews: 3120 },
  { month: "May", reviews: 3642 },
  { month: "Jun", reviews: 3751 },
];

const topSalons = [
  { name: "Fresh Men Beauty Salon", rating: "4.9", reviews: 842 },
  { name: "Your Choice Salon", rating: "4.8", reviews: 622 },
  { name: "The Waves Salon", rating: "4.7", reviews: 512 },
  { name: "Cutting Time", rating: "4.7", reviews: 498 },
  { name: "Adam Affordable Mens Salon", rating: "4.6", reviews: 423 },
];

const reviewSummary = [
  { label: "Total Reviews", value: "18,294" },
  { label: "Responded", value: "7,821", pct: "(42.8%)" },
  { label: "Pending Response", value: "23", pct: "(0.1%)" },
  { label: "Reported Reviews", value: "156", pct: "(0.9%)" },
  { label: "Deleted Reviews", value: "89", pct: "(0.5%)" },
  { label: "This Month Growth", growth: "14.8%" },
];

// The first five rows are the mockup's; the rest fill out the 10-row page.
const reviews = [
  {
    id: 1,
    salon: "Amio Unisex Family Salon",
    email: "amio2023radhangar@gmail.com",
    customer: "Rakesh Kumar",
    phone: "9170114075",
    tag: "New",
    rating: 5,
    review: "Very clean salon. Staff was professional and friendly.",
    status: "Active",
    response: "Responded",
    date: "1 Sept 2026",
    time: "10:30 AM",
  },
  {
    id: 2,
    salon: "B Unique Unisex Salon",
    email: "buniqueunisex@gmail.com",
    customer: "Anita Sharma",
    phone: "6382641774",
    tag: "Repeat",
    rating: 4,
    review: "Great experience. Quick service and no waiting.",
    status: "Active",
    response: "Responded",
    date: "1 Sept 2026",
    time: "09:15 AM",
  },
  {
    id: 3,
    salon: "Care Me Salon",
    email: "carmehaircare@gmail.com",
    customer: "Vikram Iyer",
    phone: "7200775090",
    tag: "New",
    rating: 4,
    review: "Good haircut. Will book again!",
    status: "Active",
    response: "Pending",
    date: "1 Sept 2026",
    time: "09:02 AM",
  },
  {
    id: 4,
    salon: "Adam Affordable Mens Salon",
    email: "adamofficial@gmail.com",
    customer: "Suresh Babu",
    phone: "8015541529",
    tag: "VIP",
    rating: 5,
    review: "Best salon in my area. Highly recommended.",
    status: "Active",
    response: "Responded",
    date: "31 Aug 2026",
    time: "07:45 PM",
  },
  {
    id: 5,
    salon: "Musk & Tusk",
    email: "muskandtusk@gmail.com",
    customer: "Deepak Raj",
    phone: "9345678912",
    tag: "Repeat",
    rating: 2,
    review: "Had to wait for long. Not satisfied.",
    status: "Active",
    response: "Pending",
    date: "31 Aug 2026",
    time: "06:20 PM",
  },
  {
    id: 6,
    salon: "Fresh Men Beauty Salon",
    email: "freshmenbeauty@gmail.com",
    customer: "Priya Nair",
    phone: "9840123456",
    tag: "VIP",
    rating: 5,
    review: "Loved the facial. Very relaxing and hygienic.",
    status: "Active",
    response: "Responded",
    date: "31 Aug 2026",
    time: "04:10 PM",
  },
  {
    id: 7,
    salon: "The Waves Salon",
    email: "thewavessalon@gmail.com",
    customer: "Karthik S",
    phone: "9003034689",
    tag: "Repeat",
    rating: 3,
    review: "Service was okay, but the place was crowded.",
    status: "Active",
    response: "Pending",
    date: "31 Aug 2026",
    time: "02:35 PM",
  },
  {
    id: 8,
    salon: "Cutting Time",
    email: "cuttingtime@gmail.com",
    customer: "Meena Lakshmi",
    phone: "9884473307",
    tag: "New",
    rating: 5,
    review: "Stylist understood exactly what I wanted.",
    status: "Active",
    response: "Responded",
    date: "30 Aug 2026",
    time: "06:50 PM",
  },
  {
    id: 9,
    salon: "Your Choice Salon",
    email: "yourchoicesalon@gmail.com",
    customer: "Arjun Mehta",
    phone: "7824031555",
    tag: "Repeat",
    rating: 1,
    review: "Booking was not honoured. Very disappointed.",
    status: "Reported",
    response: "Pending",
    date: "30 Aug 2026",
    time: "11:20 AM",
  },
  {
    id: 10,
    salon: "KGF Salon",
    email: "kgfsalon@gmail.com",
    customer: "Farhan Ali",
    phone: "6382039948",
    tag: "New",
    rating: 4,
    review: "Nice beard trim and good pricing.",
    status: "Active",
    response: "Responded",
    date: "30 Aug 2026",
    time: "09:40 AM",
  },
];

const TAG_TONES = {
  New: "bg-indigo-50 text-indigo-500",
  Repeat: "bg-sky-50 text-sky-600",
  VIP: "bg-orange-50 text-orange-500",
};

const STATUS_TONES = {
  Active: "bg-emerald-50 text-emerald-600",
  Reported: "bg-rose-50 text-rose-600",
  Hidden: "bg-slate-100 text-slate-500",
};

const RESPONSE_TONES = {
  Responded: "bg-violet-50 text-violet-500",
  Pending: "bg-amber-50 text-amber-500",
};

const TABS = [
  { key: "all", label: "All Reviews" },
  { key: "salons", label: "By Salons" },
  { key: "services", label: "By Services" },
  { key: "ratings", label: "By Ratings" },
  { key: "customers", label: "By Customers" },
  { key: "awaiting", label: "Awaiting Response", count: 23 },
];

const SALON_FILTERS = ["All Salons", ...new Set(reviews.map((row) => row.salon))];
const RATING_FILTERS = ["All Ratings", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];
const STATUS_FILTERS = ["All Status", "Active", "Reported", "Hidden"];
const BULK_ACTIONS = ["Bulk Actions", "Mark as Responded", "Hide Selected", "Delete Selected"];
const TREND_RANGES = ["Last 6 Months", "Last 12 Months", "Last 3 Months"];
const PAGE_SIZES = ["10", "25", "50", "100"];
const HEADER_RANGES = [
  "May 24, 2024 - Jun 23, 2024",
  "Apr 24, 2024 - May 23, 2024",
  "Jan 01, 2024 - Jun 23, 2024",
];
const LAST_PAGE = 1829;

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

const Chip = ({ children, className = "" }) => (
  <span
    className={`inline-block shrink-0 whitespace-nowrap rounded-md px-2 py-[3px] font-semibold ${T.tiny} ${className}`}
  >
    {children}
  </span>
);

// Filled amber stars for `value`, outlined grey for the rest.
const Stars = ({ value, size = 14, gap = "gap-[3px]" }) => (
  <span className={`flex shrink-0 items-center ${gap}`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        strokeWidth={1.6}
        className={n <= Math.round(value) ? "text-amber-400" : "text-slate-300"}
        fill={n <= Math.round(value) ? "currentColor" : "none"}
      />
    ))}
  </span>
);

// The mockup shows each salon's own photo; initials on a dark plate stand in
// for them until the API returns partner logos.
const SalonLogo = ({ name, size = 34 }) => {
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
      className={`grid shrink-0 place-items-center rounded-md font-bold ${T.tiny}`}
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

// Arrow + delta + caption. Arrow follows the direction, colour follows
// whether that direction is good news.
const Delta = ({ value, up, good }) => {
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span className={`flex items-center gap-1 truncate ${T.xxs}`}>
      <Arrow
        size={13}
        strokeWidth={2.4}
        className={`shrink-0 ${good ? "text-emerald-500" : "text-rose-500"}`}
      />
      <span className={`font-semibold ${good ? "text-emerald-500" : "text-rose-500"}`}>
        {value}
      </span>
      <span className="truncate text-slate-400">vs last 30 days</span>
    </span>
  );
};

const Sparkline = ({ id, data, color, height = 42 }) => (
  <div className="mt-auto w-full" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 2", "dataMax + 1"]} />
        <Area
          type="linear"
          dataKey="v"
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const KpiCard = ({ kpi, className = "" }) => {
  const Icon = kpi.icon;
  return (
    <Card className={`px-4 pb-2 pt-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: kpi.tint }}
        >
          <Icon
            size={17}
            style={{ color: kpi.color }}
            fill={kpi.stars ? "currentColor" : "none"}
          />
        </span>
        <p className={`min-w-0 flex-1 truncate font-semibold text-slate-800 ${T.xs}`}>
          {kpi.label}
        </p>
      </div>

      <div className="mt-3 flex min-w-0 items-baseline gap-2">
        <p className={`shrink-0 font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>
          {kpi.value}
        </p>
        {kpi.pct && <span className={`truncate text-slate-500 ${T.xxs}`}>{kpi.pct}</span>}
        {kpi.stars && (
          <span className="ml-2 self-center">
            <Stars value={5} size={15} gap="gap-1.5" />
          </span>
        )}
      </div>

      <div className="mt-2">
        <Delta value={kpi.delta} up={kpi.up} good={kpi.good} />
      </div>

      <Sparkline id={`kpi-${kpi.label.replace(/\W/g, "")}`} data={kpi.trend} color={kpi.line} />
    </Card>
  );
};

// The page title and the header affordances render into the app's own top
// bar (the #app-header-slot that Header.jsx exposes) rather than being drawn a
// second time inside the canvas: that bar already owns the hamburger and the
// account menu.
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
      <h1 className="min-w-0 truncate text-[18px] font-extrabold leading-tight tracking-tight text-slate-900">
        {title}
      </h1>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 xl:flex">
          <CalendarDays size={14} className="shrink-0 text-slate-500" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium text-slate-600 focus:outline-none"
          >
            {HEADER_RANGES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <ArrowRightLeft size={13} className="ml-1 shrink-0 text-slate-500" />
        </span>

        <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 lg:flex">
          <Search size={14} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything..."
            className="w-[150px] bg-transparent text-[12px] text-slate-600 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="shrink-0 rounded border border-gray-200 px-1 text-[10px] font-semibold text-slate-400">
            ⌘K
          </span>
        </span>

        <button type="button" className="relative shrink-0 text-slate-600" aria-label="Notifications">
          <Bell size={18} />
          <span
            className="absolute -right-1.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: ROSE }}
          >
            6
          </span>
        </button>

        <button type="button" className="shrink-0 text-slate-600" aria-label="Messages">
          <MessageSquare size={18} />
        </button>
      </div>
    </div>,
    slot
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ReviewsRatingsV2 = ({ title = "Reviews & Ratings" }) => {
  const [headerRange, setHeaderRange] = useState(HEADER_RANGES[0]);
  const [headerSearch, setHeaderSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [bulkAction, setBulkAction] = useState(BULK_ACTIONS[0]);
  const [trendRange, setTrendRange] = useState(TREND_RANGES[0]);
  const [search, setSearch] = useState("");
  const [salon, setSalon] = useState(SALON_FILTERS[0]);
  const [rating, setRating] = useState(RATING_FILTERS[0]);
  const [status, setStatus] = useState(STATUS_FILTERS[0]);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const topReviewCount = ratingDistribution[0];

  const resetFilters = () => {
    setTab("all");
    setSearch("");
    setSalon(SALON_FILTERS[0]);
    setRating(RATING_FILTERS[0]);
    setStatus(STATUS_FILTERS[0]);
    setBulkAction(BULK_ACTIONS[0]);
    setPage(1);
  };

  // Narrows / reorders the demo rows. "By Services" has nothing to group on
  // until the API returns the booked service, so it shows the default order.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const stars = rating === RATING_FILTERS[0] ? null : parseInt(rating, 10);

    const filtered = reviews.filter(
      (row) =>
        (!term ||
          [row.salon, row.email, row.customer, row.phone, row.review].some((field) =>
            field.toLowerCase().includes(term)
          )) &&
        (salon === SALON_FILTERS[0] || row.salon === salon) &&
        (stars === null || row.rating === stars) &&
        (status === STATUS_FILTERS[0] || row.status === status) &&
        (tab !== "awaiting" || row.response === "Pending")
    );

    if (tab === "salons") return [...filtered].sort((a, b) => a.salon.localeCompare(b.salon));
    if (tab === "customers")
      return [...filtered].sort((a, b) => a.customer.localeCompare(b.customer));
    if (tab === "ratings") return [...filtered].sort((a, b) => b.rating - a.rating);
    return filtered;
  }, [search, salon, rating, status, tab]);

  const isFiltered =
    search.trim() !== "" ||
    salon !== SALON_FILTERS[0] ||
    rating !== RATING_FILTERS[0] ||
    status !== STATUS_FILTERS[0] ||
    tab === "awaiting";

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

  const pageButton = (number) => (
    <button
      key={number}
      type="button"
      onClick={() => setPage(number)}
      className={`h-8 min-w-8 rounded-lg px-2 font-semibold transition-colors ${T.xxs} ${
        page === number
          ? "border border-rose-100 bg-rose-50"
          : "border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
      }`}
      style={page === number ? { color: ROSE } : undefined}
    >
      {number}
    </button>
  );

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
        {/* KPI row - the sixth column stacks the page actions above the     */}
        {/* shorter "Salons Reviewed" card, exactly as the mockup does.       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${KPI_COLS} items-end ${GAP}`}>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} className="h-[196px]" />
          ))}

          <div className="flex min-w-0 flex-col gap-2.5">
            {/* min-w-0 on the row and both buttons lets them shrink (labels
                truncate) instead of spilling left over the neighbouring card
                if the column ever ends up narrower than the pair. */}
            <div className="flex min-w-0 justify-end gap-2">
              <button
                type="button"
                className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold text-white shadow-sm ${T.xxs}`}
                style={{ background: ROSE }}
              >
                <Plus size={14} className="shrink-0" />
                <span className="truncate">Add Manual Review</span>
              </button>

              <button
                type="button"
                className={`flex min-w-0 items-center justify-center gap-1 rounded-lg border border-[#E6E8F0] bg-white px-2 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.xxs}`}
              >
                <Download size={14} className="shrink-0 text-slate-600" />
                <span className="truncate">Export Report</span>
              </button>
            </div>

            <KpiCard kpi={salonsReviewed} className="h-[162px]" />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tabs + toolbar                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex items-center gap-1">
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTab(item.key);
                    setPage(1);
                  }}
                  className={`relative flex items-center gap-1.5 px-5 py-3 font-medium transition-colors ${T.sm} ${
                    active ? "" : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={active ? { color: ROSE } : undefined}
                >
                  {item.label}
                  {item.count != null && (
                    <span
                      className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ background: ROSE }}
                    >
                      {item.count}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute inset-x-1 -bottom-px h-[2px] rounded-full"
                      style={{ background: ROSE }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border border-[#E6E8F0] bg-white px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 ${T.sm}`}
            >
              <Filter size={15} className="shrink-0 text-slate-600" />
              Filters
            </button>

            <Select
              value={bulkAction}
              onChange={setBulkAction}
              options={BULK_ACTIONS}
              className="w-[146px] [&_select]:py-2.5"
              size={T.sm}
            />

            <button
              type="button"
              onClick={resetFilters}
              className="grid h-[42px] w-[42px] place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 transition-colors hover:bg-slate-50"
              aria-label="Reset filters"
              title="Reset filters"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Distribution / trend / top salons / summary                      */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${PANEL_COLS} ${GAP}`}>
          {/* Rating distribution ---------------------------------------- */}
          <Card>
            <div className="px-4 pb-1 pt-4">
              <SectionTitle>Rating Distribution</SectionTitle>
            </div>

            <div className="flex flex-1 items-center gap-5 px-4 py-2">
              <div className="relative shrink-0" style={{ width: 170, height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ratingDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="64%"
                      outerRadius="100%"
                      paddingAngle={1}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {ratingDistribution.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} formatter={(value) => value.toLocaleString("en-IN")} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center">
                  <span className={`font-extrabold leading-none tracking-tight text-slate-900 ${T.donut}`}>
                    18,294
                  </span>
                  <span className={`mt-1.5 leading-none text-slate-500 ${T.tiny}`}>
                    Total Reviews
                  </span>
                </div>
              </div>

              <ul className="flex min-w-0 flex-1 flex-col gap-4">
                {ratingDistribution.map((slice) => (
                  <li key={slice.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: slice.color }}
                    />
                    <span className={`min-w-0 flex-1 truncate text-slate-700 ${T.xxs}`}>
                      {slice.name}
                    </span>
                    <span className={`shrink-0 whitespace-nowrap font-semibold text-slate-800 ${T.xxs}`}>
                      {slice.value.toLocaleString("en-US")}
                    </span>
                    <span className={`w-[46px] shrink-0 whitespace-nowrap text-right text-slate-500 ${T.tiny}`}>
                      ({slice.pct})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-4 pb-4 pt-2">
              <span className={`font-bold text-slate-900 ${T.sm}`}>{topReviewCount.pct}</span>
              <span className={`ml-1.5 text-slate-600 ${T.xs}`}>5 Star Reviews</span>
            </div>
          </Card>

          {/* Reviews trend ---------------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3.5">
              <SectionTitle>Reviews Trend</SectionTitle>
              <Select
                value={trendRange}
                onChange={setTrendRange}
                options={TREND_RANGES}
                className="w-[118px]"
              />
            </div>

            <div className="h-[252px] w-full px-1.5 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reviewsTrend} margin={{ top: 26, right: 20, bottom: 0, left: -14 }}>
                  <defs>
                    <linearGradient id="reviewsTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    dy={6}
                    padding={{ left: 24, right: 12 }}
                  />
                  <YAxis
                    domain={[0, 4000]}
                    ticks={[0, 1000, 2000, 3000, 4000]}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={48}
                    tickFormatter={(value) => (value >= 1000 ? `${value / 1000}K` : value)}
                  />
                  <Tooltip {...TOOLTIP} formatter={(value) => value.toLocaleString("en-US")} />
                  <Area
                    type="linear"
                    dataKey="reviews"
                    name="Reviews"
                    stroke={GREEN}
                    strokeWidth={2.5}
                    fill="url(#reviewsTrendFill)"
                    dot={{ r: 4.5, fill: GREEN, stroke: "#fff", strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList
                      dataKey="reviews"
                      position="top"
                      offset={10}
                      formatter={(value) => value.toLocaleString("en-US")}
                      style={{ fontSize: 11, fontWeight: 600, fill: "#0F172A" }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top reviewed salons ---------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
              <SectionTitle>Top Reviewed Salons</SectionTitle>
              <button
                type="button"
                className={`shrink-0 font-semibold text-blue-600 hover:underline ${T.xxs}`}
              >
                View All
              </button>
            </div>

            <ul className="flex flex-1 flex-col justify-center gap-3.5 px-4 py-3">
              {topSalons.map((item) => (
                <li key={item.name} className="flex items-center gap-3">
                  <SalonLogo name={item.name} size={36} />

                  <div className="min-w-0 flex-1 leading-tight">
                    <p className={`truncate font-semibold text-slate-800 ${T.xs}`}>{item.name}</p>
                    <p className={`mt-1 flex items-center gap-1 text-slate-500 ${T.tiny}`}>
                      <Star size={12} className="shrink-0 text-amber-400" fill="currentColor" />
                      <span className="font-semibold text-slate-700">{item.rating}</span>
                      <span className="truncate">({item.reviews} reviews)</span>
                    </p>
                  </div>

                  <Chip className={STATUS_TONES.Active}>Active</Chip>
                </li>
              ))}
            </ul>
          </Card>

          {/* Review summary --------------------------------------------- */}
          <Card>
            <div className="px-4 pb-1 pt-4">
              <SectionTitle>Review Summary</SectionTitle>
            </div>

            <ul className="flex flex-1 flex-col justify-around px-4 pb-3 pt-2">
              {reviewSummary.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-2">
                  <span className={`truncate text-slate-500 ${T.xxs}`}>{row.label}</span>
                  {row.growth ? (
                    <span
                      className={`flex shrink-0 items-center gap-1 font-bold text-emerald-500 ${T.xs}`}
                    >
                      <ArrowUp size={13} strokeWidth={2.4} />
                      {row.growth}
                    </span>
                  ) : (
                    <span className={`shrink-0 whitespace-nowrap ${T.xs}`}>
                      <span className="font-bold text-slate-900">{row.value}</span>
                      {row.pct && <span className="ml-1 text-slate-500">{row.pct}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-4">
          <span className="relative block min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by salon, customer, review content..."
              className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2.5 pl-10 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.xs}`}
            />
          </span>

          <Select
            value={salon}
            onChange={setSalon}
            options={SALON_FILTERS}
            className="w-[186px] [&_select]:py-2.5"
            size={T.xs}
          />
          <Select
            value={rating}
            onChange={setRating}
            options={RATING_FILTERS}
            className="w-[176px] [&_select]:py-2.5"
            size={T.xs}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={STATUS_FILTERS}
            className="w-[176px] [&_select]:py-2.5"
            size={T.xs}
          />

          <button
            type="button"
            className={`flex w-[208px] shrink-0 items-center gap-2 rounded-lg border border-[#E6E8F0] bg-white px-3.5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 ${T.xs}`}
          >
            <ListFilter size={15} className="shrink-0 text-slate-600" />
            More Filters
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Reviews table                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: 20 }} />
              <col style={{ width: 52 }} />
              <col style={{ width: 256 }} />
              <col style={{ width: 210 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 272 }} />
              <col style={{ width: 118 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 132 }} />
              <col style={{ width: 136 }} />
              <col style={{ width: 20 }} />
            </colgroup>

            <thead>
              <tr className="border-b border-[#EDEFF5] bg-[#F9FAFC]">
                <th className="rounded-tl-2xl" />
                {["#", "Salon", "Customer", "Rating", "Review", "Status", "Response", "Date"].map(
                  (column) => (
                    <th
                      key={column}
                      className={`whitespace-nowrap py-3.5 pr-3 font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                    >
                      {column}
                    </th>
                  )
                )}
                <th
                  className={`whitespace-nowrap py-3.5 pr-3 text-center font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                >
                  Actions
                </th>
                <th className="rounded-tr-2xl" />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className={`py-10 text-center text-slate-400 ${T.xs}`}>
                    No reviews match these filters.
                  </td>
                </tr>
              )}

              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                >
                  <td />

                  <td className={`py-3.5 pr-3 align-middle text-slate-700 ${T.xs}`}>{index + 1}</td>

                  <td className="py-3.5 pr-3 align-middle leading-tight">
                    <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>
                      {row.salon}
                    </span>
                    <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>
                      {row.email}
                    </span>
                  </td>

                  <td className="py-3.5 pr-3 align-middle">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>
                          {row.customer}
                        </span>
                        <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>
                          {row.phone}
                        </span>
                      </span>
                      <Chip className={TAG_TONES[row.tag]}>{row.tag}</Chip>
                    </span>
                  </td>

                  <td className="py-3.5 pr-3 align-middle">
                    <span className="flex items-center gap-2.5">
                      <Stars value={row.rating} size={15} gap="gap-1.5" />
                      <span className={`font-medium text-slate-700 ${T.xs}`}>{row.rating}</span>
                    </span>
                  </td>

                  <td className={`py-3.5 pr-3 align-middle leading-snug text-slate-700 ${T.xs}`}>
                    <span className="line-clamp-2">{row.review}</span>
                  </td>

                  <td className="py-3.5 pr-3 align-middle">
                    <Chip className={STATUS_TONES[row.status]}>{row.status}</Chip>
                  </td>

                  <td className="py-3.5 pr-3 align-middle">
                    <Chip className={RESPONSE_TONES[row.response]}>{row.response}</Chip>
                  </td>

                  <td className="py-3.5 pr-3 align-middle leading-tight">
                    <span className={`block whitespace-nowrap text-slate-700 ${T.xs}`}>
                      {row.date}
                    </span>
                    <span className={`mt-0.5 block whitespace-nowrap text-slate-700 ${T.xs}`}>
                      {row.time}
                    </span>
                  </td>

                  <td className="py-3.5 pr-3 align-middle">
                    <span className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
                        aria-label="View review"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
                        aria-label="Reply to review"
                      >
                        <Reply size={16} />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
                        aria-label="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </span>
                  </td>

                  <td />
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer ----------------------------------------------------- */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-[#EDEFF5] px-4 py-3.5">
            <span className={`whitespace-nowrap text-slate-600 ${T.xxs}`}>
              {isFiltered
                ? `Showing ${rows.length} matching review${rows.length === 1 ? "" : "s"}`
                : "Showing 1 to 10 of 18,294 reviews"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-400 transition-colors hover:bg-slate-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>

              {[1, 2, 3].map(pageButton)}
              <span className={`px-1.5 text-slate-500 ${T.xxs}`}>...</span>
              {pageButton(LAST_PAGE)}

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(LAST_PAGE, prev + 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 transition-colors hover:bg-slate-50"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <span className={`whitespace-nowrap text-slate-600 ${T.xxs}`}>Rows per page</span>
              <Select
                value={pageSize}
                onChange={setPageSize}
                options={PAGE_SIZES}
                className="w-[64px]"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReviewsRatingsV2;
