import { useState, useRef, useLayoutEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalendarDays, ChevronDown, ArrowRight, Send } from "lucide-react";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved mockup.
//
// The layout is built once on a fixed DESIGN_WIDTH canvas and then uniformly
// scaled to fit the available width, so the arrangement is identical at every
// screen size: nothing reflows, nothing clips, the page never scrolls sideways.
//
// DESIGN_WIDTH is tuned to the NARROWEST canvas the content fits in with zero
// overflow (verified element-by-element in a browser). That matters for
// readability: a narrower canvas means a higher scale factor, so the text lands
// bigger on screen. Raising the px sizes in T below does the opposite - it
// forces a wider canvas, which then scales down further and reads smaller.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
const BRAND = "#5B21F0";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW1_COLS = "grid-cols-[1811fr_1383fr_1923fr]";
const ROW2_COLS = "grid-cols-[1740fr_1888fr_1454fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these - bigger numbers here make the rendered text smaller.
const T = {
  xs: "text-[10px]",      // table headers
  sm: "text-[11px]",      // deltas, legend
  base: "text-[12px]",    // stat labels
  md: "text-[13px]",      // body, table cells
  lg: "text-[14px]",      // sub-titles, links
  xl: "text-[16px]",      // card headings
  h1: "text-[20px]",      // page title
  stat: "text-[24px]",    // stat values
  statSm: "text-[18px]",  // estimated reach
};

const PAD = "p-4";
const GAP = "gap-3";

// ---------------------------------------------------------------------------
// Static demo data — UI only for now, wire up to the backend later.
// ---------------------------------------------------------------------------

const profitability = {
  stats: [
    { label: "Total Sales", value: "2,153" },
    { label: "Profitable Sales", value: "1,248", pct: "57.9%", tone: "green" },
    { label: "Low Contribution", value: "624", pct: "29.0%", tone: "amber" },
    { label: "Negative Contribution", value: "281", pct: "13.1%", tone: "red" },
  ],
  rows: [
    { salon: "Glam Studio", bookings: 232, gmv: "₹98,420", revenue: "₹14,763", contribution: "₹9,842", margin: "30.2%", tag: "High" },
    { salon: "Cuts & Style", bookings: 184, gmv: "₹64,380", revenue: "₹9,656", contribution: "₹6,128", margin: "28.4%", tag: "High" },
    { salon: "Be U Salon", bookings: 156, gmv: "₹55,210", revenue: "₹7,831", contribution: "₹3,982", margin: "19.8%", tag: "Medium" },
    { salon: "The Hair Lounge", bookings: 98, gmv: "₹34,980", revenue: "₹4,942", contribution: "₹1,102", margin: "8.6%", tag: "Low" },
    { salon: "Magic Touch", bookings: 62, gmv: "₹21,560", revenue: "₹3,046", contribution: "-₹826", margin: "-4.1%", tag: "Negative", negative: true },
  ],
};

const gravity = {
  salons: ["Glam Studio", "Cuts & Style", "Be U Salon", "Hair Zone", "Magic Touch"],
  totalCustomers: "1,842",
  repeatCustomers: "842",
  repeatPct: "45.7%",
  avgDistance: "3.8 km",
  retention: "45.7%",
  areas: [
    { area: "Velachery", pct: 38, count: 699, color: "#5B21F0" },
    { area: "Taramani", pct: 21, count: 387, color: "#3B82F6" },
    { area: "Adambakkam", pct: 17, count: 313, color: "#12B76A" },
    { area: "Guindy", pct: 12, count: 221, color: "#F5A623" },
    { area: "Pallikaranai", pct: 6, count: 105, color: "#EC4899" },
    { area: "Others", pct: 6, count: 117, color: "#AEB4C0" },
  ],
};

const switching = {
  stats: [
    { label: "Total Customers (90 Days)", value: "3,248" },
    { label: "Stayed with same salon", value: "1,946", pct: "59.9%", tone: "green" },
    { label: "Switched Salon", value: "842", pct: "25.9%", tone: "amber" },
    { label: "No Booking Again", value: "460", pct: "14.2%", tone: "amber" },
  ],
  reasons: [
    { reason: "Price", pct: 32, color: "#5B21F0" },
    { reason: "Better Offers", pct: 24, color: "#3B82F6" },
    { reason: "Availability / Slots", pct: 20, color: "#3B82F6" },
    { reason: "Quality / Service", pct: 14, color: "#F5A623" },
    { reason: "Location", pct: 7, color: "#EC4899" },
    { reason: "Others", pct: 3, color: "#AEB4C0" },
  ],
  switchedTo: [
    { salon: "Glam Studio", count: 132 },
    { salon: "Cuts & Style", count: 108 },
    { salon: "Be U Salon", count: 96 },
    { salon: "Hair Zone", count: 78 },
    { salon: "Magic Touch", count: 64 },
  ],
};

const timeToBook = {
  stats: [
    { label: "Avg Time: App Open → Booking", value: "11m 42s", delta: "8.6% vs last week" },
    { label: "Avg Time: Search → Booking", value: "6m 18s", delta: "6.2% vs last week" },
    { label: "Avg Time: Salon View → Booking", value: "4m 51s", delta: "7.4% vs last week" },
    { label: "Avg Time: Offer View → Booking", value: "2m 26s", delta: "5.1% vs last week" },
  ],
  distribution: [
    { bucket: "0–1 min", users: 640, color: "#5B21F0" },
    { bucket: "1–3 min", users: 1000, color: "#3B82F6" },
    { bucket: "3–5 min", users: 1240, color: "#17B3A6" },
    { bucket: "5–10 min", users: 830, color: "#F5A623" },
    { bucket: "10–20 min", users: 530, color: "#EC4899" },
    { bucket: "20–30 min", users: 330, color: "#7C4DFF" },
    { bucket: "30+ min", users: 190, color: "#64748B" },
  ],
};

const uninstalled = {
  stats: [
    { label: "Uninstalled Users (30 Days)", value: "2,841" },
    { label: "Can be Re-engaged", value: "1,932", pct: "68.0%", tone: "green" },
    { label: "High Value Users", value: "481", pct: "16.9%", tone: "green" },
  ],
  segments: [
    { label: "Active before 7 days", value: "620 (21.9%)" },
    { label: "Active before 8–30 days", value: "1,071 (37.7%)" },
    { label: "Active before 31–60 days", value: "562 (19.8%)" },
    { label: "Active before 60+ days", value: "588 (20.6%)" },
  ],
  channels: ["WhatsApp", "SMS", "Push Notification", "Email"],
  templates: ["We Miss You", "Flat 30% Off", "Slots Filling Fast", "Come Back Offer"],
  estimatedReach: "1,932 users",
};

const topProfitableSalons = [
  { salon: "Glam Studio", gmv: "₹98,420", revenue: "₹14,763", contribution: "₹9,842", margin: "30.2%" },
  { salon: "Cuts & Style", gmv: "₹64,380", revenue: "₹9,656", contribution: "₹6,128", margin: "28.4%" },
  { salon: "Be U Salon", gmv: "₹55,210", revenue: "₹7,831", contribution: "₹3,982", margin: "19.8%" },
  { salon: "The Hair Lounge", gmv: "₹34,980", revenue: "₹4,942", contribution: "₹1,102", margin: "8.6%" },
  { salon: "Hair Zone", gmv: "₹28,440", revenue: "₹4,015", contribution: "₹812", margin: "7.2%" },
];

const topGravitySalons = [
  { salon: "Glam Studio", area: "Velachery", customers: 699, distance: "3.8 km" },
  { salon: "Cuts & Style", area: "Taramani", customers: 612, distance: "4.2 km" },
  { salon: "Be U Salon", area: "Adambakkam", customers: 541, distance: "4.6 km" },
  { salon: "Hair Zone", area: "Guindy", customers: 498, distance: "3.9 km" },
  { salon: "Magic Touch", area: "Pallikaranai", customers: 472, distance: "4.1 km" },
];

const switchingRiskSalons = [
  { salon: "Magic Touch", switching: "38.2%", trend: "12.4%", up: true, risk: "High" },
  { salon: "Hair Zone", switching: "31.6%", trend: "8.7%", up: true, risk: "High" },
  { salon: "The Hair Lounge", switching: "28.9%", trend: "6.2%", up: true, risk: "Medium" },
  { salon: "Be U Salon", switching: "22.1%", trend: "3.4%", up: true, risk: "Medium" },
  { salon: "Cuts & Style", switching: "18.7%", trend: "2.1%", up: false, risk: "Low" },
];

const timeToBookByCategory = [
  { category: "Haircut", time: "5m 12s", trend: "6.3%" },
  { category: "Hair Color", time: "6m 48s", trend: "7.1%" },
  { category: "Facial", time: "7m 26s", trend: "4.9%" },
  { category: "Massage", time: "8m 33s", trend: "5.6%" },
  { category: "Spa", time: "9m 47s", trend: "3.8%" },
];

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const toneClass = {
  green: "text-emerald-500",
  amber: "text-amber-500",
  red: "text-rose-500",
};

// min-w-0 is what lets these shrink inside the grid instead of forcing overflow.
const Card = ({ children, className = "" }) => (
  <div
    className={`flex min-w-0 flex-col rounded-2xl border border-[#E3E7EF] bg-white ${PAD} ${className}`}
  >
    {children}
  </div>
);

const CardTitle = ({ index, children }) => (
  <h2
    className={`mb-3 border-b border-slate-100 pb-3 font-extrabold uppercase tracking-wide text-slate-900 ${T.md}`}
  >
    {index ? `${index}. ` : ""}
    {children}
  </h2>
);

const SubTitle = ({ children }) => (
  <h3 className={`mb-3 font-bold text-slate-900 ${T.lg}`}>{children}</h3>
);

const StatTile = ({ label, value, pct, tone, labelClass = T.sm }) => (
  <div className="min-w-0">
    <p className={`leading-snug tracking-tight text-slate-500 ${labelClass}`}>{label}</p>
    <div className="mt-1.5 flex flex-nowrap items-baseline gap-x-1.5">
      <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
        {value}
      </span>
      {pct && (
        <span className={`font-semibold ${T.xs} ${toneClass[tone] || "text-slate-500"}`}>
          {pct}
        </span>
      )}
    </div>
  </div>
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

const Trend = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-1 whitespace-nowrap font-medium text-emerald-500 ${T.md}`}
  >
    {up ? "▲" : "▼"} {value}
  </span>
);

const ProfitabilityPill = ({ tag }) => {
  const styles = {
    High: "bg-emerald-50 text-emerald-600",
    Medium: "bg-amber-50 text-amber-500",
    Low: "bg-amber-50 text-amber-500",
    Negative: "bg-rose-50 text-rose-500",
  };
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${T.md} ${
        styles[tag] || "bg-slate-100 text-slate-600"
      }`}
    >
      {tag}
    </span>
  );
};

// Compact table used by the four summary cards in the bottom row.
const MiniTable = ({ columns, rows }) => (
  <table className="w-full table-auto border-collapse text-left">
    <thead>
      <tr className="border-b border-slate-200">
        {columns.map((col) => (
          <th
            key={col.key}
            className={`pb-2.5 pr-1 font-bold uppercase leading-tight text-slate-400 ${T.xs} ${
              col.align === "right" ? "pr-0 text-right" : ""
            }`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>
          {columns.map((col) => (
            <td
              key={col.key}
              className={`whitespace-nowrap py-2.5 pr-1 ${T.md} ${
                col.align === "right" ? "pr-0 text-right" : ""
              } ${col.className || "text-slate-700"}`}
            >
              {col.render ? col.render(row) : row[col.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AnalyticsIntelligenceV2 = () => {
  const [period, setPeriod] = useState("This Week");
  const [compare, setCompare] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("30 sec");
  const [selectedSalon, setSelectedSalon] = useState(gravity.salons[0]);
  const [channel, setChannel] = useState(uninstalled.channels[0]);
  const [template, setTemplate] = useState(uninstalled.templates[0]);

  const maxReason = Math.max(...switching.reasons.map((r) => r.pct));

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
      <div
        ref={canvasRef}
        className={`flex flex-col pb-4 ${GAP}`}
        style={{
          width: DESIGN_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
      {/* ------------------------------------------------------------------ */}
      {/* Page header + filter bar                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`font-extrabold tracking-tight text-slate-900 ${T.h1}`}>
            Analytics Intelligence
          </h1>
          <p className={`mt-0.5 text-slate-500 ${T.md}`}>
            Deep insights to grow GloUp smarter
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 ${T.md}`}
          >
            25 Aug – 1 Sep 2026
            <CalendarDays size={13} className="shrink-0 text-slate-400" />
          </button>

          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-7 font-medium text-slate-700 focus:outline-none ${T.md}`}
            >
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last 90 Days</option>
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setCompare((prev) => !prev)}
            className={`whitespace-nowrap rounded-xl border px-3.5 py-2 font-medium transition-colors ${T.md} ${
              compare
                ? "border-transparent bg-[#5B21F0] text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Compare
          </button>

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
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Row 1 — Profitability / Gravity / Switching                         */}
      {/* ------------------------------------------------------------------ */}
      <div className={`grid ${ROW1_COLS} ${GAP}`}>
        {/* 1. Salon Profitability Intelligence */}
        <Card>
          <CardTitle index={1}>Salon Profitability Intelligence</CardTitle>

          <div
            className={`grid grid-cols-4 gap-2 rounded-xl border border-slate-100 bg-slate-50/70 ${PAD}`}
          >
            {profitability.stats.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>

          <table className="mt-4 w-full table-auto border-collapse text-left">
            <thead>
              <tr>
                {["Salon", "Bookings", "GMV", "GloUp Revenue", "Contribution", "Margin %"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`pb-3 pr-1 font-bold uppercase leading-tight text-slate-400 ${T.xs}`}
                    >
                      {h}
                    </th>
                  )
                )}
                <th
                  className={`pb-3 text-center font-bold uppercase leading-snug tracking-wide text-slate-400 ${T.xs}`}
                >
                  Profitability
                </th>
              </tr>
            </thead>
            <tbody>
              {profitability.rows.map((row) => (
                <tr key={row.salon}>
                  <td className={`whitespace-nowrap py-2.5 pr-1 text-slate-800 ${T.md}`}>
                    <span className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-slate-900 align-middle" />
                    {row.salon}
                  </td>
                  <td className={`py-2.5 pr-1.5 text-slate-700 ${T.md}`}>{row.bookings}</td>
                  <td className={`py-2.5 pr-1.5 text-slate-700 ${T.md}`}>{row.gmv}</td>
                  <td className={`py-2.5 pr-1.5 text-slate-700 ${T.md}`}>{row.revenue}</td>
                  <td
                    className={`py-2.5 pr-1.5 font-semibold ${T.md} ${
                      row.negative ? "text-rose-500" : "text-emerald-600"
                    }`}
                  >
                    {row.contribution}
                  </td>
                  <td
                    className={`py-2.5 pr-1.5 ${T.md} ${
                      row.negative ? "text-rose-500" : "text-slate-400"
                    }`}
                  >
                    {row.margin}
                  </td>
                  <td className="py-2.5 text-center">
                    <ProfitabilityPill tag={row.tag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ViewLink>View Full Profitability Report</ViewLink>
        </Card>

        {/* 2. Customer -> Salon Gravity */}
        <Card>
          <CardTitle index={2}>Customer → Salon Gravity</CardTitle>

          <div className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] gap-4">
            <div className="min-w-0 border-r border-slate-100 pr-4">
              <p className={`text-slate-500 ${T.md}`}>Selected Salon</p>
              <div className="relative mt-2">
                <select
                  value={selectedSalon}
                  onChange={(e) => setSelectedSalon(e.target.value)}
                  className={`w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-2.5 pr-6 text-slate-800 focus:outline-none ${T.md}`}
                >
                  {gravity.salons.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="mt-5">
                <p className={`text-slate-500 ${T.md}`}>Total Customers</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                  {gravity.totalCustomers}
                </p>
              </div>

              <div className="mt-5">
                <p className={`text-slate-500 ${T.md}`}>Repeat Customers</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                  {gravity.repeatCustomers}
                  <span className={`ml-1.5 font-medium text-slate-500 ${T.md}`}>
                    ({gravity.repeatPct})
                  </span>
                </p>
              </div>
            </div>

            <div className="min-w-0">
              <SubTitle>Where your customers come from</SubTitle>
              <div className="flex items-center gap-2">
                <div className="h-[78px] w-[78px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: 1 }]}
                        dataKey="value"
                        innerRadius={20}
                        outerRadius={24}
                        fill="#EDEFF3"
                        stroke="none"
                        isAnimationActive={false}
                      />
                      <Pie
                        data={gravity.areas}
                        isAnimationActive={false}
                        dataKey="pct"
                        nameKey="area"
                        innerRadius={25}
                        outerRadius={38}
                        stroke="none"
                        startAngle={3.6}
                        endAngle={-356.4}
                      >
                        {gravity.areas.map((a) => (
                          <Cell key={a.area} fill={a.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="min-w-0 flex-1 space-y-2.5">
                  {gravity.areas.map((a) => (
                    <li key={a.area} className={`flex items-center gap-1 ${T.sm}`}>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      <span className="whitespace-nowrap font-medium text-slate-800">
                        {a.area}
                      </span>
                      <span className="ml-auto whitespace-nowrap text-slate-500">
                        {a.pct}% ({a.count})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70">
            <div className={PAD}>
              <p className={`leading-snug text-slate-500 ${T.base}`}>
                Average Travel Distance
              </p>
              <p className={`mt-1.5 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                {gravity.avgDistance}
              </p>
            </div>
            <div className={PAD}>
              <p className={`leading-snug text-slate-500 ${T.base}`}>Customer Retention</p>
              <p className={`mt-1.5 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                {gravity.retention}
              </p>
            </div>
          </div>

          <ViewLink>View Full Gravity Map</ViewLink>
        </Card>

        {/* 3. Salon Switching Intelligence */}
        <Card>
          <CardTitle index={3}>Salon Switching Intelligence</CardTitle>

          <div className="grid grid-cols-4 gap-2">
            {switching.stats.map((s) => (
              <div
                key={s.label}
                className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-3"
              >
                <StatTile {...s} labelClass={T.xs} />
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="min-w-0 border-r border-slate-100 pr-4">
              <SubTitle>Why customers switch salons?</SubTitle>
              <ul className="space-y-3">
                {switching.reasons.map((r) => (
                  <li key={r.reason} className={`flex items-center gap-2 ${T.md}`}>
                    <span className="w-[126px] shrink-0 whitespace-nowrap text-slate-500">
                      {r.reason}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block h-2.5 rounded-full"
                        style={{
                          width: `${Math.max((r.pct / maxReason) * 100, 4)}%`,
                          backgroundColor: r.color,
                        }}
                      />
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right text-slate-500">
                      {r.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <SubTitle>Top salons customers switched to</SubTitle>
              <ul className="space-y-2">
                {switching.switchedTo.map((s, i) => (
                  <li key={s.salon} className={`flex items-center gap-2 ${T.md}`}>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-500 ${T.base}`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {s.salon}
                    </span>
                    <span className="ml-auto whitespace-nowrap text-slate-500">
                      {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ViewLink>View Switching Analysis</ViewLink>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Row 2 — Time-to-book / Re-engagement / Message preview              */}
      {/* ------------------------------------------------------------------ */}
      <div className={`grid ${ROW2_COLS} ${GAP}`}>
        {/* 4. Time-to-Book Intelligence */}
        <Card>
          <CardTitle index={4}>Time-to-Book Intelligence</CardTitle>

          <div className="grid grid-cols-4 gap-2">
            {timeToBook.stats.map((s) => (
              <div
                key={s.label}
                className="flex min-w-0 flex-col rounded-xl border border-slate-100 bg-slate-50/70 px-1.5 py-3"
              >
                <p className={`leading-snug text-slate-500 ${T.base}`}>{s.label}</p>
                <p
                  className="mt-2 whitespace-nowrap text-[22px] font-extrabold tracking-tight text-slate-900"
                >
                  {s.value}
                </p>
                <p className={`mt-1.5 leading-snug font-medium text-emerald-500 ${T.sm}`}>
                  ▼ {s.delta}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 min-w-0">
            <SubTitle>Time distribution (Search → Booking)</SubTitle>
            <p className={`text-slate-500 ${T.base}`}>Users</p>
            <div className="mt-1 h-[210px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeToBook.distribution}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                  barCategoryGap="34%"
                >
                  <XAxis
                    dataKey="bucket"
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickMargin={8}
                    interval={0}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    formatter={(value) => [value.toLocaleString(), "Users"]}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="users" radius={[8, 8, 8, 8]} barSize={38} isAnimationActive={false}>
                    {timeToBook.distribution.map((d) => (
                      <Cell key={d.bucket} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <ViewLink>View Full Time Analysis</ViewLink>
        </Card>

        {/* 5. Uninstalled Users — Re-engagement */}
        <Card>
          <CardTitle index={5}>Uninstalled Users — Re-engagement</CardTitle>

          <div
            className={`grid grid-cols-3 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 ${PAD}`}
          >
            {uninstalled.stats.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <SubTitle>Segment Uninstalled Users</SubTitle>
              <ul className="space-y-3.5 rounded-xl border border-slate-200 p-3.5">
                {uninstalled.segments.map((s) => (
                  <li key={s.label} className={`flex items-center gap-2 ${T.md}`}>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    </span>
                    <span className="min-w-0 leading-snug text-slate-500">{s.label}</span>
                    <span className="ml-auto whitespace-nowrap font-bold text-slate-900">
                      {s.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <SubTitle>Re-engagement Action</SubTitle>
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="min-w-0">
                    <p className={`leading-snug text-slate-500 ${T.base}`}>Select Channel</p>
                    <div className="relative mt-2">
                      <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className={`w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-2.5 pr-6 text-slate-800 focus:outline-none ${T.md}`}
                      >
                        {uninstalled.channels.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className={`leading-snug text-slate-500 ${T.base}`}>Message Template</p>
                    <div className="relative mt-2">
                      <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className={`w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-2.5 pr-6 text-slate-800 focus:outline-none ${T.md}`}
                      >
                        {uninstalled.templates.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <p className={`mt-3.5 text-slate-500 ${T.base}`}>Estimated Reach</p>
                <p
                  className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.statSm}`}
                >
                  {uninstalled.estimatedReach}
                </p>

                <button
                  type="button"
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-white ${T.lg}`}
                  style={{ backgroundColor: BRAND }}
                >
                  <Send size={14} className="shrink-0" />
                  <span className="truncate">Send {channel}</span>
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`whitespace-nowrap rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 font-bold ${T.base}`}
                  style={{ color: BRAND }}
                >
                  Send SMS
                </button>
                <button
                  type="button"
                  className={`whitespace-nowrap rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 font-bold ${T.base}`}
                  style={{ color: BRAND }}
                >
                  Schedule Campaign
                </button>
              </div>
            </div>
          </div>

          <ViewLink>View Uninstalled Users</ViewLink>
        </Card>

        {/* Quick Message Preview */}
        <Card>
          <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
            Quick Message Preview
          </h2>

          <div className={`rounded-2xl bg-emerald-50 ${PAD}`}>
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                <span className="h-3 w-3 rounded-full border-[3px] border-emerald-600" />
              </span>

              <div
                className={`min-w-0 flex-1 space-y-3.5 leading-relaxed text-slate-800 ${T.md}`}
              >
                <p>Hey {"{{name}}"}! 👋</p>
                <p>We miss you on GloUp! 💜</p>
                <p>
                  Book your favorite services again and{" "}
                  <span className="font-bold">get FLAT 30% OFF* this week!</span>
                </p>
                <p>
                  Zero waiting. Best salons. Best offers.
                  <br />
                  👇
                </p>
                <p>Book now before slots fill up!</p>
                <p>Check &amp; Book Now:</p>
                <div className="flex items-end justify-between gap-2">
                  <span className="min-w-0 truncate text-slate-400">
                    {"{{deeplink}}"}
                  </span>
                  <span className={`shrink-0 whitespace-nowrap text-slate-400 ${T.base}`}>
                    11:30 AM ✓✓
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className={`mt-3.5 text-slate-500 ${T.md}`}>
            Personalized with user name &amp; offer
          </p>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Row 3 — Summary tables                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className={`grid grid-cols-4 ${GAP}`}>
        <Card>
          <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
            Top Profitable Salons
          </h2>
          <MiniTable
            columns={[
              { key: "salon", label: "Salon" },
              { key: "gmv", label: "GMV" },
              { key: "revenue", label: "GloUp Revenue" },
              { key: "contribution", label: "Contribution" },
              {
                key: "margin",
                label: "Margin %",
                align: "right",
                className: "text-emerald-600 font-semibold",
              },
            ]}
            rows={topProfitableSalons}
          />
          <ViewLink>View All</ViewLink>
        </Card>

        <Card>
          <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
            Top Customer Gravity (By Salon)
          </h2>
          <MiniTable
            columns={[
              { key: "salon", label: "Salon" },
              { key: "area", label: "Top Area" },
              { key: "customers", label: "Customers" },
              { key: "distance", label: "Distance", align: "right" },
            ]}
            rows={topGravitySalons}
          />
          <ViewLink>View All</ViewLink>
        </Card>

        <Card>
          <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
            Switching Risk Salons
          </h2>
          <MiniTable
            columns={[
              { key: "salon", label: "Salon" },
              { key: "switching", label: "Switching %" },
              {
                key: "trend",
                label: "Trend",
                render: (row) => <Trend value={row.trend} up={row.up} />,
              },
              { key: "risk", label: "Risk Level", align: "right" },
            ]}
            rows={switchingRiskSalons}
          />
          <ViewLink>View All</ViewLink>
        </Card>

        <Card>
          <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
            Time-to-Book by Category
          </h2>
          <MiniTable
            columns={[
              { key: "category", label: "Category" },
              { key: "time", label: "Avg Time (Search → Book)" },
              {
                key: "trend",
                label: "Trend",
                align: "right",
                render: (row) => <Trend value={row.trend} up={false} />,
              },
            ]}
            rows={timeToBookByCategory}
          />
          <ViewLink>View All</ViewLink>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsIntelligenceV2;
