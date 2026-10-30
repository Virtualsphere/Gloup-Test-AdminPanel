import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import toast from "react-hot-toast";
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
  UserPlus,
  Users,
} from "lucide-react";
import { fetchUserAnalyticsOverviewV2, fetchUserRetentionV2 } from "../../redux/slices/analyticsSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS, CHART_TOOLTIP as TOOLTIP, toSpark as spark, WRAP } from "../v2/tokens";
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
// The approved "User Analytics Dashboard" mockup, on a fixed DESIGN_WIDTH
// canvas that ScaledCanvas scales to the available width (see there for why
// bigger px sizes in T read smaller on screen).
//
// Data: getUserAnalyticsOverviewV2 + getUserRetentionV2 (analyticsSlice).
// - App activity (unique users, DAU/MAU, sessions, heatmaps, platform) comes
//   from the app heartbeat, recorded since `activity_since`; salon views and
//   coupon applies since `events_since`. Before that those cards say so
//   instead of showing numbers.
// - Signups, logins, checkout, bookings, uninstalls and booking retention read
//   tables that already had data.
// - Not tracked, so dropped from the mockup: app downloads (KPI and funnel
//   step 1 are sign-ups instead), searches, offer clicks and the cart (the
//   funnel's "Add to Cart" is "Checkout Started").
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const VIOLET = "#5236E8";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const ORANGE = "#F59E0B";
const PINK = "#EC4899";
const SLATE = "#CBD5E1";

// Measured card widths from the mockup, used directly as grid fr units. The
// mockup leaves the right third of the funnel row empty; the funnel card spans
// the full row instead.
const ROW3_COLS = `grid-cols-[331fr_279fr_341fr_356fr] ${WRAP[4]}`;
const ROW4_COLS = `grid-cols-[331fr_326fr_293fr_356fr] ${WRAP[4]}`;
const ROW5_COLS = `grid-cols-[316fr_376fr_343fr_266fr] ${WRAP[4]}`;

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
const DASH = "–";

const PERIODS = [
  { value: "last_7", label: "Last 7 Days", range: () => [moment().subtract(6, "days"), moment()] },
  { value: "this_week", label: "This Week", range: () => [moment().startOf("isoWeek"), moment()] },
  {
    value: "last_week",
    label: "Last Week",
    range: () => [moment().subtract(1, "week").startOf("isoWeek"), moment().subtract(1, "week").endOf("isoWeek")],
  },
  { value: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { value: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    value: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
  { value: "last_90", label: "Last 90 Days", range: () => [moment().subtract(89, "days"), moment()] },
];
const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
  { value: "app", label: "App (platform not sent)" },
];
const PLATFORM_SLICES = {
  android: { name: "Android", color: GREEN },
  ios: { name: "iOS", color: BLUE },
  web: { name: "Web", color: ORANGE },
  app: { name: "App (platform not sent)", color: VIOLET },
  unknown: { name: "Unknown", color: SLATE },
};
const COHORT_MODES = [
  { value: "signup", label: "By Sign-up Cohort" },
  { value: "first_booking", label: "By First Booking Cohort" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_PARTS = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"];
// Screen-time cells are coloured against this top bucket (3+ minutes).
const SCREEN_TIME_TOP_SECONDS = 180;

const ENGAGEMENT_RAMP = ["#F1EEFE", "#C9BEFA", "#8B74F0", "#4C2FE0"];
const SCREEN_TIME_RAMP = ["#ECFDF3", "#A7E9C1", "#4CC38A", "#16A34A"];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const fmtInt = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN") : DASH);
const fmtDecimal = (v) =>
  isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : DASH;
const fmtPct = (v, digits = 1) => (isNum(v) ? `${Number(v).toFixed(digits)}%` : DASH);
const fmtDuration = (seconds) => {
  if (!isNum(seconds)) return DASH;
  const s = Math.round(Number(seconds));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : DASH);
const pctOf = (part, whole) => (isNum(part) && isNum(whole) && Number(whole) ? (part / whole) * 100 : null);

// Change vs the previous window: relative %, or percentage points when the
// metric is itself a rate. null when there's nothing to compare.
const change = (cur, prev, { points = false, inverse = false } = {}) => {
  if (!isNum(cur) || !isNum(prev)) return null;
  const diff = points ? cur - prev : prev ? ((cur - prev) / prev) * 100 : null;
  if (diff === null) return null;
  const up = diff >= 0;
  return {
    value: `${Math.abs(diff).toFixed(points ? 2 : 1)}${points ? " pts" : "%"}`,
    up,
    good: inverse ? !up : up,
  };
};

// Sparkline points from a series column, skipping untracked days.
const sparkOf = (series, key) => {
  const values = (series || []).map((row) => row[key]).filter(isNum);
  return values.length > 1 ? spark(values) : undefined;
};

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

const HeatGrid = ({ values, ramp, title }) => (
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
    title={title}
  />
);

// Centred grey note for a card with nothing to show yet.
const EmptyNote = ({ children, className = "" }) => (
  <div className={`grid flex-1 place-items-center px-3 py-4 text-center text-slate-400 ${T.xs} ${className}`}>
    <p>{children}</p>
  </div>
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
            {fmtInt(slice.value)} ({fmtPct(slice.pct)})
          </span>
        </span>
      </li>
    ))}
  </ul>
);

// Small line chart shared by the activity, uninstall and session cards.
const TrendChart = ({ data, lines, tickFormatter, formatter, height, allowDecimals = false }) => (
  <div className="w-full" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -6 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          dy={6}
          interval="preserveStartEnd"
          minTickGap={12}
          padding={{ left: 8, right: 8 }}
        />
        <YAxis
          domain={[0, "auto"]}
          allowDecimals={allowDecimals}
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
            dot={data.length <= 31 ? { r: 3, fill: line.color, strokeWidth: 0 } : false}
            activeDot={{ r: 4.5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const thousands = (v) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}K` : `${v}`);

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, subtitle, updated, filters, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {updated && <LiveStamp updated={updated} className="hidden 2xl:flex" />}
        <HeaderSelect
          icon={CalendarDays}
          label="Date range"
          value={filters.period}
          onChange={filters.setPeriod}
          options={PERIODS}
          className="hidden lg:flex"
        />
        <HeaderSelect
          icon={MonitorSmartphone}
          label="Platform"
          value={filters.platform}
          onChange={filters.setPlatform}
          options={PLATFORMS}
          className="hidden xl:flex"
        />
        <HeaderSelect
          icon={MapPin}
          label="City"
          value={filters.city}
          onChange={filters.setCity}
          options={filters.cityOptions}
          className="hidden xl:flex"
        />
        <HeaderButton icon={Download} label="Export report" color={VIOLET} onClick={onExport}>
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
  const dispatch = useDispatch();
  const { userOverview, userRetention } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState(PERIODS[0].value);
  const [platform, setPlatform] = useState("all");
  const [city, setCity] = useState("all");
  const [cohortMode, setCohortMode] = useState(COHORT_MODES[0].value);
  const [updated, setUpdated] = useState(null);

  const range = useMemo(() => {
    const [from, to] = (PERIODS.find((p) => p.value === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period]);

  useEffect(() => {
    const body = { from: range.from, to: range.to };
    if (platform !== "all") body.platform = platform;
    if (city !== "all") body.city = city;
    dispatch(fetchUserAnalyticsOverviewV2(body))
      .unwrap()
      .then(() => setUpdated(moment().format("h:mm A")))
      .catch((message) => toast.error(message || "Failed to load user analytics", { id: "user-analytics-v2" }));
  }, [dispatch, range.from, range.to, platform, city]);

  useEffect(() => {
    dispatch(fetchUserRetentionV2({ mode: cohortMode }))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load retention", { id: "user-retention-v2" }));
  }, [dispatch, cohortMode]);

  const data = userOverview.data;
  const loading = userOverview.loading && !data;
  const m = data?.metrics || {};
  const pm = data?.previous_metrics || {};
  const series = useMemo(
    () => (data?.series || []).map((row) => ({ ...row, label: fmtDay(row.day) })),
    [data]
  );
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const activitySince = data?.activity_since;
  const shown = (v, fmt = fmtInt) => (loading ? "…" : fmt(v));

  // Caption for cards fed by the heartbeat: what's missing, or since when.
  const activityNote = !data
    ? ""
    : !activitySince
      ? "No app activity recorded yet"
      : m.activity_partial
        ? `Tracked since ${fmtDay(activitySince)}`
        : compare;

  // Logins are dated by session start, which older sessions don't carry.
  const loginsNote = !data
    ? ""
    : !data.logins_since
      ? "Not tracked yet"
      : m.logins_partial
        ? `Tracked since ${fmtDay(data.logins_since)}`
        : compare;

  const cityOptions = useMemo(
    () => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))],
    [data]
  );

  // ---- KPI tiles ----------------------------------------------------------
  const kpi = (label, key, icon, color, tint, sparkKey, opts = {}) => {
    const delta = change(m[key], pm[key]);
    return {
      label,
      value: shown(m[key], opts.format),
      delta: delta?.value,
      up: delta?.up,
      good: delta?.good,
      caption: opts.activity ? activityNote : opts.logins ? loginsNote : compare,
      icon,
      color,
      tint,
      spark: sparkOf(series, sparkKey),
    };
  };
  const kpis = [
    kpi("New Sign-ups", "signups", UserPlus, VIOLET, "#EEEBFD", "signups"),
    kpi("Total Logins", "logins", LogIn, GREEN, "#DCFCE7", "logins", { logins: true }),
    kpi("Unique Users", "unique_users", Users, BLUE, "#DBEAFE", "dau", { activity: true }),
    kpi("1st Time Bookings", "first_bookings", ShoppingCart, ORANGE, "#FEF3C7", "first_bookings"),
    kpi("DAU (avg.)", "dau", UserCheck, PINK, "#FCE7F3", "dau", { activity: true, format: fmtDecimal }),
    kpi("MAU", "mau", CalendarRange, VIOLET, "#EEEBFD", "mau", { activity: true }),
  ];

  // ---- Funnel -------------------------------------------------------------
  // Bars on a square-root scale so the last stages stay visible (the mockup
  // compresses them the same way).
  const funnel = data?.funnel || [];
  const funnelMax = Math.max(0, ...funnel.map((s) => (isNum(s.users) ? s.users : 0)));
  const funnelSteps = funnel.slice(1).map((stage, i) => pctOf(stage.users, funnel[i].users));
  const overallConversion = funnel.length ? pctOf(funnel[funnel.length - 1].users, funnel[0].users) : null;

  // ---- Donuts ---------------------------------------------------------------
  const platformData = (data?.platforms || []).map((row) => ({
    ...(PLATFORM_SLICES[row.key] || PLATFORM_SLICES.unknown),
    value: row.users,
  }));
  const platformTotal = platformData.reduce((t, s) => t + s.value, 0);
  platformData.forEach((s) => (s.pct = pctOf(s.value, platformTotal)));

  const nvr = data?.new_vs_returning;
  const newVsReturning = nvr
    ? [
        { name: "New Customers", value: nvr.new, color: VIOLET, pct: pctOf(nvr.new, nvr.customers) },
        { name: "Returning Customers", value: nvr.returning, color: GREEN, pct: pctOf(nvr.returning, nvr.customers) },
      ]
    : [];

  // ---- Heatmaps -------------------------------------------------------------
  const heat = data?.heatmap;
  const heatMax = heat ? Math.max(0, ...heat.users.flat()) : 0;
  const engagement = heat ? heat.users.map((row) => row.map((v) => (heatMax ? v / heatMax : 0))) : null;
  const screenTime = heat
    ? heat.avg_seconds.map((row) => row.map((v) => (isNum(v) ? Math.min(1, v / SCREEN_TIME_TOP_SECONDS) : 0)))
    : null;
  const hasHeat = heatMax > 0;

  // ---- Top actions / drop-offs ---------------------------------------------
  const topActions = data?.top_actions || [];
  const actionMax = Math.max(0, ...topActions.map((a) => (isNum(a.users) ? a.users : 0)));
  const dropOffs = data?.drop_offs || [];
  const maxDropOff = Math.max(0, ...dropOffs.map((row) => (isNum(row.pct) ? row.pct : 0)));

  // ---- Key metrics ----------------------------------------------------------
  const keyMetrics = [
    { metric: "Sign-ups", key: "signups" },
    { metric: "Logins", key: "logins" },
    { metric: "Salon Views (users)", key: "salon_viewers" },
    { metric: "Checkout Started", key: "checkout_users" },
    { metric: "1st Bookings", key: "first_bookings" },
    { metric: "1st Bookings Completed", key: "first_completed" },
    { metric: "DAU (avg.)", key: "dau", format: fmtDecimal },
    { metric: "MAU", key: "mau" },
    { metric: "Avg. Session Duration", key: "avg_session_seconds", format: fmtDuration },
    { metric: "Uninstall Rate", key: "uninstall_rate", format: (v) => fmtPct(v, 2), points: true, inverse: true },
  ].map((row) => {
    const format = row.format || fmtInt;
    return {
      ...row,
      thisPeriod: format(m[row.key]),
      lastPeriod: format(pm[row.key]),
      change: change(m[row.key], pm[row.key], row),
    };
  });

  const exportKeyMetrics = () => {
    if (!data) return;
    downloadCsv(
      `user-analytics-${data.from}_${data.to}.csv`,
      ["Metric", `This Period (${data.from} to ${data.to})`, `Last Period (${data.previous.from} to ${data.previous.to})`, "Change"],
      keyMetrics.map((row) => [
        row.metric,
        row.thisPeriod,
        row.lastPeriod,
        row.change ? `${row.change.up ? "+" : "-"}${row.change.value}` : DASH,
      ])
    );
  };

  // ---- Retention ------------------------------------------------------------
  const retention = userRetention.data?.mode === cohortMode ? userRetention.data : null;
  const retentionSubtitle =
    cohortMode === "signup"
      ? userRetention.data?.activity_since
        ? `% who came back (app or booking) N+ days after sign-up`
        : "% who placed a booking N+ days after sign-up (app activity not recorded yet)"
      : "% who booked again N+ days after their first booking";

  // ---- Insights -------------------------------------------------------------
  const insights = [];
  const signupChange = change(m.signups, pm.signups);
  if (signupChange) {
    insights.push({
      id: "signups",
      icon: UserPlus,
      text: <>New sign-ups {signupChange.up ? "increased" : "decreased"} by {signupChange.value} vs the previous period.</>,
    });
  }
  const worstDrop = dropOffs.filter((d) => isNum(d.pct)).sort((a, b) => b.pct - a.pct)[0];
  if (worstDrop && worstDrop.pct > 0) {
    insights.push({
      id: "drop-off",
      icon: TrendingDown,
      text: (
        <>
          Biggest drop-off: <b className="font-bold">{worstDrop.label}</b> ({fmtPct(worstDrop.pct)}).
        </>
      ),
    });
  }
  if (hasHeat) {
    let best = null;
    heat.avg_seconds.forEach((row, r) =>
      row.forEach((v, c) => {
        if (isNum(v) && heat.users[r][c] > 0 && (!best || v > best.v)) best = { v, r, c };
      })
    );
    if (best) {
      insights.push({
        id: "screen-time",
        icon: Clock,
        text: (
          <>
            Longest sessions on <b className="font-bold">{WEEKDAY_NAMES[best.c]}s, {DAY_PARTS[best.r]}</b> ({fmtDuration(best.v)}).
          </>
        ),
      });
    }
  } else if (data) {
    insights.push({
      id: "activity",
      icon: Clock,
      text: activitySince ? <>App activity tracked since {fmtDay(activitySince)}.</> : <>App activity will appear once the app update is live.</>,
    });
  }
  const day7 = (retention?.cohorts || []).map((c) => c.retention[1]).filter(isNum);
  if (day7.length >= 2) {
    const diff = day7[0] - day7[1];
    insights.push({
      id: "retention",
      icon: Repeat2,
      text: <>Day 7 retention {diff >= 0 ? "improved" : "fell"} by {Math.abs(diff).toFixed(1)} pts ({fmtPct(day7[0])}).</>,
    });
  }
  const uninstallChange = change(m.uninstall_rate, pm.uninstall_rate, { points: true, inverse: true });
  if (uninstallChange && m.uninstall_rate > 0) {
    insights.push({
      id: "uninstall",
      icon: TriangleAlert,
      text: <>Uninstall rate {uninstallChange.up ? "rose" : "fell"} to {fmtPct(m.uninstall_rate, 2)}.</>,
    });
  }

  const subtitle =
    city !== "all" || platform !== "all"
      ? "City narrows bookings & salon views · Platform narrows app activity & logins"
      : "Track user growth, engagement, behavior & retention";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        updated={updated}
        filters={{ period, setPeriod, platform, setPlatform, city, setCity, cityOptions }}
        onExport={exportKeyMetrics}
      />

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${WRAP[6]} ${GAP}`}>
          {kpis.map(({ icon, color, tint, spark: trend, ...tile }) => (
            <KpiTile
              key={tile.label}
              {...tile}
              icon={icon}
              iconColor={color}
              iconTint={tint}
              spark={trend}
              sparkColor={color}
              sparkId={`ua-kpi-${tile.label.replace(/\W/g, "")}`}
            />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - User funnel                                              */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-5 pb-2 pt-4">
          <div className="flex items-start justify-between gap-4">
            <CardHeader
              title="User Funnel Overview"
              subtitle="Unique users per step in the period · 1st Booking = first-ever booking"
            />
            <div className="shrink-0 text-right leading-tight">
              <p className={`text-slate-500 ${T.micro}`}>Conversion Rate (Overall)</p>
              <p className={`mt-1 font-extrabold text-slate-900 ${T.md}`}>{shown(overallConversion, fmtPct)}</p>
            </div>
          </div>

          <div className="relative mt-1 grid grid-cols-6">
            {(funnel.length ? funnel : Array.from({ length: 6 }, (_, i) => ({ key: i, label: "", users: null }))).map(
              (stage) => (
                <div key={stage.key} className="flex min-w-0 flex-col items-center">
                  <p className={`truncate text-slate-500 ${T.micro}`}>{stage.label || " "}</p>
                  <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.md}`}>{shown(stage.users)}</p>
                  <div className="mt-3 flex h-[108px] w-full items-end justify-center">
                    <span
                      className="block w-[46px] rounded-t-[3px]"
                      style={{
                        height: `${isNum(stage.users) && funnelMax ? Math.max(3, Math.sqrt(stage.users / funnelMax) * 100) : 0}%`,
                        background: VIOLET,
                      }}
                      title={
                        isNum(stage.users)
                          ? `${stage.label}: ${fmtInt(stage.users)}`
                          : stage.key === "salon_views"
                            ? "Salon views are recorded once the update is live"
                            : undefined
                      }
                    />
                  </div>
                </div>
              )
            )}

            {/* Step conversion, centred on the boundary between two stages. */}
            {funnelSteps.map((step, i) => (
              <span
                key={funnel[i + 1].key}
                className={`absolute bottom-[38px] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-slate-600 ${T.xs}`}
                style={{ left: `${((i + 1) / funnel.length) * 100}%` }}
              >
                {fmtPct(step)}
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
              <LegendDot line color={GREEN} label="MAU (30 days)" size={T.micro} />
            </div>
            {activitySince ? (
              <div className="mt-1">
                <TrendChart
                  data={series}
                  height={100}
                  tickFormatter={thousands}
                  formatter={(value) => Number(value).toLocaleString("en-IN")}
                  lines={[
                    { key: "dau", name: "DAU", color: VIOLET },
                    { key: "mau", name: "MAU", color: GREEN },
                  ]}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No app activity recorded yet"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Users by Platform" />
            {platformTotal ? (
              <div className="mt-3 flex flex-1 items-center gap-5">
                <Donut data={platformData} center={fmtInt(platformTotal)} caption="Active Users" />
                <DonutLegend data={platformData} />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : activityNote || "No app activity in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="New vs Returning Users" />
            {nvr?.customers ? (
              <div className="mt-3 flex flex-1 items-center gap-6">
                <Donut data={newVsReturning} center={fmtInt(nvr.customers)} caption="Booking Customers" />
                <DonutLegend data={newVsReturning} />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Uninstall Rate"
              subtitle={data ? `Detected on push sends · of ${fmtInt(data.uninstall.base)} users with a push token` : undefined}
            />
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                {shown(m.uninstall_rate, (v) => fmtPct(v, 2))}
              </span>
              {uninstallChange && (
                <Delta value={uninstallChange.value} up={uninstallChange.up} good={uninstallChange.good} size={T.sm} />
              )}
              <span className={`truncate text-slate-400 ${T.micro}`}>{compare}</span>
            </div>
            <div className="mt-1">
              <TrendChart
                data={series}
                height={80}
                allowDecimals
                tickFormatter={(v) => `${v}%`}
                formatter={(value) => `${value}%`}
                lines={[{ key: "uninstall_rate", name: "Uninstall Rate", color: VIOLET }]}
              />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Heatmaps / session duration / top actions                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="User Engagement Heatmap" subtitle="Active users by session start (IST)" />
            {hasHeat ? (
              <>
                <div className="mt-3">
                  <HeatGrid
                    values={engagement}
                    ramp={ENGAGEMENT_RAMP}
                    title={(r, c) => `${WEEKDAYS[c]} ${DAY_PARTS[r]} · ${fmtInt(heat.users[r][c])} active users`}
                  />
                </div>
                <div className="mt-auto pt-3">
                  <RampLegend ramp={ENGAGEMENT_RAMP} from="Less Active" to="More Active" size={T.micro} steps={7} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : activityNote || "No app activity in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title={
                <>
                  Screen Time Heatmap{" "}
                  <span className={`font-medium text-slate-500 ${T.micro}`}>(Avg. Session Duration)</span>
                </>
              }
              subtitle="By session start (IST)"
            />
            {hasHeat ? (
              <>
                <div className="mt-3">
                  <HeatGrid
                    values={screenTime}
                    ramp={SCREEN_TIME_RAMP}
                    title={(r, c) => `${WEEKDAYS[c]} ${DAY_PARTS[r]} · ${fmtDuration(heat.avg_seconds[r][c])} avg. session`}
                  />
                </div>
                <div className="mt-auto pt-3">
                  <RampLegend ramp={SCREEN_TIME_RAMP} from="0 sec" to="3+ min" size={T.micro} width={150} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : activityNote || "No app activity in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Average Session Duration" />
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                {shown(m.avg_session_seconds, fmtDuration)}
              </span>
              <span className={`truncate text-slate-400 ${T.micro}`}>{activityNote}</span>
            </div>
            {activitySince ? (
              <div className="mt-auto pt-1">
                <TrendChart
                  data={series.map((row) => ({
                    ...row,
                    minutes: isNum(row.avg_session_seconds) ? Number((row.avg_session_seconds / 60).toFixed(2)) : null,
                  }))}
                  height={92}
                  allowDecimals
                  tickFormatter={(v) => `${v} min`}
                  formatter={(value) => `${value} min`}
                  lines={[{ key: "minutes", name: "Avg. Session", color: VIOLET }]}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No app activity recorded yet"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Top User Actions"
              right={<span className={`text-slate-500 ${T.micro}`}>Users (% of active)</span>}
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
              {topActions.map((row, i) => (
                <li key={row.key} className={`flex items-center gap-2 ${T.xs}`}>
                  <span className="w-4 shrink-0 text-slate-500">{i + 1}.</span>
                  <span className="w-[112px] shrink-0 truncate text-slate-700">{row.label}</span>
                  <span className="min-w-0 flex-1">
                    <Meter
                      pct={isNum(row.pct) ? row.pct : (pctOf(row.users, actionMax) ?? 0)}
                      color={VIOLET}
                      height={3}
                      track="transparent"
                    />
                  </span>
                  <span className="w-[104px] shrink-0 whitespace-nowrap text-right text-slate-600">
                    {fmtInt(row.users)}
                    {isNum(row.pct) ? ` (${fmtPct(row.pct)})` : ""}
                  </span>
                </li>
              ))}
              {!topActions.length && <EmptyNote>{loading ? "Loading…" : DASH}</EmptyNote>}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Key metrics / retention / drop-offs / insights           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Key Metrics Summary" subtitle={compare ? `This period ${compare}` : undefined} />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  {["Metric", "This Period", "Last Period", "Change"].map((h, i) => (
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
                    <td className={`whitespace-nowrap py-0 pr-2 text-slate-700 ${T.xs}`}>{row.metric}</td>
                    <td className={`whitespace-nowrap py-0 pr-2 text-right text-slate-700 ${T.xs}`}>
                      {loading ? "…" : row.thisPeriod}
                    </td>
                    <td className={`whitespace-nowrap py-0 pr-2 text-right text-slate-500 ${T.xs}`}>
                      {loading ? "…" : row.lastPeriod}
                    </td>
                    <td className={`py-0 text-right ${T.xs}`}>
                      {row.change ? (
                        <Delta value={row.change.value} up={row.change.up} good={row.change.good} size={T.xs} iconSize={10} />
                      ) : (
                        <span className="text-slate-400">{DASH}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="User Retention Cohort"
              subtitle={retentionSubtitle}
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
                  {["Cohort", ...(retention?.days || [1, 7, 14, 30, 60, 90]).map((d) => `Day ${d}`)].map((h, i) => (
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
                {(retention?.cohorts || []).map((row) => (
                  <tr key={row.from}>
                    <td className={`whitespace-nowrap py-[7px] pr-2 text-slate-700 ${T.xs}`} title={`${fmtInt(row.users)} users`}>
                      {fmtRange(row.from, row.to)}
                    </td>
                    {row.retention.map((value, i) => (
                      <td
                        key={retention.days[i]}
                        className={`whitespace-nowrap py-[7px] text-center ${T.xs} ${
                          isNum(value) ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {fmtPct(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!retention && (
              <EmptyNote>{userRetention.loading ? "Loading…" : userRetention.error || DASH}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="User Drop-off Points" subtitle="Where users leave the booking flow" />
            <p className={`mt-2 text-right text-slate-500 ${T.micro}`}>Drop-off rate</p>
            <ul className="mt-1.5 flex flex-1 flex-col justify-around gap-2">
              {dropOffs.map((row) => (
                <li
                  key={row.key}
                  className={`flex items-center gap-3 ${T.xs}`}
                  title={isNum(row.of) ? `${fmtInt(row.dropped)} of ${fmtInt(row.of)}` : "Recorded once the update is live"}
                >
                  <span className="w-[196px] shrink-0 truncate text-slate-700">
                    {row.label} <span className="text-slate-500">({row.note})</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <Meter
                      pct={isNum(row.pct) && maxDropOff ? (row.pct / maxDropOff) * 100 : 0}
                      color={VIOLET}
                      height={3}
                      track="transparent"
                    />
                  </span>
                  <span className="w-[38px] shrink-0 text-right text-slate-600">{fmtPct(row.pct)}</span>
                </li>
              ))}
              {!dropOffs.length && <EmptyNote>{loading ? "Loading…" : DASH}</EmptyNote>}
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
              {!insights.length && (
                <li className={`text-white/80 ${T.xs}`}>{loading ? "Loading…" : "Not enough data for insights yet."}</li>
              )}
            </ul>
            <button
              type="button"
              onClick={exportKeyMetrics}
              disabled={!data}
              className={`mt-2.5 flex w-full items-center gap-2 rounded-lg bg-white/15 px-4 py-2 font-semibold transition-colors hover:bg-white/25 disabled:opacity-60 ${T.sm}`}
            >
              Download Metrics Report
              <Download size={14} className="ml-auto shrink-0" />
            </button>
          </div>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default UserAnalyticsV2;
