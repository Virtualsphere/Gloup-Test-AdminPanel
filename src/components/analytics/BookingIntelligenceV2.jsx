import { Fragment, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChartLine,
  CircleDollarSign,
  CircleX,
  Clock,
  Download,
  MapPin,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, rampColor } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  LegendDot,
  RampLegend,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Booking Intelligence" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. The
// booking list (bookingSlice) carries the booking time and amount, so both
// heat maps, the peak lists, the time-slot split and the trend are plain
// group-bys over it once an endpoint returns them for a date range; the
// cancellation rate needs the cancelled bookings too. The date and city
// pickers and the "By ..." selects hold local state only. "Download Report"
// exports the day-of-week grid.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#6D4AE0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const BLUE = "#3B82F6";
const PINK = "#F0527E";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[520fr_443fr_320fr]";
const ROW3_COLS = "grid-cols-[405fr_446fr_432fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1307px of content, so measured sizes carry over at ~1.16x.
const T = {
  nano: "text-[10.5px]", // heat map column labels
  micro: "text-[11px]", // axis text, legend
  xs: "text-[12px]", // grid cells, list sub-lines
  sm: "text-[13px]", // list rows, KPI captions
  base: "text-[14px]", // KPI labels
  title: "text-[16px]", // card titles
  kpi: "text-[26px]", // KPI values
  donut: "text-[22px]", // donut centre total
};

const GAP = "gap-3";
const COMPARE = "vs Jun 01 – Jun 30, 2026";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

// Solid gradient badges with a white glyph, as drawn in the mockup.
const badge = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
const kpis = [
  { label: "Total Bookings", value: "12,842", delta: "18.6%", icon: CalendarCheck, tint: badge("#8B6CF6", "#6D4AE0") },
  { label: "Total Revenue", value: "₹18,72,450", delta: "22.8%", icon: CircleDollarSign, tint: badge("#4CCB7E", "#22A95A") },
  { label: "Total Customers", value: "8,721", delta: "16.2%", icon: UsersRound, tint: badge("#FFB347", "#F58A1F") },
  { label: "Avg. Booking Value", value: "₹146", delta: "6.1%", icon: ChartLine, tint: badge("#4F8DF7", "#2B62E8") },
  // A falling cancellation rate is good news, so its arrow points down in green.
  { label: "Cancellation Rate", value: "4.7%", delta: "1.2%", up: false, good: true, icon: CircleX, tint: badge("#FF7A93", "#F0447A") },
];

// Rows are two-hour slots, columns the hour of the day, as labelled in the
// mockup.
const TOD_HOURS = ["12 AM", "2 AM", "4 AM", "6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"];
const TOD_SLOTS = [
  "12 AM - 2 AM",
  "2 AM - 4 AM",
  "4 AM - 6 AM",
  "6 AM - 8 AM",
  "8 AM - 10 AM",
  "10 AM - 12 PM",
  "12 PM - 2 PM",
  "2 PM - 4 PM",
  "4 PM - 6 PM",
  "6 PM - 8 PM",
  "8 PM - 10 PM",
  "10 PM - 12 AM",
];
const timeOfDay = [
  [12, 8, 5, 7, 10, 14, 18, 20, 16, 12, 9, 6],
  [5, 3, 2, 3, 4, 6, 7, 8, 6, 4, 3, 2],
  [3, 2, 2, 3, 4, 5, 6, 7, 5, 4, 3, 2],
  [8, 6, 6, 10, 18, 28, 35, 42, 36, 28, 18, 10],
  [28, 22, 20, 32, 54, 78, 96, 112, 98, 74, 48, 26],
  [42, 36, 34, 58, 96, 142, 168, 182, 156, 112, 72, 40],
  [48, 44, 42, 72, 112, 168, 198, 215, 186, 128, 84, 48],
  [58, 56, 52, 82, 128, 186, 225, 242, 208, 146, 96, 56],
  [62, 58, 54, 78, 120, 168, 215, 236, 198, 138, 88, 50],
  [48, 42, 38, 56, 92, 132, 168, 182, 152, 108, 72, 42],
  [28, 22, 18, 32, 54, 78, 96, 112, 92, 64, 42, 24],
  [12, 8, 6, 10, 16, 24, 32, 36, 28, 20, 12, 8],
];
const TOD_RAMP = ["#F6F2FF", "#E3D8FC", "#BEA6F7", "#9468EE", "#7141DC"];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_SLOTS = [
  "12 AM - 2 AM",
  "2 AM - 4 AM",
  "4 AM - 6 AM",
  "6 AM - 9 AM",
  "9 AM - 12 PM",
  "12 PM - 3 PM",
  "3 PM - 6 PM",
  "6 PM - 9 PM",
  "9 PM - 12 AM",
];
const dayOfWeek = [
  [16, 14, 12, 11, 13, 18, 20],
  [6, 5, 4, 4, 5, 7, 8],
  [8, 7, 6, 6, 7, 9, 10],
  [120, 112, 108, 105, 118, 148, 156],
  [862, 812, 798, 784, 856, 1026, 1084],
  [1256, 1198, 1156, 1126, 1236, 1482, 1568],
  [1482, 1386, 1324, 1298, 1426, 1712, 1824],
  [1156, 1048, 1006, 968, 1072, 1268, 1348],
  [86, 78, 74, 70, 76, 92, 98],
];
const DOW_RAMP = ["#F0F5FF", "#DCE8FD", "#B3CCFA", "#7FA6F5", "#4A7DE8", "#3B63D9"];

const peakHours = [
  { label: "3 PM – 4 PM", bookings: 2242, color: "#3730A3" },
  { label: "2 PM – 3 PM", bookings: 2198, color: "#8B7CF6" },
  { label: "4 PM – 5 PM", bookings: 2052, color: ORANGE },
  { label: "1 PM – 2 PM", bookings: 1896, color: "#F5A524" },
  { label: "12 PM – 1 PM", bookings: 1756, color: "#FACC15" },
];
const busiestDays = [
  { label: "Saturday", bookings: 7672, color: BRAND },
  { label: "Sunday", bookings: 7020, color: "#5B84E8" },
  { label: "Friday", bookings: 6679, color: ORANGE },
  { label: "Monday", bookings: 6416, color: "#F5A524" },
  { label: "Thursday", bookings: 6053, color: "#FACC15" },
];

// The mockup colours the ring differently from its legend (it merges slots);
// the legend's colours are used for both so they agree.
const timeSlots = [
  { name: "12 AM - 6 AM", value: 268, pct: "2.1%", color: "#8B5CF6" },
  { name: "6 AM - 10 AM", value: 1593, pct: "12.4%", color: "#38BDF8" },
  { name: "10 AM - 2 PM", value: 3171, pct: "24.7%", color: GREEN },
  { name: "2 PM - 6 PM", value: 4856, pct: "37.8%", color: "#FACC15" },
  { name: "6 PM - 10 PM", value: 2384, pct: "18.6%", color: "#FB923C" },
  { name: "10 PM - 12 AM", value: 570, pct: "4.4%", color: PINK },
];

const TREND_DAYS = Array.from({ length: 31 }, (_, i) => `Jul ${String(i + 1).padStart(2, "0")}`);
const TREND_TICKS = ["Jul 01", "Jul 08", "Jul 15", "Jul 22", "Jul 31"];
const THIS_MONTH = [
  500, 472, 540, 505, 560, 610, 655, 640, 700, 668, 720, 705, 760, 800, 845, 780, 690, 650, 700, 745, 770, 720, 650,
  610, 690, 760, 820, 850, 800, 760, 720,
];
const LAST_MONTH = [
  280, 300, 330, 315, 380, 420, 440, 400, 450, 470, 430, 400, 380, 400, 460, 540, 560, 500, 450, 430, 480, 540, 570,
  600, 520, 470, 440, 500, 580, 600, 540,
];
const trend = TREND_DAYS.map((day, i) => ({ day, current: THIS_MONTH[i], previous: LAST_MONTH[i] }));
const THIS_COLOR = "#7C5CF0";
const LAST_COLOR = "#A9B1C2";

const insights = [
  {
    icon: Clock,
    color: "#3B6FE0",
    tint: "#E8EEFC",
    title: "Peak Time Alert",
    text: "Your peak time is 2 PM – 6 PM. Consider adding more staff to reduce wait time.",
  },
  {
    icon: CalendarRange,
    color: "#16A34A",
    tint: "#E3F5E9",
    title: "Weekend Rush",
    text: "Bookings on weekends are 32% higher than weekdays.",
  },
  {
    icon: TrendingUp,
    color: "#E5365F",
    tint: "#FDE8EC",
    title: "Growth Opportunity",
    text: "Early morning (6 AM – 9 AM) bookings are low. Run offers to boost sales.",
  },
];

const DATE_RANGES = ["Jul 01 – Jul 31, 2026", "Jun 01 – Jun 30, 2026", "May 01 – May 31, 2026"];
const CITIES = ["Chennai", "All Cities"];
const BASIS = ["By Bookings", "By Revenue"];
const GRANULARITY = ["By Day", "By Week"];

const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

const Select = ({ size = T.micro, ...props }) => (
  <BaseSelect size={size} className="w-[104px] [&_select]:py-1" {...props} />
);

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.base, value: T.kpi, delta: T.sm, caption: T.sm }}
    iconClass="h-[58px] w-[58px] rounded-xl"
    iconSize={26}
    iconColor="#fff"
    caption={COMPARE}
    up
    className="px-5 py-5"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    size={196}
    inner="70%"
    centerSize={T.donut}
    captionSize={T.sm}
    formatter={(value) => num(value)}
    {...props}
  />
);

// Heat map with the value written in every cell. Text turns white once the
// tint is dark enough to need it.
const NumberGrid = ({ rows, cols, values, ramp, labelWidth, cellHeight, labelSize, cellSize, colSize }) => {
  const max = Math.max(...values.flat());
  return (
    <div
      className="grid min-w-0 items-center"
      style={{ gridTemplateColumns: `${labelWidth}px repeat(${cols.length}, minmax(0, 1fr))`, gap: 3 }}
    >
      <span />
      {cols.map((col) => (
        <span key={col} className={`truncate pb-1 text-center leading-none text-slate-500 ${colSize}`}>
          {col}
        </span>
      ))}

      {values.map((row, r) => (
        <Fragment key={rows[r]}>
          <span className={`whitespace-nowrap leading-none text-slate-600 ${labelSize}`}>{rows[r]}</span>
          {row.map((value, c) => (
            <span
              key={c}
              title={`${rows[r]} · ${cols[c]} · ${num(value)} bookings`}
              className={`grid place-items-center rounded-[3px] font-medium ${cellSize}`}
              style={{
                height: cellHeight,
                background: rampColor(ramp, value / max),
                color: value / max >= 0.55 ? "#fff" : "#475569",
              }}
            >
              {num(value)}
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
};

// Ranked list with a coloured position badge and a bar beside the count.
const RankList = ({ rows, barFrom, barTo }) => {
  const max = Math.max(...rows.map((row) => row.bookings));
  return (
    <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
      {rows.map((row, i) => (
        <li key={row.label} className={`flex items-center gap-3 ${T.sm}`}>
          <span
            className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-bold text-white ${T.micro}`}
            style={{ background: row.color }}
          >
            {i + 1}
          </span>
          <span className="w-[92px] shrink-0 whitespace-nowrap font-medium text-slate-800">{row.label}</span>
          <span className="min-w-0 flex-1">
            <span
              className="block h-[3px] rounded-full"
              style={{
                width: `${(row.bookings / max) * 100}%`,
                background: `linear-gradient(90deg, ${barFrom}, ${barTo})`,
              }}
            />
          </span>
          <span className="shrink-0 whitespace-nowrap text-right text-slate-500">{num(row.bookings)} bookings</span>
        </li>
      ))}
    </ul>
  );
};

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E3E7EF] bg-white px-3 py-2 shadow-lg">
      <p className={`font-bold text-slate-900 ${T.sm}`}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className={`mt-1 flex items-center gap-1.5 text-slate-600 ${T.xs}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-semibold text-slate-900">{num(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

const exportReport = () =>
  downloadCsv(
    "booking-intelligence-day-of-week.csv",
    ["Time slot", ...WEEKDAYS],
    dayOfWeek.map((row, r) => [DOW_SLOTS[r], ...row])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, city, setCity }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Understand booking patterns to grow your business
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <HeaderSelect
          icon={CalendarDays}
          label="Date range"
          value={range}
          onChange={setRange}
          options={DATE_RANGES}
          className="hidden lg:flex"
        />
        <HeaderSelect
          icon={MapPin}
          label="City"
          value={city}
          onChange={setCity}
          options={CITIES}
          className="hidden xl:flex"
        />
        <HeaderButton icon={Download} label="Download report" color={INDIGO} onClick={exportReport}>
          <span className="hidden md:inline">Download Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BookingIntelligenceV2 = ({ title = "Booking Intelligence" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [slotBasis, setSlotBasis] = useState(BASIS[0]);
  const [trendBasis, setTrendBasis] = useState(GRANULARITY[0]);

  return (
    <>
      <PageHeader title={title} range={range} setRange={setRange} city={city} setCity={setCity} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-5 ${GAP}`}>
          {kpis.map(({ icon, tint, ...kpi }) => (
            <KpiTile key={kpi.label} {...kpi} icon={icon} iconTint={tint} />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Heat maps / peak lists                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="px-5 pb-5 pt-5">
            <CardHeader title="Heat Map - Time of Day" info />
            <div className="mt-5">
              <NumberGrid
                rows={TOD_SLOTS}
                cols={TOD_HOURS}
                values={timeOfDay}
                ramp={TOD_RAMP}
                labelWidth={96}
                cellHeight={26}
                labelSize={T.nano}
                cellSize={T.xs}
                colSize={T.nano}
              />
            </div>
            <div className="mt-auto pt-4">
              <RampLegend ramp={TOD_RAMP} from="Low" to="High" size={T.micro} steps={10} width={290} height={9} />
            </div>
          </Card>

          <Card className="px-5 pb-5 pt-5">
            <CardHeader title="Heat Map - Day of Week" />
            <div className="mt-5">
              <NumberGrid
                rows={DOW_SLOTS}
                cols={WEEKDAYS}
                values={dayOfWeek}
                ramp={DOW_RAMP}
                labelWidth={92}
                cellHeight={37}
                labelSize={T.xs}
                cellSize={T.sm}
                colSize={T.xs}
              />
            </div>
            <div className="mt-auto pt-4">
              <RampLegend ramp={DOW_RAMP} from="Low" to="High" size={T.micro} steps={10} width={250} height={9} />
            </div>
          </Card>

          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <Card className="flex-[250] px-5 pb-4 pt-5">
              <CardHeader
                title="Peak Hours"
                info
                right={<span className={`text-slate-500 ${T.micro}`}>By Total Bookings</span>}
              />
              <RankList rows={peakHours} barFrom="#CFC3F8" barTo={BRAND} />
            </Card>

            <Card className="flex-[176] px-5 pb-4 pt-5">
              <CardHeader
                title="Busiest Days"
                right={<span className={`text-slate-500 ${T.micro}`}>By Total Bookings</span>}
              />
              <RankList rows={busiestDays} barFrom="#C9D5F7" barTo="#5B84E8" />
            </Card>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Time slots / trend / insights                            */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-5">
            <CardHeader
              title="Bookings by Time Slot"
              right={<Select value={slotBasis} onChange={setSlotBasis} options={BASIS} />}
            />
            <div className="flex flex-1 items-center gap-6 pt-3">
              <Donut data={timeSlots} center="12,842" caption="Total" />
              <ul className="flex min-w-0 flex-1 flex-col gap-[13px]">
                {timeSlots.map((slot) => (
                  <li key={slot.name} className={`flex items-center gap-2 ${T.sm}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slot.color }} />
                    <span className="min-w-0 flex-1 whitespace-nowrap text-slate-700">{slot.name}</span>
                    <span className="w-[42px] shrink-0 text-right text-slate-500">{slot.pct}</span>
                    <span className="w-[44px] shrink-0 text-right font-medium text-slate-700">{num(slot.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader
              title="Booking Trend"
              right={<Select value={trendBasis} onChange={setTrendBasis} options={GRANULARITY} />}
            />
            <div className="mt-3 flex items-center justify-center gap-6">
              <LegendDot line color={THIS_COLOR} label="This Month" size={T.micro} />
              <LegendDot line color={LAST_COLOR} label="Last Month" size={T.micro} />
            </div>
            <div className="mt-1 min-h-[190px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 14, bottom: 0, left: -6 }}>
                  <defs>
                    <linearGradient id="bi-trend-current" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THIS_COLOR} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={THIS_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bi-trend-previous" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LAST_COLOR} stopOpacity={0.14} />
                      <stop offset="100%" stopColor={LAST_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EEF0F6" vertical={false} />
                  <XAxis
                    dataKey="day"
                    ticks={TREND_TICKS}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 11 }}
                    dy={6}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    domain={[0, 1000]}
                    ticks={[0, 250, 500, 750, 1000]}
                    interval={0}
                    tickFormatter={(v) => (v === 1000 ? "1K" : v)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 11 }}
                    width={38}
                  />
                  <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#CBD2E0", strokeDasharray: "3 3" }} />
                  <Area
                    type="monotone"
                    dataKey="previous"
                    name="Last Month"
                    stroke={LAST_COLOR}
                    strokeWidth={1.8}
                    fill="url(#bi-trend-previous)"
                    dot={{ r: 2.4, fill: LAST_COLOR, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="current"
                    name="This Month"
                    stroke={THIS_COLOR}
                    strokeWidth={2}
                    fill="url(#bi-trend-current)"
                    dot={{ r: 2.6, fill: THIS_COLOR, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Insights & Recommendations" />
            <ul className="mt-4 flex flex-1 flex-col justify-around gap-4">
              {insights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-4">
                    <span
                      className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full"
                      style={{ background: item.tint, color: item.color }}
                    >
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={`font-semibold text-slate-900 ${T.base}`}>{item.title}</p>
                      <p className={`mt-1 text-slate-500 ${T.sm}`}>{item.text}</p>
                    </div>
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

export default BookingIntelligenceV2;
