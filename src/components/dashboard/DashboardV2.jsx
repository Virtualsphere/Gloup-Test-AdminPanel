import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  CircleCheck,
  CircleChevronDown,
  Clock,
  Crown,
  Gift,
  Handshake,
  Info,
  MapPin,
  Megaphone,
  Scissors,
  ShoppingCart,
  Store,
  Target,
  TriangleAlert,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  Card,
  Delta,
  HeaderBell,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  LegendDot as BaseLegendDot,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved executive "Dashboard" mockup (Real-time
// overview of GloUp platform performance), on a fixed DESIGN_WIDTH canvas that
// ScaledCanvas scales to the available width (see there for why bigger px
// sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup's
// tables (the charts are drawn from the same figures, so the bars, the
// scorecard and the month-on-month tables agree), and the period, refresh and
// date pickers hold local state only. The live dashboard payload
// (dashboardSlice getDashboard, rendered by DashboardPage.jsx) carries none of
// the marketing spend, Meta reach or alert data yet.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const PINK = "#EC4899";
const AMBER = "#F5A623";
const ORANGE = "#E08700";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[454fr_418fr_444fr]";
const ROW3_COLS = "grid-cols-[508fr_363fr_444fr]";
const ROW4_COLS = "grid-cols-[527fr_500fr_287fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1340px of content, so measured sizes carry over at ~1.13x.
const T = {
  nano: "text-[9.5px]", // uppercase column headers
  xs: "text-[10.5px]", // table cells, legends, captions
  sm: "text-[11px]", // labels, body
  base: "text-[12px]", // stat labels, links
  md: "text-[13px]", // card titles
  kpi: "text-[21px]", // KPI values
  stat: "text-[19px]", // in-card stat values
};

const GAP = "gap-3";
const PAD = "p-3";

// ---------------------------------------------------------------------------
// Static demo data - UI only for now, wire up to the backend later.
// ---------------------------------------------------------------------------

const COMPARE_LABEL = "vs Jul 2026";

const kpis = [
  { label: "Total Bookings", value: "954", delta: "81.7%", up: true, icon: CalendarDays, tint: "#EDE7FF", color: BRAND },
  { label: "Total Revenue (GMV)", value: "₹1,06,117.50", delta: "78.0%", up: true, icon: BadgeIndianRupee, tint: "#E1F7EC", color: GREEN },
  { label: "Total Users", value: "25.7K", delta: "60.6%", up: true, icon: Users, tint: "#FFF2DC", color: ORANGE },
  { label: "Total Partners", value: "212", delta: "14.9%", up: false, icon: Store, tint: "#E6EFFF", color: BLUE },
  { label: "Total Subscriptions", value: "23", delta: "130.0%", up: true, icon: Crown, tint: "#FDE6F0", color: PINK },
  // The rate fell, which is good news: the arrow points down, drawn green.
  { label: "Cancellation Rate", value: "2.73%", delta: "31.9%", up: false, good: true, icon: CircleChevronDown, tint: "#DCF3F0", color: "#0E9384" },
];

const scorecard = [
  { metric: "Bookings Growth", icon: CalendarCheck, color: "#4F6BED", value: "954", delta: "81.7%", up: true, status: "GOOD", logic: "Beyond the ±10% band" },
  { metric: "Revenue Growth", icon: ChartColumn, color: BLUE, value: "₹1,06,117.50", delta: "78.0%", up: true, status: "GOOD", logic: "Beyond the ±10% band" },
  { metric: "CAC Efficiency (per booking)", icon: CircleCheck, color: GREEN, value: "₹58.75", delta: "21.7%", up: true, status: "GOOD", logic: "Beyond the ±5% band" },
  { metric: "Cancellation Rate", icon: CircleCheck, color: GREEN, value: "2.73%", delta: "31.9%", up: false, good: true, status: "GOOD", logic: "Beyond the ±5% band" },
  { metric: "User Growth", icon: UserRound, color: BLUE, value: "25.7K", delta: "60.6%", up: true, status: "GOOD", logic: "Beyond the ±10% band" },
  { metric: "Partner Growth", icon: Handshake, color: ORANGE, value: "212", delta: "14.9%", up: false, status: "NEEDS ATTENTION", logic: "Beyond the −2% band" },
  { metric: "Subscription Growth", icon: Gift, color: RED, value: "23", delta: "130.0%", up: true, status: "GOOD", logic: "Beyond the ±10% band" },
];

// Column widths (%) of the scorecard table, as measured.
const SCORECARD_COLS = [28, 13, 17, 18, 24];

const bookingsRevenue = [
  { month: "June", bookings: 235, revenue: 23437.58 },
  { month: "July", bookings: 525, revenue: 59600.77 },
  { month: "August", bookings: 954, revenue: 106117.5 },
];

const marketingSpend = [
  { month: "June", meta: 17500, other: 4500, organic: 3000 },
  { month: "July", meta: 27500, other: 7875, organic: 4000 },
  { month: "August", meta: 39232, other: 10800, organic: 6014 },
];

const marketingKpis = [
  { label: "Marketing Spend", value: "₹56,045.95", delta: "42.3%", up: true, icon: Megaphone, color: BRAND, tint: "#EDE7FF" },
  { label: "CAC (Overall)", value: "₹58.75", delta: "21.7%", up: true, icon: UserCheck, color: GREEN, tint: "#E1F7EC" },
  { label: "Meta Reach", value: "10.8K", delta: "5.4%", up: false, icon: Target, color: ORANGE, tint: "#FFF2DC" },
];

const userGrowth = [
  { month: "Jun", value: 8000 },
  { month: "Jul", value: 16000 },
  { month: "Aug", value: 25700 },
];

const partnerGrowth = [
  { month: "Jun", value: 233 },
  { month: "Jul", value: 249 },
  { month: "Aug", value: 212 },
];

const subscriptionGrowth = [
  { month: "Jun", value: 4 },
  { month: "Jul", value: 10 },
  { month: "Aug", value: 23 },
];

// Rate = cancellations / bookings of the month (6/235, 21/525, 26/954).
const cancellations = [
  { month: "June", count: 6, rate: 2.55 },
  { month: "July", count: 21, rate: 4.0 },
  { month: "August", count: 26, rate: 2.73 },
];

const metaReach = [
  { month: "July", reach: 11420 },
  { month: "August", reach: 10800 },
];

const juneToJuly = [
  { metric: "Bookings", a: "235", b: "525", change: "+290", pct: "123.4%", up: true },
  { metric: "Revenue", a: "₹23,437.58", b: "₹59,600.77", change: "+₹36,163.19", pct: "154.3%", up: true },
  { metric: "CAC Spend", a: "₹25,000.00", b: "₹39,375.00", change: "+₹14,375.00", pct: "57.5%", up: true },
  { metric: "Cancellations", a: "6", b: "21", change: "+15", pct: "250.0%", up: true },
  { metric: "Users", a: "8.0K", b: "16.0K", change: "+8.0K", pct: "100.0%", up: true },
  { metric: "Partners", a: "233", b: "249", change: "+16", pct: "6.9%", up: true },
  { metric: "Subscriptions", a: "N/A", b: "10", change: null, pct: null },
];

const julyToAugust = [
  { metric: "Bookings", a: "525", b: "954", change: "+429", pct: "81.7%", up: true },
  { metric: "Revenue", a: "₹59,600.77", b: "₹1,06,117.50", change: "+₹46,516.73", pct: "78.0%", up: true },
  { metric: "CAC Spend", a: "₹39,375.00", b: "₹56,045.95", change: "+₹16,670.95", pct: "42.3%", up: true },
  { metric: "Cancellations", a: "21", b: "26", change: "+5", pct: "23.8%", up: true },
  { metric: "Users", a: "16.0K", b: "25.7K", change: "+9.7K", pct: "60.6%", up: true },
  { metric: "Partners", a: "249", b: "212", change: "-37", pct: "-14.9%", up: false },
  { metric: "Subscriptions", a: "10", b: "23", change: "+13", pct: "130.0%", up: true },
];

// Each alert is drawn in its own tone: tinted row, tinted border, coloured
// title and link.
const alerts = [
  { icon: TriangleAlert, color: "#D92D20", bg: "#FFF1F0", border: "#FAD5D1", title: "3 Salons have zero bookings", sub: "for 7 days", action: "View Partners" },
  { icon: Clock, color: "#E8830A", bg: "#FFF6EA", border: "#FBDDB6", title: "₹1,23,450 overdue payout", sub: "to 3 partners", action: "View Payouts" },
  { icon: ShoppingCart, color: "#C98A00", bg: "#FFFAE8", border: "#F6E4A4", title: "42 users dropped off at checkout", sub: "today", action: "View Report" },
  { icon: MapPin, color: "#2563EB", bg: "#EEF4FF", border: "#CFE0FD", title: "Perungudi demand is 31% higher", sub: "than availability", action: "View Details" },
  { icon: Scissors, color: "#12A06A", bg: "#EDFAF3", border: "#C6EBD9", title: "Haircut ₹99 converting 2.4x", sub: "better than ₹149", action: "View Report" },
];

const PERIODS = ["This Month", "Last Month", "This Week", "Last 90 Days", "This Year"];
const CARD_PERIODS = ["This Month", "Last Month", "Last 6 Months"];
const REFRESH_INTERVALS = ["15 sec", "30 sec", "1 min", "5 min"];

const inr = (v) => `₹${Number(v).toLocaleString("en-IN")}`;
const thousands = (v) => (v === 0 ? "0" : `${Math.round(v / 1000)}K`);
// 125000 -> "₹1,25L", 75000 -> "₹75K": the Indian lakh the mockup's axis uses.
const lakh = (v) => {
  if (v === 0) return "₹0";
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(".", ",")}L`;
  return `₹${v / 1000}K`;
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardTitle = ({ children, right }) => (
  <div className="mb-2 flex min-h-[22px] items-start justify-between gap-3">
    <h2 className={`font-extrabold uppercase tracking-wide text-slate-900 ${T.md}`}>{children}</h2>
    {right}
  </div>
);

const ViewLink = ({ children }) => (
  <button
    type="button"
    className={`mt-auto flex w-full items-center justify-center gap-1.5 pt-2 font-semibold hover:underline ${T.base}`}
    style={{ color: BRAND }}
  >
    {children}
    <ArrowRight size={13} className="shrink-0" />
  </button>
);

const Select = (props) => (
  <BaseSelect size={T.xs} className="w-[104px] [&_select]:py-1" {...props} />
);

const LegendDot = (props) => <BaseLegendDot size={T.xs} {...props} />;

// Dashboard KPI tile: the delta sits on one line with its comparison caption.
const KpiTile = ({ delta, up, good, ...props }) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.xs, caption: T.xs }}
    iconClass="h-[52px] w-[52px] rounded-xl"
    iconSize={24}
    className="px-4 py-3.5"
    caption={
      <span className="inline-flex items-center gap-1.5">
        <Delta value={delta} up={up} good={good} size={T.xs} iconSize={11} />
        <span className="text-slate-500">{COMPARE_LABEL}</span>
      </span>
    }
    {...props}
  />
);

// Tinted, bordered mini stat under the bookings / cancellation / meta charts.
const StatBox = ({ label, value, delta, up, good, bg, border }) => (
  <div
    className="min-w-0 rounded-xl border px-3.5 py-1.5"
    style={{ background: bg, borderColor: border }}
  >
    <p className={`truncate text-slate-600 ${T.sm}`}>{label}</p>
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <span className="whitespace-nowrap text-[17px] font-extrabold tracking-tight text-slate-900">
        {value}
      </span>
      {delta && <Delta value={delta} up={up} good={good} size={T.sm} />}
    </div>
  </div>
);

const StatusPill = ({ status }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2 py-[3px] text-[8.5px] font-bold ${
      status === "GOOD"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
    }`}
  >
    {status}
  </span>
);

// Shared by the two month-on-month comparison tables.
const ComparisonTable = ({ columns, rows }) => (
  <table className="w-full table-auto border-collapse text-left">
    <thead>
      <tr className="border-b border-slate-200">
        {columns.map((col, i) => (
          <th
            key={col}
            className={`pb-2 pr-2 font-bold uppercase tracking-wide text-slate-400 ${T.nano} ${
              i ? "text-right" : ""
            }`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.metric}>
          <td className={`whitespace-nowrap py-[5px] pr-2 font-medium text-slate-700 ${T.xs}`}>
            {row.metric}
          </td>
          <td className={`whitespace-nowrap py-[5px] pr-2 text-right text-slate-600 ${T.xs}`}>{row.a}</td>
          <td className={`whitespace-nowrap py-[5px] pr-2 text-right text-slate-600 ${T.xs}`}>{row.b}</td>
          <td
            className={`whitespace-nowrap py-[5px] pr-2 text-right font-semibold ${T.xs} ${
              !row.change
                ? "text-slate-400"
                : row.change.startsWith("-")
                  ? "text-rose-500"
                  : "text-emerald-600"
            }`}
          >
            {row.change || "N/A"}
          </td>
          <td className={`whitespace-nowrap py-[5px] text-right ${T.xs}`}>
            {row.pct ? (
              <Delta value={row.pct} up={row.up} size={T.xs} iconSize={11} />
            ) : (
              <span className="text-slate-400">N/A</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// One of the three mini panels inside the growth card.
const GrowthMini = ({ icon, iconColor, title, caption, value, delta, up, tint, border, children }) => {
  const Icon = icon;
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-[#E6E8F0] p-3">
      <p className={`flex items-center gap-1.5 font-bold text-slate-900 ${T.xs}`}>
        <Icon size={13} className="shrink-0" style={{ color: iconColor }} />
        <span className="truncate">{title}</span>
      </p>
      <p className={`mt-0.5 truncate text-slate-500 ${T.xs}`}>{caption}</p>
      {/* The mini panels stretch to the height of the tallest card in the row;
          the chart takes whatever the header and value box leave. */}
      <div className="mt-2 min-h-[120px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      <div
        className="mt-2 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
        style={{ background: tint, borderColor: border }}
      >
        <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{value}</span>
        <Delta value={delta} up={up} size={T.xs} iconSize={11} />
      </div>
    </div>
  );
};

// Axis text for the dashboard's charts.
const AXIS_TEXT = { ...AXIS, fontSize: 10 };

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, period, setPeriod, refreshInterval, setRefreshInterval }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Real-time overview of GloUp platform performance
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 lg:flex"
        >
          1 Aug – 31 Aug 2026
          <CalendarDays size={14} className="shrink-0 text-slate-500" />
        </button>

        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={PERIODS}
          className="hidden lg:flex"
        />

        <div className="hidden items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="leading-tight">
            <p className="whitespace-nowrap text-[11px] font-semibold text-slate-700">Auto refresh</p>
            <div className="relative">
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                aria-label="Auto refresh interval"
                className="cursor-pointer appearance-none bg-transparent pr-3.5 text-[10px] text-slate-500 focus:outline-none"
              >
                {REFRESH_INTERVALS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                size={10}
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-slate-600 hover:text-slate-900 xl:flex"
        >
          <Info size={14} className="shrink-0 text-slate-400" />
          How it works?
        </button>

        <HeaderBell count={12} color={RED} />
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const DashboardV2 = ({ title = "Dashboard" }) => {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [refreshInterval, setRefreshInterval] = useState(REFRESH_INTERVALS[1]);
  const [revenuePeriod, setRevenuePeriod] = useState(CARD_PERIODS[0]);
  const [marketingPeriod, setMarketingPeriod] = useState(CARD_PERIODS[0]);

  return (
    <>
      <PageHeader
        title={title}
        period={period}
        setPeriod={setPeriod}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, ...kpi }) => (
            <KpiTile key={kpi.label} {...kpi} icon={icon} iconColor={color} iconTint={tint} />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Scorecard / Bookings & revenue / Acquisition cost         */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          {/* Performance scorecard */}
          <Card className={PAD}>
            <CardTitle>Performance Scorecard</CardTitle>

            <div className="overflow-hidden rounded-lg border border-[#E6E8F0]">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  {SCORECARD_COLS.map((width, i) => (
                    <col key={i} style={{ width: `${width}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-[#F8F9FC]">
                    {["Metric", "Latest Value", "Change vs Prior Month", "Status", "Logic Applied"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-2 py-1.5 font-semibold uppercase leading-tight text-slate-500 ${T.nano} ${
                          i && i < 4 ? "text-center" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scorecard.map(({ icon, color, ...row }) => {
                    const Icon = icon;
                    return (
                      <tr key={row.metric} className="h-[33px] border-t border-slate-100">
                        <td className={`px-2 ${T.xs}`}>
                          <span className="flex items-center gap-2">
                            <span
                              className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border"
                              style={{ borderColor: `${color}40`, background: `${color}12`, color }}
                            >
                              <Icon size={12} />
                            </span>
                            <span className="font-medium leading-tight text-slate-700">{row.metric}</span>
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-2 text-center text-slate-700 ${T.xs}`}>{row.value}</td>
                        <td className={`whitespace-nowrap px-2 text-center ${T.xs}`}>
                          <Delta value={row.delta} up={row.up} good={row.good} size={T.xs} iconSize={11} />
                        </td>
                        <td className="px-2 text-center">
                          <StatusPill status={row.status} />
                        </td>
                        <td className={`whitespace-nowrap px-2 text-slate-500 ${T.nano}`}>{row.logic}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ViewLink>View Full Performance Report</ViewLink>
          </Card>

          {/* Bookings & revenue performance */}
          <Card className={PAD}>
            <CardTitle
              right={
                <Select value={revenuePeriod} onChange={setRevenuePeriod} options={CARD_PERIODS} />
              }
            >
              Bookings &amp; Revenue Performance
            </CardTitle>

            <div className="flex items-center gap-5">
              <LegendDot square color={BRAND} label="Total Bookings" />
              <LegendDot color={GREEN} label="Total Revenue (₹)" />
            </div>

            <div className="mt-1 h-[172px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={bookingsRevenue} margin={{ top: 10, right: 2, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dash-bookings-bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C5CF5" />
                      <stop offset="100%" stopColor={BRAND} />
                    </linearGradient>
                    <linearGradient id="dash-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TEXT} dy={6} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 1250]}
                    ticks={[0, 250, 500, 750, 1000, 1250]}
                    interval={0}
                    tickFormatter={(v) => v.toLocaleString("en-IN")}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={48}
                    label={{
                      value: "Bookings",
                      angle: -90,
                      position: "insideLeft",
                      offset: 4,
                      style: { fontSize: 10, fill: "#64748B", textAnchor: "middle" },
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 125000]}
                    ticks={[0, 25000, 50000, 75000, 100000, 125000]}
                    interval={0}
                    tickFormatter={lakh}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={50}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(91,33,240,0.05)" }}
                    formatter={(value, name) => (name === "Total Revenue (₹)" ? inr(value) : value)}
                  />
                  <Area
                    yAxisId="right"
                    type="linear"
                    dataKey="revenue"
                    name="Total Revenue (₹)"
                    stroke="none"
                    fill="url(#dash-revenue-fill)"
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    name="Total Bookings"
                    fill="url(#dash-bookings-bar)"
                    radius={[4, 4, 0, 0]}
                    barSize={44}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="revenue"
                    name="Total Revenue (₹)"
                    stroke={GREEN}
                    strokeWidth={2}
                    dot={{ r: 4.5, fill: GREEN, stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={`mt-3 grid grid-cols-2 ${GAP}`}>
              <StatBox label="Total Bookings" value="954" delta="81.7%" up bg="#F7F5FE" border="#E4DEFB" />
              <StatBox label="Total Revenue" value="₹1,06,117.50" delta="78.0%" up bg="#F7F5FE" border="#E4DEFB" />
            </div>

            <ViewLink>View Detailed Analytics</ViewLink>
          </Card>

          {/* Acquisition cost & marketing efficiency */}
          <Card className={PAD}>
            <CardTitle
              right={
                <Select value={marketingPeriod} onChange={setMarketingPeriod} options={CARD_PERIODS} />
              }
            >
              Acquisition Cost &amp; Marketing Efficiency
            </CardTitle>

            <div className="grid grid-cols-3 gap-2">
              {marketingKpis.map(({ icon, color, tint, ...kpi }) => {
                const Icon = icon;
                return (
                  <div
                    key={kpi.label}
                    className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#E6E8F0] px-2.5 py-2"
                  >
                    <span
                      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg"
                      style={{ background: tint, color }}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block truncate text-slate-500 ${T.xs}`}>{kpi.label}</span>
                      <span className="block whitespace-nowrap text-[14px] font-extrabold tracking-tight text-slate-900">
                        {kpi.value}
                      </span>
                      <span className={`block ${T.xs}`}>
                        <Delta value={kpi.delta} up={kpi.up} size={T.xs} iconSize={10} />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <p className={`mt-3 font-bold text-slate-900 ${T.sm}`}>
              Marketing &amp; Acquisition Spend Breakdown (₹)
            </p>

            <div className="mt-1 flex items-center justify-center gap-5">
              <LegendDot square color={BRAND} label="Meta Ads" />
              <LegendDot square color={BLUE} label="Other Ads" />
              <LegendDot square color={GREEN} label="Organic / Others" />
            </div>

            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketingSpend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TEXT} dy={6} />
                  <YAxis
                    domain={[0, 80000]}
                    ticks={[0, 20000, 40000, 60000, 80000]}
                    interval={0}
                    tickFormatter={(v) => (v === 0 ? "₹0" : `₹${v / 1000}K`)}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={42}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(91,33,240,0.05)" }}
                    formatter={(value) => inr(value)}
                  />
                  <Bar dataKey="meta" name="Meta Ads" stackId="spend" fill={BRAND} barSize={60} isAnimationActive={false} />
                  <Bar dataKey="other" name="Other Ads" stackId="spend" fill={BLUE} barSize={60} isAnimationActive={false} />
                  <Bar
                    dataKey="organic"
                    name="Organic / Others"
                    stackId="spend"
                    fill={GREEN}
                    barSize={60}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ViewLink>View Marketing Report</ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Growth / Cancellations / Meta                             */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          {/* Customer, partner & subscription growth */}
          <Card className={PAD}>
            <CardTitle>Customer, Partner &amp; Subscription Growth</CardTitle>

            <div className="grid flex-1 grid-cols-3 gap-2">
              <GrowthMini
                icon={UserRound}
                iconColor={BLUE}
                title="User Growth"
                caption="Total users by month"
                value="25.7K"
                delta="60.6%"
                up
                tint="#F1F6FF"
                border="#D6E5FD"
              >
                <AreaChart data={userGrowth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dash-users-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    dy={4}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    domain={[0, 40000]}
                    ticks={[0, 10000, 20000, 30000, 40000]}
                    interval={0}
                    tickFormatter={thousands}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={30}
                  />
                  <Tooltip {...TOOLTIP} formatter={(v) => Number(v).toLocaleString("en-IN")} />
                  <Area
                    type="linear"
                    dataKey="value"
                    name="Users"
                    stroke={BLUE}
                    strokeWidth={2}
                    fill="url(#dash-users-fill)"
                    dot={{ r: 4, fill: BLUE, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </GrowthMini>

              <GrowthMini
                icon={MapPin}
                iconColor={GREEN}
                title="Partner / Salon Network"
                caption="Total partners by month"
                value="212"
                delta="14.9%"
                up={false}
                tint="#FFF6F5"
                border="#FBDAD6"
              >
                <BarChart data={partnerGrowth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TEXT} dy={4} />
                  <YAxis
                    domain={[0, 400]}
                    ticks={[0, 100, 200, 300, 400]}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={28}
                  />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(240,68,56,0.05)" }} />
                  <Bar
                    dataKey="value"
                    name="Partners"
                    fill={RED}
                    radius={[3, 3, 0, 0]}
                    barSize={20}
                    isAnimationActive={false}
                  />
                </BarChart>
              </GrowthMini>

              <GrowthMini
                icon={Crown}
                iconColor={GREEN}
                title="Subscription Growth"
                caption="Total subscriptions by month"
                value="23"
                delta="130.0%"
                up
                tint="#F0FBF5"
                border="#CBEFDC"
              >
                <BarChart data={subscriptionGrowth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TEXT} dy={4} />
                  <YAxis
                    domain={[0, 40]}
                    ticks={[0, 10, 20, 30, 40]}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={24}
                  />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(18,183,106,0.05)" }} />
                  <Bar
                    dataKey="value"
                    name="Subscriptions"
                    fill={GREEN}
                    radius={[3, 3, 0, 0]}
                    barSize={20}
                    isAnimationActive={false}
                  />
                </BarChart>
              </GrowthMini>
            </div>

            <ViewLink>View All Growth Reports</ViewLink>
          </Card>

          {/* Cancellation analysis */}
          <Card className={PAD}>
            <CardTitle>Cancellation Analysis</CardTitle>
            <p className={`-mt-1.5 mb-2 text-slate-500 ${T.xs}`}>
              Bars: cancellations • Line: cancellation rate (%)
            </p>

            <div className="flex items-center gap-5">
              <LegendDot square color={PINK} label="Cancellations" />
              <LegendDot line color={AMBER} label="Cancellation Rate (%)" />
            </div>

            <div className="mt-1 h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cancellations} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TEXT} dy={6} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 40]}
                    ticks={[0, 10, 20, 30, 40]}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={28}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                    interval={0}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={30}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(236,72,153,0.05)" }}
                    formatter={(value, name) => (name === "Cancellation Rate (%)" ? `${value}%` : value)}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Cancellations"
                    fill={PINK}
                    fillOpacity={0.85}
                    radius={[4, 4, 0, 0]}
                    barSize={44}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="rate"
                    name="Cancellation Rate (%)"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#F97316", strokeWidth: 0 }}
                    activeDot={{ r: 5.5 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={`mt-3 grid grid-cols-2 ${GAP}`}>
              <StatBox label="Total Cancellations" value="26" bg="#FEF1F5" border="#F8D6E1" />
              <StatBox label="Cancellation Rate" value="2.73%" delta="31.9%" up={false} good bg="#FEF1F5" border="#F8D6E1" />
            </div>

            <ViewLink>View Cancellation Report</ViewLink>
          </Card>

          {/* Meta performance overview */}
          <Card className={PAD}>
            <CardTitle>Meta Performance Overview</CardTitle>
            <p className={`-mt-1.5 mb-2 text-slate-500 ${T.xs}`}>Months without reported reach are omitted</p>

            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metaReach} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TEXT} dy={6} />
                  <YAxis
                    domain={[0, 14000]}
                    ticks={[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000]}
                    interval={0}
                    tickFormatter={thousands}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TEXT}
                    width={34}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(46,144,250,0.05)" }}
                    formatter={(value) => Number(value).toLocaleString("en-IN")}
                  />
                  <Bar
                    dataKey="reach"
                    name="Meta Reach"
                    fill="#0A84FF"
                    radius={[4, 4, 0, 0]}
                    barSize={110}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3">
              <StatBox label="Meta Reach (This Month)" value="10.8K" delta="5.4%" up={false} bg="#EFF6FF" border="#CFE3FD" />
            </div>

            <ViewLink>View Meta Ads Report</ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Month-on-month tables / Alerts                            */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className={PAD}>
            <CardTitle>Month-on-Month Performance</CardTitle>
            <ComparisonTable
              columns={["Metric", "June", "July", "Change", "% Change"]}
              rows={juneToJuly}
            />
          </Card>

          <Card className={PAD}>
            <CardTitle>July → August</CardTitle>
            <ComparisonTable
              columns={["Metric", "July", "August", "Change", "% Change"]}
              rows={julyToAugust}
            />
          </Card>

          <Card className={PAD}>
            <CardTitle
              right={
                <button
                  type="button"
                  className={`flex shrink-0 items-center gap-1 font-semibold hover:underline ${T.xs}`}
                  style={{ color: BRAND }}
                >
                  View All
                  <ArrowRight size={11} className="shrink-0" />
                </button>
              }
            >
              Alerts &amp; Insights
            </CardTitle>

            <ul className="flex flex-1 flex-col justify-between gap-1">
              {alerts.map(({ icon, ...alert }) => {
                const Icon = icon;
                return (
                  <li
                    key={alert.title}
                    className="flex items-center gap-2.5 rounded-xl border px-2.5 py-[4px]"
                    style={{ background: alert.bg, borderColor: alert.border }}
                  >
                    <Icon size={16} className="shrink-0" style={{ color: alert.color }} />

                    {/* This card is the narrowest on the canvas - the type here is
                        one step down so the longest alert still fits on one line. */}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-semibold ${T.xs}`}
                        style={{ color: alert.color }}
                      >
                        {alert.title}
                      </span>
                      <span className={`block truncate text-slate-500 ${T.nano}`}>{alert.sub}</span>
                    </span>

                    <button
                      type="button"
                      className={`flex shrink-0 items-center gap-1 font-semibold hover:underline ${T.nano}`}
                      style={{ color: alert.color }}
                    >
                      {alert.action}
                      <ArrowRight size={10} className="shrink-0" />
                    </button>
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

export default DashboardV2;
