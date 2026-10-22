import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Gift,
  IndianRupee,
  MapPin,
  MessageCircle,
  MessageSquareText,
  OctagonAlert,
  ShoppingCart,
  TriangleAlert,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  Card,
  Donut as BaseDonut,
  HeaderBell,
  HeaderSelect,
  LegendDot as BaseLegendDot,
  Meter,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Dashboard - Real-time intelligence to grow
// GloUp" mockup (a separate page from Dashboard V2, which keeps its own mockup),
// on a fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the available
// width (see there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup, and
// the date, period and refresh pickers hold local state only. Nothing here has
// an endpoint yet. The two cards the existing dashboard payload could feed
// first are the booking-frequency and level-conversion ones:
// dashboardSlice getDashboard -> customer_funnel / customer_segments /
// repeat_booking_rate_by_month (already rendered by components/dashboard/
// CustomerFunnel.jsx, CustomerSegments.jsx and RepeatBookingsChart.jsx).
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const BLUE = "#2E6CF0";
const GREEN = "#12B76A";
const ORANGE = "#F59E0B";
const RED = "#F04438";
const PINK = "#EC4899";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW_COLS = "grid-cols-[472fr_399fr_416fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1313px of content, so measured sizes carry over at ~1.16x.
const T = {
  micro: "text-[10px]", // uppercase column headers, axis text
  xs: "text-[11px]", // table cells, legends, captions
  sm: "text-[12px]", // body, links
  title: "text-[13px]", // card titles
  kpi: "text-[22px]", // KPI values
  donut: "text-[22px]", // donut centre totals
};

const GAP = "gap-3";
const PAD = "p-4";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  { label: "High-Intent Users", value: "1,284", caption: "Users who almost booked", link: "View Details", icon: UsersRound, color: BRAND, tint: "#EEEAFD" },
  { label: "Dropoff at Checkout", value: "312", caption: "Users dropped at checkout", link: "View Funnel", icon: ShoppingCart, color: "#F97316", tint: "#FFEDD5" },
  { label: "1st Time Users (Aug)", value: "642", caption: "New users this month", link: "View Tracker", icon: UserPlus, color: GREEN, tint: "#DCFCE7" },
  { label: "Users for 2nd Booking", value: "271", caption: "Active but not booked again", link: "View Details", icon: Users, color: BLUE, tint: "#E0EBFF" },
  { label: "Empty Slot Opportunity", value: "1,842", caption: "Slots available today", link: "View Opportunities", icon: CalendarClock, color: PINK, tint: "#FDE7F3" },
  { label: "Potential Revenue", value: "₹7.4L", caption: "From empty slots", link: "View Details", icon: IndianRupee, color: GREEN, tint: "#DCFCE7" },
];

const DEMAND_STATUS = {
  high: { label: "High Demand", color: RED },
  balanced: { label: "Balanced", color: GREEN },
  moderate: { label: "Moderate Demand", color: ORANGE },
  low: { label: "Low Supply", color: ORANGE },
};

const locations = [
  { name: "Tambaram", users: "4,820", active: "2,140", bookings: "420", conversion: "8.7%", status: "high" },
  { name: "Velachery", users: "3,420", active: "1,680", bookings: "356", conversion: "9.4%", status: "balanced" },
  { name: "Perungudi", users: "2,580", active: "1,240", bookings: "284", conversion: "9.8%", status: "moderate" },
  { name: "Anna Nagar", users: "2,240", active: "1,020", bookings: "210", conversion: "8.4%", status: "balanced" },
  { name: "Porur", users: "1,980", active: "860", bookings: "142", conversion: "7.2%", status: "low" },
];

const supplyDemand = [
  { area: "Tambaram", demand: 850, capacity: 590 },
  { area: "Velachery", demand: 480, capacity: 660 },
  { area: "Perungudi", demand: 360, capacity: 570 },
  { area: "Anna Nagar", demand: 340, capacity: 630 },
  { area: "Porur", demand: 330, capacity: 230 },
];

// The mockup draws the first segment green in the ring but violet in the
// legend; the ring's colour is used for both so they agree.
const tracker = [
  { name: "Already Booked Again", value: 184, pct: "28.7%", color: GREEN, text: "#0E9F6E" },
  { name: "Active but Not Booked", value: 271, pct: "42.2%", color: "#F97316", text: "#EA580C" },
  { name: "No Activity", value: 127, pct: "19.8%", color: "#FBBF24", text: "#D18B05" },
  { name: "Churn Risk", value: 60, pct: "9.3%", color: RED, text: "#DC2626" },
];

// `bar` is the fill as drawn in the mockup (not strictly proportional).
const frequency = [
  { label: "Never Booked", users: "21,420", pct: "83.0%", bar: 100, color: BRAND },
  { label: "1 Booking", users: "2,180", pct: "8.5%", bar: 56, color: BLUE },
  { label: "2 Bookings", users: "980", pct: "3.8%", bar: 47, color: "#3FA1E8" },
  { label: "3 – 4 Bookings", users: "620", pct: "2.4%", bar: 43, color: "#12A87A" },
  { label: "5 – 9 Bookings", users: "380", pct: "1.5%", bar: 37.5, color: "#F5B83D" },
  { label: "10+ Bookings", users: "120", pct: "0.5%", bar: 34.5, color: "#F0584A" },
];

const conversion = [
  { step: "1st → 2nd Booking", converted: "675 / 2,180", rate: 31.0 },
  { step: "2nd → 3rd Booking", converted: "451 / 980", rate: 46.0 },
  { step: "3rd → 5th Booking", converted: "323 / 620", rate: 52.1 },
  { step: "5th → 10th Booking", converted: "82 / 120", rate: 68.3 },
];

const almostBooked = [
  { name: "Selected Slot", value: 420, pct: "32.7%", color: BRAND },
  { name: "Reached Checkout", value: 318, pct: "24.8%", color: "#22B8CF" },
  { name: "Viewed Multiple Salons", value: 546, pct: "42.5%", color: "#3B82F6" },
];

const funnel = [
  { stage: "App Opened", users: 4820, drop: "-", dropPct: "-" },
  { stage: "Viewed Salon", users: 2940, drop: "1,880", dropPct: "39%" },
  { stage: "Viewed Service", users: 1920, drop: "1,020", dropPct: "35%" },
  { stage: "Selected Slot", users: 1140, drop: "780", dropPct: "41%" },
  { stage: "Checkout Started", users: 680, drop: "460", dropPct: "40%" },
  { stage: "Booking Completed", users: 512, drop: "168", dropPct: "25%" },
];
const FUNNEL_BAR_MAX = 46; // px for the first stage
const dropReasons = ["No suitable slots", "Price too high", "Long distance", "Extra charges"];

const daysToSecond = [
  { label: "0 – 7 Days", users: 82, color: BLUE },
  { label: "8 – 15 Days", users: 61, color: BRAND },
  { label: "16 – 30 Days", users: 29, color: "#D63FBE" },
  { label: "31+ Days", users: 12, color: RED },
];

const alerts = [
  { icon: TriangleAlert, color: RED, tint: "#FEE4E2", text: "312 high-intent users didn't complete booking today.", action: "Take Action" },
  { icon: OctagonAlert, color: "#EA580C", tint: "#FFEDD5", text: "84 booking attempts failed due to payment/technical issues.", action: "Investigate" },
  { icon: TriangleAlert, color: "#EA580C", tint: "#FFEDD5", text: "27 salons have unusually high empty slots today.", action: "Create Offer" },
  { icon: MapPin, color: "#EA580C", tint: "#FFEDD5", text: "6 locations have demand higher than available capacity.", action: "View Locations" },
  { icon: TriangleAlert, color: RED, tint: "#FEE4E2", text: "Cancellations increased by 18% compared to yesterday.", action: "View Cancellations" },
];

const DATES = ["1 Sep 2026", "31 Aug 2026", "30 Aug 2026"];
const PERIODS = ["This Month", "Last Month", "This Week", "Last 90 Days"];
const REFRESH = ["15 sec", "30 sec", "1 min", "5 min"];
const CARD_PERIODS = ["Today", "This Week", "This Month"];

const compact = (v) => (v >= 1000 ? `${v / 1000}K` : `${v}`);

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardTitle = ({ index, right, children }) => (
  <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
    <h2 className={`min-w-0 truncate font-extrabold uppercase tracking-wide text-slate-900 ${T.title}`}>
      {index}. {children}
    </h2>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

const Select = (props) => (
  <BaseSelect size={T.micro} className="w-[98px] [&_select]:py-1" {...props} />
);

// The card-header period dropdown; each card keeps its own choice.
const PeriodSelect = ({ initial, options = CARD_PERIODS }) => {
  const [value, setValue] = useState(initial);
  return <Select value={value} onChange={setValue} options={options} />;
};

const ViewLink = ({ children }) => (
  <button
    type="button"
    className={`mt-auto flex w-full items-center justify-center gap-1.5 pt-3 font-semibold hover:underline ${T.sm}`}
    style={{ color: BRAND }}
  >
    {children}
    <ArrowRight size={13} className="shrink-0" />
  </button>
);

const Th = ({ children, className = "" }) => (
  <th className={`pb-2.5 font-semibold uppercase tracking-wide text-slate-500 ${T.micro} ${className}`}>
    {children}
  </th>
);

// Header cell for the div-based grids (a <th> is only valid inside a table).
const ColHead = ({ children, className = "" }) => (
  <span className={`font-semibold uppercase tracking-wide text-slate-500 ${T.micro} ${className}`}>
    {children}
  </span>
);

const Donut = (props) => (
  <BaseDonut centerSize={T.donut} captionSize={T.xs} formatter={(v) => Number(v).toLocaleString("en-IN")} {...props} />
);

const LegendSquare = ({ color, label }) => (
  <BaseLegendDot square color={color} label={label} size={T.xs} />
);

const alertCount = 12;

// Date, period and auto-refresh live in the app bar next to the title.
const PageHeader = ({ title, date, setDate, period, setPeriod, refresh, setRefresh }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Real-time intelligence to grow GloUp</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <HeaderSelect
          icon={CalendarDays}
          label="Date"
          value={date}
          onChange={setDate}
          options={DATES}
          className="hidden lg:flex"
        />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={PERIODS}
          className="hidden xl:flex"
        />

        {/* Static: the demo data never refreshes. */}
        <span className="hidden items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="leading-tight">
            <span className="block whitespace-nowrap text-[11px] font-semibold text-slate-700">Auto refresh</span>
            <span className="relative block">
              <select
                value={refresh}
                onChange={(e) => setRefresh(e.target.value)}
                aria-label="Auto refresh interval"
                className="cursor-pointer appearance-none bg-transparent pr-3.5 text-[10px] text-slate-500 focus:outline-none"
              >
                {REFRESH.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                size={10}
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </span>
          </span>
        </span>

        <HeaderBell count={alertCount} color={RED} />
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const GrowthDashboardV2 = ({ title = "Dashboard" }) => {
  const [date, setDate] = useState(DATES[0]);
  const [period, setPeriod] = useState(PERIODS[0]);
  const [refresh, setRefresh] = useState(REFRESH[1]);

  return (
    <>
      <PageHeader
        title={title}
        date={date}
        setDate={setDate}
        period={period}
        setPeriod={setPeriod}
        refresh={refresh}
        setRefresh={setRefresh}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - Action tiles                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className={`${PAD} py-[18px]`}>
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl"
                    style={{ background: kpi.tint }}
                  >
                    <Icon size={24} style={{ color: kpi.color }} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold uppercase tracking-wide text-slate-600 ${T.micro}`}>
                      {kpi.label}
                    </p>
                    <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>
                      {kpi.value}
                    </p>
                    <p className={`mt-0.5 truncate text-slate-500 ${T.xs}`}>{kpi.caption}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`mt-3 flex items-center gap-1.5 self-start pl-[64px] font-semibold hover:underline ${T.xs}`}
                  style={{ color: BRAND }}
                >
                  {kpi.link}
                  <ArrowRight size={12} className="shrink-0" />
                </button>
              </Card>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Location / supply vs demand / first -> second booking     */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className={PAD}>
            <CardTitle index={1} right={<PeriodSelect initial="This Month" />}>
              User Location Intelligence
            </CardTitle>

            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Location</Th>
                  <Th className="text-right">Users</Th>
                  <Th className="text-right">Active Users</Th>
                  <Th className="text-right">Bookings</Th>
                  <Th className="text-right">Conversion</Th>
                  <Th className="pl-4">Demand / Supply</Th>
                </tr>
              </thead>
              <tbody>
                {locations.map((row) => {
                  const status = DEMAND_STATUS[row.status];
                  return (
                    <tr key={row.name} className="h-[32px]">
                      <td className={`whitespace-nowrap pr-2 font-medium text-slate-800 ${T.xs}`}>{row.name}</td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.users}</td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.active}</td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.bookings}</td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.conversion}</td>
                      <td className={`whitespace-nowrap pl-4 font-semibold ${T.xs}`} style={{ color: status.color }}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: status.color }} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ViewLink>View All Locations</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={2} right={<PeriodSelect initial="Today" />}>
              Salon Supply vs Customer Demand
            </CardTitle>

            <div className="flex items-center gap-5">
              <LegendSquare color={BRAND} label="Customer Demand (Searches)" />
              <LegendSquare color={GREEN} label="Available Salon Capacity (Slots)" />
            </div>

            <div className="mt-1 min-h-[180px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplyDemand} margin={{ top: 8, right: 6, bottom: 0, left: -8 }} barGap={3}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="area" tickLine={false} axisLine={false} tick={AXIS} dy={4} interval={0} />
                  <YAxis
                    domain={[0, 1000]}
                    ticks={[0, 250, 500, 750, 1000]}
                    interval={0}
                    tickFormatter={compact}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={40}
                  />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(91,63,240,0.05)" }} />
                  <Bar dataKey="demand" name="Customer demand" fill={BRAND} barSize={19} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="capacity" name="Salon capacity" fill={GREEN} barSize={19} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ViewLink>View Full Analysis</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={3} right={<PeriodSelect initial="This Month" />}>
              First Booking → Second Booking Tracker
            </CardTitle>

            <div className="flex flex-1 items-center gap-5">
              <Donut data={tracker} size={176} inner="64%" center="642" caption="1st Time Users" />
              <ul className="flex min-w-0 flex-1 flex-col gap-[18px]">
                {tracker.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate" style={{ color: row.text }}>
                      {row.name}
                    </span>
                    <span className="w-[28px] shrink-0 text-right font-bold text-slate-900">{row.value}</span>
                    <span className="w-[40px] shrink-0 text-right font-semibold" style={{ color: GREEN }}>
                      {row.pct}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <ViewLink>View Full Tracker</ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Frequency / level conversion / almost booked              */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className={PAD}>
            <CardTitle index={4} right={<PeriodSelect initial="This Month" />}>
              Booking Frequency Intelligence
            </CardTitle>

            <div className="grid grid-cols-[1fr_76px_76px] items-center gap-y-[5px]">
              <span />
              <ColHead className="text-right">Users</ColHead>
              <ColHead className="text-right">% of Total</ColHead>

              {frequency.map((row) => (
                <div key={row.label} className="contents">
                  <span className="block w-[272px] max-w-full">
                    <span
                      className={`flex h-[22px] items-center rounded-[4px] px-3 font-semibold text-white ${T.xs}`}
                      style={{ width: `${row.bar}%`, minWidth: 92, background: row.color }}
                    >
                      <span className="truncate">{row.label}</span>
                    </span>
                  </span>
                  <span className={`text-right text-slate-700 ${T.xs}`}>{row.users}</span>
                  <span className={`text-right text-slate-700 ${T.xs}`}>{row.pct}</span>
                </div>
              ))}
            </div>

            <ViewLink>View Full Report</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={5} right={<PeriodSelect initial="This Month" />}>
              Conversion Between Levels
            </CardTitle>

            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>From → To</Th>
                  <Th className="text-center">Converted Users</Th>
                  <Th>Conversion Rate</Th>
                </tr>
              </thead>
              <tbody>
                {conversion.map((row) => (
                  <tr key={row.step} className="h-[33px]">
                    <td className={`whitespace-nowrap pr-2 font-medium text-slate-800 ${T.xs}`}>{row.step}</td>
                    <td className={`whitespace-nowrap pr-2 text-center text-slate-700 ${T.xs}`}>{row.converted}</td>
                    <td className="pl-1">
                      <span className="flex items-center gap-2.5">
                        <span className="w-[54px] shrink-0">
                          <Meter
                            pct={row.rate}
                            height={5}
                            color="linear-gradient(90deg,#6D3AE8,#3B82F6)"
                          />
                        </span>
                        <span className={`text-slate-700 ${T.xs}`}>{row.rate.toFixed(1)}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ViewLink>View Cohort Analysis</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={6} right={<PeriodSelect initial="Today" />}>
              Users Who Almost Booked
            </CardTitle>

            <div className="flex items-center gap-5">
              <Donut data={almostBooked} size={132} inner="68%" center="1,284" caption="Total Users" />
              <ul className="min-w-0 flex-1 divide-y divide-slate-100">
                {almostBooked.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 py-[9px] ${T.xs}`}>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                    <span className="w-[28px] shrink-0 text-right font-bold text-slate-900">{row.value}</span>
                    <span className="w-[40px] shrink-0 text-right font-semibold" style={{ color: GREEN }}>
                      {row.pct}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`mt-3.5 grid grid-cols-3 ${GAP}`}>
              {[
                { label: "Send Push", icon: MessageSquareText, background: BRAND },
                { label: "Send WhatsApp", icon: MessageCircle, background: "#12A150" },
                { label: "Create Offer", icon: Gift, background: "#1E78E8" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-semibold text-white transition-opacity hover:opacity-90 ${T.xs}`}
                    style={{ background: action.background }}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>

            <ViewLink>View All</ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Drop-off / days to 2nd booking / what needs attention     */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className={PAD}>
            <CardTitle index={7} right={<PeriodSelect initial="Today" />}>
              Booking Drop-off Detector
            </CardTitle>

            <div className="flex min-w-0 flex-1 gap-4">
              <table className="min-w-0 flex-1 table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Stage</Th>
                    <Th>Users</Th>
                    <Th className="text-right">Drop</Th>
                    <Th className="text-right">Drop %</Th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.map((row) => (
                    <tr key={row.stage} className="h-[28px]">
                      <td className={`whitespace-nowrap pr-2 font-medium text-slate-800 ${T.xs}`}>{row.stage}</td>
                      <td className="pr-2">
                        <span className="flex items-center gap-2">
                          <span className="w-[46px] shrink-0">
                            <span
                              className="block h-[10px] rounded-[2px]"
                              style={{
                                width: Math.max(12, (row.users / funnel[0].users) * FUNNEL_BAR_MAX),
                                background: "#8B74F5",
                              }}
                            />
                          </span>
                          <span className={`text-slate-700 ${T.xs}`}>{row.users.toLocaleString("en-IN")}</span>
                        </span>
                      </td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.drop}</td>
                      <td className={`whitespace-nowrap text-right text-slate-700 ${T.xs}`}>{row.dropPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="w-[168px] shrink-0 rounded-xl border border-[#FBE5D6] bg-[#FFF6EF] p-3">
                <p className={`flex items-center gap-1.5 font-bold ${T.xs}`} style={{ color: RED }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: RED }} />
                  Biggest Drop
                </p>
                <p className={`mt-1.5 font-bold text-slate-900 ${T.sm}`}>Service → Slot Selection</p>
                <p className={`mt-1 text-slate-500 ${T.micro}`}>41% users are leaving at this stage.</p>

                <p className={`mt-3 font-bold text-slate-900 ${T.xs}`}>Top Reasons (AI Insight)</p>
                <ul className="mt-1.5 space-y-1.5">
                  {dropReasons.map((reason) => (
                    <li key={reason} className={`flex items-center gap-1.5 text-slate-500 ${T.micro}`}>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ViewLink>View Full Funnel</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={8} right={<PeriodSelect initial="This Month" />}>
              Days to 2nd Booking
            </CardTitle>
            <p className={`text-slate-500 ${T.micro}`}>Users</p>

            <div className="min-h-[180px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daysToSecond} margin={{ top: 22, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} dy={4} interval={0} />
                  <YAxis
                    domain={[0, 300]}
                    ticks={[0, 75, 150, 225, 300]}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={40}
                  />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(91,63,240,0.05)" }} />
                  <Bar dataKey="users" name="Users" barSize={34} radius={[3, 3, 0, 0]}>
                    {daysToSecond.map((d) => (
                      <Cell key={d.label} fill={d.color} />
                    ))}
                    <LabelList
                      dataKey="users"
                      position="top"
                      offset={6}
                      style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ViewLink>View Cohort Details</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={9}>What Needs Attention</CardTitle>

            <ul className="flex flex-col gap-2">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <li
                    key={alert.text}
                    className="flex items-center gap-2.5 rounded-lg border border-[#EEF0F5] px-2.5 py-[7px]"
                  >
                    <span
                      className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md"
                      style={{ background: alert.tint, color: alert.color }}
                    >
                      <Icon size={13} />
                    </span>
                    <span className={`min-w-0 flex-1 text-slate-800 ${T.micro}`}>{alert.text}</span>
                    <button
                      type="button"
                      className={`flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold hover:underline ${T.micro}`}
                      style={{ color: BRAND }}
                    >
                      {alert.action}
                      <ArrowRight size={11} className="shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <ViewLink>View All Alerts</ViewLink>
          </Card>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default GrowthDashboardV2;
