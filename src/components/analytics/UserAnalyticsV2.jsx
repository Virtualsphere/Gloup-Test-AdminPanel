import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Clock,
  Download,
  LogIn,
  MapPin,
  MonitorSmartphone,
  Repeat2,
  ShoppingCart,
  TrendingDown,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS, CHART_TOOLTIP as TOOLTIP, toSpark as spark } from "../v2/tokens";
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
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "User Analytics Dashboard" mockup, on a
// fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the available width
// (see there for why bigger px sizes in T read smaller on screen).
//
// UI only - every number below is static demo data matching the mockup. There
// is no backend source yet for downloads, logins, DAU/MAU, sessions, screen
// time, retention cohorts or uninstalls: the app has to start reporting usage
// events first. The header pickers hold local state only.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const VIOLET = "#5236E8";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const ORANGE = "#F59E0B";
const PINK = "#EC4899";

// Measured card widths from the mockup, used directly as grid fr units. The
// mockup leaves the right third of the funnel row empty; the funnel card spans
// the full row instead.
const ROW3_COLS = "grid-cols-[331fr_279fr_341fr_356fr]";
const ROW4_COLS = "grid-cols-[331fr_326fr_293fr_356fr]";
const ROW5_COLS = "grid-cols-[316fr_376fr_343fr_266fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1338px of content, so measured sizes carry over at ~1.14x.
const T = {
  micro: "text-[10px]", // column headers, chart captions
  xs: "text-[11px]", // table cells, legends, KPI captions
  sm: "text-[12px]", // KPI labels, deltas, body rows
  title: "text-[13px]", // card titles
  md: "text-[14px]", // funnel stage values
  donut: "text-[16px]", // donut centre totals
  stat: "text-[19px]", // in-card headline numbers
  kpi: "text-[21px]", // KPI values
};

const GAP = "gap-3";
const AXIS = { ...CHART_AXIS, fontSize: 10 };
const COMPARE = "vs May 14 – May 20";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Total Downloads",
    value: "2,43,580",
    delta: "18.6%",
    icon: Download,
    color: VIOLET,
    tint: "#EEEBFD",
    spark: spark([8, 9, 8.6, 9.8, 9.2, 10.4, 9.9, 10.9, 10.3, 11.4, 10.8, 12, 11.4, 12.6, 12.1, 13.6, 13]),
  },
  {
    label: "Total Logins",
    value: "1,82,314",
    delta: "16.4%",
    icon: LogIn,
    color: GREEN,
    tint: "#DCFCE7",
    spark: spark([9, 9.8, 9.4, 10.6, 10.1, 9.7, 10.9, 10.4, 11.2, 10.8, 11.9, 11.3, 12.2, 11.8, 12.9, 13.6, 12.8]),
  },
  {
    label: "Unique Users",
    value: "1,36,729",
    delta: "17.2%",
    icon: Users,
    color: BLUE,
    tint: "#DBEAFE",
    spark: spark([8.4, 9.2, 8.8, 9.6, 9.3, 10.1, 9.8, 10.6, 10.2, 11, 10.5, 11.3, 11, 12.1, 11.6, 12.8, 13.4]),
  },
  {
    label: "1st Time Bookings",
    value: "25,000",
    delta: "18.6%",
    icon: ShoppingCart,
    color: ORANGE,
    tint: "#FEF3C7",
    spark: spark([9.2, 9.6, 9.1, 10.2, 9.7, 9.4, 10.5, 10.1, 10.9, 10.4, 11.3, 10.8, 11.7, 11.2, 12.4, 12, 13.2]),
  },
  {
    label: "DAU",
    value: "28,450",
    delta: "12.7%",
    icon: UserCheck,
    color: PINK,
    tint: "#FCE7F3",
    spark: spark([9.1, 9.8, 9.3, 10.4, 9.6, 10.9, 10.2, 11.1, 10.5, 11.6, 10.9, 12, 11.4, 12.6, 11.9, 13.3, 12.7]),
  },
  {
    label: "MAU",
    value: "1,36,729",
    delta: "17.2%",
    icon: CalendarRange,
    color: VIOLET,
    tint: "#EEEBFD",
    spark: spark([8.7, 9.5, 9, 10.1, 9.6, 10.5, 10, 11.1, 10.6, 11.5, 11, 12.1, 11.5, 12.8, 12.2, 13.5, 12.9]),
  },
];

// Bar heights are as drawn in the mockup (compressed so the last stage stays
// visible), not proportional to the counts.
const funnel = [
  { label: "Downloads", value: "2,43,580", bar: 100 },
  { label: "Logins", value: "1,82,314", bar: 88 },
  { label: "Salon Clicks", value: "1,05,876", bar: 77 },
  { label: "Add to Cart", value: "59,420", bar: 63 },
  { label: "1st Booking", value: "25,000", bar: 46 },
  { label: "Completed Booking", value: "22,680", bar: 28 },
];
const funnelSteps = ["74.8%", "58.1%", "56.1%", "42.1%", "90.7%"];

const DAYS = ["May 21", "May 22", "May 23", "May 24", "May 25", "May 26", "May 27"];

const activityTrend = DAYS.map((day, i) => ({
  day,
  dau: [10200, 13100, 15000, 16900, 19100, 21600, 24300][i],
  mau: [27800, 30100, 32200, 34600, 37300, 41000, 45200][i],
}));

const platforms = [
  { name: "Android", value: 91245, label: "91,245", pct: "66.7%", color: GREEN },
  { name: "iOS", value: 41019, label: "41,019", pct: "30.0%", color: BLUE },
  { name: "Web", value: 4465, label: "4,465", pct: "3.3%", color: ORANGE },
];

const newVsReturning = [
  { name: "New Users", value: 56342, label: "56,342", pct: "41.2%", color: VIOLET },
  { name: "Returning Users", value: 80387, label: "80,387", pct: "58.8%", color: GREEN },
];

const uninstallTrend = DAYS.map((day, i) => ({
  day,
  rate: [5.9, 6.0, 6.1, 6.1, 6.2, 5.9, 6.23][i],
}));

const sessionTrend = DAYS.map((day, i) => ({
  day,
  minutes: [2.15, 2.22, 2.28, 2.32, 2.35, 2.33, 2.57][i],
}));

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_PARTS = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"];

// Share of the busiest slot, rows = DAY_PARTS, columns = WEEKDAYS.
const engagement = [
  [0.18, 0.16, 0.18, 0.2, 0.24, 0.3, 0.28],
  [0.08, 0.06, 0.08, 0.08, 0.1, 0.14, 0.12],
  [0.34, 0.36, 0.38, 0.36, 0.4, 0.3, 0.26],
  [0.52, 0.56, 0.6, 0.58, 0.72, 0.78, 0.7],
  [0.64, 0.66, 0.7, 0.68, 0.84, 1, 0.94],
  [0.58, 0.6, 0.62, 0.6, 0.74, 0.8, 0.72],
];

// Average session length as a share of the 3+ minute top bucket.
const screenTime = [
  [0.2, 0.18, 0.2, 0.22, 0.26, 0.34, 0.32],
  [0.1, 0.08, 0.1, 0.1, 0.12, 0.16, 0.16],
  [0.38, 0.4, 0.42, 0.4, 0.44, 0.48, 0.46],
  [0.6, 0.62, 0.66, 0.64, 0.74, 0.88, 0.86],
  [0.66, 0.7, 0.72, 0.7, 0.8, 1, 0.96],
  [0.56, 0.58, 0.6, 0.58, 0.68, 0.84, 0.8],
];

const ENGAGEMENT_RAMP = ["#F1EEFE", "#C9BEFA", "#8B74F0", "#4C2FE0"];
const SCREEN_TIME_RAMP = ["#ECFDF3", "#A7E9C1", "#4CC38A", "#16A34A"];

const topActions = [
  { action: "Search Salon", users: "1,12,340", pct: 82.1 },
  { action: "View Salon Details", users: "98,512", pct: 72.0 },
  { action: "Click Offer", users: "76,320", pct: 55.8 },
  { action: "Add to Cart", users: "59,420", pct: 43.4 },
  { action: "Apply Coupon", users: "38,245", pct: 27.9 },
  { action: "Make Payment", users: "24,980", pct: 18.2 },
];

// `good` is false where the rise is bad news (drawn red in the mockup).
const keyMetrics = [
  { metric: "Downloads", thisWeek: "2,43,580", lastWeek: "2,05,320", change: "18.6%" },
  { metric: "Logins", thisWeek: "1,82,314", lastWeek: "1,56,809", change: "16.4%" },
  { metric: "Salon Clicks", thisWeek: "1,05,876", lastWeek: "89,210", change: "18.7%" },
  { metric: "Add to Cart", thisWeek: "59,420", lastWeek: "51,230", change: "16.0%" },
  { metric: "1st Bookings", thisWeek: "25,000", lastWeek: "21,100", change: "18.5%" },
  { metric: "Completed Bookings", thisWeek: "22,680", lastWeek: "19,240", change: "17.9%" },
  { metric: "DAU", thisWeek: "28,450", lastWeek: "25,230", change: "12.7%" },
  { metric: "MAU", thisWeek: "1,36,729", lastWeek: "1,16,707", change: "17.2%" },
  { metric: "Avg. Session Duration", thisWeek: "2m 34s", lastWeek: "2m 17s", change: "12.6%" },
  { metric: "Uninstall Rate", thisWeek: "6.23%", lastWeek: "5.63%", change: "0.6%", good: false },
];

const RETENTION_DAYS = ["Day 1", "Day 7", "Day 14", "Day 30", "Day 60", "Day 90"];
const COHORT_MODES = ["By Sign-up Cohort", "By First Booking Cohort"];

const retention = [
  { cohort: "May 19 – May 25", days: ["42.6%", "22.1%", "15.3%", "8.7%", "–", "–"] },
  { cohort: "May 12 – May 18", days: ["41.2%", "21.3%", "14.6%", "8.1%", "4.2%", "–"] },
  { cohort: "May 5 – May 11", days: ["39.8%", "20.4%", "13.6%", "7.6%", "4.1%", "2.2%"] },
  { cohort: "Apr 28 – May 4", days: ["38.7%", "19.6%", "12.9%", "7.1%", "3.8%", "2.0%"] },
  { cohort: "Apr 21 – Apr 27", days: ["37.1%", "18.8%", "12.1%", "6.6%", "3.5%", "1.7%"] },
];

const dropOffs = [
  { step: "After Login", note: "didn't search salon", pct: 24.4 },
  { step: "After Salon List", note: "didn't open details", pct: 21.1 },
  { step: "After Salon Details", note: "didn't add to cart", pct: 18.6 },
  { step: "After Add to Cart", note: "didn't checkout", pct: 15.2 },
  { step: "During Checkout", note: "payment failed/exit", pct: 9.8 },
  { step: "After Payment", note: "booking not completed", pct: 5.3 },
];
const maxDropOff = Math.max(...dropOffs.map((row) => row.pct));

const insights = [
  { id: "downloads", icon: Download, text: <>App downloads increased by 18.6% this week.</> },
  {
    id: "drop-off",
    icon: TrendingDown,
    text: (
      <>
        Major drop-off happening <b className="font-bold">after Salon Details</b>.
      </>
    ),
  },
  {
    id: "screen-time",
    icon: Clock,
    text: (
      <>
        Screen time is highest on <b className="font-bold">Saturday &amp; Sunday</b>.
      </>
    ),
  },
  { id: "retention", icon: Repeat2, text: <>Retention on Day 7 improved by 1.7%.</> },
  { id: "uninstall", icon: TriangleAlert, text: <>Uninstall rate slightly increased, monitor trends.</> },
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const PLATFORMS = [{ value: "all", label: "Platforms" }, "Android", "iOS", "Web"];
const CITIES = ["Chennai", "All Cities"];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => (
  <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />
);

const Select = ({ size = T.micro, ...props }) => <BaseSelect size={size} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.xs }}
    iconClass="h-10 w-10 rounded-xl"
    sparkHeight={36}
    caption={COMPARE}
    up
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    size={132}
    inner="76%"
    centerSize={T.donut}
    captionSize={T.micro}
    formatter={(value) => Number(value).toLocaleString("en-IN")}
    {...props}
  />
);

const HeatGrid = ({ values, ramp, unit }) => (
  <BaseHeatGrid
    values={values}
    ramp={ramp}
    rowLabels={DAY_PARTS}
    colLabels={WEEKDAYS}
    labelSize={T.micro}
    labelWidth={40}
    cellHeight={12}
    gap="4px 3px"
    radius={2}
    title={(r, c) => `${WEEKDAYS[c]} ${DAY_PARTS[r]} · ${Math.round(values[r][c] * 100)}% ${unit}`}
  />
);

// Legend row for the two donut cards: dot, name, then "count (pct)" below.
const DonutLegend = ({ data }) => (
  <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
    {data.map((slice) => (
      <li key={slice.name} className="flex min-w-0 gap-2">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: slice.color }} />
        <span className={`min-w-0 leading-snug ${T.xs}`}>
          <span className="block truncate font-medium text-slate-700">{slice.name}</span>
          <span className="block whitespace-nowrap text-slate-500">
            {slice.label} ({slice.pct})
          </span>
        </span>
      </li>
    ))}
  </ul>
);

// Small line chart shared by the activity, uninstall and session cards.
const TrendChart = ({ data, lines, domain, ticks, tickFormatter, formatter, height }) => (
  <div className="w-full" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -6 }}>
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          dy={6}
          interval={0}
          padding={{ left: 8, right: 8 }}
        />
        <YAxis
          domain={domain}
          ticks={ticks}
          interval={0}
          tickFormatter={tickFormatter}
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          width={40}
        />
        <Tooltip {...TOOLTIP} formatter={formatter} />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="linear"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={1.8}
            dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const thousands = (v) => (v >= 1000 ? `${v / 1000}K` : `${v}`);

const exportKeyMetrics = () =>
  downloadCsv(
    "user-analytics-key-metrics.csv",
    ["Metric", "This Week", "Last Week", "Change"],
    // Every change on the card is an increase.
    keyMetrics.map((row) => [row.metric, row.thisWeek, row.lastWeek, `+${row.change}`])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, platform, setPlatform, city, setCity }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Track user growth, engagement, behavior &amp; retention
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <LiveStamp updated="10:30 AM" className="hidden 2xl:flex" />
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
        <HeaderButton icon={Download} label="Export report" color={VIOLET} onClick={exportKeyMetrics}>
          <span className="hidden md:inline">Export Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UserAnalyticsV2 = ({ title = "User Analytics Dashboard" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [platform, setPlatform] = useState("all");
  const [city, setCity] = useState(CITIES[0]);
  const [cohortMode, setCohortMode] = useState(COHORT_MODES[0]);

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
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, spark: trend, ...kpi }) => (
            <KpiTile
              key={kpi.label}
              {...kpi}
              icon={icon}
              iconColor={color}
              iconTint={tint}
              spark={trend}
              sparkColor={color}
              sparkId={`ua-kpi-${kpi.label.replace(/\W/g, "")}`}
            />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - User funnel                                              */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-5 pb-2 pt-4">
          <div className="flex items-start justify-between gap-4">
            <CardHeader title="User Funnel Overview" />
            <div className="shrink-0 text-right leading-tight">
              <p className={`text-slate-500 ${T.micro}`}>Conversion Rate (Overall)</p>
              <p className={`mt-1 font-extrabold text-slate-900 ${T.md}`}>10.28%</p>
            </div>
          </div>

          <div className="relative mt-1 grid grid-cols-6">
            {funnel.map((stage) => (
              <div key={stage.label} className="flex min-w-0 flex-col items-center">
                <p className={`truncate text-slate-500 ${T.micro}`}>{stage.label}</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.md}`}>
                  {stage.value}
                </p>
                <div className="mt-3 flex h-[108px] w-full items-end justify-center">
                  <span
                    className="block w-[46px] rounded-t-[3px]"
                    style={{ height: `${stage.bar}%`, background: VIOLET }}
                    title={`${stage.label}: ${stage.value}`}
                  />
                </div>
              </div>
            ))}

            {/* Step conversion, centred on the boundary between two stages. */}
            {funnelSteps.map((step, i) => (
              <span
                key={step + i}
                className={`absolute bottom-[38px] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-slate-600 ${T.xs}`}
                style={{ left: `${((i + 1) / funnel.length) * 100}%` }}
              >
                {step}
                <ArrowRight size={11} className="shrink-0 text-slate-400" />
              </span>
            ))}
          </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Activity / platform / new vs returning / uninstalls      */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="User Activity Trend" />
            <div className="mt-2 flex items-center gap-5 pl-1">
              <LegendDot line color={VIOLET} label="DAU" size={T.micro} />
              <LegendDot line color={GREEN} label="MAU" size={T.micro} />
            </div>
            <div className="mt-1">
              <TrendChart
                data={activityTrend}
                height={100}
                domain={[0, 50000]}
                ticks={[0, 10000, 20000, 30000, 40000, 50000]}
                tickFormatter={thousands}
                formatter={(value) => Number(value).toLocaleString("en-IN")}
                lines={[
                  { key: "dau", name: "DAU", color: VIOLET },
                  { key: "mau", name: "MAU", color: GREEN },
                ]}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Users by Platform" />
            <div className="mt-3 flex flex-1 items-center gap-5">
              <Donut data={platforms} center="1,36,729" caption="Total Users" />
              <DonutLegend data={platforms} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="New vs Returning Users" />
            <div className="mt-3 flex flex-1 items-center gap-6">
              <Donut data={newVsReturning} center="1,36,729" caption="Total Users" />
              <DonutLegend data={newVsReturning} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Uninstall Rate" />
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>6.23%</span>
              <Delta value="0.6%" up good={false} size={T.sm} />
              <span className={`truncate text-slate-400 ${T.micro}`}>{COMPARE}</span>
            </div>
            <div className="mt-1">
              <TrendChart
                data={uninstallTrend}
                height={92}
                domain={[0, 9]}
                ticks={[0, 3, 6, 9]}
                tickFormatter={(v) => `${v}%`}
                formatter={(value) => `${value}%`}
                lines={[{ key: "rate", name: "Uninstall Rate", color: VIOLET }]}
              />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Heatmaps / session duration / top actions                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="User Engagement Heatmap" info />
            <div className="mt-3">
              <HeatGrid values={engagement} ramp={ENGAGEMENT_RAMP} unit="of peak activity" />
            </div>
            <div className="mt-auto pt-3">
              <RampLegend
                ramp={ENGAGEMENT_RAMP}
                from="Less Active"
                to="More Active"
                size={T.micro}
                steps={7}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={
                <>
                  Screen Time Heatmap{" "}
                  <span className={`font-medium text-slate-500 ${T.micro}`}>(Avg. Session Duration)</span>
                </>
              }
              info
            />
            <div className="mt-3">
              <HeatGrid values={screenTime} ramp={SCREEN_TIME_RAMP} unit="of the 3+ min bucket" />
            </div>
            <div className="mt-auto pt-3">
              <RampLegend ramp={SCREEN_TIME_RAMP} from="0 sec" to="3+ min" size={T.micro} width={150} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Average Session Duration" />
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>2m 34s</span>
              <span className={`truncate text-slate-400 ${T.micro}`}>{COMPARE}</span>
            </div>
            <div className="mt-auto pt-1">
              <TrendChart
                data={sessionTrend}
                height={92}
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tickFormatter={(v) => `${v} min`}
                formatter={(value) => `${value} min`}
                lines={[{ key: "minutes", name: "Avg. Session", color: VIOLET }]}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Top User Actions"
              right={<span className={`text-slate-500 ${T.micro}`}>Users</span>}
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
              {topActions.map((row, i) => (
                <li key={row.action} className={`flex items-center gap-2 ${T.xs}`}>
                  <span className="w-4 shrink-0 text-slate-500">{i + 1}.</span>
                  <span className="w-[112px] shrink-0 truncate text-slate-700">{row.action}</span>
                  <span className="min-w-0 flex-1">
                    <Meter pct={row.pct} color={VIOLET} height={3} track="transparent" />
                  </span>
                  <span className="w-[104px] shrink-0 whitespace-nowrap text-right text-slate-600">
                    {row.users} ({row.pct.toFixed(1)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Key metrics / retention / drop-offs / insights           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Key Metrics Summary" info />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  {["Metric", "This Week", "Last Week", "Change"].map((h, i) => (
                    <th
                      key={h}
                      className={`pb-2 font-medium text-slate-500 ${T.micro} ${i ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keyMetrics.map((row) => (
                  <tr key={row.metric} className="h-[18px]">
                    <td className={`whitespace-nowrap py-0 pr-2 text-slate-700 ${T.xs}`}>
                      {row.metric}
                    </td>
                    <td className={`whitespace-nowrap py-0 pr-2 text-right text-slate-700 ${T.xs}`}>
                      {row.thisWeek}
                    </td>
                    <td className={`whitespace-nowrap py-0 pr-2 text-right text-slate-500 ${T.xs}`}>
                      {row.lastWeek}
                    </td>
                    <td className={`py-0 text-right ${T.xs}`}>
                      <Delta value={row.change} up good={row.good !== false} size={T.xs} iconSize={10} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="User Retention Cohort"
              info
              subtitle="% of users who came back and used the app"
              right={
                <Select
                  value={cohortMode}
                  onChange={setCohortMode}
                  options={COHORT_MODES}
                  className="w-[132px] [&_select]:py-1.5"
                  truncate
                />
              }
            />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Cohort", ...RETENTION_DAYS].map((h, i) => (
                    <th
                      key={h}
                      className={`pb-2.5 font-medium text-slate-500 ${T.micro} ${i ? "text-center" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retention.map((row) => (
                  <tr key={row.cohort}>
                    <td className={`whitespace-nowrap py-[7px] pr-2 text-slate-700 ${T.xs}`}>
                      {row.cohort}
                    </td>
                    {row.days.map((value, i) => (
                      <td
                        key={RETENTION_DAYS[i]}
                        className={`whitespace-nowrap py-[7px] text-center ${T.xs} ${
                          value === "–" ? "text-slate-400" : "text-slate-700"
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader title="User Drop-off Points" info subtitle="Where users leave the app" />
            <p className={`mt-2 text-right text-slate-500 ${T.micro}`}>Drop-off rate</p>
            <ul className="mt-1.5 flex flex-1 flex-col justify-around gap-2">
              {dropOffs.map((row) => (
                <li key={row.step} className={`flex items-center gap-3 ${T.xs}`}>
                  <span className="w-[196px] shrink-0 truncate text-slate-700">
                    {row.step} <span className="text-slate-500">({row.note})</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <Meter
                      pct={(row.pct / maxDropOff) * 100}
                      color={VIOLET}
                      height={3}
                      track="transparent"
                    />
                  </span>
                  <span className="w-[38px] shrink-0 text-right text-slate-600">{row.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <div
            className="flex min-w-0 flex-col rounded-2xl p-4 text-white"
            style={{ background: `linear-gradient(160deg, #5B3FF0, ${VIOLET} 55%, #4325D6)` }}
          >
            <h2 className={`font-bold ${T.title}`}>Insights</h2>
            <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
              {insights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className={`flex items-center gap-3 leading-snug ${T.xs}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/30 bg-white/10">
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 text-white/90">{item.text}</span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className={`mt-2.5 flex w-full items-center gap-2 rounded-lg bg-white/15 px-4 py-2 font-semibold transition-colors hover:bg-white/25 ${T.sm}`}
            >
              View Full Insights Report
              <ArrowRight size={14} className="shrink-0" />
            </button>
          </div>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default UserAnalyticsV2;
