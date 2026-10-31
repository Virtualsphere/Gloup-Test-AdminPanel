import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { toast } from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlarmClock,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Facebook,
  Instagram,
  Leaf,
  Link,
  LogIn,
  MapPin,
  MonitorSmartphone,
  Package,
  Repeat,
  Search,
  Share2,
  ShoppingCart,
  Star,
  Store,
  Ticket,
  Timer,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  fetchClickInteractionV2,
  fetchSalonHeatmapV2,
  fetchServiceIntelligenceV2,
  fetchUserAnalyticsOverviewV2,
  fetchUserLiveFeedV2,
  fetchUserRetentionV2,
  fetchUserSegmentsV2,
} from "../../redux/slices/analyticsSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, toSpark, WRAP } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
  Delta,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  HeatGrid as BaseHeatGrid,
  KpiTile as BaseKpiTile,
  LegendDot,
  Meter,
  RampLegend,
  Segmented as BaseSegmented,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "User Analytics 360°" mockup, on a fixed DESIGN_WIDTH canvas
// that ScaledCanvas scales to the available width (see there for why bigger
// px sizes in T read smaller on screen).
//
// A roll-up of the other analytics APIs (analyticsSlice): getUserAnalytics-
// OverviewV2 (KPIs, funnel, activity heatmap, uninstalls), getUserRetentionV2
// (cohorts at day 7 / 14 / 28 / 56), getUserSegmentsV2 (segments, booking
// behaviour, LTV, acquisition, leave reasons), getClickInteractionV2 (screen
// time, taps, top paths), getServiceIntelligenceV2 (most booked services /
// categories), getSalonHeatmapV2 (bookings by salon area) and
// getUserLiveFeedV2. App downloads aren't recorded, so the first KPI is
// sign-ups. Acquisition channels need the app's /v2/attribution call; until
// then referral (used a code) vs organic is shown. Uninstall / checkout
// reasons come from the reason prompts the app sends to /v2/feedback.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const VIOLET = "#6D4AE0";
const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const AMBER = "#F5A524";
const PINK = "#F0507A";
const RED = "#EF4444";

// Measured card widths from the mockup, used directly as grid fr units.
const KPI_COLS = `grid-cols-[178fr_178fr_174fr_184fr_184fr_192fr_202fr] ${WRAP[7]}`;
const ROW2_COLS = `grid-cols-[432fr_513fr_389fr] ${WRAP[3]}`;
const ROW3_COLS = `grid-cols-[243fr_316fr_258fr_196fr_302fr] ${WRAP[5]}`;
const ROW4_COLS = `grid-cols-[228fr_436fr_272fr_382fr] ${WRAP[4]}`;
const ROW5_COLS = `grid-cols-[412fr_285fr_242fr_380fr] ${WRAP[4]}`;

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1352px of content, so measured sizes carry over at ~1.12x.
// This mockup's type is smaller than the other V2 pages'; in the wrapped
// layout, where the cards are wider than drawn, it steps up to match them.
const T = {
  nano: "text-[8.5px] wrapped:text-[10px]", // column headers, sub-lines
  micro: "text-[9px] wrapped:text-[10.5px]", // captions
  xs: "text-[9.5px] wrapped:text-[11px]", // table cells, list rows
  sm: "text-[10.5px] wrapped:text-[12px]", // body, legend
  md: "text-[11.5px] wrapped:text-[13px]", // emphasised values
  title: "text-[12.5px] wrapped:text-[14px]", // card titles
  kpi: "text-[19px] wrapped:text-[22px]", // KPI values
  donut: "text-[15px] wrapped:text-[17px]", // donut centre totals
};

const GAP = "gap-3";
const DASH = "–";

const PERIODS = [
  { key: "last_7", label: "Last 7 Days", range: () => [moment().subtract(6, "days"), moment()] },
  { key: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    key: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
];
const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
];

const FUNNEL_COLORS = ["#5B3FF0", "#3B82F6", "#38A8F5", "#22B573", "#F7C233", "#F5933A"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HEAT_TABS = [
  { value: "users", label: "Active Users" },
  { value: "avg_seconds", label: "Session Length" },
];
const HEAT_RAMP = ["#F3F0FF", "#D9D0FB", "#A996F5", "#7A5CF0", "#5B3FF0"];
const SCREEN_TABS = [
  { value: "time", label: "Avg. Time on Screen" },
  { value: "views", label: "Views per User" },
];
const SCREEN_ICONS = { home: Store, search: Search, salon_details: Store, slots: Clock, checkout: ShoppingCart, payment: CreditCard, payment_success: CalendarCheck, offers: Ticket };
const SEGMENT_COLORS = { new: VIOLET, active: GREEN, loyal: "#1E3A8A", at_risk: AMBER, inactive: PINK };
const RETENTION_DAYS = [7, 14, 28, 56];
const COHORT_MODES = [
  { value: "signup", label: "By Sign-up Week" },
  { value: "first_booking", label: "By First Booking Week" },
];
const REASON_COLORS = [VIOLET, BLUE, AMBER, "#14B8A6", "#64748B"];
const REASON_ICONS = [Wallet, Search, Clock, CreditCard, Package];
const LTV_COLORS = { top20: BLUE, mid60: AMBER, bottom20: PINK };
const FEED_STYLE = {
  signup: { icon: UserPlus, color: "#EA580C", tint: "#FFEDD5", title: "New user signed up" },
  booking: { icon: CalendarCheck, color: "#16A34A", tint: "#DCFCE7", title: "Booking paid" },
  review: { icon: Star, color: "#D97706", tint: "#FEF3C7", title: "New review" },
};
const FEED_POLL_MS = 30000;

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : DASH);
const rupee = (v) => (isNum(v) ? `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const share = (part, whole) => (whole ? (part / whole) * 100 : null);
const secs = (v) => (isNum(v) ? (v >= 60 ? `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, "0")}s` : `${Math.round(v)}s`) : DASH);
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : DASH);
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const ago = (at) => {
  const m = moment().diff(moment(at), "minutes");
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};
const change = (cur, prev) => (isNum(cur) && isNum(prev) && prev ? ((cur - prev) / prev) * 100 : null);

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

const Select = ({ size = T.nano, ...props }) => <BaseSelect size={size} className="w-[104px] [&_select]:py-1" {...props} />;

const Segmented = (props) => <BaseSegmented size={T.nano} color={BRAND} padding="px-2.5 py-1" {...props} />;

const KpiTile = (props) => <BaseKpiTile sizes={{ label: T.xs, value: T.kpi, delta: T.xs, caption: T.xs }} iconClass="h-[36px] w-[36px] rounded-full" iconSize={17} sparkHeight={38} className="px-3.5 pb-2 pt-3.5" {...props} />;

const Donut = (props) => <BaseDonut inner="62%" centerSize={T.donut} captionSize={T.micro} formatter={(value) => num(value)} {...props} />;

const HeatGrid = (props) => <BaseHeatGrid labelSize={T.nano} labelWidth={26} cellHeight={22} gap="3px 2px" radius={2} {...props} />;

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-2 py-4 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[240px]">{children}</p>
  </div>
);

const IconCircle = ({ icon, color, tint, size = 24, iconSize = 12 }) => {
  const Icon = icon;
  return (
    <span className="grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: tint, color }}>
      <Icon size={iconSize} />
    </span>
  );
};

// Legend row: dot, name, then "pct (count)".
const SegmentLegend = ({ data }) => (
  <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
    {data.map((row) => (
      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`} title={row.hint}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
        <span className="shrink-0 whitespace-nowrap text-slate-700">
          {fmtPct(row.pct)} <span className="text-slate-500">({num(row.value)})</span>
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
  const badge = CHANNEL_BADGES[kind] || { content: String(kind || "?").charAt(0).toUpperCase(), bg: "#E2E8F0", color: "#475569" };
  const Icon = badge.icon;
  return (
    <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: badge.bg, color: badge.color, boxShadow: badge.ring ? `inset 0 0 0 1px ${badge.ring}` : undefined }}>
      {Icon ? <Icon size={9} /> : badge.content}
    </span>
  );
};

// Heat blob for the tap-map phone; `x`/`y` are % of the screen.
const TapBlob = ({ x, y, size }) => (
  <span
    className="pointer-events-none absolute rounded-full"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      transform: "translate(-50%, -50%)",
      background: "radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(249,115,22,0.85) 28%, rgba(250,204,21,0.65) 52%, rgba(132,204,22,0.3) 74%, rgba(132,204,22,0) 100%)",
    }}
  />
);

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, platform, setPlatform, city, setCity, cityOptions, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Understand Users. Drive Bookings. Grow Faster.</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="ua360-range" maxDays={92} className="relative hidden lg:block" />
        <HeaderSelect
          icon={CalendarDays}
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MonitorSmartphone} label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} className="hidden xl:flex" />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={onExport}>
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
  const dispatch = useDispatch();
  const { userOverview, userRetention, userSegments, liveFeed, clickInteraction, serviceIntel, salonHeatmap } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [custom, setCustom] = useState(null);
  const [platform, setPlatform] = useState("all");
  const [city, setCity] = useState("all");
  const [heatTab, setHeatTab] = useState("users");
  const [screenTab, setScreenTab] = useState("time");
  const [cohortMode, setCohortMode] = useState("signup");
  const [interestTab, setInterestTab] = useState("services");
  const [feedLive, setFeedLive] = useState(true);

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  useEffect(() => {
    const base = { from: range.from, to: range.to };
    const withCity = city !== "all" ? { ...base, city } : base;
    const withPlatform = platform !== "all" ? { platform } : {};
    const fail = (id, fallback) => (message) => toast.error(message || fallback, { id });
    dispatch(fetchUserAnalyticsOverviewV2({ ...withCity, ...withPlatform })).unwrap().catch(fail("ua360-overview", "Failed to load user analytics"));
    dispatch(fetchUserSegmentsV2(base)).unwrap().catch(fail("ua360-segments", "Failed to load user segments"));
    dispatch(fetchClickInteractionV2({ ...base, ...withPlatform })).unwrap().catch(fail("ua360-click", "Failed to load screen analytics"));
    dispatch(fetchServiceIntelligenceV2(withCity)).unwrap().catch(fail("ua360-services", "Failed to load services"));
    dispatch(fetchSalonHeatmapV2(withCity)).unwrap().catch(fail("ua360-areas", "Failed to load areas"));
  }, [dispatch, range.from, range.to, city, platform]);

  useEffect(() => {
    dispatch(fetchUserRetentionV2({ mode: cohortMode, to: range.to, weeks: 5, days: RETENTION_DAYS }))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load retention", { id: "ua360-retention" }));
  }, [dispatch, cohortMode, range.to]);

  // The live feed refreshes itself while "Live" is on.
  useEffect(() => {
    const load = () => dispatch(fetchUserLiveFeedV2({ limit: 6 }));
    load();
    if (!feedLive) return undefined;
    const id = setInterval(load, FEED_POLL_MS);
    return () => clearInterval(id);
  }, [dispatch, feedLive]);

  const ov = userOverview.data;
  const loading = userOverview.loading && !ov;
  const m = ov?.metrics || {};
  const pm = ov?.previous_metrics || {};
  const compare = ov ? `vs ${fmtRange(ov.previous.from, ov.previous.to)}` : "";
  const shown = (v, fmt = num) => (loading ? "…" : fmt(v));
  const seg = userSegments.data;
  const click = clickInteraction.data;
  const svc = serviceIntel.data;
  const areasData = salonHeatmap.data;
  const cityOptions = useMemo(() => [{ value: "all", label: "All Cities" }, ...(ov?.cities || []).map((c) => ({ value: c, label: c }))], [ov]);

  // ---- KPIs ------------------------------------------------------------------
  const series = ov?.series || [];
  const sparkOf = (key) => {
    const values = series.map((r) => r[key]).filter(isNum);
    return values.length > 1 ? toSpark(values) : undefined;
  };
  const kpi = (label, key, icon, color, tint, line, { missing = compare, sparkKey } = {}) => {
    const d = change(m[key], pm[key]);
    return {
      label,
      value: shown(m[key]),
      delta: isNum(d) ? `${Math.abs(d).toFixed(1)}%` : undefined,
      up: isNum(d) ? d >= 0 : undefined,
      caption: isNum(m[key]) ? compare : missing,
      icon,
      color,
      tint,
      line,
      spark: sparkKey ? sparkOf(sparkKey) : undefined,
    };
  };
  const activityNote = ov?.activity_since ? `Tracked since ${fmtDay(ov.activity_since)}` : "No app activity yet";
  const kpis = [
    kpi("New Sign-ups", "signups", UserPlus, VIOLET, "#EEEAFD", INDIGO, { sparkKey: "signups" }),
    kpi("Logins", "logins", LogIn, "#16A34A", "#DCFCE7", GREEN, { sparkKey: "logins", missing: ov?.logins_since ? `Tracked since ${fmtDay(ov.logins_since)}` : "Not tracked yet" }),
    kpi("Active Users", "unique_users", Users, "#2563EB", "#DBEAFE", BLUE, { sparkKey: "dau", missing: activityNote }),
    kpi("1st Time Bookings", "first_bookings", ShoppingCart, "#EA580C", "#FFEDD5", "#F59E0B", { sparkKey: "first_bookings" }),
    kpi("Checkout Started", "checkout_users", ShoppingCart, "#E11D48", "#FFE4E6", "#EC4899"),
    kpi("Paying Users", "paid_users", BadgeCheck, VIOLET, "#EEEAFD", INDIGO),
  ];
  const dauBars = series.slice(-24).map((r, i) => ({ i, v: r.dau || 0 }));
  const stickiness = isNum(m.dau) && m.mau ? (m.dau / m.mau) * 100 : null;
  const prevStickiness = isNum(pm.dau) && pm.mau ? (pm.dau / pm.mau) * 100 : null;

  // ---- 1. Funnel --------------------------------------------------------------
  const funnelRaw = (ov?.funnel || []).filter((s) => isNum(s.users));
  const funnelTop = funnelRaw[0]?.users || 0;
  const funnel = funnelRaw.map((s, i) => ({ ...s, pct: share(s.users, funnelTop), width: funnelTop ? Math.max(18, (s.users / funnelTop) * 100) : 18, color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }));
  const overall = funnel.length > 1 ? funnel[funnel.length - 1].pct : null;
  const drops = funnel.slice(1).map((s, i) => ({ from: funnel[i].label, to: s.label, rate: funnel[i].users ? ((funnel[i].users - s.users) / funnel[i].users) * 100 : null }));
  const biggestDrop = [...drops].filter((d) => isNum(d.rate)).sort((a, b) => b.rate - a.rate)[0];

  // ---- 2. Activity heatmap (weekday x 4-hour part) -----------------------------
  const heat = ov?.heatmap;
  const heatSource = heat?.[heatTab];
  const heatMax = heatSource ? Math.max(0, ...heatSource.flat().filter(isNum)) : 0;
  const heatValues = heatSource ? WEEKDAYS.map((_, wd) => heatSource.map((row) => (heatMax && isNum(row[wd]) ? row[wd] / heatMax : 0))) : null;
  const heatStats = (() => {
    if (!heat) return null;
    const users = heat.users;
    const total = users.flat().reduce((t, v) => t + v, 0);
    if (!total) return null;
    const partTotals = users.map((row) => row.reduce((t, v) => t + v, 0));
    const dayTotals = WEEKDAYS.map((_, wd) => users.reduce((t, row) => t + row[wd], 0));
    const bestPart = partTotals.indexOf(Math.max(...partTotals));
    const bestDay = dayTotals.indexOf(Math.max(...dayTotals));
    const avgDay = total / 7;
    return {
      time: `${heat.day_parts[bestPart]} – ${heat.day_parts[(bestPart + 1) % heat.day_parts.length]}`,
      timeShare: share(partTotals[bestPart], total),
      day: WEEKDAY_NAMES[bestDay],
      dayLift: avgDay ? ((dayTotals[bestDay] - avgDay) / avgDay) * 100 : null,
    };
  })();

  // ---- 3. Screen time ---------------------------------------------------------
  const screens = (click?.screens || []).slice(0, 6);
  const screenRows = screens.map((s) => ({
    key: s.screen,
    label: s.label,
    icon: SCREEN_ICONS[s.screen] || Store,
    value: screenTab === "time" ? secs(s.avg_seconds) : s.unique_users ? num(Number((s.views / s.unique_users).toFixed(1))) : DASH,
  }));
  const screenHeadline =
    screenTab === "time"
      ? { value: secs(m.avg_session_seconds), label: "Avg. session", delta: change(m.avg_session_seconds, pm.avg_session_seconds) }
      : { value: click?.kpis?.avg_per_user ? num(click.kpis.avg_per_user) : DASH, label: "Interactions / user", delta: change(click?.kpis?.avg_per_user, click?.previous_kpis?.avg_per_user) };
  const tapCells = Object.values(click?.heatmaps || {}).flat();
  const tapMax = Math.max(0, ...tapCells.map((c) => c.taps));
  const tapBlobs = [...tapCells].sort((a, b) => b.taps - a.taps).slice(0, 6).map((c) => ({ x: c.x * 100, y: c.y * 100, size: Math.round(14 + (tapMax ? c.taps / tapMax : 0) * 26) }));

  // ---- 4. Acquisition ---------------------------------------------------------
  const acq = seg?.acquisition;
  const attributed = (acq?.sources || []).filter((s) => s.source !== "unknown" && s.users);
  const channelRows = attributed.length
    ? attributed.map((s) => ({ name: titleCase(s.source), kind: String(s.source).toLowerCase(), users: s.users }))
    : acq
      ? [
          { name: "Organic", kind: "organic", users: acq.organic },
          { name: "Referral code", kind: "referral", users: acq.referral },
        ]
      : [];
  const channelTotal = channelRows.reduce((t, r) => t + r.users, 0);
  const channelMax = Math.max(0, ...channelRows.map((r) => r.users));

  // ---- 5 / 7 / 12. Segments, behaviour, LTV ---------------------------------------
  const segmentRows = (seg?.segments || []).map((s) => ({ key: s.key, name: s.label, value: s.users, pct: s.share, color: SEGMENT_COLORS[s.key] || "#94A3B8" }));
  const behavior = seg?.booking_behavior;
  const behaviorPrev = behavior?.previous;
  const ltvRows = (seg?.ltv?.by_segment || []).filter((s) => isNum(s.avg_lifetime_spend)).sort((a, b) => b.avg_lifetime_spend - a.avg_lifetime_spend);
  const ltvMax = Math.max(0, ...ltvRows.map((r) => r.avg_lifetime_spend));
  const ltvShare = (seg?.ltv?.share || []).map((s) => ({ name: s.label, value: s.share || 0, pct: s.share, color: LTV_COLORS[s.key] }));
  const ltvAll = (() => {
    const segs = seg?.segments || [];
    const users = segs.reduce((t, s) => t + s.users, 0);
    const spend = segs.reduce((t, s) => t + (s.avg_lifetime_spend || 0) * s.users, 0);
    return users ? spend / users : null;
  })();

  // ---- 6. Cohorts ---------------------------------------------------------------
  const retention = userRetention.data?.mode === cohortMode ? userRetention.data : null;
  const cohortCols = retention?.days || RETENTION_DAYS;

  // ---- 8. Uninstalls / leave reasons ----------------------------------------------
  const leaveTotal = (seg?.leave_reasons || []).reduce((t, r) => t + r.users, 0);
  const leaveRows = (seg?.leave_reasons || []).slice(0, 5).map((r, i) => ({ name: titleCase(r.reason), value: r.users, pct: share(r.users, leaveTotal), color: REASON_COLORS[i] }));
  const uninstallDelta = isNum(m.uninstall_rate) && isNum(pm.uninstall_rate) ? m.uninstall_rate - pm.uninstall_rate : null;

  // ---- 9. Interest (most booked) --------------------------------------------------
  const interest =
    interestTab === "services"
      ? (svc?.services?.all || []).filter((s) => s.key !== "others").slice(0, 5).map((s) => ({ name: s.name, count: s.bookings, share: s.share }))
      : (svc?.categories || []).slice(0, 5).map((c) => ({ name: c.name, count: c.bookings, share: c.share }));

  // ---- 10. Checkout ----------------------------------------------------------------
  const cartSteps = [
    { label: "Viewed a Salon", users: m.salon_viewers },
    { label: "Started Checkout", users: m.checkout_users },
    { label: "Paid", users: m.paid_users },
    { label: "1st Booking", users: m.first_bookings },
  ].filter((s) => isNum(s.users));
  const cartTop = cartSteps[0]?.users || 0;
  const checkoutTotal = (seg?.checkout_reasons || []).reduce((t, r) => t + r.users, 0);
  const cartReasons = (seg?.checkout_reasons || []).slice(0, 5).map((r, i) => ({ label: titleCase(r.reason), pct: share(r.users, checkoutTotal), icon: REASON_ICONS[i], color: i < 2 ? "#E11D48" : i < 3 ? "#EA580C" : i < 4 ? "#16A34A" : "#64748B" }));

  // ---- 11. New vs returning ---------------------------------------------------------
  const nvr = ov?.new_vs_returning;
  const newVsActive = series.map((r) => ({ day: fmtDay(r.day), fresh: r.signups, active: r.dau }));

  // ---- 13. Flows / 14. Areas / 15. Feed ---------------------------------------------
  const flows = (click?.flows || []).slice(0, 4);
  const areaRows = (() => {
    const list = (areasData?.areas || []).filter((a) => a.bookings);
    const total = list.reduce((t, a) => t + a.bookings, 0);
    if (!total) return [];
    const top = list.slice(0, 5).map((a) => ({ name: a.name, pct: share(a.bookings, total), growth: a.growth_pct }));
    const rest = total - list.slice(0, 5).reduce((t, a) => t + a.bookings, 0);
    if (rest > 0) top.push({ name: "Others", pct: share(rest, total), growth: null });
    return top;
  })();
  const feed = liveFeed.data?.items || [];

  // ---- 16. Insights ---------------------------------------------------------------------
  const recommendations = [];
  if (attributed.length) {
    const topSource = [...attributed].sort((a, b) => b.users - a.users)[0];
    recommendations.push({ icon: ArrowUpRight, color: "#16A34A", text: `${titleCase(topSource.source)} brings ${fmtPct(share(topSource.users, channelTotal))} of new sign-ups.` });
  }
  if (heatStats) recommendations.push({ icon: AlarmClock, color: "#16A34A", text: `Push offers around ${heatStats.time} - ${fmtPct(heatStats.timeShare)} of weekly activity happens then.` });
  if (biggestDrop) recommendations.push({ icon: ShoppingCart, color: "#E11D48", text: `${fmtPct(biggestDrop.rate)} drop-off from ${biggestDrop.from} → ${biggestDrop.to}.` });
  const loyalLtv = ltvRows.find((r) => r.key === "loyal");
  if (loyalLtv && ltvAll) recommendations.push({ icon: Star, color: "#D97706", text: `Loyal customers are worth ${(loyalLtv.avg_lifetime_spend / ltvAll).toFixed(1)}x the average user. Reward them.` });
  const inactive = segmentRows.find((s) => s.key === "inactive");
  if (inactive?.value) recommendations.push({ icon: Bell, color: "#E11D48", text: `Re-engage ${num(inactive.value)} inactive users (60+ days) with a comeback offer.` });

  const exportReport = () => {
    if (!ov) return;
    downloadCsv(
      `user-analytics-360_${ov.from}_${ov.to}.csv`,
      ["Section", "Metric", "Value", "Share"],
      [
        ...kpis.map((x) => ["KPI", x.label, x.value, ""]),
        ...funnel.map((s) => ["Funnel", s.label, s.users, fmtPct(s.pct)]),
        ...segmentRows.map((s) => ["Segments", s.name, s.value, fmtPct(s.pct)]),
        ...channelRows.map((c) => ["Acquisition", c.name, c.users, fmtPct(share(c.users, channelTotal))]),
        ...(retention?.cohorts || []).map((c) => ["Retention", `${c.from} to ${c.to} (${c.users} users)`, c.retention.map((v, i) => `D${cohortCols[i]} ${fmtPct(v)}`).join(" · "), ""]),
        ...ltvRows.map((r) => ["LTV", r.label, r.avg_lifetime_spend, ""]),
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
        platform={platform}
        setPlatform={setPlatform}
        city={city}
        setCity={setCity}
        cityOptions={cityOptions}
        onExport={exportReport}
      />

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - KPI tiles */}
        <div className={`grid ${KPI_COLS} ${GAP}`}>
          {kpis.map(({ icon, color, tint, line, spark, ...tile }) => (
            <KpiTile key={tile.label} {...tile} icon={icon} iconColor={color} iconTint={tint} spark={spark} sparkColor={line} sparkId={`ua360-kpi-${tile.label.replace(/\W/g, "")}`} />
          ))}

          <KpiTile
            label="DAU / MAU"
            value={loading ? "…" : `${num(m.dau)} / ${num(m.mau)}`}
            icon={Users}
            iconColor="#2563EB"
            iconTint="#DBEAFE"
            sizes={{ label: T.xs, value: "text-[15px]", delta: T.xs, caption: T.xs }}
            caption={
              isNum(stickiness) ? (
                <span className="flex items-center gap-1.5">
                  <b className="font-bold text-slate-800">{fmtPct(stickiness)}</b>
                  {isNum(prevStickiness) && <Delta value={`${Math.abs(stickiness - prevStickiness).toFixed(1)} pts`} up={stickiness >= prevStickiness} size={T.xs} iconSize={10} />}
                </span>
              ) : (
                activityNote
              )
            }
            footer={
              dauBars.some((b) => b.v) ? (
                <div className="mt-auto h-[38px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dauBars} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
                      <Bar dataKey="v" fill={BRAND} radius={[1, 1, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null
            }
          />
        </div>

        {/* Row 2 - Funnel / activity heatmap / screen time */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={1}>User Journey Funnel</Title>} subtitle="Unique users per step in the period" />
            {funnel.length ? (
              <div className="mt-3 flex flex-1 gap-4">
                <ul className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                  {funnel.map((row) => {
                    const inside = row.width > 55;
                    return (
                      <li key={row.key} className="relative h-[26px]">
                        <span className={`absolute left-0 top-0 flex h-full items-center rounded-md px-2.5 font-semibold text-white ${T.xs}`} style={{ width: `${row.width}%`, background: row.color }}>
                          <span className="truncate leading-tight">{row.label}</span>
                        </span>
                        <span className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-semibold ${T.xs} ${inside ? "text-white" : "text-slate-800"}`} style={{ left: inside ? `${row.width * 0.62}%` : `${row.width + 3}%` }}>
                          {num(row.users)}
                        </span>
                        <span className={`absolute right-0 top-1/2 -translate-y-1/2 pr-2 ${T.xs} ${row.width > 90 ? "font-semibold text-white" : "pr-0 text-slate-600"}`}>{fmtPct(row.pct)}</span>
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
                      <g transform="rotate(-90 40 40)">
                        <circle cx="40" cy="40" r="33" fill="none" stroke="#EEF0F6" strokeWidth="7" />
                        <circle cx="40" cy="40" r="33" fill="none" stroke="url(#ua360-ring)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(Math.min(100, overall || 0) / 100) * 207} 207`} />
                      </g>
                    </svg>
                    <span className="absolute inset-0 grid place-items-center text-[14px] font-extrabold text-slate-900">{fmtPct(overall)}</span>
                  </div>
                  <p className={`mt-1 text-center text-slate-400 ${T.nano}`}>
                    {funnel[0]?.label} → {funnel[funnel.length - 1]?.label}
                  </p>

                  {biggestDrop && (
                    <div className="mt-auto rounded-lg border border-rose-100 bg-rose-50/40 px-2.5 py-2">
                      <p className={`font-bold ${T.xs}`} style={{ color: RED }}>
                        Biggest Drop-off
                      </p>
                      <p className={`mt-1 text-slate-700 ${T.xs}`}>
                        {biggestDrop.from} → {biggestDrop.to}
                      </p>
                      <p className="mt-0.5 text-[16px] font-extrabold tracking-tight text-slate-900">{fmtPct(biggestDrop.rate)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No funnel data in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={2}>User Activity Heatmap</Title>} subtitle="By session start (IST)" />
            <div className="mt-2.5">
              <Segmented value={heatTab} onChange={setHeatTab} options={HEAT_TABS} className="w-fit" />
            </div>

            {heatMax ? (
              <div className="mt-3 flex flex-1 gap-4">
                <div className="flex min-w-0 flex-1 flex-col">
                  <HeatGrid
                    values={heatValues}
                    ramp={HEAT_RAMP}
                    rowLabels={WEEKDAYS}
                    colLabels={heat.day_parts}
                    title={(r, c) => `${WEEKDAYS[r]} ${heat.day_parts[c]} · ${heatTab === "users" ? `${num(heatSource[c][r])} active users` : secs(heatSource[c][r])}`}
                  />
                  <div className="mt-auto pt-2.5">
                    <RampLegend ramp={HEAT_RAMP} from="Less Active" to="More Active" size={T.nano} width={210} />
                  </div>
                </div>

                {heatStats && (
                  <div className="flex w-[152px] shrink-0 flex-col justify-between gap-2.5">
                    {[
                      { icon: Clock, color: VIOLET, tint: "#EEEAFD", label: "Peak Time", value: heatStats.time, caption: `${fmtPct(heatStats.timeShare)} of activity` },
                      { icon: CalendarDays, color: "#E11D48", tint: "#FFE4E6", label: "Peak Day", value: heatStats.day, caption: isNum(heatStats.dayLift) ? `${Math.round(heatStats.dayLift)}% above an average day` : "" },
                    ].map((stat) => (
                      <div key={stat.label} className="flex flex-1 items-center gap-2.5 rounded-lg border border-[#EEF0F6] px-2.5 py-2">
                        <IconCircle icon={stat.icon} color={stat.color} tint={stat.tint} size={26} iconSize={13} />
                        <div className="min-w-0 leading-tight">
                          <p className={`text-slate-500 ${T.nano}`}>{stat.label}</p>
                          <p className="mt-0.5 text-[12px] font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                          <p className={`mt-0.5 text-slate-500 ${T.nano}`}>{stat.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : activityNote}</EmptyNote>
            )}
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
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${T.nano} ${screenTab === tab.value ? "bg-white text-[#4F46E5] shadow-sm" : "text-slate-500"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-1 gap-3">
              <div className="w-[196px] shrink-0">
                <p className="flex items-baseline gap-2">
                  <span className="text-[20px] font-extrabold tracking-tight text-slate-900">{screenHeadline.value}</span>
                  {isNum(screenHeadline.delta) && <Delta value={`${Math.abs(screenHeadline.delta).toFixed(1)}%`} up={screenHeadline.delta >= 0} size={T.xs} iconSize={10} />}
                  <span className={`text-slate-400 ${T.nano}`}>{screenHeadline.label}</span>
                </p>
                {screenRows.length ? (
                  <ul className="mt-2.5 flex flex-col gap-[11px]">
                    {screenRows.map((row) => {
                      const Icon = row.icon;
                      return (
                        <li key={row.key} className={`flex items-center gap-2.5 ${T.sm}`}>
                          <Icon size={13} style={{ color: "#2563EB" }} className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-slate-700">{row.label}</span>
                          <span className="shrink-0 font-semibold text-slate-800">{row.value}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={`mt-3 text-slate-400 ${T.xs}`}>{click?.screens_since ? "No screen views in this period" : "No screen views tracked yet"}</p>
                )}
              </div>

              <div className="relative min-w-0 flex-1">
                <span className="absolute -top-1 right-0 z-10 rounded-md bg-[#1E293B] px-2 py-1 leading-tight text-white shadow-md">
                  <span className={`block font-bold ${T.xs}`}>Most taps</span>
                  <span className={`block text-slate-300 ${T.nano}`}>{tapBlobs.length ? "All screens" : "Waiting for app taps"}</span>
                </span>
                <div className="mx-auto mt-6 h-[184px] w-[96px] rounded-[16px] bg-[#15151c] p-[3px] shadow-[0_6px_14px_rgba(15,23,42,0.2)]">
                  <div className="relative h-full w-full overflow-hidden rounded-[13px] bg-white">
                    <span className="absolute left-1/2 top-[3px] z-10 h-[4px] w-[26px] -translate-x-1/2 rounded-full bg-[#15151c]" />
                    <span className="absolute left-2 right-2 top-[18px] h-[10px] rounded bg-slate-100" />
                    <span className="absolute left-2 right-8 top-[36px] h-[6px] rounded bg-slate-100" />
                    <span className="absolute left-2 right-2 top-[52px] h-[52px] rounded bg-slate-100/80" />
                    <span className="absolute left-2 right-2 top-[112px] h-[8px] rounded bg-slate-100" />
                    {tapBlobs.map((blob, i) => (
                      <TapBlob key={i} {...blob} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Row 3 - Channels / segmentation / cohorts / behaviour / uninstall */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={4}>User Acquisition Channels</Title>} subtitle={attributed.length ? "Sign-ups by install source" : "Sign-ups · install source not reported yet"} />
            {channelTotal ? (
              <ul className="mt-2 flex flex-1 flex-col justify-around gap-1.5">
                {channelRows.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`} title={`${num(row.users)} sign-ups`}>
                    <ChannelBadge kind={row.kind} />
                    <span className="w-[62px] shrink-0 truncate text-slate-700">{row.name}</span>
                    <span className="min-w-0 flex-1">
                      <Meter pct={channelMax ? (row.users / channelMax) * 100 : 0} height={4} track="transparent" color="linear-gradient(90deg,#8B74F5,#5B3FF0)" />
                    </span>
                    <span className="w-[36px] shrink-0 text-right font-semibold text-slate-700">{fmtPct(share(row.users, channelTotal))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{userSegments.loading && !seg ? "Loading…" : "No sign-ups in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={5}>User Segmentation</Title>} subtitle="As of the period end" />
            {segmentRows.length ? (
              <div className="mt-2 flex flex-1 items-center gap-4">
                <Donut data={segmentRows} size={132} inner="64%" center={num(seg.total_users)} caption="Total Users" />
                <SegmentLegend data={segmentRows} />
              </div>
            ) : (
              <EmptyNote>{userSegments.loading ? "Loading…" : "No users yet"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={6}>Cohort Retention</Title>} right={<Select value={cohortMode} onChange={setCohortMode} options={COHORT_MODES} className="w-[124px] [&_select]:py-1" />} />
            {retention?.cohorts?.length ? (
              <table className="mt-3 w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: "32%" }} />
                  {cohortCols.map((col) => (
                    <col key={col} style={{ width: `${68 / cohortCols.length}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Week</th>
                    {cohortCols.map((col) => (
                      <th key={col} className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>
                        Day {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retention.cohorts.map((row) => (
                    <tr key={row.from} className="h-[25px]" title={`${num(row.users)} users`}>
                      <td className={`whitespace-nowrap text-slate-700 ${T.nano}`}>{fmtRange(row.from, row.to)}</td>
                      {row.retention.map((value, i) => (
                        <td key={cohortCols[i]} className={`text-center ${T.nano} ${isNum(value) ? "text-slate-700" : "text-slate-300"}`}>
                          {row.users ? fmtPct(value) : DASH}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{userRetention.loading ? "Loading…" : "No cohorts yet"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={7}>Booking Behavior</Title>} />
            {behavior?.customers ? (
              <ul className="mt-2 flex flex-1 flex-col justify-around gap-1.5">
                {[
                  { icon: Users, color: VIOLET, tint: "#EEEAFD", label: "Avg. Bookings per User", value: num(behavior.avg_bookings_per_user), d: change(behavior.avg_bookings_per_user, behaviorPrev?.avg_bookings_per_user) },
                  { icon: Timer, color: "#E11D48", tint: "#FFE4E6", label: "Avg. Days Between Bookings", value: isNum(behavior.avg_days_between) ? `${behavior.avg_days_between} Days` : DASH, d: change(behavior.avg_days_between, behaviorPrev?.avg_days_between) },
                  { icon: Clock, color: "#2563EB", tint: "#DBEAFE", label: "Preferred Time", value: behavior.preferred_time || DASH },
                  { icon: Repeat, color: "#EA580C", tint: "#FFEDD5", label: "Repeat Booking Rate", value: fmtPct(behavior.repeat_booking_rate) },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-2">
                    <IconCircle icon={row.icon} color={row.color} tint={row.tint} size={24} iconSize={12} />
                    <span className={`min-w-0 flex-1 leading-tight text-slate-600 ${T.nano}`}>{row.label}</span>
                    <span className="shrink-0 text-right leading-tight">
                      <span className={`block font-bold text-slate-900 ${T.sm}`}>{row.value}</span>
                      {isNum(row.d) && <Delta value={`${Math.abs(row.d).toFixed(1)}%`} up={row.d >= 0} size={T.nano} iconSize={9} />}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{userSegments.loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={8}>Uninstall Rate</Title>} subtitle={leaveRows.length ? "Account deletion reasons" : "Reasons come from the app's delete prompt"} />
            <div className="mt-2 flex flex-1 items-center gap-4">
              <Donut
                data={leaveRows.length ? leaveRows : [{ name: "No reasons yet", value: 1, color: "#E2E8F0" }]}
                size={124}
                inner="68%"
                formatter={(value) => (leaveRows.length ? num(value) : "")}
                center={
                  <span className="flex flex-col items-center gap-0.5">
                    <span>{loading ? "…" : fmtPct(m.uninstall_rate)}</span>
                    <span className={`font-normal text-slate-500 ${T.nano}`}>{num(m.uninstalls)} uninstalls</span>
                    {isNum(uninstallDelta) && <Delta value={`${Math.abs(uninstallDelta).toFixed(1)} pts`} up={uninstallDelta >= 0} good={uninstallDelta < 0} size={T.nano} iconSize={9} />}
                  </span>
                }
              />
              {leaveRows.length ? (
                <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
                  {leaveRows.map((row) => (
                    <li key={row.name} className={`flex items-center gap-2 ${T.xs}`} title={`${num(row.value)} users`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                      <span className="shrink-0 font-semibold text-slate-700">{fmtPct(row.pct)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`min-w-0 flex-1 text-slate-400 ${T.xs}`}>Uninstalls are detected from push tokens that stopped working.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Row 4 - Interest / checkout / new vs returning / LTV */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={9}>Booking Interest</Title>} subtitle="Most booked services & categories" />
            <div className="mt-2.5 flex items-center gap-4 border-b border-slate-100">
              {[
                { value: "services", label: "Services" },
                { value: "categories", label: "Categories" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setInterestTab(tab.value)}
                  className={`-mb-px border-b-2 pb-1.5 font-semibold ${T.nano} ${interestTab === tab.value ? "text-[#4F46E5]" : "border-transparent text-slate-500"}`}
                  style={interestTab === tab.value ? { borderColor: BRAND } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {interest.length ? (
              <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
                {interest.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={row.name}>
                      {row.name}
                    </span>
                    <span className="shrink-0 text-right font-medium text-slate-800">{num(row.count)}</span>
                    <span className="w-[36px] shrink-0 text-right font-semibold text-slate-500">{fmtPct(row.share)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{serviceIntel.loading && !svc ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={10}>Checkout &amp; Payment Funnel</Title>} subtitle="Unique users in the period" />
            <div className="mt-3 flex flex-1 gap-3">
              {cartTop ? (
                <ul className="flex min-w-0 flex-1 flex-col justify-around gap-1.5">
                  {cartSteps.map((row, i) => {
                    const pct = share(row.users, cartTop);
                    return (
                      <li key={row.label} className={`flex items-center gap-2 ${T.xs}`}>
                        <span className="w-[80px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                        <span className="w-[40px] shrink-0 text-right font-medium text-slate-800">{num(row.users)}</span>
                        <span className="min-w-0 flex-1">
                          <Meter pct={pct || 0} height={11} track="transparent" color={`linear-gradient(90deg,#B7A6F8,rgba(91,63,240,${(1 - i * 0.12).toFixed(2)}))`} className="rounded-[3px] [&>span]:rounded-[3px]" />
                        </span>
                        <span className="w-[38px] shrink-0 text-right text-slate-600">{fmtPct(pct)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyNote>{loading ? "Loading…" : "No checkout activity in this period"}</EmptyNote>
              )}

              <div className="w-[132px] shrink-0 rounded-lg bg-[#F7F8FC] px-2.5 py-2">
                <p className={`font-bold text-slate-800 ${T.nano}`}>Why users left checkout</p>
                {cartReasons.length ? (
                  <ul className="mt-1.5 flex flex-col gap-[7px]">
                    {cartReasons.map((row) => {
                      const Icon = row.icon;
                      return (
                        <li key={row.label} className={`flex items-center gap-1.5 ${T.nano}`}>
                          <span className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded" style={{ background: `${row.color}1F`, color: row.color }}>
                            <Icon size={9} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-slate-700">{row.label}</span>
                          <span className="shrink-0 font-semibold text-slate-800">{fmtPct(row.pct)}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={`mt-1.5 text-slate-400 ${T.nano}`}>Collected once the app asks users who exit checkout.</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={11}>New vs Returning Users</Title>} subtitle={nvr?.customers ? `Customers: ${num(nvr.new)} new · ${num(nvr.returning)} returning` : undefined} />
            <div className="mt-2 flex items-center gap-4">
              <LegendDot line color={VIOLET} label="New sign-ups" size={T.nano} />
              <LegendDot line color={GREEN} label="Active users (DAU)" size={T.nano} />
            </div>
            {newVsActive.length ? (
              <div className="mt-1 min-h-[110px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={newVsActive} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#EEF1F6" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 8.5 }} dy={4} interval="preserveStartEnd" minTickGap={14} padding={{ left: 6, right: 6 }} />
                    <YAxis domain={[0, "auto"]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 8.5 }} width={30} />
                    <Tooltip {...TOOLTIP} formatter={(v) => num(v)} />
                    <Line type="monotone" dataKey="fresh" name="New sign-ups" stroke={VIOLET} strokeWidth={1.8} dot={newVsActive.length <= 31 ? { r: 2.4, fill: VIOLET, strokeWidth: 0 } : false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="active" name="Active users" stroke={GREEN} strokeWidth={1.8} dot={newVsActive.length <= 31 ? { r: 2.4, fill: GREEN, strokeWidth: 0 } : false} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : DASH}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={12}>LTV &amp; Revenue per User</Title>} subtitle="Lifetime spend on served bookings" />
            {ltvRows.length ? (
              <div className="mt-2 flex flex-1 gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-slate-500 ${T.nano}`}>Avg. LTV (All Users)</p>
                  <p className="mt-0.5 text-[18px] font-extrabold tracking-tight text-slate-900">{rupee(ltvAll)}</p>
                  <p className={`mt-2 font-medium text-slate-600 ${T.nano}`}>Segment</p>
                  <ul className="mt-1.5 flex flex-col gap-[7px]">
                    {ltvRows.map((row) => (
                      <li key={row.key} className={`flex items-center gap-2 ${T.nano}`}>
                        <span className="w-[64px] shrink-0 whitespace-nowrap text-slate-600">{row.label}</span>
                        <span className="min-w-0 flex-1">
                          <Meter pct={ltvMax ? (row.avg_lifetime_spend / ltvMax) * 100 : 0} height={4} track="transparent" color="linear-gradient(90deg,#8B74F5,#5B3FF0)" />
                        </span>
                        <span className="w-[44px] shrink-0 text-right font-semibold text-slate-800">{rupee(row.avg_lifetime_spend)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {ltvShare.length > 0 && (
                  <div className="w-[130px] shrink-0 rounded-lg border border-[#EEF0F6] px-2.5 py-2">
                    <p className={`font-semibold text-slate-700 ${T.nano}`}>Spend Share</p>
                    <div className="mt-1 flex justify-center">
                      <Donut data={ltvShare} size={74} inner="76%" formatter={(v) => `${v}%`} />
                    </div>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {ltvShare.map((row) => (
                        <li key={row.name} className={`flex items-center gap-1.5 ${T.nano}`}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.color }} />
                          <span className="min-w-0 flex-1 truncate text-slate-600">{row.name}</span>
                          <span className="shrink-0 font-semibold text-slate-800">{fmtPct(row.pct)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <EmptyNote>{userSegments.loading ? "Loading…" : "No spend recorded yet"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 5 - Flows / geography / live feed / insights */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={13} aside="(Top Paths)">User Flow Insights</Title>} subtitle="Most common screen sequences in a day" />
            {flows.length ? (
              <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
                {flows.map((flow, i) => (
                  <div key={i} className="flex min-w-0 flex-col justify-center rounded-lg bg-[#F4F2FE] px-2.5 py-1.5">
                    <span className={`flex flex-wrap items-center gap-0.5 text-slate-600 ${T.nano}`}>
                      {flow.steps.map((step, j) => (
                        <span key={j} className="flex items-center gap-0.5">
                          {j > 0 && <ChevronRight size={8} className="text-slate-400" />}
                          {step}
                        </span>
                      ))}
                    </span>
                    <span className={`mt-0.5 font-bold text-slate-900 ${T.xs}`}>
                      {fmtPct(flow.share)} <span className={`font-normal text-slate-500 ${T.nano}`}>({num(flow.sessions)} days)</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote>{clickInteraction.loading && !click ? "Loading…" : "No multi-screen journeys in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={14}>Geographic Insights</Title>} subtitle="Bookings by salon area" />
            <div className="mt-2.5 flex flex-1 gap-3">
              {/* Static stand-in for the map thumbnail: soft heat on a pale base. */}
              <div className="relative w-[118px] shrink-0 overflow-hidden rounded-lg" style={{ background: "linear-gradient(135deg,#E7EDF5,#F1EFE8)" }}>
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
                    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(109,74,224,0.85) 0%, rgba(109,74,224,0.35) 45%, rgba(109,74,224,0) 72%)" }}
                  />
                ))}
                <span className={`absolute inset-x-0 bottom-3 text-center font-bold text-slate-700 ${T.xs}`}>{city === "all" ? "All Cities" : city}</span>
              </div>

              {areaRows.length ? (
                <ul className="flex min-w-0 flex-1 flex-col justify-around gap-1">
                  {areaRows.map((row) => (
                    <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                      <span className="shrink-0 font-semibold text-slate-800">{fmtPct(row.pct)}</span>
                      <span className={`w-[8px] shrink-0 ${isNum(row.growth) ? (row.growth >= 0 ? "text-emerald-500" : "text-rose-500") : "text-transparent"}`}>{isNum(row.growth) ? (row.growth >= 0 ? "↑" : "↓") : "·"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote>{salonHeatmap.loading && !areasData ? "Loading…" : "No bookings in this period"}</EmptyNote>
              )}
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
                  className={`flex items-center gap-1 rounded-full py-0.5 pl-2 pr-0.5 font-semibold text-white transition-colors ${T.nano} ${feedLive ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  {feedLive ? "Live" : "Paused"}
                  <span className="h-3.5 w-3.5 rounded-full bg-white" />
                </button>
              }
            />
            {feed.length ? (
              <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
                {feed.slice(0, 5).map((item, i) => {
                  const style = FEED_STYLE[item.kind] || FEED_STYLE.signup;
                  const sub =
                    item.kind === "signup"
                      ? item.name || `User #${item.user_id}`
                      : item.kind === "booking"
                        ? [item.detail, rupee(item.amount), item.area].filter(Boolean).join(" | ")
                        : `${item.detail}★ · ${[item.store, item.area].filter(Boolean).join(" | ")}`;
                  return (
                    <li key={`${item.kind}-${item.at}-${i}`} className="flex items-center gap-2">
                      <IconCircle icon={style.icon} color={style.color} tint={style.tint} size={22} iconSize={11} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className={`block truncate font-semibold text-slate-800 ${T.nano}`}>{style.title}</span>
                        <span className={`block truncate text-slate-500 ${T.nano}`}>{sub}</span>
                      </span>
                      <span className={`shrink-0 text-slate-400 ${T.nano}`}>{ago(item.at)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{liveFeed.loading ? "Loading…" : "No activity in the last 30 days"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={16}>Insights &amp; Recommendations</Title>} />
            <ul className="mt-2.5 flex flex-1 flex-col justify-around gap-1">
              {recommendations.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-2.5">
                    <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border" style={{ borderColor: `${item.color}66`, color: item.color }}>
                      <Icon size={9} />
                    </span>
                    <span className={`min-w-0 text-slate-700 ${T.nano}`}>{item.text}</span>
                  </li>
                );
              })}
              {!recommendations.length && <li className={`text-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : "Not enough data for insights yet."}</li>}
            </ul>
          </Card>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default UserAnalytics360V2;
