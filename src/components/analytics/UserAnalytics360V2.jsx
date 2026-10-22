import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CalendarDays,
  Clock,
  CreditCard,
  Download,
  Facebook,
  House,
  Instagram,
  Leaf,
  Link,
  LogIn,
  MapPin,
  MonitorSmartphone,
  MousePointerClick,
  Repeat,
  Search,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Ticket,
  Timer,
  UserPlus,
  Users,
  Compass,
  BadgeCheck,
  Wallet,
  AlarmClock,
  Package,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, toSpark as spark } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Delta,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  HeatGrid as BaseHeatGrid,
  KpiTile as BaseKpiTile,
  LegendDot,
  LiveStamp,
  Meter,
  RampLegend,
  Segmented as BaseSegmented,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "User Analytics 360°" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. It
// is a roll-up of the other analytics pages, so the same gaps apply: downloads,
// logins, acquisition channels, screen time, tap maps, cohorts, uninstall
// reasons, the live feed and the AI recommendations all need the apps to
// report events first. The activity-heatmap and screen-time tabs and the
// header pickers hold local state only.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const VIOLET = "#6D4AE0";
const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const AMBER = "#F5A524";
const ORANGE = "#F5933A";
const PINK = "#F0507A";
const RED = "#EF4444";

// Measured card widths from the mockup, used directly as grid fr units.
const KPI_COLS = "grid-cols-[178fr_178fr_174fr_184fr_184fr_192fr_202fr]";
const ROW2_COLS = "grid-cols-[432fr_513fr_389fr]";
const ROW3_COLS = "grid-cols-[243fr_316fr_258fr_196fr_302fr]";
const ROW4_COLS = "grid-cols-[228fr_436fr_272fr_382fr]";
const ROW5_COLS = "grid-cols-[412fr_285fr_242fr_380fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1352px of content, so measured sizes carry over at ~1.12x.
const T = {
  nano: "text-[8.5px]", // column headers, sub-lines
  micro: "text-[9px]", // captions
  xs: "text-[9.5px]", // table cells, list rows
  sm: "text-[10.5px]", // body, legend
  md: "text-[11.5px]", // emphasised values
  title: "text-[12.5px]", // card titles
  kpi: "text-[19px]", // KPI values
  donut: "text-[15px]", // donut centre totals
};

const GAP = "gap-3";
const COMPARE = "vs last week";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

// A fixed wavy upward series for the KPI sparklines (no randomness).
const trend = (seed, slope = 0.45, amp = 1.1) =>
  spark(
    Array.from({ length: 18 }, (_, i) =>
      +(10 + slope * i + amp * Math.sin(i * 1.9 + seed) + 0.6 * Math.sin(i * 0.8 + seed * 2)).toFixed(2)
    )
  );

const kpis = [
  { label: "Downloads", value: "2,43,580", delta: "18.6%", icon: Download, color: VIOLET, tint: "#EEEAFD", line: INDIGO, trend: trend(1) },
  { label: "Logins", value: "1,82,314", delta: "16.4%", icon: LogIn, color: "#16A34A", tint: "#DCFCE7", line: GREEN, trend: trend(2.2) },
  { label: "Unique Users", value: "1,36,729", delta: "17.2%", icon: Users, color: "#2563EB", tint: "#DBEAFE", line: BLUE, trend: trend(3.4) },
  { label: "1st Time Bookings", value: "25,000", delta: "18.6%", icon: ShoppingCart, color: "#EA580C", tint: "#FFEDD5", line: "#F59E0B", trend: trend(4.1) },
  { label: "Add to Cart", value: "59,420", delta: "16.0%", icon: ShoppingBag, color: "#E11D48", tint: "#FFE4E6", line: "#EC4899", trend: trend(5.3) },
  { label: "Completed Bookings", value: "22,680", delta: "17.9%", icon: BadgeCheck, color: VIOLET, tint: "#EEEAFD", line: INDIGO, trend: trend(6.6) },
];
const DAU_BARS = Array.from({ length: 24 }, (_, i) => ({
  i,
  v: Math.round(8 + 3 * Math.sin(i * 1.3) + (i > 16 ? (i - 16) * 1.6 : 0) + 3 * Math.cos(i * 0.7)),
}));

// `width` is the bar's share of the track as drawn in the mockup.
const funnel = [
  { label: "App Open", count: "2,98,540", pct: "100%", width: 100, color: "#5B3FF0" },
  { label: "Search Salon", count: "1,87,340", pct: "62.7%", width: 79, color: "#3B82F6" },
  { label: "View Details", count: "1,05,876", pct: "35.4%", width: 58.5, color: "#38A8F5" },
  { label: "Add to Cart", count: "59,420", pct: "19.9%", width: 48.5, color: "#22B573" },
  { label: "Initiate Checkout", count: "33,245", pct: "11.1%", width: 41.5, color: "#F7C233" },
  { label: "Payment Success", count: "25,000", pct: "8.4%", width: 36.5, color: "#F5933A" },
  { label: "Booking Completed", count: "22,680", pct: "7.6%", width: 29, color: "#F26B4A" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) =>
  h % 4 === 0 ? `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? "AM" : "PM"}` : ""
);
const DAY_BOOST = [0.82, 0.86, 0.9, 0.92, 0.98, 1, 0.96];
const HEAT_CURVES = {
  opens: [0.14, 0.1, 0.08, 0.08, 0.1, 0.16, 0.3, 0.45, 0.55, 0.6, 0.58, 0.62, 0.66, 0.62, 0.6, 0.66, 0.74, 0.84, 0.94, 1, 0.92, 0.78, 0.52, 0.28],
  search: [0.1, 0.08, 0.06, 0.06, 0.08, 0.14, 0.26, 0.42, 0.58, 0.7, 0.74, 0.72, 0.7, 0.66, 0.62, 0.66, 0.7, 0.78, 0.88, 0.92, 0.84, 0.7, 0.46, 0.22],
  bookings: [0.06, 0.04, 0.03, 0.03, 0.04, 0.08, 0.16, 0.28, 0.4, 0.46, 0.5, 0.54, 0.56, 0.52, 0.5, 0.56, 0.68, 0.82, 0.96, 1, 0.9, 0.7, 0.4, 0.16],
};
const heat = Object.fromEntries(
  Object.entries(HEAT_CURVES).map(([key, curve]) => [
    key,
    DAY_BOOST.map((boost) => curve.map((v) => Math.min(1, +(v * boost).toFixed(3)))),
  ])
);
const HEAT_TABS = [
  { value: "opens", label: "App Opens" },
  { value: "search", label: "Search" },
  { value: "bookings", label: "Bookings" },
];
const HEAT_RAMP = ["#F3F0FF", "#D9D0FB", "#A996F5", "#7A5CF0", "#5B3FF0"];

const SCREEN_TABS = [
  { value: "duration", label: "Avg. Session Duration" },
  { value: "screens", label: "Screens per Session" },
];
const screenTime = {
  duration: {
    headline: "2m 34s",
    delta: "10.4%",
    rows: [
      { icon: House, label: "Home", value: "28s" },
      { icon: Search, label: "Search", value: "42s" },
      { icon: Store, label: "Salon Details", value: "1m 12s" },
      { icon: ShoppingCart, label: "Cart", value: "48s" },
      { icon: CreditCard, label: "Checkout", value: "1m 08s" },
      { icon: CalendarCheck, label: "Booking Success", value: "22s" },
    ],
  },
  screens: {
    headline: "6.8",
    delta: "4.1%",
    rows: [
      { icon: House, label: "Home", value: "1.2" },
      { icon: Search, label: "Search", value: "1.6" },
      { icon: Store, label: "Salon Details", value: "1.4" },
      { icon: ShoppingCart, label: "Cart", value: "1.1" },
      { icon: CreditCard, label: "Checkout", value: "1.0" },
      { icon: CalendarCheck, label: "Booking Success", value: "0.5" },
    ],
  },
};
const SCREEN_ICON_COLORS = ["#2563EB", "#2563EB", "#2563EB", "#EA580C", "#EA580C", "#16A34A"];

const channels = [
  { name: "Google Ads", pct: 32.6, kind: "google" },
  { name: "Instagram", pct: 24.7, kind: "instagram" },
  { name: "Facebook", pct: 18.9, kind: "facebook" },
  { name: "Organic", pct: 12.1, kind: "organic" },
  { name: "Direct", pct: 7.4, kind: "direct" },
  { name: "Referral", pct: 4.3, kind: "referral" },
];

const segments = [
  { name: "New Users", value: 56342, pct: "41.2%", color: VIOLET },
  { name: "Active", value: 39197, pct: "28.7%", color: GREEN },
  { name: "Potential Churn", value: 27742, pct: "20.3%", color: AMBER },
  { name: "At Risk", value: 9029, pct: "6.6%", color: PINK },
  { name: "Loyal", value: 4419, pct: "3.2%", color: "#1E3A8A" },
];

const cohorts = [
  { week: "May 19–25", values: ["100%", "38.6%", "22.7%", "12.1%", "5.8%"] },
  { week: "May 12–18", values: ["100%", "41.2%", "23.1%", "13.4%", "6.8%"] },
  { week: "May 5–11", values: ["100%", "39.8%", "22.0%", "11.8%", "5.1%"] },
  { week: "Apr 28–May 4", values: ["100%", "38.7%", "20.6%", "10.9%", "4.8%"] },
  { week: "Apr 21–27", values: ["100%", "37.1%", "19.3%", "9.6%", "4.1%"] },
];
const COHORT_COLS = ["Week 0", "Week 1", "Week 2", "Week 4", "Week 8"];
const COHORT_MODES = ["By Sign-up Week", "By First Booking Week"];

const uninstall = [
  { name: "Price", value: 31.2, pct: "31.2%", color: VIOLET },
  { name: "Not using", value: 25.6, pct: "25.6%", color: BLUE },
  { name: "Too many notifications", value: 14.8, pct: "14.8%", color: AMBER },
  { name: "App issues", value: 10.3, pct: "10.3%", color: "#14B8A6" },
  { name: "Others", value: 18.1, pct: "18.1%", color: "#64748B" },
];

const searches = {
  services: [
    { name: "Haircut", count: "1,12,340", up: "24%" },
    { name: "Beard Trim", count: "86,245", up: "21%" },
    { name: "Hair Spa", count: "64,780", up: "19%" },
    { name: "Facial", count: "48,920", up: "17%" },
    { name: "Hair Colour", count: "32,450", up: "15%" },
  ],
  categories: [
    { name: "Hair Care", count: "2,10,500", up: "22%" },
    { name: "Grooming", count: "1,24,310", up: "19%" },
    { name: "Skin Care", count: "98,760", up: "18%" },
    { name: "Nail Care", count: "52,430", up: "14%" },
    { name: "Hair Removal", count: "31,880", up: "12%" },
  ],
};

const cart = [
  { label: "Add to Cart", count: "59,420", pct: "100%", width: 100 },
  { label: "Go to Checkout", count: "33,245", pct: "56.0%", width: 56 },
  { label: "Enter Details", count: "28,740", pct: "48.4%", width: 48.4 },
  { label: "Payment Page", count: "25,860", pct: "43.5%", width: 43.5 },
  { label: "Payment Success", count: "25,000", pct: "42.1%", width: 42.1 },
];
const cartReasons = [
  { icon: Wallet, color: "#E11D48", label: "Price high", pct: "28.4%" },
  { icon: Search, color: "#E11D48", label: "Comparing", pct: "24.1%" },
  { icon: Clock, color: "#EA580C", label: "Time slot", pct: "18.6%" },
  { icon: CreditCard, color: "#16A34A", label: "Payment issues", pct: "12.3%" },
  { icon: Package, color: "#64748B", label: "Others", pct: "16.6%" },
];

const DAYS = ["May 21", "22", "23", "24", "25", "26", "27"];
const returning = DAYS.map((day, i) => ({
  day,
  fresh: [21000, 24200, 22600, 27200, 26200, 30000, 31600][i],
  back: [8200, 11300, 13600, 12200, 15200, 23800, 27200][i],
}));

const ltvSegments = [
  { name: "Loyal Users", value: "₹2,860", width: 100 },
  { name: "Active Users", value: "₹1,960", width: 70 },
  { name: "Potential Churn", value: "₹820", width: 30 },
  { name: "New Users", value: "₹420", width: 16 },
];
const ltvShare = [
  { name: "Top 20%", value: 71.4, pct: "71.4%", color: BLUE },
  { name: "Middle 60%", value: 24.7, pct: "24.7%", color: AMBER },
  { name: "Bottom 20%", value: 3.9, pct: "3.9%", color: PINK },
];

const paths = [
  { icon: Search, label: "Search Salon", pct: "62.7%", color: "#0EA5E9", tint: "#E3F5FC" },
  { icon: Store, label: "View Details", pct: "55.2%", color: "#2563EB", tint: "#E6EDFD" },
  { icon: ShoppingCart, label: "Add to Cart", pct: "56.1%", color: "#E11D48", tint: "#FDE8EE" },
  { icon: CalendarCheck, label: "Book Now", pct: "43.9%", color: "#16A34A", tint: "#E2F6EA" },
  { icon: Compass, label: "Explore Home", pct: "29.3%", color: "#6D4AE0", tint: "#ECE8FB" },
  { icon: Ticket, label: "Offers Page", pct: "18.4%", color: "#16A34A", tint: "#E2F6EA" },
  { icon: Store, label: "View Details", pct: "37.6%", color: "#2563EB", tint: "#E6EDFD" },
  { icon: CalendarCheck, label: "Book Now", pct: "32.1%", color: "#EA580C", tint: "#FEF0E0" },
];

const areas = [
  { name: "Anna Nagar", pct: "18.4%" },
  { name: "Velachery", pct: "14.8%" },
  { name: "T. Nagar", pct: "12.6%" },
  { name: "Porur", pct: "9.8%" },
  { name: "Adyar", pct: "8.2%" },
  { name: "Others", pct: "36.2%" },
];

const feed = [
  { icon: UserPlus, color: "#EA580C", tint: "#FFEDD5", title: "New user signed up", sub: "Priya S – Chennai", ago: "2m ago" },
  { icon: ShoppingCart, color: "#E11D48", tint: "#FFE4E6", title: "Added to cart", sub: "Haircut – ₹49 | Velachery", ago: "4m ago" },
  { icon: CalendarCheck, color: "#16A34A", tint: "#DCFCE7", title: "Booking completed", sub: "Facial – ₹899 | T. Nagar", ago: "6m ago" },
  { icon: Star, color: "#D97706", tint: "#FEF3C7", title: "5-star review", sub: "Looks & Style Salon | Adyar", ago: "8m ago" },
];

const recommendations = [
  { icon: ArrowUpRight, color: "#16A34A", text: "Instagram brings 24.7% of new users with 18% higher booking rate." },
  { icon: AlarmClock, color: "#16A34A", text: "Promote 6–9 PM slots – 28% of daily activity happens here." },
  { icon: ShoppingCart, color: "#E11D48", text: "43.9% drop-off at Details → Add to Cart. Highlight offers & trust badges." },
  { icon: Star, color: "#D97706", text: "Loyal users have 3.2x higher LTV. Launch loyalty rewards." },
  { icon: Bell, color: "#E11D48", text: "Re-engage 42,180 inactive users (30+ days) with a ₹49 comeback offer." },
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const PLATFORMS = [{ value: "all", label: "Platforms" }, "Android", "iOS", "Web"];
const CITIES = ["Chennai", "All Cities"];

const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

// "3. Screen Time & Feature Usage" and "13. User Flow Insights (Top Paths)".
const Title = ({ index, children, aside }) => (
  <>
    {index}. {children}
    {aside && <span className={`ml-1 font-medium text-slate-500 ${T.micro}`}>{aside}</span>}
  </>
);

const Select = ({ size = T.nano, ...props }) => (
  <BaseSelect size={size} className="w-[104px] [&_select]:py-1" {...props} />
);

const Segmented = (props) => <BaseSegmented size={T.nano} color={BRAND} padding="px-2.5 py-1" {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.xs, value: T.kpi, delta: T.xs, caption: T.xs }}
    iconClass="h-[36px] w-[36px] rounded-full"
    iconSize={17}
    sparkHeight={38}
    caption={COMPARE}
    up
    className="px-3.5 pb-2 pt-3.5"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    inner="62%"
    centerSize={T.donut}
    captionSize={T.micro}
    formatter={(value) => num(value)}
    {...props}
  />
);

const HeatGrid = (props) => (
  <BaseHeatGrid
    labelSize={T.nano}
    labelWidth={26}
    cellHeight={16}
    gap="3px 2px"
    radius={2}
    {...props}
  />
);

const IconCircle = ({ icon, color, tint, size = 24, iconSize = 12 }) => {
  const Icon = icon;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: tint, color }}
    >
      <Icon size={iconSize} />
    </span>
  );
};

const ViewAll = ({ children = "View All" }) => (
  <button type="button" className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
    {children}
  </button>
);

// Legend row: dot, name, then "pct (count)".
const SegmentLegend = ({ data }) => (
  <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
    {data.map((row) => (
      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
        <span className="shrink-0 whitespace-nowrap text-slate-700">
          {row.pct} <span className="text-slate-500">({num(row.value)})</span>
        </span>
      </li>
    ))}
  </ul>
);

// Small channel badge: a coloured disc with a glyph or letter.
const CHANNEL_BADGES = {
  google: { content: "G", bg: "#fff", color: "#4285F4", ring: "#DADCE0" },
  instagram: { icon: Instagram, bg: "linear-gradient(135deg,#F9A03F,#E1306C,#833AB4)", color: "#fff" },
  facebook: { icon: Facebook, bg: "#1877F2", color: "#fff" },
  organic: { icon: Leaf, bg: "#22C55E", color: "#fff" },
  direct: { icon: Link, bg: "#7C5CF0", color: "#fff" },
  referral: { icon: Share2, bg: "#F0507A", color: "#fff" },
};
const ChannelBadge = ({ kind }) => {
  const badge = CHANNEL_BADGES[kind];
  const Icon = badge.icon;
  return (
    <span
      className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full text-[9px] font-bold"
      style={{
        background: badge.bg,
        color: badge.color,
        boxShadow: badge.ring ? `inset 0 0 0 1px ${badge.ring}` : undefined,
      }}
    >
      {Icon ? <Icon size={9} /> : badge.content}
    </span>
  );
};

// Heat blob for the tap-map phone; `x`/`y` are % of the screen.
const TapBlob = ({ x, y, size, green = false }) => (
  <span
    className="pointer-events-none absolute rounded-full"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      transform: "translate(-50%, -50%)",
      background: green
        ? "radial-gradient(circle, rgba(34,197,94,0.9) 0%, rgba(34,197,94,0.45) 40%, rgba(34,197,94,0) 72%)"
        : "radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(249,115,22,0.85) 28%, rgba(250,204,21,0.65) 52%, rgba(132,204,22,0.3) 74%, rgba(132,204,22,0) 100%)",
    }}
  />
);

const exportFunnel = () =>
  downloadCsv(
    "user-journey-funnel.csv",
    ["Step", "Users", "% of App Open"],
    funnel.map((row) => [row.label, row.count.replace(/,/g, ""), row.pct])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, platform, setPlatform, city, setCity }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Understand Users. Drive Bookings. Grow Faster.
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <LiveStamp updated="10:31 AM" className="hidden 2xl:flex" />
        <HeaderSelect
          icon={CalendarDays}
          label="Date range"
          value={range}
          onChange={setRange}
          options={DATE_RANGES}
          className="hidden lg:flex"
        />
        <HeaderSelect
          icon={MonitorSmartphone}
          label="Platform"
          value={platform}
          onChange={setPlatform}
          options={PLATFORMS}
          className="hidden xl:flex"
        />
        <HeaderSelect
          icon={MapPin}
          label="City"
          value={city}
          onChange={setCity}
          options={CITIES}
          className="hidden xl:flex"
        />
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={exportFunnel}>
          <span className="hidden md:inline">Export Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UserAnalytics360V2 = ({ title = "User Analytics 360°" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [platform, setPlatform] = useState("all");
  const [city, setCity] = useState(CITIES[0]);
  const [heatTab, setHeatTab] = useState("opens");
  const [screenTab, setScreenTab] = useState("duration");
  const [cohortMode, setCohortMode] = useState(COHORT_MODES[0]);
  const [searchTab, setSearchTab] = useState("services");
  const [feedLive, setFeedLive] = useState(true);

  const screens = screenTime[screenTab];

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        setRange={setRange}
        platform={platform}
        setPlatform={setPlatform}
        city={city}
        setCity={setCity}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${KPI_COLS} ${GAP}`}>
          {kpis.map(({ icon, color, tint, line, trend: series, ...kpi }) => (
            <KpiTile
              key={kpi.label}
              {...kpi}
              icon={icon}
              iconColor={color}
              iconTint={tint}
              spark={series}
              sparkColor={line}
              sparkId={`ua360-kpi-${kpi.label.replace(/\W/g, "")}`}
            />
          ))}

          <KpiTile
            label="DAU / MAU"
            value="28,450 / 1,36,729"
            icon={Users}
            iconColor="#2563EB"
            iconTint="#DBEAFE"
            sizes={{ label: T.xs, value: "text-[15px]", delta: T.xs, caption: T.xs }}
            caption={
              <span className="flex items-center gap-1.5">
                <b className="font-bold text-slate-800">20.8%</b>
                <Delta value="2.6%" up size={T.xs} iconSize={10} />
              </span>
            }
            footer={
              <div className="mt-auto h-[38px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DAU_BARS} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
                    <Bar dataKey="v" fill={BRAND} radius={[1, 1, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            }
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Funnel / activity heatmap / screen time                  */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={<Title index={1}>User Journey Funnel</Title>}
              subtitle="From app open to completed booking"
            />
            <div className="mt-3 flex flex-1 gap-4">
              <ul className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                {funnel.map((row) => {
                  const inside = row.width > 55;
                  return (
                    <li key={row.label} className="relative h-[26px]">
                      <span
                        className={`absolute left-0 top-0 flex h-full items-center rounded-md px-2.5 font-semibold text-white ${T.xs}`}
                        style={{ width: `${row.width}%`, background: row.color }}
                      >
                        <span className="leading-tight">{row.label}</span>
                      </span>
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-semibold ${T.xs} ${
                          inside ? "text-white" : "text-slate-800"
                        }`}
                        style={{ left: inside ? `${row.width * 0.5}%` : `${row.width + 3}%` }}
                      >
                        {row.count}
                      </span>
                      <span
                        className={`absolute right-0 top-1/2 -translate-y-1/2 pr-2 ${T.xs} ${
                          row.width > 90 ? "font-semibold text-white" : "pr-0 text-slate-600"
                        }`}
                      >
                        {row.pct}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="flex w-[148px] shrink-0 flex-col">
                <p className={`text-center leading-tight text-slate-700 ${T.xs}`}>
                  Overall
                  <br />
                  Conversion Rate
                </p>
                <div className="relative mx-auto mt-2 h-[74px] w-[74px]">
                  <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
                    <defs>
                      <linearGradient id="ua360-ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={BRAND} />
                        <stop offset="100%" stopColor={GREEN} />
                      </linearGradient>
                    </defs>
                    <g transform="rotate(-100 40 40)">
                      <circle cx="40" cy="40" r="33" fill="none" stroke="#EEF0F6" strokeWidth="7" />
                      <circle
                        cx="40"
                        cy="40"
                        r="33"
                        fill="none"
                        stroke="url(#ua360-ring)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray="168 207"
                      />
                    </g>
                  </svg>
                  <span className="absolute inset-0 grid place-items-center text-[14px] font-extrabold text-slate-900">
                    7.6%
                  </span>
                </div>
                <p className={`mt-1 text-center ${T.xs}`}>
                  <Delta value="1.1%" up size={T.xs} iconSize={10} />
                </p>
                <p className={`text-center text-slate-400 ${T.nano}`}>{COMPARE}</p>

                <div className="mt-auto rounded-lg border border-rose-100 bg-rose-50/40 px-2.5 py-2">
                  <p className={`font-bold ${T.xs}`} style={{ color: RED }}>
                    Biggest Drop-off
                  </p>
                  <p className={`mt-1 text-slate-700 ${T.xs}`}>Details → Add to Cart</p>
                  <p className="mt-0.5 text-[16px] font-extrabold tracking-tight text-slate-900">43.9%</p>
                  <button
                    type="button"
                    className={`mt-1 flex items-center gap-1 font-semibold hover:underline ${T.nano}`}
                    style={{ color: BRAND }}
                  >
                    View Drop-off Analysis
                    <ArrowRight size={9} />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={2}>User Activity Heatmap</Title>}
              subtitle="When users are most active"
            />
            <div className="mt-2.5">
              <Segmented value={heatTab} onChange={setHeatTab} options={HEAT_TABS} className="w-fit" />
            </div>

            <div className="mt-3 flex flex-1 gap-4">
              <div className="flex min-w-0 flex-1 flex-col">
                <HeatGrid
                  values={heat[heatTab]}
                  ramp={HEAT_RAMP}
                  rowLabels={WEEKDAYS}
                  colLabels={HOUR_LABELS}
                  title={(r, c) =>
                    `${WEEKDAYS[r]} ${String(c).padStart(2, "0")}:00 · ${Math.round(heat[heatTab][r][c] * 100)}% of peak`
                  }
                />
                <div className="mt-auto pt-2.5">
                  <RampLegend ramp={HEAT_RAMP} from="Less Active" to="More Active" size={T.nano} width={210} />
                </div>
              </div>

              <div className="flex w-[152px] shrink-0 flex-col justify-between gap-2.5">
                {[
                  { icon: Clock, color: VIOLET, tint: "#EEEAFD", label: "Peak Time", value: "7 PM – 9 PM", caption: "28% of daily activity" },
                  { icon: CalendarDays, color: "#E11D48", tint: "#FFE4E6", label: "Peak Day", value: "Saturday", caption: "19% higher activity" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-1 items-center gap-2.5 rounded-lg border border-[#EEF0F6] px-2.5 py-2"
                  >
                    <IconCircle icon={stat.icon} color={stat.color} tint={stat.tint} size={26} iconSize={13} />
                    <div className="min-w-0 leading-tight">
                      <p className={`text-slate-500 ${T.nano}`}>{stat.label}</p>
                      <p className="mt-0.5 text-[12px] font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                      <p className={`mt-0.5 text-slate-500 ${T.nano}`}>{stat.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={3}>Screen Time &amp; Feature Usage</Title>} />
            <div className="mt-2.5 flex w-fit items-center gap-0.5 rounded-lg bg-[#F1F3F9] p-[3px]">
              {SCREEN_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setScreenTab(tab.value)}
                  aria-pressed={screenTab === tab.value}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${T.nano} ${
                    screenTab === tab.value ? "bg-white text-[#4F46E5] shadow-sm" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-1 gap-3">
              <div className="w-[196px] shrink-0">
                <p className="flex items-baseline gap-2">
                  <span className="text-[20px] font-extrabold tracking-tight text-slate-900">
                    {screens.headline}
                  </span>
                  <Delta value={screens.delta} up size={T.xs} iconSize={10} />
                  <span className={`text-slate-400 ${T.nano}`}>{COMPARE}</span>
                </p>
                <ul className="mt-2.5 flex flex-col gap-[11px]">
                  {screens.rows.map((row, i) => {
                    const Icon = row.icon;
                    return (
                      <li key={row.label} className={`flex items-center gap-2.5 ${T.sm}`}>
                        <Icon size={13} style={{ color: SCREEN_ICON_COLORS[i] }} className="shrink-0" />
                        <span className="min-w-0 flex-1 text-slate-700">{row.label}</span>
                        <span className="shrink-0 font-semibold text-slate-800">{row.value}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="relative min-w-0 flex-1">
                <span className="absolute -top-1 right-0 z-10 rounded-md bg-[#1E293B] px-2 py-1 leading-tight text-white shadow-md">
                  <span className={`block font-bold ${T.xs}`}>Most taps</span>
                  <span className={`block text-slate-300 ${T.nano}`}>Search &amp; Details</span>
                </span>
                <div className="mx-auto mt-6 h-[184px] w-[96px] rounded-[16px] bg-[#15151c] p-[3px] shadow-[0_6px_14px_rgba(15,23,42,0.2)]">
                  <div className="relative h-full w-full overflow-hidden rounded-[13px] bg-white">
                    <span className="absolute left-1/2 top-[3px] z-10 h-[4px] w-[26px] -translate-x-1/2 rounded-full bg-[#15151c]" />
                    <span className="absolute left-2 right-2 top-[18px] h-[10px] rounded bg-slate-100" />
                    <span className="absolute left-2 right-8 top-[36px] h-[6px] rounded bg-slate-100" />
                    <span className="absolute left-2 right-2 top-[52px] h-[52px] rounded bg-slate-100/80" />
                    <span className="absolute left-2 right-2 top-[112px] h-[8px] rounded bg-slate-100" />
                    <TapBlob x={24} y={30} size={20} green />
                    <TapBlob x={60} y={33} size={40} />
                    <TapBlob x={64} y={48} size={30} />
                    <TapBlob x={40} y={70} size={18} green />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Channels / segmentation / cohorts / behaviour / uninstall */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={4}>User Acquisition Channels</Title>} />
            <div className="mt-2 flex items-center gap-4">
              <LegendDot line color={VIOLET} label="New Users" size={T.nano} />
              <LegendDot line color={BLUE} label="Active Users" size={T.nano} />
            </div>
            <ul className="mt-2 flex flex-1 flex-col justify-around gap-1.5">
              {channels.map((row) => (
                <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                  <ChannelBadge kind={row.kind} />
                  <span className="w-[56px] shrink-0 whitespace-nowrap text-slate-700">{row.name}</span>
                  <span className="min-w-0 flex-1">
                    <Meter
                      pct={(row.pct / channels[0].pct) * 100}
                      height={4}
                      track="transparent"
                      color="linear-gradient(90deg,#8B74F5,#5B3FF0)"
                    />
                  </span>
                  <span className="w-[32px] shrink-0 text-right font-semibold text-slate-700">{row.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={5}>User Segmentation</Title>} />
            <div className="mt-2 flex flex-1 items-center gap-4">
              <Donut data={segments} size={132} inner="64%" center="1,36,799" caption="Total Users" />
              <SegmentLegend data={segments} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={6}>Cohort Retention</Title>}
              right={<Select
                  value={cohortMode}
                  onChange={setCohortMode}
                  options={COHORT_MODES}
                  className="w-[124px] [&_select]:py-1"
                />}
            />
            <table className="mt-3 w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "27%" }} />
                {COHORT_COLS.map((col) => (
                  <col key={col} style={{ width: "14.6%" }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Week</th>
                  {COHORT_COLS.map((col) => (
                    <th key={col} className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((row) => (
                  <tr key={row.week} className="h-[25px]">
                    <td className={`whitespace-nowrap text-slate-700 ${T.nano}`}>{row.week}</td>
                    {row.values.map((value, i) => (
                      <td key={COHORT_COLS[i]} className={`text-center text-slate-700 ${T.nano}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={7}>Booking Behavior</Title>} />
            <ul className="mt-2 flex flex-1 flex-col justify-around gap-1.5">
              {[
                { icon: Users, color: VIOLET, tint: "#EEEAFD", label: "Avg. Bookings per User", value: "1.8", delta: "8.5%", up: true },
                { icon: Timer, color: "#E11D48", tint: "#FFE4E6", label: "Avg. Days Between Bookings", value: "18 Days", delta: "3.4%", up: false },
                { icon: Clock, color: "#2563EB", tint: "#DBEAFE", label: "Preferred Time", value: "6 PM – 9 PM" },
                { icon: Repeat, color: "#EA580C", tint: "#FFEDD5", label: "Repeat Booking Rate", value: "32.6%", delta: "5.1%", up: true },
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-2">
                  <IconCircle icon={row.icon} color={row.color} tint={row.tint} size={24} iconSize={12} />
                  <span className={`min-w-0 flex-1 leading-tight text-slate-600 ${T.nano}`}>{row.label}</span>
                  <span className="shrink-0 text-right leading-tight">
                    <span className={`block font-bold text-slate-900 ${T.sm}`}>{row.value}</span>
                    {row.delta && <Delta value={row.delta} up={row.up} size={T.nano} iconSize={9} />}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={8}>Uninstall Rate</Title>} />
            <div className="mt-2 flex flex-1 items-center gap-4">
              <Donut
                data={uninstall}
                size={124}
                inner="68%"
                center={
                  <span className="flex flex-col items-center gap-0.5">
                    <span>6.23%</span>
                    <span className={`font-normal text-slate-500 ${T.nano}`}>Uninstall Rate</span>
                    <Delta value="0.6%" up good={false} size={T.nano} iconSize={9} />
                  </span>
                }
              />
              <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
                {uninstall.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                    <span className="shrink-0 font-semibold text-slate-700">{row.pct}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Search / cart / new vs returning / LTV                   */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={<Title index={9}>Search &amp; Interest Insights</Title>}
              subtitle="Most searched services & categories"
            />
            <div className="mt-2.5 flex items-center gap-4 border-b border-slate-100">
              {[
                { value: "services", label: "Services" },
                { value: "categories", label: "Categories" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSearchTab(tab.value)}
                  className={`-mb-px border-b-2 pb-1.5 font-semibold ${T.nano} ${
                    searchTab === tab.value ? "text-[#4F46E5]" : "border-transparent text-slate-500"
                  }`}
                  style={searchTab === tab.value ? { borderColor: BRAND } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
              {searches[searchTab].map((row) => (
                <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                  <span className="shrink-0 text-right font-medium text-slate-800">{row.count}</span>
                  <span className="flex w-[34px] shrink-0 items-center justify-end gap-0.5 font-semibold text-emerald-500">
                    ↑ {row.up}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex justify-center">
              <ViewAll>View All →</ViewAll>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={10}>Cart &amp; Checkout Abandonment</Title>} />
            <div className="mt-3 flex flex-1 gap-3">
              <ul className="flex min-w-0 flex-1 flex-col justify-around gap-1.5">
                {cart.map((row, i) => (
                  <li key={row.label} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="w-[78px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                    <span className="w-[36px] shrink-0 text-right font-medium text-slate-800">{row.count}</span>
                    <span className="min-w-0 flex-1">
                      <Meter
                        pct={row.width}
                        height={11}
                        track="transparent"
                        color={`linear-gradient(90deg,#B7A6F8,rgba(91,63,240,${(1 - i * 0.12).toFixed(2)}))`}
                        className="rounded-[3px] [&>span]:rounded-[3px]"
                      />
                    </span>
                    <span className="w-[34px] shrink-0 text-right text-slate-600">{row.pct}</span>
                  </li>
                ))}
              </ul>

              <div className="w-[132px] shrink-0 rounded-lg bg-[#F7F8FC] px-2.5 py-2">
                <p className={`font-bold text-slate-800 ${T.nano}`}>Top Reasons</p>
                <ul className="mt-1.5 flex flex-col gap-[7px]">
                  {cartReasons.map((row) => {
                    const Icon = row.icon;
                    return (
                      <li key={row.label} className={`flex items-center gap-1.5 ${T.nano}`}>
                        <span
                          className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded"
                          style={{ background: `${row.color}1F`, color: row.color }}
                        >
                          <Icon size={9} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-slate-700">{row.label}</span>
                        <span className="shrink-0 font-semibold text-slate-800">{row.pct}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={11}>New vs Returning Users</Title>} />
            <div className="mt-2 flex items-center gap-4">
              <LegendDot line color={VIOLET} label="New Users" size={T.nano} />
              <LegendDot line color={GREEN} label="Returning Users" size={T.nano} />
            </div>
            <div className="mt-1 min-h-[110px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={returning} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 8.5 }}
                    dy={4}
                    interval={0}
                    padding={{ left: 6, right: 6 }}
                  />
                  <YAxis
                    domain={[0, 40000]}
                    ticks={[0, 10000, 20000, 30000, 40000]}
                    interval={0}
                    tickFormatter={(v) => `${v / 1000}K`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 8.5 }}
                    width={30}
                  />
                  <Tooltip {...TOOLTIP} formatter={(v) => num(v)} />
                  <Line type="monotone" dataKey="fresh" name="New Users" stroke={VIOLET} strokeWidth={1.8} dot={{ r: 2.4, fill: VIOLET, strokeWidth: 0 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="back" name="Returning Users" stroke={GREEN} strokeWidth={1.8} dot={{ r: 2.4, fill: GREEN, strokeWidth: 0 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={12}>LTV &amp; Revenue per User</Title>} />
            <div className="mt-2 flex flex-1 gap-3">
              <div className="min-w-0 flex-1">
                <p className={`text-slate-500 ${T.nano}`}>Avg. LTV (All Users)</p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[18px] font-extrabold tracking-tight text-slate-900">₹1,245</span>
                  <Delta value="11.2%" up size={T.xs} iconSize={10} />
                </p>
                <p className={`mt-2 font-medium text-slate-600 ${T.nano}`}>Segment</p>
                <ul className="mt-1.5 flex flex-col gap-[7px]">
                  {ltvSegments.map((row) => (
                    <li key={row.name} className={`flex items-center gap-2 ${T.nano}`}>
                      <span className="w-[64px] shrink-0 whitespace-nowrap text-slate-600">{row.name}</span>
                      <span className="min-w-0 flex-1">
                        <Meter
                          pct={row.width}
                          height={4}
                          track="transparent"
                          color="linear-gradient(90deg,#8B74F5,#5B3FF0)"
                        />
                      </span>
                      <span className="w-[34px] shrink-0 text-right font-semibold text-slate-800">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="w-[130px] shrink-0 rounded-lg border border-[#EEF0F6] px-2.5 py-2">
                <p className={`font-semibold text-slate-700 ${T.nano}`}>LTV Share</p>
                <div className="mt-1 flex justify-center">
                  <Donut data={ltvShare} size={74} inner="76%" />
                </div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {ltvShare.map((row) => (
                    <li key={row.name} className={`flex items-center gap-1.5 ${T.nano}`}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-600">{row.name}</span>
                      <span className="shrink-0 font-semibold text-slate-800">{row.pct}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Flows / geography / live feed / AI insights              */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={13} aside="(Top Paths)">User Flow Insights</Title>} />
            <div className="mt-3 grid flex-1 grid-cols-4 gap-2">
              {paths.map((path, i) => (
                <div
                  key={`${path.label}-${i}`}
                  className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: path.tint }}
                >
                  <IconCircle icon={path.icon} color={path.color} tint="#fff" size={22} iconSize={11} />
                  <span className="min-w-0 leading-tight">
                    <span className={`block truncate text-slate-600 ${T.nano}`}>{path.label}</span>
                    <span className={`block font-bold text-slate-900 ${T.xs}`}>{path.pct}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={14}>Geographic Insights</Title>} />
            <div className="mt-2.5 flex flex-1 gap-3">
              {/* Static stand-in for the map thumbnail: soft heat on a pale base. */}
              <div
                className="relative w-[118px] shrink-0 overflow-hidden rounded-lg"
                style={{ background: "linear-gradient(135deg,#E7EDF5,#F1EFE8)" }}
              >
                {[
                  [38, 34, 46],
                  [58, 50, 36],
                  [46, 66, 40],
                  [28, 56, 28],
                  [66, 28, 26],
                ].map(([x, y, size]) => (
                  <span
                    key={`${x}-${y}`}
                    className="absolute rounded-full"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: size,
                      height: size,
                      transform: "translate(-50%,-50%)",
                      background:
                        "radial-gradient(circle, rgba(109,74,224,0.85) 0%, rgba(109,74,224,0.35) 45%, rgba(109,74,224,0) 72%)",
                    }}
                  />
                ))}
                <span className={`absolute inset-x-0 bottom-3 text-center font-bold text-slate-700 ${T.xs}`}>
                  Chennai
                </span>
              </div>

              <ul className="flex min-w-0 flex-1 flex-col justify-around gap-1">
                {areas.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                    <span className="shrink-0 font-semibold text-slate-800">{row.pct}</span>
                    <span className="shrink-0 text-emerald-500">↑</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={15}>Real-time Activity Feed</Title>}
              right={
                <button
                  type="button"
                  role="switch"
                  aria-checked={feedLive}
                  aria-label="Live feed"
                  onClick={() => setFeedLive((on) => !on)}
                  className={`flex items-center gap-1 rounded-full py-0.5 pl-2 pr-0.5 font-semibold text-white transition-colors ${T.nano} ${
                    feedLive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  {feedLive ? "Live" : "Paused"}
                  <span className="h-3.5 w-3.5 rounded-full bg-white" />
                </button>
              }
            />
            <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
              {feed.map((item) => (
                <li key={item.title} className="flex items-center gap-2">
                  <IconCircle icon={item.icon} color={item.color} tint={item.tint} size={22} iconSize={11} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className={`block truncate font-semibold text-slate-800 ${T.nano}`}>{item.title}</span>
                    <span className={`block truncate text-slate-500 ${T.nano}`}>{item.sub}</span>
                  </span>
                  <span className={`shrink-0 text-slate-400 ${T.nano}`}>{item.ago}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={16}>AI Insights &amp; Recommendations</Title>} right={<ViewAll />} />
            <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
              {recommendations.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-2.5">
                    <span
                      className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border"
                      style={{ borderColor: `${item.color}66`, color: item.color }}
                    >
                      <Icon size={9} />
                    </span>
                    <span className={`min-w-0 text-slate-700 ${T.nano}`}>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default UserAnalytics360V2;
