import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clock,
  Gift,
  Info,
  IndianRupee,
  MapPin,
  Scissors,
  ShoppingCart,
  Slash,
  Store,
  Users,
} from "lucide-react";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved executive dashboard mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const PINK = "#EC4899";
const AMBER = "#F5A623";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[541fr_528fr_571fr]";
const ROW3_COLS = "grid-cols-[606fr_451fr_571fr]";
const ROW4_COLS = "grid-cols-[651fr_606fr_383fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these.
const T = {
  xs: "text-[10px]", // table headers
  sm: "text-[11px]", // deltas, legend, captions
  base: "text-[12px]", // stat labels, table cells
  md: "text-[13px]", // body, card headings
  lg: "text-[14px]", // links
  h1: "text-[22px]", // page title
  kpi: "text-[20px]", // KPI values
  stat: "text-[18px]", // in-card stat values
};

const PAD = "p-4";
const GAP = "gap-3";

// ---------------------------------------------------------------------------
// Static demo data - UI only for now, wire up to the backend later.
// ---------------------------------------------------------------------------

const COMPARE_LABEL = "vs Jul 2026";

const kpis = [
  { label: "Total Bookings", value: "954", delta: "81.7%", up: true, icon: CalendarCheck, tint: "#EDE7FF", color: BRAND },
  { label: "Total Revenue (GMV)", value: "₹1,06,117.50", delta: "78.0%", up: true, icon: IndianRupee, tint: "#E1F7EC", color: GREEN },
  { label: "Total Users", value: "25.7K", delta: "60.6%", up: true, icon: Users, tint: "#FFF2DC", color: "#E08700" },
  { label: "Total Partners", value: "212", delta: "14.9%", up: false, icon: Store, tint: "#E6EFFF", color: BLUE },
  { label: "Total Subscriptions", value: "23", delta: "130.0%", up: true, icon: Gift, tint: "#FDE6F0", color: PINK },
  // The mockup renders this delta green even though the rate rose - kept as drawn.
  { label: "Cancellation Rate", value: "2.73%", delta: "31.9%", up: true, icon: Slash, tint: "#DCF3F0", color: "#0E9384" },
];

const scorecard = [
  { metric: "Bookings Growth", value: "954", delta: "81.7%", up: true, status: "GOOD", logic: "Beyond the +10% band" },
  { metric: "Revenue Growth", value: "₹1,06,117.50", delta: "78.0%", up: true, status: "GOOD", logic: "Beyond the +10% band" },
  { metric: "CAC efficiency (per booking)", value: "₹58.75", delta: "21.7%", up: true, status: "GOOD", logic: "Beyond the -5% band" },
  { metric: "Cancellation Rate", value: "2.73%", delta: "31.9%", up: true, status: "GOOD", logic: "Beyond the -5% band" },
  { metric: "User Growth", value: "25.7K", delta: "60.6%", up: true, status: "GOOD", logic: "Beyond the +10% band" },
  { metric: "Partner Growth", value: "212", delta: "14.9%", up: false, status: "ATTENTION", logic: "Beyond the -2% band" },
  { metric: "Subscription Growth", value: "23", delta: "130.0%", up: true, status: "GOOD", logic: "Beyond the +10% band" },
];

const bookingsRevenue = [
  { month: "June", bookings: 543, revenue: 23437.58 },
  { month: "July", bookings: 704, revenue: 59600.77 },
  { month: "August", bookings: 954, revenue: 106117.5 },
];

const marketingSpend = [
  { month: "June", meta: 17500, other: 4500, organic: 3000 },
  { month: "July", meta: 27500, other: 7875, organic: 4000 },
  { month: "August", meta: 39232, other: 10800, organic: 6014 },
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

const cancellations = [
  { month: "June", count: 6, rate: 1.6 },
  { month: "July", count: 21, rate: 2.07 },
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

const alerts = [
  {
    icon: AlertTriangle,
    tint: "#FEE4E2",
    color: RED,
    title: "3 Salons have zero bookings",
    sub: "for 7 days",
    action: "View Partners",
    critical: true,
  },
  {
    icon: Clock,
    tint: "#FFF2DC",
    color: "#E08700",
    title: "₹1,23,450 overdue payout",
    sub: "to 3 partners",
    action: "View Payouts",
  },
  {
    icon: ShoppingCart,
    tint: "#EDE7FF",
    color: BRAND,
    title: "42 users dropped off at checkout",
    sub: "today",
    action: "View Report",
  },
  {
    icon: MapPin,
    tint: "#E6EFFF",
    color: BLUE,
    title: "Perungudi demand is 31% higher",
    sub: "than available",
    action: "View Details",
  },
  {
    icon: Scissors,
    tint: "#E1F7EC",
    color: GREEN,
    title: "Haircut ₹99 converting 2.4x",
    sub: "better than ₹149",
    action: "View Report",
  },
];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// min-w-0 is what lets these shrink inside the grid instead of forcing overflow.
const Card = ({ children, className = "" }) => (
  <div
    className={`flex min-w-0 flex-col rounded-2xl border border-[#E3E7EF] bg-white ${PAD} ${className}`}
  >
    {children}
  </div>
);

const CardTitle = ({ children, right }) => (
  <div className="mb-3 flex items-start justify-between gap-3">
    <h2 className={`font-extrabold uppercase tracking-wide text-slate-900 ${T.md}`}>
      {children}
    </h2>
    {right}
  </div>
);

const Delta = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${up ? "text-emerald-500" : "text-rose-500"
      }`}
  >
    {up ? "↑" : "↓"} {value}
  </span>
);

const ViewLink = ({ children }) => (
  <button
    type="button"
    className={`mt-auto flex w-full items-center justify-center gap-1.5 pt-4 font-bold hover:underline ${T.lg}`}
    style={{ color: BRAND }}
  >
    {children}
    <ArrowRight size={14} className="shrink-0" />
  </button>
);

const Select = ({ value, onChange, options, compact = false }) => (
  <div className="relative shrink-0">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none ${compact ? `py-1.5 pl-2.5 pr-6 ${T.base}` : `py-2 pl-3 pr-7 ${T.md}`
        }`}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
    <ChevronDown
      size={compact ? 11 : 13}
      className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </div>
);

const LegendDot = ({ color, label }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600 ${T.sm}`}>
    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
    {label}
  </span>
);

// Bordered mini stat used under the bookings / marketing / meta charts.
const StatBox = ({ label, value, delta, up }) => (
  <div className="min-w-0 rounded-xl border border-[#E3E7EF] px-3 py-2.5">
    <p className={`truncate text-slate-500 ${T.sm}`}>{label}</p>
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <span className={`truncate font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
        {value}
      </span>
      {delta && (
        <span className={T.sm}>
          <Delta value={delta} up={up} />
        </span>
      )}
    </div>
  </div>
);

const StatusPill = ({ status }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-md px-2 py-1 font-bold ${T.xs} ${status === "GOOD"
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
        {columns.map((col) => (
          <th
            key={col}
            className={`pb-2.5 pr-2 font-bold uppercase tracking-wide text-slate-400 ${T.xs}`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.metric} className="border-b border-slate-50 last:border-0">
          <td className={`whitespace-nowrap py-2.5 pr-2 font-medium text-slate-700 ${T.base}`}>
            {row.metric}
          </td>
          <td className={`whitespace-nowrap py-2.5 pr-2 text-slate-600 ${T.base}`}>{row.a}</td>
          <td className={`whitespace-nowrap py-2.5 pr-2 text-slate-600 ${T.base}`}>{row.b}</td>
          <td
            className={`whitespace-nowrap py-2.5 pr-2 font-semibold ${T.base} ${!row.change
                ? "text-slate-400"
                : row.change.startsWith("-")
                  ? "text-rose-500"
                  : "text-emerald-600"
              }`}
          >
            {row.change || "N/A"}
          </td>
          <td className={`whitespace-nowrap py-2.5 ${T.base}`}>
            {row.pct ? (
              <Delta value={row.pct} up={row.up} />
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
const GrowthMini = ({ title, caption, value, delta, up, children }) => (
  <div className="flex min-w-0 flex-col rounded-xl border border-[#E3E7EF] p-3">
    <p className={`font-bold text-slate-900 ${T.md}`}>{title}</p>
    <p className={`mt-0.5 text-slate-500 ${T.sm}`}>{caption}</p>
    <div className="mt-2 h-[112px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex items-baseline justify-between gap-2">
      <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{value}</span>
      <span className={T.sm}>
        <Delta value={delta} up={up} />
      </span>
    </div>
  </div>
);

const inr = (v) => `₹${Number(v).toLocaleString("en-IN")}`;
const thousands = (v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const DashboardV2 = ({ title = "Dashboard" }) => {
  const [period, setPeriod] = useState("This Month");
  const [refreshInterval, setRefreshInterval] = useState("30 sec");
  const [revenuePeriod, setRevenuePeriod] = useState("This Month");
  const [marketingPeriod, setMarketingPeriod] = useState("This Month");

  return (
    <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Page header + filter bar                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`font-extrabold tracking-tight text-slate-900 ${T.h1}`}>{title}</h1>
            <p className={`mt-0.5 text-slate-500 ${T.md}`}>
              Real-time overview of GloUp platform performance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 ${T.md}`}
            >
              1 Aug – 31 Aug 2026
              <CalendarDays size={13} className="shrink-0 text-slate-400" />
            </button>

            <Select
              value={period}
              onChange={setPeriod}
              options={["This Month", "Last Month", "This Week", "Last 90 Days", "This Year"]}
            />

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
              <div className="leading-tight">
                <p className={`whitespace-nowrap font-semibold text-slate-700 ${T.base}`}>
                  Auto refresh
                </p>
                <div className="relative">
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                    className={`appearance-none bg-transparent pr-3 text-slate-500 focus:outline-none ${T.sm}`}
                  >
                    <option>15 sec</option>
                    <option>30 sec</option>
                    <option>1 min</option>
                    <option>5 min</option>
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
              className={`flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-600 hover:text-slate-900 ${T.md}`}
            >
              <Info size={14} className="shrink-0 text-slate-400" />
              How it works?
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <div
              key={kpi.label}
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#E3E7EF] bg-white p-3.5"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: kpi.tint }}
              >
                <Icon size={20} style={{ color: kpi.color }} />
              </div>

              <div className="min-w-0">
                <p className={`truncate text-slate-500 ${T.base}`}>{kpi.label}</p>
                <p
                  className={`mt-0.5 whitespace-nowrap font-extrabold tracking-tight text-slate-900 ${T.kpi}`}
                >
                  {kpi.value}
                </p>
                <p className={`mt-0.5 flex items-center gap-1.5 ${T.sm}`}>
                  <Delta value={kpi.delta} up={kpi.up} />
                  <span className="truncate text-slate-400">{COMPARE_LABEL}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Scorecard / Bookings & revenue / Acquisition cost         */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          {/* Performance scorecard */}
          <Card>
            <CardTitle>Performance Scorecard</CardTitle>

            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  {[
                    "Metric",
                    "Latest Value",
                    "Change vs Prior Month",
                    "Status",
                    "Logic Applied",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`pb-2.5 pr-2 font-bold uppercase leading-tight tracking-wide text-slate-400 ${T.xs}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorecard.map((row) => (
                  <tr key={row.metric}>
                    <td className={`py-2 pr-2 ${T.base}`}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: row.status === "GOOD" ? BRAND : AMBER }}
                        />
                        <span className="font-medium text-slate-700">{row.metric}</span>
                      </span>
                    </td>
                    <td className={`whitespace-nowrap py-2 pr-2 text-slate-600 ${T.base}`}>
                      {row.value}
                    </td>
                    <td className={`whitespace-nowrap py-2 pr-2 ${T.base}`}>
                      <Delta value={row.delta} up={row.up} />
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill status={row.status} />
                    </td>
                    {/* 10px keeps "Beyond the +10% band" on one line in this column. */}
                    <td className={`whitespace-nowrap py-2 text-slate-400 ${T.xs}`}>{row.logic}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ViewLink>View Full Performance Report</ViewLink>
          </Card>

          {/* Bookings & revenue performance */}
          <Card>
            <CardTitle
              right={
                <Select
                  compact
                  value={revenuePeriod}
                  onChange={setRevenuePeriod}
                  options={["This Month", "Last Month", "Last 6 Months"]}
                />
              }
            >
              Bookings &amp; Revenue Performance
            </CardTitle>

            <div className="mb-1 flex items-center gap-4">
              <LegendDot color={BRAND} label="Total Bookings" />
              <LegendDot color={GREEN} label="Total Revenue (₹)" />
            </div>

            <div className="h-[232px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={bookingsRevenue}
                  margin={{ top: 22, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 1250]}
                    ticks={[250, 500, 750, 1000, 1250]}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={46}
                  />
                  {/* The revenue axis is hidden and unlabelled, so its floor is
                      offset below zero purely to park the line in a clear band
                      above the bars and their value labels - at 0 the line cut
                      straight through the August bar. Exact values are still in
                      the tooltip and the stat boxes below. */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[-120000, 125000]}
                    hide
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(91,33,240,0.05)" }}
                    formatter={(value, name) =>
                      name === "Total Revenue (₹)" ? inr(value) : value
                    }
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    name="Total Bookings"
                    fill={BRAND}
                    radius={[5, 5, 0, 0]}
                    barSize={54}
                  >
                    <LabelList
                      dataKey="bookings"
                      position="top"
                      offset={8}
                      style={{ fontSize: 12, fontWeight: 700, fill: "#0F172A" }}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="revenue"
                    name="Total Revenue (₹)"
                    stroke={GREEN}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: GREEN, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={`mt-3 grid grid-cols-2 ${GAP}`}>
              <StatBox label="Total Bookings" value="954" delta="81.7%" up />
              <StatBox label="Total Revenue" value="₹1,06,117.50" delta="78.0%" up />
            </div>

            <ViewLink>View Detailed Analytics</ViewLink>
          </Card>

          {/* Acquisition cost & marketing efficiency */}
          <Card>
            <CardTitle
              right={
                <Select
                  compact
                  value={marketingPeriod}
                  onChange={setMarketingPeriod}
                  options={["This Month", "Last Month", "Last 6 Months"]}
                />
              }
            >
              Acquisition Cost &amp; Marketing Efficiency
            </CardTitle>

            <div className={`grid grid-cols-3 ${GAP}`}>
              <StatBox label="Marketing Spend" value="₹56,045.95" delta="42.3%" up />
              <StatBox label="CAC (Overall)" value="₹58.75" delta="21.7%" up />
              <StatBox label="Meta Reach" value="10.8K" delta="5.4%" up={false} />
            </div>

            <p className={`mt-4 font-bold text-slate-900 ${T.md}`}>
              Marketing &amp; Acquisition Spend Breakdown (₹)
            </p>

            <div className="mt-2 flex items-center gap-4">
              <LegendDot color={BRAND} label="Meta Ads" />
              <LegendDot color={BLUE} label="Other Ads" />
              <LegendDot color={GREEN} label="Organic / Others" />
            </div>

            <div className="mt-1 h-[186px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketingSpend} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  <YAxis hide />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(91,33,240,0.05)" }}
                    formatter={(value) => inr(value)}
                  />
                  <Bar dataKey="meta" name="Meta Ads" stackId="spend" fill={BRAND} barSize={82} />
                  <Bar dataKey="other" name="Other Ads" stackId="spend" fill={BLUE} barSize={82} />
                  <Bar
                    dataKey="organic"
                    name="Organic / Others"
                    stackId="spend"
                    fill={GREEN}
                    barSize={82}
                    radius={[5, 5, 0, 0]}
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
          <Card>
            <CardTitle>Customer, Partner &amp; Subscription Growth</CardTitle>

            <div className={`grid grid-cols-3 ${GAP}`}>
              <GrowthMini
                title="User Growth"
                caption="Total users by month"
                value="25.7K"
                delta="60.6%"
                up
              >
                <LineChart data={userGrowth} margin={{ top: 8, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={4} />
                  <YAxis hide domain={["dataMin - 4000", "dataMax + 4000"]} />
                  <Tooltip {...TOOLTIP} formatter={(v) => Number(v).toLocaleString("en-IN")} />
                  <Line
                    type="linear"
                    dataKey="value"
                    name="Users"
                    stroke={BLUE}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: BLUE, strokeWidth: 0 }}
                  />
                </LineChart>
              </GrowthMini>

              <GrowthMini
                title="Partner / Salon Network"
                caption="Total partners by month"
                value="212"
                delta="14.9%"
                up={false}
              >
                <BarChart data={partnerGrowth} margin={{ top: 8, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={4} />
                  <YAxis hide />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(240,68,56,0.05)" }} />
                  <Bar
                    dataKey="value"
                    name="Partners"
                    fill={RED}
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                </BarChart>
              </GrowthMini>

              <GrowthMini
                title="Subscription Growth"
                caption="Total subscriptions by month"
                value="23"
                delta="130.0%"
                up
              >
                <BarChart
                  data={subscriptionGrowth}
                  margin={{ top: 8, right: 10, bottom: 0, left: 10 }}
                >
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={4} />
                  <YAxis hide />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(18,183,106,0.05)" }} />
                  <Bar
                    dataKey="value"
                    name="Subscriptions"
                    fill={GREEN}
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                </BarChart>
              </GrowthMini>
            </div>

            <ViewLink>View All Growth Reports</ViewLink>
          </Card>

          {/* Cancellation analysis */}
          <Card>
            <CardTitle>Cancellation Analysis</CardTitle>
            <p className={`-mt-2 mb-2 text-slate-500 ${T.sm}`}>
              Bars: cancellations • Line: cancellation rate (%)
            </p>

            <div className="mb-1 flex items-center gap-4">
              <LegendDot color={PINK} label="Cancellations" />
              <LegendDot color={AMBER} label="Cancellation Rate (%)" />
            </div>

            <div className="h-[236px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={cancellations}
                  margin={{ top: 18, right: 10, bottom: 0, left: 10 }}
                >
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  {/* Same idea as the bookings chart: headroom on the bar axis
                      plus a tighter rate axis keeps the rate line clear of the
                      bars instead of running behind them. */}
                  <YAxis yAxisId="left" domain={[0, 40]} hide />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 3]} hide />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(236,72,153,0.05)" }}
                    formatter={(value, name) =>
                      name === "Cancellation Rate (%)" ? `${value}%` : value
                    }
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Cancellations"
                    fill={PINK}
                    radius={[5, 5, 0, 0]}
                    barSize={54}
                  />
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="rate"
                    name="Cancellation Rate (%)"
                    stroke={AMBER}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: AMBER, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className={`text-slate-500 ${T.sm}`}>Total Cancellations</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>26</p>
              </div>
              <div className="min-w-0">
                <p className={`text-slate-500 ${T.sm}`}>Cancellation Rate</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                    2.73%
                  </span>
                  <span className={T.sm}>
                    <Delta value="31.9%" up />
                  </span>
                </div>
              </div>
            </div>

            <ViewLink>View Cancellation Report</ViewLink>
          </Card>

          {/* Meta performance overview */}
          <Card>
            <CardTitle>Meta Performance Overview</CardTitle>
            <p className={`-mt-2 mb-2 text-slate-500 ${T.sm}`}>
              Months without reported reach are omitted
            </p>

            <div className="h-[262px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metaReach} margin={{ top: 12, right: 8, bottom: 0, left: -14 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  <YAxis
                    domain={[0, 12000]}
                    ticks={[0, 4000, 8000, 10000, 12000]}
                    tickFormatter={thousands}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={44}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(46,144,250,0.05)" }}
                    formatter={(value) => Number(value).toLocaleString("en-IN")}
                  />
                  <Bar
                    dataKey="reach"
                    name="Meta Reach"
                    fill={BLUE}
                    radius={[5, 5, 0, 0]}
                    barSize={104}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 rounded-xl border border-[#E3E7EF] px-3 py-2.5">
              <p className={`text-slate-500 ${T.sm}`}>Meta Reach (This Month)</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                  10.8K
                </span>
                <span className={T.sm}>
                  <Delta value="5.4%" up={false} />
                </span>
              </div>
            </div>

            <ViewLink>View Meta Ads Report</ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Month-on-month tables / Alerts                            */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card>
            <CardTitle>Month-on-Month Performance</CardTitle>
            <ComparisonTable
              columns={["Metric", "June", "July", "Change", "% Change"]}
              rows={juneToJuly}
            />
          </Card>

          <Card>
            <CardTitle>July → August</CardTitle>
            <ComparisonTable
              columns={["Metric", "July", "August", "Change", "% Change"]}
              rows={julyToAugust}
            />
          </Card>

          <Card>
            <CardTitle
              right={
                <button
                  type="button"
                  className={`flex shrink-0 items-center gap-1 font-bold hover:underline ${T.base}`}
                  style={{ color: BRAND }}
                >
                  View All
                  <ArrowRight size={12} className="shrink-0" />
                </button>
              }
            >
              Alerts &amp; Insights
            </CardTitle>

            <div className="flex flex-col gap-2">
              {alerts.map(({ icon: Icon, ...alert }) => (
                <div
                  key={alert.title}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${alert.critical ? "border-rose-100 bg-rose-50/60" : "border-[#E3E7EF] bg-white"
                    }`}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: alert.tint }}
                  >
                    <Icon size={14} style={{ color: alert.color }} />
                  </div>

                  {/* This card is the narrowest on the canvas - the type here is
                      one step down so the longest alert still fits on one line. */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold text-slate-800 ${T.sm}`}>
                      {alert.title}
                    </p>
                    <p className={`truncate text-slate-400 ${T.xs}`}>{alert.sub}</p>
                  </div>

                  <button
                    type="button"
                    className={`flex shrink-0 items-center gap-1 font-semibold hover:underline ${T.xs}`}
                    style={{ color: BRAND }}
                  >
                    {alert.action}
                    <ArrowRight size={11} className="shrink-0" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
    </ScaledCanvas>
  );
};

export default DashboardV2;
