import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  Clock,
  Contact,
  Download,
  Globe,
  MapPin,
  RefreshCw,
  Repeat,
  UsersRound,
  Users,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  HeatGrid as BaseHeatGrid,
  KpiTile as BaseKpiTile,
  LegendDot,
  Meter,
  RampLegend,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "User Analytics" mockup (Jul 01 - Jul 31
// overview; a separate page from User Analytics Dashboard), on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. The
// user list behind it exists (allUsersSlice, see UsersV2.jsx), but the city /
// device / demographics splits, the activity heatmap, funnel and engagement
// series need event data the apps don't report yet. The header pickers and the
// card selects hold local state only.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const VIOLET = "#6D4AE0";
const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const ORANGE = "#F97316";
const RED = "#F0455A";
const PINK = "#F25C8A";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW_COLS = "grid-cols-[435fr_414fr_423fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1300px of content, so measured sizes carry over at ~1.17x.
const T = {
  tiny: "text-[10.5px]", // axis text, captions
  xs: "text-[11.5px]", // table cells, legend rows
  sm: "text-[12.5px]", // KPI labels, body
  title: "text-[15px]", // card titles
  kpi: "text-[24px]", // KPI values
  donut: "text-[17px]", // donut centre totals
};

const GAP = "gap-3";
const COMPARE = "vs Jun 01 – Jun 30, 2026";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  { label: "Total Users", value: "56,782", delta: "18.6%", icon: Users, color: "#6D4AE0" },
  { label: "New Users", value: "12,456", delta: "21.3%", icon: Globe, color: "#1FB76A" },
  { label: "Active Users", value: "28,934", delta: "16.8%", icon: UsersRound, color: "#F59E0B" },
  { label: "Returning Users", value: "23,848", delta: "14.2%", icon: Contact, color: "#2D7CF0" },
  { label: "User Retention (30 Days)", value: "42.6%", delta: "3.4%", icon: RefreshCw, color: "#F0455A" },
];

// 31 days of fixed wavy upward series (no randomness).
const DAYS = Array.from({ length: 31 }, (_, i) => `Jul ${String(i + 1).padStart(2, "0")}`);
const DAY_TICKS = ["Jul 01", "Jul 08", "Jul 15", "Jul 22", "Jul 31"];
const series = (base, slope, amp, freq, phase = 0) =>
  DAYS.map((_, i) => Math.round(base + slope * i + amp * Math.sin(i * freq + phase)));

const growth = DAYS.map((day, i) => ({
  day,
  total: series(4200, 1790, 1500, 1.1)[i],
  fresh: series(1400, 990, 1250, 0.9, 1)[i],
}));

const engagement = DAYS.map((day, i) => ({
  day,
  dau: series(3400, 190, 650, 1.3)[i],
  wau: series(12500, 320, 800, 1.0, 2)[i],
  mau: series(26500, 380, 900, 0.8, 4)[i],
}));

const cities = [
  { name: "Chennai", value: 25678, pct: "45.2%", color: VIOLET },
  { name: "Bangalore", value: 10612, pct: "18.7%", color: BLUE },
  { name: "Hyderabad", value: 7046, pct: "12.4%", color: GREEN },
  { name: "Coimbatore", value: 4714, pct: "8.3%", color: "#FBBF24" },
  { name: "Madurai", value: 3180, pct: "5.6%", color: ORANGE },
  { name: "Others", value: 5552, pct: "9.8%", color: PINK },
];

const devices = [
  { name: "Android", value: 44565, pct: "78.5%", color: BLUE },
  { name: "iOS", value: 10914, pct: "19.2%", color: GREEN },
  { name: "Web", value: 1303, pct: "2.3%", color: RED },
];

const ages = [
  { label: "18 – 24", pct: 28.6 },
  { label: "25 – 34", pct: 34.7 },
  { label: "35 – 44", pct: 22.1 },
  { label: "45 – 54", pct: 9.8 },
  { label: "55+", pct: 4.8 },
];
const maxAge = Math.max(...ages.map((row) => row.pct));

const genders = [
  { name: "Male", value: 62.3, pct: "62.3%", color: VIOLET },
  { name: "Female", value: 37.1, pct: "37.1%", color: GREEN },
  { name: "Other", value: 0.6, pct: "0.6%", color: ORANGE },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Hour labels: every fourth column of the 24 is named, the rest are blank.
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) =>
  h % 4 === 0 ? `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? "AM" : "PM"}` : ""
);
// Quiet overnight, busy through the evening, a touch busier at the weekend.
const HOUR_CURVE = [0.16, 0.12, 0.1, 0.1, 0.12, 0.18, 0.28, 0.4, 0.5, 0.55, 0.58, 0.62, 0.66, 0.62, 0.6, 0.64, 0.72, 0.82, 0.92, 1, 0.96, 0.86, 0.66, 0.38];
const DAY_BOOST = [0.82, 0.86, 0.9, 0.92, 0.98, 1, 0.96];
const activity = DAY_BOOST.map((boost) => HOUR_CURVE.map((v) => Math.min(1, +(v * boost).toFixed(3))));
const ACTIVITY_RAMP = ["#F3F0FF", "#D9D0FB", "#A996F5", "#7A5CF0", "#5B3FF0"];

const actions = [
  { label: "Search Salon", value: 45672 },
  { label: "View Salon Details", value: 38924 },
  { label: "Check Pricing", value: 34221 },
  { label: "Add to Cart", value: 28146 },
  { label: "Place Booking", value: 22987 },
  { label: "Apply Offer", value: 16842 },
  { label: "Write Review", value: 8421 },
];

// The mockup draws the fourth band green, against an amber legend dot; the
// legend colour is used for both so they agree.
const funnel = [
  { name: "App Open", users: "56,782", pct: "100%", color: "#7E6CF5" },
  { name: "Search Salon", users: "45,672", pct: "80.5%", color: "#3B9AF2" },
  { name: "View Salon", users: "38,924", pct: "68.6%", color: "#34B368" },
  { name: "Add to Cart", users: "28,146", pct: "49.6%", color: "#F7C233" },
  { name: "Place Booking", users: "22,987", pct: "40.5%", color: "#F5933A" },
  { name: "Booking Completed", users: "19,432", pct: "34.2%", color: "#F0507A" },
];

const segments = [
  { segment: "New Users", users: "12,456", share: "21.9%", bookings: "3,201", aov: "₹486" },
  { segment: "Active Users", users: "16,478", share: "29.0%", bookings: "8,924", aov: "₹512" },
  { segment: "Loyal Users", users: "15,236", share: "26.8%", bookings: "10,987", aov: "₹548" },
  { segment: "At Risk Users", users: "7,892", share: "13.9%", bookings: "2,145", aov: "₹432" },
  { segment: "Inactive Users", users: "4,720", share: "8.3%", bookings: "512", aov: "₹398" },
];

const insights = [
  { icon: Clock, color: "#5B3FF0", tint: "#F1EEFE", title: "Peak Usage Time", lead: "6 PM – 9 PM", caption: "is the most active time for your users." },
  { icon: CalendarCheck2, color: "#0E9F6E", tint: "#EDF9F2", title: "High Conversion on Weekends", leadStat: "34%", lead: "higher booking conversion", caption: "on Saturdays & Sundays." },
  { icon: Repeat, color: "#D97706", tint: "#FEF6E7", title: "Repeat Booking Users", leadStat: "61%", lead: "of users book again", caption: "within 30 days." },
  { icon: MapPin, color: "#3B6FE0", tint: "#EEF3FE", title: "Top Performing City", lead: "Chennai", caption: "generates 45% of total bookings." },
];

const DATE_RANGES = ["Jul 01 – Jul 31, 2026", "Jun 01 – Jun 30, 2026", "May 01 – May 31, 2026"];
const CITIES = ["Chennai", "All Cities"];
const GROWTH_STEPS = ["Daily", "Weekly", "Monthly"];
const HEAT_BASIS = ["By Hour", "By Day"];
const ACTION_FILTERS = ["All Actions", "Search", "Booking"];

const compact = (v) => (v >= 1000 ? `${v / 1000}K` : `${v}`);
const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.tiny} {...props} />;

const Select = ({ size = T.tiny, ...props }) => (
  <BaseSelect size={size} className="w-[88px] [&_select]:py-1" {...props} />
);

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.xs }}
    iconClass="h-[55px] w-[55px] rounded-xl"
    iconSize={26}
    caption={COMPARE}
    up
    className="px-4 py-5"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    size={178}
    inner="62%"
    centerSize={T.donut}
    captionSize={T.xs}
    formatter={(value) => num(value)}
    {...props}
  />
);

const HeatGrid = (props) => (
  <BaseHeatGrid
    labelSize={T.tiny}
    labelWidth={32}
    cellHeight={14}
    gap="3px 2px"
    radius={2}
    labelsAt="bottom"
    {...props}
  />
);

// Donut legend: dot, name, share and (count).
const CountLegend = ({ data }) => (
  <ul className="flex min-w-0 flex-1 flex-col gap-[14px]">
    {data.map((row) => (
      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
        <span className="w-[42px] shrink-0 text-right text-slate-600">{row.pct}</span>
        <span className="w-[58px] shrink-0 text-right text-slate-500">({num(row.value)})</span>
      </li>
    ))}
  </ul>
);

// Two- or three-series line/area chart on the 31-day x axis.
const SeriesChart = ({ data, lines, area = false, domain, ticks, height, idPrefix }) => {
  const Chart = area ? AreaChart : LineChart;
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -6 }}>
          {area && (
            <defs>
              {lines.map((line) => (
                <linearGradient key={line.key} id={`${idPrefix}-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity={line.fill ?? 0.18} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
          )}
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis
            dataKey="day"
            ticks={DAY_TICKS}
            interval={0}
            tickLine={false}
            axisLine={false}
            tick={{ ...AXIS, fontSize: 10.5 }}
            dy={6}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            interval={0}
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            tick={{ ...AXIS, fontSize: 10.5 }}
            width={42}
          />
          <Tooltip {...TOOLTIP} formatter={(value) => num(value)} />
          {lines.map((line) =>
            area ? (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                fill={`url(#${idPrefix}-${line.key})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
};

// Funnel drawn as stacked trapezoids: each band's bottom edge is the next
// band's top edge.
const FUNNEL_W = 238;
const FUNNEL_EDGES = [238, 208, 180, 154, 128, 104, 82];
const BAND_H = 27;
const BAND_GAP = 3;

const FunnelGraphic = () => (
  <div className="flex shrink-0 flex-col items-center" style={{ width: FUNNEL_W, gap: BAND_GAP }}>
    {funnel.map((stage, i) => {
      const top = FUNNEL_EDGES[i];
      const inset = (top - FUNNEL_EDGES[i + 1]) / 2;
      return (
        <div
          key={stage.name}
          className={`grid place-items-center font-bold text-white ${T.xs}`}
          style={{
            width: top,
            height: BAND_H,
            background: stage.color,
            clipPath: `polygon(0 0, 100% 0, calc(100% - ${inset}px) 100%, ${inset}px 100%)`,
          }}
          title={`${stage.name}: ${stage.users} (${stage.pct})`}
        >
          {i > 0 && stage.pct}
        </div>
      );
    })}
  </div>
);

const StatInsight = ({ item }) => {
  const Icon = item.icon;
  return (
    <div
      className="flex min-w-0 items-center gap-4 rounded-xl border border-black/[0.04] px-4 py-4"
      style={{ background: item.tint }}
    >
      <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-white/80 ring-1 ring-black/[0.05]">
        <Icon size={22} style={{ color: item.color }} />
      </span>
      <div className="min-w-0">
        <p className={`font-semibold ${T.xs}`} style={{ color: item.color }}>
          {item.title}
        </p>
        <p className={`mt-1 text-slate-600 ${T.xs}`}>
          {item.leadStat && (
            <b className="mr-1 text-[17px] font-extrabold tracking-tight text-slate-900">{item.leadStat}</b>
          )}
          {item.leadStat ? (
            item.lead
          ) : (
            <b className="block text-[17px] font-extrabold tracking-tight text-slate-900">{item.lead}</b>
          )}
        </p>
        <p className={`text-slate-500 ${T.tiny}`}>{item.caption}</p>
      </div>
    </div>
  );
};

const exportSegments = () =>
  downloadCsv(
    "user-segmentation.csv",
    ["Segment", "Users", "% of Total", "Bookings", "AOV (INR)"],
    segments.map((row) => [row.segment, row.users, row.share, row.bookings, row.aov.replace("₹", "")])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, city, setCity }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Understand your users better and grow your platform
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
        <HeaderButton icon={Download} label="Download report" color="#334155" onClick={exportSegments}>
          <span className="hidden md:inline">Download Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UserAnalyticsOverviewV2 = ({ title = "User Analytics" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [growthStep, setGrowthStep] = useState(GROWTH_STEPS[0]);
  const [engagementStep, setEngagementStep] = useState(GROWTH_STEPS[0]);
  const [heatBasis, setHeatBasis] = useState(HEAT_BASIS[0]);
  const [actionFilter, setActionFilter] = useState(ACTION_FILTERS[0]);

  return (
    <>
      <PageHeader title={title} range={range} setRange={setRange} city={city} setCity={setCity} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-5 ${GAP}`}>
          {kpis.map(({ icon, color, ...kpi }) => (
            <KpiTile key={kpi.label} {...kpi} icon={icon} iconTint={color} iconColor="#fff" />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Growth / city / device                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title="User Growth Over Time"
              right={<Select value={growthStep} onChange={setGrowthStep} options={GROWTH_STEPS} />}
            />
            <div className="mt-2 flex items-center gap-5">
              <LegendDot dash color={VIOLET} label="Total Users" size={T.tiny} />
              <LegendDot dash color={GREEN} label="New Users" size={T.tiny} />
            </div>
            <div className="mt-1 min-h-[174px] flex-1">
              <SeriesChart
                area
                idPrefix="uao-growth"
                data={growth}
                height="100%"
                domain={[0, 60000]}
                ticks={[0, 15000, 30000, 45000, 60000]}
                lines={[
                  { key: "total", name: "Total Users", color: VIOLET, fill: 0.16 },
                  { key: "fresh", name: "New Users", color: GREEN, fill: 0.08 },
                ]}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="User Distribution by City"
              right={
                <button type="button" className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
                  View All
                </button>
              }
            />
            <div className="flex flex-1 items-center gap-5">
              <Donut data={cities} center="56,782" caption="Total" />
              <CountLegend data={cities} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Device Usage" />
            <div className="flex flex-1 items-center gap-6">
              <Donut data={devices} center="56,782" caption="Total" />
              <ul className="flex min-w-0 flex-1 flex-col gap-[18px]">
                {devices.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                    <span className="w-[42px] shrink-0 text-right text-slate-600">{row.pct}</span>
                    <span className="w-[58px] shrink-0 text-right text-slate-500">({num(row.value)})</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Demographics / activity heatmap / top actions            */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="User Demographics" />
            <p className={`mt-3 flex items-center gap-1 text-slate-600 ${T.xs}`}>
              Age <ChevronDown size={12} className="text-slate-400" />
            </p>

            <div className="mt-2 flex flex-1 items-center gap-5">
              <ul className="flex min-w-0 flex-1 flex-col gap-[13px]">
                {ages.map((row) => (
                  <li key={row.label} className={`flex items-center gap-3 ${T.xs}`}>
                    <span className="w-[52px] shrink-0 whitespace-nowrap text-slate-600">{row.label}</span>
                    <span className="min-w-0 flex-1">
                      <Meter
                        pct={(row.pct / maxAge) * 100}
                        color="linear-gradient(90deg,#8B74F5,#6D4AE0)"
                        height={4}
                        track="transparent"
                      />
                    </span>
                    <span className="w-[42px] shrink-0 text-right text-slate-600">{row.pct}%</span>
                  </li>
                ))}
              </ul>

              <BaseDonut
                data={genders}
                size={104}
                inner="78%"
                formatter={(value) => `${value}%`}
              />
              <ul className="flex shrink-0 flex-col gap-3">
                {genders.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="text-slate-700">{row.name}</span>
                    <span className="text-slate-500">{row.pct}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="User Activity Heatmap"
              right={<Select value={heatBasis} onChange={setHeatBasis} options={HEAT_BASIS} />}
            />
            <div className="mt-3">
              <HeatGrid
                values={activity}
                ramp={ACTIVITY_RAMP}
                rowLabels={WEEKDAYS}
                colLabels={HOUR_LABELS}
                title={(r, c) =>
                  `${WEEKDAYS[r]} ${String(c).padStart(2, "0")}:00 · ${Math.round(activity[r][c] * 100)}% of peak`
                }
              />
            </div>
            <div className="mt-auto pt-3">
              <RampLegend ramp={ACTIVITY_RAMP} from="Low" to="High" size={T.tiny} width={310} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Top User Actions"
              right={
                <Select
                  value={actionFilter}
                  onChange={setActionFilter}
                  options={ACTION_FILTERS}
                  className="w-[104px] [&_select]:py-1"
                />
              }
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-1.5">
              {actions.map((row) => (
                <li key={row.label} className={`flex items-center gap-3 ${T.xs}`}>
                  <span className="w-[118px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                  <span className="min-w-0 flex-1">
                    <Meter
                      pct={(row.value / actions[0].value) * 100}
                      color="linear-gradient(90deg,#8B74F5,#6D4AE0)"
                      height={4}
                      track="transparent"
                    />
                  </span>
                  <span className="w-[50px] shrink-0 text-right text-slate-700">{num(row.value)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Funnel / engagement / segmentation                       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Funnel Analysis" />
            <div className="mt-3 flex flex-1 items-center gap-5">
              <ul className="flex min-w-0 flex-1 flex-col gap-[14px]">
                {funnel.map((stage) => (
                  <li key={stage.name} className={`flex items-center gap-2 ${T.tiny}`}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{stage.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-slate-500">
                      {stage.users} ({stage.pct})
                    </span>
                  </li>
                ))}
              </ul>
              <FunnelGraphic />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="User Engagement Over Time"
              right={<Select value={engagementStep} onChange={setEngagementStep} options={GROWTH_STEPS} />}
            />
            <div className="mt-2 flex items-center gap-5">
              <LegendDot dash color={VIOLET} label="DAU" size={T.tiny} />
              <LegendDot dash color={GREEN} label="WAU" size={T.tiny} />
              <LegendDot dash color={ORANGE} label="MAU" size={T.tiny} />
            </div>
            <div className="mt-1 min-h-[130px] flex-1">
              <SeriesChart
                idPrefix="uao-engagement"
                data={engagement}
                height="100%"
                domain={[0, 40000]}
                ticks={[0, 10000, 20000, 30000, 40000]}
                lines={[
                  { key: "dau", name: "DAU", color: VIOLET },
                  { key: "wau", name: "WAU", color: GREEN },
                  { key: "mau", name: "MAU", color: ORANGE },
                ]}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="User Segmentation" />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  {["Segment", "Users", "% of Total", "Bookings", "AOV (₹)"].map((heading, i) => (
                    <th
                      key={heading}
                      className={`pb-2 pr-2 font-medium text-slate-500 last:pr-0 ${T.tiny} ${
                        i ? "text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((row) => (
                  <tr key={row.segment} className="h-[23px]">
                    <td className={`whitespace-nowrap pr-2 text-slate-700 ${T.xs}`}>{row.segment}</td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.users}</td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.share}</td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.bookings}</td>
                    <td className={`whitespace-nowrap text-right font-medium text-slate-800 ${T.xs}`}>{row.aov}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className={`mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E6E8F0] py-1.5 font-semibold hover:bg-slate-50 ${T.xs}`}
              style={{ color: "#4F5BE8" }}
            >
              View All Segments →
            </button>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Key insights                                             */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-4 pb-4 pt-3.5">
          <CardHeader title="Key Insights" />
          <div className={`mt-2.5 grid grid-cols-4 ${GAP}`}>
            {insights.map((item) => (
              <StatInsight key={item.title} item={item} />
            ))}
          </div>
        </Card>
      </ScaledCanvas>
    </>
  );
};

export default UserAnalyticsOverviewV2;
