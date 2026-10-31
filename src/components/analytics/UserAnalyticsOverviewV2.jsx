import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { toast } from "react-hot-toast";
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
  Clock,
  Contact,
  Download,
  Globe,
  MapPin,
  MonitorSmartphone,
  RefreshCw,
  UsersRound,
  Users,
} from "lucide-react";
import { fetchUserAnalyticsOverviewV2, fetchUserRetentionV2, fetchUserSegmentsV2 } from "../../redux/slices/analyticsSlice";
import { getUsersSummaryV2 } from "../../redux/slices/allUsersSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, WRAP, WRAP_FLOW, WRAP_WIDE } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
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
// The approved "User Analytics" mockup (the overview; a separate page from the
// User Analytics Dashboard), on a fixed DESIGN_WIDTH canvas that ScaledCanvas
// scales to the available width (see there for why bigger px sizes in T read
// smaller on screen).
//
// Data: getUserAnalyticsOverviewV2 + getUserRetentionV2 (analyticsSlice, the
// same as the User Analytics Dashboard), getUserSegmentsV2 (segments and age
// groups, analyticsSlice `userSegments`) and getUsersSummaryV2 (allUsersSlice,
// the Users V2 summary). App activity (active users, DAU / WAU / MAU, devices,
// the heatmap) starts with the heartbeat tracking, so those cards say so until
// it has data. Ages come from the profile age / date of birth, which few users
// have set; cities from the profile city, likewise.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const VIOLET = "#6D4AE0";
const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const ORANGE = "#F97316";
const RED = "#F0455A";
const PINK = "#F25C8A";
const SLATE = "#CBD5E1";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW_COLS = `grid-cols-[435fr_414fr_423fr] ${WRAP.flow}`;

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
const DASH = "–";

const PERIODS = [
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    key: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
  { key: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { key: "last_90", label: "Last 90 Days", range: () => [moment().subtract(89, "days"), moment()] },
];
const STEPS = ["Daily", "Weekly", "Monthly"];
const CITY_COLORS = [VIOLET, BLUE, GREEN, "#FBBF24", ORANGE, PINK];
const PLATFORM_SLICES = {
  android: { name: "Android", color: BLUE },
  ios: { name: "iOS", color: GREEN },
  web: { name: "Web", color: RED },
  app: { name: "App (platform not sent)", color: VIOLET },
  unknown: { name: "Unknown", color: SLATE },
};
const FUNNEL_COLORS = ["#7E6CF5", "#3B9AF2", "#34B368", "#F7C233", "#F5933A", "#F0507A"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];
const SEGMENT_COLORS = { new: BLUE, active: GREEN, loyal: VIOLET, at_risk: AMBER, inactive: RED };
const SEGMENT_HINTS = {
  new: "Signed up in the period",
  loyal: "5+ bookings, the last within 60 days",
  active: "Booked or used the app within 30 days",
  at_risk: "Last booking or app use 31-60 days ago",
  inactive: "Nothing for 60+ days, or never",
};
const ACTIVITY_RAMP = ["#F3F0FF", "#D9D0FB", "#A996F5", "#7A5CF0", "#5B3FF0"];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN") : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const pctOf = (part, whole) => (isNum(part) && isNum(whole) && Number(whole) ? (part / whole) * 100 : null);
const compact = (v) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}K` : `${v}`);
const fmtDay = (d) => (d ? moment(d).format("MMM DD") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${moment(to).format("MMM DD, YYYY")}` : DASH);

const change = (cur, prev, { points = false } = {}) => {
  if (!isNum(cur) || !isNum(prev)) return null;
  const diff = points ? cur - prev : prev ? ((cur - prev) / prev) * 100 : null;
  if (diff === null) return null;
  return { value: `${Math.abs(diff).toFixed(1)}${points ? " pts" : "%"}`, up: diff >= 0 };
};

// Daily rows -> weekly / monthly buckets. `sum` keys add up, `last` keys take
// the bucket's last value, `avg` keys average the days that have one.
const bucketSeries = (rows, step, { sum = [], last = [], avg = [] }) => {
  if (step === "Daily") return rows.map((r) => ({ ...r, label: moment(r.day).format("MMM DD") }));
  const keyOf = (day) => (step === "Weekly" ? moment(day).startOf("isoWeek").format("YYYY-MM-DD") : day.slice(0, 7));
  const buckets = new Map();
  for (const r of rows) {
    const k = keyOf(r.day);
    const b = buckets.get(k) || { day: k, label: step === "Weekly" ? `Wk ${moment(k).format("MMM DD")}` : moment(`${k}-01`).format("MMM YYYY"), n: {} };
    for (const key of sum) b[key] = (b[key] || 0) + (Number(r[key]) || 0);
    for (const key of last) if (isNum(r[key])) b[key] = r[key];
    for (const key of avg) {
      if (!isNum(r[key])) continue;
      b.n[key] = (b.n[key] || 0) + 1;
      b[key] = ((b[key] || 0) * (b.n[key] - 1) + Number(r[key])) / b.n[key];
    }
    buckets.set(k, b);
  }
  return [...buckets.values()].map((b) => {
    for (const key of avg) if (isNum(b[key])) b[key] = Number(b[key].toFixed(1));
    return b;
  });
};

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
    className="px-4 py-5"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut size={178} inner="62%" centerSize={T.donut} captionSize={T.xs} formatter={(value) => num(value)} {...props} />
);

const HeatGrid = (props) => (
  <BaseHeatGrid labelSize={T.tiny} labelWidth={32} cellHeight={22} gap="3px 2px" radius={2} labelsAt="bottom" {...props} />
);

// Centred grey note for a card with nothing to show yet.
const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[300px]">{children}</p>
  </div>
);

// Donut legend: dot, name, share and (count).
const CountLegend = ({ data }) => (
  <ul className="flex min-w-0 flex-1 flex-col gap-[14px]">
    {data.map((row) => (
      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
        <span className="w-[42px] shrink-0 text-right text-slate-600">{fmtPct(row.pct)}</span>
        <span className="w-[58px] shrink-0 text-right text-slate-500">({num(row.value)})</span>
      </li>
    ))}
  </ul>
);

// Line / area chart over the period.
const SeriesChart = ({ data, lines, area = false, height, idPrefix }) => {
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
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={18}
            tickLine={false}
            axisLine={false}
            tick={{ ...AXIS, fontSize: 10.5 }}
            dy={6}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
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
                connectNulls={false}
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
                connectNulls={false}
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

const FunnelGraphic = ({ stages }) => (
  <div className="flex shrink-0 flex-col items-center" style={{ width: FUNNEL_W, gap: BAND_GAP }}>
    {stages.map((stage, i) => {
      const top = FUNNEL_EDGES[i];
      const inset = (top - FUNNEL_EDGES[i + 1]) / 2;
      return (
        <div
          key={stage.key}
          className={`grid place-items-center font-bold text-white ${T.xs}`}
          style={{
            width: top,
            height: BAND_H,
            background: stage.color,
            clipPath: `polygon(0 0, 100% 0, calc(100% - ${inset}px) 100%, ${inset}px 100%)`,
          }}
          title={`${stage.label}: ${num(stage.users)} (${fmtPct(stage.pct)})`}
        >
          {i > 0 && fmtPct(stage.pct)}
        </div>
      );
    })}
  </div>
);

const StatInsight = ({ item }) => {
  const Icon = item.icon;
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-xl border border-black/[0.04] px-4 py-4" style={{ background: item.tint }}>
      <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-white/80 ring-1 ring-black/[0.05]">
        <Icon size={22} style={{ color: item.color }} />
      </span>
      <div className="min-w-0">
        <p className={`font-semibold ${T.xs}`} style={{ color: item.color }}>
          {item.title}
        </p>
        <p className={`mt-1 text-slate-600 ${T.xs}`}>
          {item.leadStat && <b className="mr-1 text-[17px] font-extrabold tracking-tight text-slate-900">{item.leadStat}</b>}
          {item.leadStat ? item.lead : <b className="block text-[17px] font-extrabold tracking-tight text-slate-900">{item.lead}</b>}
        </p>
        <p className={`text-slate-500 ${T.tiny}`}>{item.caption}</p>
      </div>
    </div>
  );
};

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, city, setCity, cityOptions, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Understand your users better and grow your platform</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={VIOLET} toastId="uao-range" className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[
            ...PERIODS.map((p) => ({ value: p.key, label: p.label })),
            ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : []),
          ]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
        <HeaderButton icon={Download} label="Download report" color="#334155" onClick={onExport}>
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
  const dispatch = useDispatch();
  const { userOverview, userRetention, userSegments } = useSelector((state) => state.analytics);
  const summary = useSelector((state) => state.allUsers?.usersSummaryV2);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [custom, setCustom] = useState(null);
  const [city, setCity] = useState("all");
  const [growthStep, setGrowthStep] = useState(STEPS[0]);
  const [engagementStep, setEngagementStep] = useState(STEPS[0]);

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  useEffect(() => {
    const body = { from: range.from, to: range.to };
    if (city !== "all") body.city = city;
    dispatch(fetchUserAnalyticsOverviewV2(body))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load user analytics", { id: "uao-overview" }));
  }, [dispatch, range.from, range.to, city]);

  useEffect(() => {
    dispatch(fetchUserSegmentsV2({ from: range.from, to: range.to }))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load user segments", { id: "uao-segments" }));
  }, [dispatch, range.from, range.to]);

  useEffect(() => {
    dispatch(getUsersSummaryV2());
    dispatch(fetchUserRetentionV2({ mode: "signup", weeks: 8 }))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load retention", { id: "uao-retention" }));
  }, [dispatch]);

  const data = userOverview.data;
  const loading = userOverview.loading && !data;
  const m = data?.metrics || {};
  const pm = data?.previous_metrics || {};
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const shown = (v, fmt = num) => (loading ? "…" : fmt(v));
  const activityNote = !data ? "" : !data.activity_since ? "No app activity recorded yet" : m.activity_partial ? `Tracked since ${fmtDay(data.activity_since)}` : compare;

  const cityOptions = useMemo(
    () => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))],
    [data]
  );

  // ---- Retention: the latest signup cohort that has reached day 30.
  const retention = userRetention.data?.mode === "signup" ? userRetention.data : null;
  const day30 = retention ? retention.days.indexOf(30) : -1;
  const ret30 = retention ? retention.cohorts.filter((c) => isNum(c.retention[day30])) : [];
  const retLatest = ret30[0];
  const retChange = ret30.length >= 2 ? change(ret30[0].retention[day30], ret30[1].retention[day30], { points: true }) : null;

  // ---- KPI tiles ----------------------------------------------------------
  const nvr = data?.new_vs_returning;
  const signupChange = change(m.signups, pm.signups);
  const activeChange = change(m.unique_users, pm.unique_users);
  const kpis = [
    { label: "Total Users", value: num(summary?.total_users), caption: "All registered users", icon: Users, color: "#6D4AE0" },
    { label: "New Users", value: shown(m.signups), delta: signupChange?.value, up: signupChange?.up, caption: compare, icon: Globe, color: "#1FB76A" },
    { label: "Active Users", value: shown(m.unique_users), delta: activeChange?.value, up: activeChange?.up, caption: activityNote, icon: UsersRound, color: "#F59E0B" },
    { label: "Returning Customers", value: shown(nvr?.returning), caption: "Booked again in the period", icon: Contact, color: "#2D7CF0" },
    {
      label: "User Retention (30 Days)",
      value: retLatest ? fmtPct(retLatest.retention[day30]) : userRetention.loading ? "…" : DASH,
      delta: retChange?.value,
      up: retChange?.up,
      caption: retLatest ? `Signed up ${fmtRange(retLatest.from, retLatest.to)}` : "No cohort has reached day 30 yet",
      icon: RefreshCw,
      color: "#F0455A",
    },
  ];

  // ---- Growth / engagement series -------------------------------------------
  const rawSeries = useMemo(() => {
    let running = 0;
    return (data?.series || []).map((row) => {
      running += Number(row.signups) || 0;
      return { ...row, cumulative: running };
    });
  }, [data]);
  const growthSeries = bucketSeries(rawSeries, growthStep, { sum: ["signups"], last: ["cumulative"] });
  const engagementSeries = bucketSeries(rawSeries, engagementStep, { avg: ["dau"], last: ["wau", "mau"] });

  // ---- Segments / age groups (getUserSegmentsV2) -------------------------------
  const seg = userSegments.data;
  const segLoading = userSegments.loading && !seg;
  const ageGroups = seg?.age_groups;
  const ageMax = ageGroups ? Math.max(0, ...ageGroups.groups.map((g) => g.users)) : 0;

  // ---- Cities (profile city) ----------------------------------------------
  const topCities = summary?.top_cities || [];
  const cityTotal = topCities.reduce((t, c) => t + c.users, 0);
  const cityRows = topCities.slice(0, 5).map((c, i) => ({ name: c.city, value: c.users, color: CITY_COLORS[i] }));
  const otherCities = cityTotal - cityRows.reduce((t, c) => t + c.value, 0);
  if (otherCities > 0) cityRows.push({ name: "Others", value: otherCities, color: CITY_COLORS[5] });
  cityRows.forEach((c) => (c.pct = pctOf(c.value, cityTotal)));

  // ---- Devices ----------------------------------------------------------------
  const devices = (data?.platforms || []).map((row) => ({ ...(PLATFORM_SLICES[row.key] || PLATFORM_SLICES.unknown), value: row.users }));
  const deviceTotal = devices.reduce((t, d) => t + d.value, 0);
  devices.forEach((d) => (d.pct = pctOf(d.value, deviceTotal)));

  // ---- Gender -------------------------------------------------------------
  const genderTotal = summary?.total_users || 0;
  const genders = summary
    ? [
        { name: "Male", value: summary.male_users, color: VIOLET },
        { name: "Female", value: summary.female_users, color: GREEN },
        { name: "Not set", value: Math.max(0, genderTotal - summary.male_users - summary.female_users), color: ORANGE },
      ].map((g) => ({ ...g, pct: pctOf(g.value, genderTotal) }))
    : [];

  // ---- Activity heatmap: weekdays x 4-hour parts --------------------------------
  const heat = data?.heatmap;
  const heatMax = heat ? Math.max(0, ...heat.users.flat()) : 0;
  const heatValues = heat ? WEEKDAYS.map((_, wd) => heat.users.map((row) => (heatMax ? row[wd] / heatMax : 0))) : null;

  // ---- Actions / funnel -----------------------------------------------------
  const actions = (data?.top_actions || []).filter((a) => isNum(a.users));
  const actionMax = Math.max(0, ...actions.map((a) => a.users));
  const funnel = (data?.funnel || []).map((s, i, all) => ({
    ...s,
    color: FUNNEL_COLORS[i],
    pct: pctOf(s.users, all[0]?.users),
  }));

  // ---- Insights ---------------------------------------------------------------
  const insights = [];
  if (heatMax) {
    let best = { v: -1, r: 0, c: 0 };
    heat.users.forEach((row, r) => row.forEach((v, c) => v > best.v && (best = { v, r, c })));
    insights.push({
      icon: Clock,
      color: "#5B3FF0",
      tint: "#F1EEFE",
      title: "Peak Usage Time",
      lead: `${heat.day_parts[best.r]} – ${heat.day_parts[(best.r + 1) % heat.day_parts.length]}`,
      caption: `on ${WEEKDAY_NAMES[best.c]} is when most users are active.`,
    });
  }
  const topDevice = [...devices].sort((a, b) => b.value - a.value)[0];
  if (topDevice) {
    insights.push({
      icon: MonitorSmartphone,
      color: "#0E9F6E",
      tint: "#EDF9F2",
      title: "Top Platform",
      leadStat: fmtPct(topDevice.pct),
      lead: `of active users on ${topDevice.name}`,
      caption: "in this period.",
    });
  }
  if (nvr?.customers) {
    insights.push({
      icon: CalendarCheck2,
      color: "#D97706",
      tint: "#FEF6E7",
      title: "Returning Customers",
      leadStat: fmtPct(pctOf(nvr.returning, nvr.customers)),
      lead: "of booking customers",
      caption: "had booked before this period.",
    });
  }
  if (cityRows.length && cityRows[0].name !== "Others") {
    insights.push({
      icon: MapPin,
      color: "#3B6FE0",
      tint: "#EEF3FE",
      title: "Top City",
      lead: cityRows[0].name,
      caption: `${fmtPct(cityRows[0].pct)} of users with a profile city.`,
    });
  }

  const exportReport = () => {
    if (!data) return;
    downloadCsv(
      `user-analytics-overview-${data.from}_${data.to}.csv`,
      ["Section", "Metric", "Value"],
      [
        ...kpis.map((k) => ["KPI", k.label, k.value]),
        ...funnel.map((s) => ["Funnel", s.label, `${s.users ?? ""} (${fmtPct(s.pct)})`]),
        ...devices.map((d) => ["Devices", d.name, d.value]),
        ...genders.map((g) => ["Gender", g.name, g.value]),
      ]
    );
  };

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        period={period}
        setPeriod={setPeriod}
        onCustom={(from, to) => {
          setCustom({ from, to });
          setPeriod("custom");
        }}
        city={city}
        setCity={setCity}
        cityOptions={cityOptions}
        onExport={exportReport}
      />

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-4 leading-snug ${WRAP_FLOW} ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-5 ${WRAP[5]} ${WRAP_WIDE} ${GAP}`}>
          {kpis.map(({ icon, color, ...kpi }) => (
            <KpiTile key={kpi.label} {...kpi} icon={icon} iconTint={color} iconColor="#fff" />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Growth / city / device                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="User Growth Over Time" right={<Select value={growthStep} onChange={setGrowthStep} options={STEPS} />} />
            <div className="mt-2 flex items-center gap-5">
              <LegendDot dash color={VIOLET} label="Cumulative New Users" size={T.tiny} />
              <LegendDot dash color={GREEN} label="New Users" size={T.tiny} />
            </div>
            {growthSeries.length ? (
              <div className="mt-1 min-h-[174px] flex-1">
                <SeriesChart
                  area
                  idPrefix="uao-growth"
                  data={growthSeries}
                  height="100%"
                  lines={[
                    { key: "cumulative", name: "Cumulative new users", color: VIOLET, fill: 0.16 },
                    { key: "signups", name: "New users", color: GREEN, fill: 0.08 },
                  ]}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No sign-ups in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title="User Distribution by City"
              subtitle={summary ? `Profile city · ${num(cityTotal)} of ${num(summary.total_users)} users have one` : undefined}
            />
            {cityTotal ? (
              <div className="flex flex-1 items-center gap-5">
                <Donut data={cityRows} center={num(cityTotal)} caption="With a city" />
                <CountLegend data={cityRows} />
              </div>
            ) : (
              <EmptyNote>{summary ? "No users have a profile city yet" : "Loading…"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Device Usage" subtitle="Active users by platform" />
            {deviceTotal ? (
              <div className="flex flex-1 items-center gap-6">
                <Donut data={devices} center={num(deviceTotal)} caption="Active" />
                <ul className="flex min-w-0 flex-1 flex-col gap-[18px]">
                  {devices.map((row) => (
                    <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                      <span className="w-[42px] shrink-0 text-right text-slate-600">{fmtPct(row.pct)}</span>
                      <span className="w-[58px] shrink-0 text-right text-slate-500">({num(row.value)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : activityNote || "No app activity in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Demographics / activity heatmap / top actions            */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="User Demographics" />
            <div className="mt-2 flex flex-1 items-center gap-5">
              <div className="min-w-0 flex-1 self-stretch">
                <p className={`font-semibold text-slate-700 ${T.xs}`}>Age groups</p>
                {ageMax ? (
                  <ul className="mt-2 flex flex-col gap-2">
                    {ageGroups.groups.map((g) => (
                      <li key={g.label} className={`flex items-center gap-2 ${T.tiny}`} title={`${num(g.users)} users`}>
                        <span className="w-[42px] shrink-0 text-slate-600">{g.label}</span>
                        <span className="min-w-0 flex-1">
                          <Meter pct={(g.users / ageMax) * 100} color={VIOLET} height={5} track="#F1F3F8" />
                        </span>
                        <span className="w-[38px] shrink-0 text-right text-slate-600">{fmtPct(g.share)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`mt-2 text-slate-400 ${T.tiny}`}>{segLoading ? "Loading…" : "No users have an age or date of birth yet"}</p>
                )}
                {ageGroups?.known > 0 && (
                  <p className={`mt-2 text-slate-400 ${T.tiny}`}>
                    Known for {num(ageGroups.known)} of {num(ageGroups.total)} users
                  </p>
                )}
              </div>
              {genderTotal ? (
                <>
                  <BaseDonut data={genders} size={104} inner="78%" formatter={(value) => num(value)} />
                  <ul className="flex shrink-0 flex-col gap-3">
                    {genders.map((row) => (
                      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.color }} />
                        <span className="text-slate-700">{row.name}</span>
                        <span className="text-slate-500">{fmtPct(row.pct)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="User Activity Heatmap" subtitle="Active users by session start (IST)" />
            {heatMax ? (
              <>
                <div className="mt-3">
                  <HeatGrid
                    values={heatValues}
                    ramp={ACTIVITY_RAMP}
                    rowLabels={WEEKDAYS}
                    colLabels={heat.day_parts}
                    title={(r, c) => `${WEEKDAYS[r]} ${heat.day_parts[c]} · ${num(heat.users[c][r])} active users`}
                  />
                </div>
                <div className="mt-auto pt-3">
                  <RampLegend ramp={ACTIVITY_RAMP} from="Low" to="High" size={T.tiny} width={310} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : activityNote || "No app activity in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Top User Actions" subtitle="Users per action in the period" />
            {actions.length ? (
              <ul className="mt-3 flex flex-1 flex-col justify-around gap-1.5">
                {actions.map((row) => (
                  <li key={row.key} className={`flex items-center gap-3 ${T.xs}`}>
                    <span className="w-[118px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                    <span className="min-w-0 flex-1">
                      <Meter
                        pct={actionMax ? (row.users / actionMax) * 100 : 0}
                        color="linear-gradient(90deg,#8B74F5,#6D4AE0)"
                        height={4}
                        track="transparent"
                      />
                    </span>
                    <span className="w-[50px] shrink-0 text-right text-slate-700">{num(row.users)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No actions recorded in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Funnel / engagement / segmentation                       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Funnel Analysis" subtitle="Unique users per step in the period" />
            {funnel.length ? (
              <div className="mt-3 flex flex-1 items-center gap-5">
                <ul className="flex min-w-0 flex-1 flex-col gap-[14px]">
                  {funnel.map((stage) => (
                    <li key={stage.key} className={`flex items-center gap-2 ${T.tiny}`}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stage.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{stage.label}</span>
                      <span className="shrink-0 whitespace-nowrap text-slate-500">
                        {num(stage.users)} ({fmtPct(stage.pct)})
                      </span>
                    </li>
                  ))}
                </ul>
                <FunnelGraphic stages={funnel} />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : DASH}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="User Engagement Over Time" right={<Select value={engagementStep} onChange={setEngagementStep} options={STEPS} />} />
            <div className="mt-2 flex items-center gap-5">
              <LegendDot dash color={VIOLET} label="DAU" size={T.tiny} />
              <LegendDot dash color={GREEN} label="WAU (7 days)" size={T.tiny} />
              <LegendDot dash color={ORANGE} label="MAU (30 days)" size={T.tiny} />
            </div>
            {data?.activity_since ? (
              <div className="mt-1 min-h-[130px] flex-1">
                <SeriesChart
                  idPrefix="uao-engagement"
                  data={engagementSeries}
                  height="100%"
                  lines={[
                    { key: "dau", name: "DAU", color: VIOLET },
                    { key: "wau", name: "WAU", color: GREEN },
                    { key: "mau", name: "MAU", color: ORANGE },
                  ]}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No app activity recorded yet"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="User Segmentation" subtitle="As of the period end · bookings and AOV in the period" />
            {seg?.segments?.length ? (
              <table className="mt-3 w-full table-auto border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={`pb-2 pr-2 font-medium text-slate-500 ${T.tiny}`}>Segment</th>
                    <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.tiny}`}>Users</th>
                    <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.tiny}`}>% of Users</th>
                    <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.tiny}`}>Bookings</th>
                    <th className={`pb-2 text-right font-medium text-slate-500 ${T.tiny}`}>AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {seg.segments.map((row) => (
                    <tr key={row.key} className="h-[30px] border-b border-slate-50 last:border-0" title={SEGMENT_HINTS[row.key]}>
                      <td className={`pr-2 text-slate-800 ${T.xs}`}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEGMENT_COLORS[row.key] || SLATE }} />
                          {row.label}
                        </span>
                      </td>
                      <td className={`pr-2 text-right text-slate-700 ${T.xs}`}>{num(row.users)}</td>
                      <td className={`pr-2 text-right text-slate-700 ${T.xs}`}>{fmtPct(row.share)}</td>
                      <td className={`pr-2 text-right text-slate-700 ${T.xs}`}>{num(row.bookings)}</td>
                      <td className={`text-right text-slate-700 ${T.xs}`}>{isNum(row.aov) ? `₹${num(Math.round(row.aov))}` : DASH}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{segLoading ? "Loading…" : "No users yet"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Key insights                                             */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-4 pb-4 pt-3.5">
          <CardHeader title="Key Insights" />
          <div className={`mt-2.5 grid grid-cols-4 ${WRAP[4]} ${GAP}`}>
            {insights.map((item) => (
              <StatInsight key={item.title} item={item} />
            ))}
            {!insights.length && (
              <p className={`col-span-4 py-3 text-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : "Not enough data for insights yet."}</p>
            )}
          </div>
        </Card>
      </ScaledCanvas>
    </>
  );
};

export default UserAnalyticsOverviewV2;
