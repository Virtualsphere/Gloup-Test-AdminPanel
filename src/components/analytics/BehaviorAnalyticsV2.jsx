import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BadgePercent,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  CircleDollarSign,
  Clock,
  ClipboardCheck,
  Crown,
  Download,
  Eye,
  FileDown,
  Filter,
  Flower2,
  Gem,
  Gift,
  Hand,
  Heart,
  Hourglass,
  LayoutGrid,
  Loader2,
  MonitorSmartphone,
  Moon,
  MousePointerClick,
  Repeat,
  Scale,
  Scissors,
  Search,
  Send,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Store,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";
import { fetchBehaviorAnalyticsV2, fetchBehaviorListV2, sendBulkUserPushV2 } from "../../redux/slices/analyticsSlice";
import { downloadXlsx } from "../../utils/excelExport";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  ListDialog,
  Meter,
  PushDialog,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Advanced Behavior Analytics" mockup, on a fixed DESIGN_WIDTH
// canvas that ScaledCanvas scales to the available width (see there for why
// bigger px sizes in T read smaller on screen).
//
// Data: getBehaviorAnalyticsV2 (analyticsSlice `behavior`). Bookings are
// served ones (paid, not cancelled / refunded, from go-live). App activity,
// salon views, searches / filters and checkouts come from the app tracking
// (heartbeat sessions, screen views logged by the API, and the app's own
// event batch once the Flutter app sends it), so those cards say when
// tracking started. Lifestyle segments are rules over booking history (time
// of day, spacing, spend), not a model. Drop-off reasons come from the
// reason prompts the app sends to /v2/feedback. Opportunities cover the
// window's last 7 days; Send Push / Contacts fetch that list.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const BLUE = "#2E7CF6";
const GREEN = "#22B573";
const AMBER = "#F5A524";
const PINK = "#F0507A";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[430fr_464fr_435fr]";
const ROW3_COLS = "grid-cols-[430fr_442fr_452fr]";
const ROW4_COLS = "grid-cols-[430fr_368fr_532fr]";
const ROW5_COLS = "grid-cols-[512fr_380fr_432fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1349px of content, so measured sizes carry over at ~1.13x.
const T = {
  nano: "text-[8.5px]", // column headers, sub-lines
  micro: "text-[9.5px]", // notes, subtitles
  xs: "text-[10px]", // table cells
  sm: "text-[11px]", // legend rows, links
  title: "text-[13px]", // card titles
  kpi: "text-[21px]", // KPI values
  donut: "text-[17px]", // donut centre total
};

const GAP = "gap-3";
const DASH = "–";
const DONUT_COLORS = [BRAND, BLUE, GREEN, AMBER, PINK];

const PERIODS = [
  { key: "last_7", label: "Last 7 Days", range: () => [moment().subtract(6, "days"), moment()] },
  { key: "last_14", label: "Last 14 Days", range: () => [moment().subtract(13, "days"), moment()] },
  { key: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
];
const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
];

const SEGMENT_STYLE = {
  basic: { icon: Scissors, color: "#2563EB", tint: "#DBEAFE" },
  face: { icon: Smile, color: "#EA580C", tint: "#FFEDD5" },
  relax: { icon: Flower2, color: "#16A34A", tint: "#DCFCE7" },
  premium: { icon: Gem, color: "#E11D48", tint: "#FFE4E6" },
  other: { icon: LayoutGrid, color: "#64748B", tint: "#EEF1F6" },
};
const INTENT_STYLE = {
  viewed_3: { icon: Search, color: "#2563EB", tint: "#DBEAFE" },
  price_filter: { icon: Scale, color: "#6D4AE0", tint: "#EDE9FE" },
  unpaid_checkout: { icon: ShoppingCart, color: "#EA580C", tint: "#FFEDD5" },
  offers: { icon: Ticket, color: "#16A34A", tint: "#DCFCE7" },
  coupon: { icon: BadgePercent, color: "#E11D48", tint: "#FFE4E6" },
};
const HIGH_VALUE_STYLES = [
  { icon: Hand, color: "#E11D48", tint: "#FFE4E6" },
  { icon: Flower2, color: "#2563EB", tint: "#DBEAFE" },
  { icon: Sparkles, color: "#4F46E5", tint: "#E0E7FF" },
  { icon: Gem, color: "#16A34A", tint: "#DCFCE7" },
  { icon: Crown, color: "#D97706", tint: "#FEF3C7" },
];
const SPEED_COLORS = { fast: GREEN, medium: AMBER, slow: PINK };
const LIFESTYLE_STYLE = {
  busy: { icon: Briefcase, color: "#16A34A", tint: "#DCFCE7" },
  regular: { icon: CalendarClock, color: "#2563EB", tint: "#DBEAFE" },
  self_care: { icon: Heart, color: "#E11D48", tint: "#FFE4E6" },
  occasional: { icon: Hourglass, color: "#EA580C", tint: "#FFEDD5" },
};
const OPPORTUNITY_STYLE = {
  viewed_not_booked: { icon: Eye, color: "#2563EB", tint: "#E0EBFF", audience: "users who viewed a salon but didn't book" },
  checkout_unpaid: { icon: ShoppingCart, color: "#EA580C", tint: "#FFEDD5", audience: "users who started checkout but didn't pay" },
  offer_not_booked: { icon: Ticket, color: "#E11D48", tint: "#FFE4E6", audience: "users who checked offers but didn't book" },
  inactive_7d: { icon: Moon, color: "#16A34A", tint: "#DCFCE7", audience: "users inactive for 7+ days" },
};
// Timeline steps by event kind (server-logged names and the app's event types).
const SCREEN_LABEL = { home: "Home", search: "Search", salon_details: "Salon Details", slots: "Slots", offers: "Offers", checkout: "Checkout", payment: "Payment", payment_success: "Payment Success", bookings: "Bookings", profile: "Profile" };
const STEP_STYLE = {
  salon_view: { icon: Store, color: "#6D4AE0", tint: "#EDE9FE", name: "Viewed Salon" },
  screen_view: { icon: Eye, color: "#2563EB", tint: "#E0EBFF", name: "Opened Screen" },
  search: { icon: Search, color: "#2563EB", tint: "#E0EBFF", name: "Searched" },
  filter: { icon: Filter, color: "#6D4AE0", tint: "#EDE9FE", name: "Filtered" },
  tap: { icon: MousePointerClick, color: "#64748B", tint: "#EEF1F6", name: "Tapped" },
  cart: { icon: ShoppingCart, color: "#E11D48", tint: "#FFE4E6", name: "Cart" },
  checkout_step: { icon: ShoppingCart, color: "#E11D48", tint: "#FFE4E6", name: "Checkout Step" },
  coupon_apply: { icon: Ticket, color: "#16A34A", tint: "#DCFCE7", name: "Applied Coupon" },
  coupon_attempt_failed: { icon: Ticket, color: "#D97706", tint: "#FEF3C7", name: "Coupon Failed" },
  booking: { icon: CalendarCheck, color: "#2563EB", tint: "#DBEAFE", name: "Booking Paid" },
};
const CONTACT_COLUMNS = [
  { header: "Phone", kind: "text", width: 14, get: (r) => r.phone },
  { header: "Name", kind: "text", width: 24, get: (r) => r.name },
  { header: "Gender", kind: "text", width: 9, get: (r) => r.gender },
  { header: "User ID", kind: "int", width: 9, get: (r) => r.user_id },
];
const isReachable = (phone) => /^[6-9]\d{9}$/.test(String(phone || ""));

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : DASH);
const rupee = (v) => (isNum(v) ? `₹${num(v)}` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : DASH);
const duration = (s) => (isNum(s) ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s` : DASH);
const share = (part, whole) => (whole ? (part / whole) * 100 : null);

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

// "1. Booking Frequency (Per Month)": the bracketed part is lighter and smaller.
const Title = ({ index, children, aside }) => (
  <>
    {index}. {children}
    {aside && <span className={`ml-1 font-medium text-slate-500 ${T.micro}`}>{aside}</span>}
  </>
);

const KpiTile = (props) => <BaseKpiTile sizes={{ label: T.xs, value: T.kpi, delta: T.sm, caption: T.xs }} iconClass="h-[42px] w-[42px] rounded-full" iconSize={20} className="px-4 pb-3.5 pt-3.5" {...props} />;

const Donut = (props) => <BaseDonut inner="56%" centerSize={T.donut} captionSize={T.nano} formatter={(value) => num(value)} {...props} />;

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[300px]">{children}</p>
  </div>
);

// Footer strip under a card: grey for plain notes, green for a recommendation.
const Note = ({ tone = "gray", children, className = "" }) => (
  <p className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${T.micro} ${tone === "green" ? "border-emerald-100 bg-emerald-50/70 text-emerald-700" : "border-[#E9ECF4] bg-[#F7F8FC] text-slate-600"} ${className}`}>
    {tone === "green" && <CircleCheck size={12} className="shrink-0 text-emerald-500" />}
    {children}
  </p>
);

const IconTile = ({ icon, color, tint, size = 27 }) => {
  const Icon = icon;
  return (
    <span className="grid shrink-0 place-items-center rounded-lg" style={{ width: size, height: size, background: tint, color }}>
      <Icon size={Math.round(size * 0.56)} />
    </span>
  );
};

// Donut legend row: dot, name, then "count (pct)".
const CountLegend = ({ data, gap = "gap-[15px]" }) => (
  <ul className={`flex min-w-0 flex-1 flex-col ${gap}`}>
    {data.map((row) => (
      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-slate-700" title={row.name}>
          {row.name}
        </span>
        <span className="shrink-0 whitespace-nowrap text-slate-600">
          {num(row.value)} <span className="text-slate-500">({fmtPct(row.pct)})</span>
        </span>
      </li>
    ))}
  </ul>
);

// Semicircle gauge: four colour bands and a needle at `value` (0-100).
const GAUGE = { cx: 70, cy: 70, r: 54, stroke: 14 };
const BANDS = [
  { from: 180, to: 134, color: "#F0507A" },
  { from: 135, to: 89, color: "#F5933A" },
  { from: 90, to: 44, color: "#F7C233" },
  { from: 45, to: 0, color: "#22B573" },
];
const polar = (deg, radius) => [GAUGE.cx + radius * Math.cos((deg * Math.PI) / 180), GAUGE.cy - radius * Math.sin((deg * Math.PI) / 180)];
const arcPath = (from, to) => {
  const [x1, y1] = polar(from, GAUGE.r);
  const [x2, y2] = polar(to, GAUGE.r);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${GAUGE.r},${GAUGE.r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
};

const Gauge = ({ value }) => {
  const [nx, ny] = polar(180 - ((value || 0) / 100) * 180, GAUGE.r - 12);
  return (
    <svg viewBox="0 0 140 80" className="h-[84px] w-[147px] shrink-0" role="img" aria-label={`${value}% fast bookers`}>
      {BANDS.map((band) => (
        <path key={band.color} d={arcPath(band.from, band.to)} fill="none" stroke={band.color} strokeWidth={GAUGE.stroke} />
      ))}
      <line x1={GAUGE.cx} y1={GAUGE.cy} x2={nx} y2={ny} stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={GAUGE.cx} cy={GAUGE.cy} r="4" fill="#1F2937" />
    </svg>
  );
};

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, platform, setPlatform, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Deep insights into user intent, preferences and patterns</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="behavior-range" maxDays={92} className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MonitorSmartphone} label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} className="hidden xl:flex" />
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

const BehaviorAnalyticsV2 = ({ title = "Advanced Behavior Analytics" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { behavior } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [custom, setCustom] = useState(null);
  const [platform, setPlatform] = useState("all");
  const [push, setPush] = useState(null); // { key, count }
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(null);
  const [dialog, setDialog] = useState(null); // { key, loading, rows }

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);
  const body = useMemo(() => {
    const b = { from: range.from, to: range.to };
    if (platform !== "all") b.platform = platform;
    return b;
  }, [range.from, range.to, platform]);

  useEffect(() => {
    dispatch(fetchBehaviorAnalyticsV2(body))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load behavior analytics", { id: "behavior-v2" }));
  }, [dispatch, body]);

  const data = behavior.data;
  const loading = behavior.loading && !data;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const notTracked = data?.activity_since ? `Tracked since ${fmtDay(data.activity_since)}` : "No app activity tracked yet";
  const eventsNote = data?.events_since ? `Tracked since ${fmtDay(data.events_since)}` : "Not tracked yet";

  const kpi = (label, key, fmt, icon, color, tint, missing = notTracked) => {
    const cur = k[key];
    const prev = pk[key];
    const d = isNum(cur) && isNum(prev) && prev ? ((cur - prev) / prev) * 100 : null;
    return {
      label,
      value: loading ? "…" : fmt(cur),
      delta: isNum(d) ? `${Math.abs(d).toFixed(1)}%` : undefined,
      up: isNum(d) ? d >= 0 : undefined,
      caption: !isNum(cur) ? missing : compare,
      icon,
      color,
      tint,
    };
  };
  const kpis = [
    kpi("Active Users", "active_users", num, Users, "#6D4AE0", "#EEEAFD"),
    kpi("Avg. Daily Active Users", "dau", num, UserCheck, "#16A34A", "#DCFCE7"),
    kpi("Sessions", "sessions", num, ShoppingCart, "#EA580C", "#FFEDD5"),
    kpi("Avg. Session Duration", "avg_session_seconds", duration, Clock, "#E11D48", "#FFE4E6"),
    kpi("Salon Views", "salon_views", num, Eye, "#2563EB", "#DBEAFE", eventsNote),
    kpi("Bookings Completed", "bookings_completed", num, ClipboardCheck, "#6D4AE0", "#EEEAFD", compare),
  ];

  const frequency = (data?.frequency || []).map((r, i) => ({ name: r.label, value: r.users, pct: r.share, color: DONUT_COLORS[i] }));
  const freqTotal = frequency.reduce((t, r) => t + r.value, 0);
  const segments = data?.service_segments || [];
  const intent = data?.intent;
  const pricing = (data?.pricing?.rows || []).map((r, i) => ({ name: r.label, value: r.users, pct: r.share, color: DONUT_COLORS[i] }));
  const pricingActive = pricing.some((r) => r.value && r.name !== "No comparison behaviour");
  const timeSpent = (data?.time_spent || []).map((r) => ({ label: r.label, pct: r.share || 0, sessions: r.sessions }));
  const sessionsTotal = timeSpent.reduce((t, r) => t + r.sessions, 0);
  const highValue = data?.high_value || [];
  const speed = data?.speed;
  const reasonsTotal = (data?.drop_reasons || []).reduce((t, r) => t + r.users, 0);
  const reasons = (data?.drop_reasons || []).slice(0, 5).map((r) => ({ label: r.reason, pct: share(r.users, reasonsTotal), users: r.users }));
  const lifestyle = data?.lifestyle || [];
  const timeline = data?.timeline || [];
  const opportunities = data?.opportunities;

  // Notes and key insights from the numbers above.
  const once = frequency.find((r) => r.name.startsWith("1 "));
  const topReason = reasons[0];
  const topValue = highValue[0];
  const busy7 = lifestyle.find((l) => l.key === "busy");
  const biggestOpp = [...(opportunities?.rows || [])].sort((a, b) => b.users - a.users)[0];
  const keyInsights = [];
  if (once?.value) keyInsights.push({ icon: Repeat, text: `${fmtPct(once.pct)} of customers booked once a month - focus on repeat bookings.` });
  if (topReason) keyInsights.push({ icon: CircleDollarSign, text: `"${topReason.label}" is the top reason users give for leaving (${fmtPct(topReason.pct)}).` });
  if (topValue) keyInsights.push({ icon: Crown, text: `${topValue.name} has the highest average order value (${rupee(topValue.aov)}).` });
  if (busy7?.users && busy7.best_time) keyInsights.push({ icon: Clock, text: `Best time to engage Busy Professionals is ${busy7.best_time}.` });
  if (biggestOpp?.users) keyInsights.push({ icon: Gift, text: `${num(biggestOpp.users)} ${OPPORTUNITY_STYLE[biggestOpp.key]?.audience || "users"} can be targeted now.` });

  // Opportunity lists: fetched on demand for push, contacts and the dialog.
  const fetchList = (key) => dispatch(fetchBehaviorListV2({ ...body, include_list: key })).unwrap().then((res) => res.rows || []);
  const openList = async (key) => {
    setDialog({ key, loading: true, rows: [] });
    try {
      setDialog({ key, loading: false, rows: await fetchList(key) });
    } catch (message) {
      toast.error(message || "Failed to load the list", { id: "behavior-list" });
      setDialog(null);
    }
  };
  const sendPush = async (pushTitle, message) => {
    setSending(true);
    try {
      const users = await fetchList(push.key);
      if (!users.length) {
        toast.error("Nobody in this list right now", { id: "behavior-push" });
        return;
      }
      const result = await dispatch(sendBulkUserPushV2({ user_ids: users.map((u) => u.user_id), title: pushTitle, description: message })).unwrap();
      const noToken = result.push?.no_token || 0;
      toast.success(`Sent to ${num(result.push?.success || 0)} devices${noToken ? ` · ${num(noToken)} users have no push token (in-app only)` : ""}`, { id: "behavior-push" });
      setPush(null);
    } catch (message) {
      toast.error(message || "Failed to send push notifications", { id: "behavior-push" });
    } finally {
      setSending(false);
    }
  };
  const downloadContacts = async (key) => {
    setBusy(key);
    toast.loading("Preparing contact list…", { id: "behavior-contacts" });
    try {
      const users = (await fetchList(key)).filter((u) => isReachable(u.phone));
      if (!users.length) {
        toast.error("No users with a valid mobile number in this list", { id: "behavior-contacts" });
        return;
      }
      await downloadXlsx(`${key}_${range.to}.xlsx`, [{ name: "Contacts", rows: users, columns: CONTACT_COLUMNS }]);
      toast.success(`Downloaded ${num(users.length)} contacts - upload the sheet on Marketing to send on WhatsApp`, { id: "behavior-contacts" });
    } catch (message) {
      toast.error(typeof message === "string" ? message : "Failed to build the contact list", { id: "behavior-contacts" });
    } finally {
      setBusy(null);
    }
  };

  const exportReport = () => {
    if (!data) return;
    downloadCsv(
      `behavior-analytics_${data.from}_${data.to}.csv`,
      ["Section", "Metric", "Users", "Share / Value"],
      [
        ...kpis.map((x) => ["KPI", x.label, "", x.value]),
        ...(data.frequency || []).map((r) => ["Booking frequency", r.label, r.users, fmtPct(r.share)]),
        ...segments.map((r) => ["Service segments", r.label, r.users, `${fmtPct(r.share)} · AOV ${rupee(r.aov)}`]),
        ...(intent?.rows || []).map((r) => ["High intent", r.label, r.users, fmtPct(r.share)]),
        ...(data.pricing?.rows || []).map((r) => ["Price behaviour", r.label, r.users, fmtPct(r.share)]),
        ...lifestyle.map((r) => ["Lifestyle", r.label, r.users, fmtPct(r.share)]),
        ...(opportunities?.rows || []).map((r) => ["Opportunities", r.label, r.users, ""]),
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
        onExport={exportReport}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - KPI tiles */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, ...tile }) => (
            <KpiTile key={tile.label} {...tile} icon={icon} iconColor={color} iconTint={tint} />
          ))}
        </div>

        {/* Row 2 - Frequency / service segments / high intent */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={1} aside="(Per Month)">Booking Frequency</Title>} subtitle="Booking customers by how often they book" />
            {freqTotal ? (
              <>
                <div className="mt-3 flex flex-1 items-center gap-5">
                  <Donut data={frequency} size={150} center={num(freqTotal)} caption="Customers" />
                  <CountLegend data={frequency} />
                </div>
                {once?.value > 0 && <Note className="mt-3">{fmtPct(once.pct)} of customers book only once a month. Increase repeat bookings with reminders &amp; offers.</Note>}
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={2}>Service Preference Segments</Title>} subtitle="Customers by the kind of service they book most" />
            {segments.some((r) => r.users) ? (
              <table className="mt-3 w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: "46%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Segment</th>
                    <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Users</th>
                    <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>% of Users</th>
                    <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Avg. Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((row) => {
                    const style = SEGMENT_STYLE[row.key] || SEGMENT_STYLE.other;
                    return (
                      <tr key={row.key} className="h-[34px] border-t border-slate-50">
                        <td className="pr-2">
                          <span className="flex items-center gap-2.5">
                            <IconTile icon={style.icon} color={style.color} tint={style.tint} size={28} />
                            <span className="min-w-0 leading-tight">
                              <span className={`block font-semibold text-slate-800 ${T.xs}`}>{row.label}</span>
                              {row.sub && <span className={`block truncate text-slate-500 ${T.nano}`}>({row.sub})</span>}
                            </span>
                          </span>
                        </td>
                        <td className={`text-center text-slate-700 ${T.xs}`}>{num(row.users)}</td>
                        <td className={`text-center text-slate-700 ${T.xs}`}>{fmtPct(row.share)}</td>
                        <td className={`text-center font-medium text-slate-800 ${T.xs}`}>{rupee(row.aov)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={3} aside="(Likely to Book)">High Intent Behavior</Title>} subtitle={intent?.base ? `Share of ${num(intent.base)} active users` : "Users who showed strong booking intent"} />
            {intent?.rows?.some((r) => r.users) ? (
              <>
                <ul className="mt-3 flex flex-1 flex-col justify-around gap-1">
                  {intent.rows.map((row) => {
                    const style = INTENT_STYLE[row.key] || INTENT_STYLE.viewed_3;
                    return (
                      <li key={row.key} className="flex items-center gap-3">
                        <IconTile icon={style.icon} color={style.color} tint={style.tint} size={24} />
                        <span className={`min-w-0 flex-1 truncate text-slate-700 ${T.xs}`}>{row.label}</span>
                        <span className={`shrink-0 whitespace-nowrap ${T.xs}`}>
                          <span className="font-semibold text-slate-800">{num(row.users)}</span>
                          <span className="ml-1 text-slate-500">({fmtPct(row.share)})</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Note tone="green" className="mt-3">
                  Send personalized offers to high-intent users to convert them (see Opportunities below).
                </Note>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `No intent signals in this period · ${eventsNote}`}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 3 - Price sensitivity / time spent / high-value services */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={4}>Price Sensitivity &amp; Comparison Behavior</Title>} subtitle="How active users react to pricing (a user can be in several)" />
            {pricingActive ? (
              <>
                <div className="mt-3 flex flex-1 items-center gap-5">
                  <Donut data={pricing} size={124} center={num(data.pricing.base)} caption="Active Users" />
                  <CountLegend data={pricing} />
                </div>
                <Note className="mt-3">{fmtPct(100 - (pricing.find((r) => r.name === "No comparison behaviour")?.pct || 0))} of active users compared prices or looked for discounts.</Note>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `No price filters or comparisons recorded · ${eventsNote}`}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={5}>Time Spent in the App</Title>} subtitle={sessionsTotal ? `${num(sessionsTotal)} sessions by length` : "Sessions by length"} />
            {sessionsTotal ? (
              <>
                <div className="mt-2 min-h-[108px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSpent} margin={{ top: 20, right: 6, bottom: 0, left: 6 }}>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 9.5 }} interval={0} dy={4} />
                      <YAxis hide domain={[0, "auto"]} />
                      <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(91,63,240,0.05)" }} formatter={(v) => `${v}%`} />
                      <Bar dataKey="pct" name="Sessions" fill={BRAND} radius={[3, 3, 0, 0]} barSize={38} isAnimationActive={false}>
                        <LabelList dataKey="pct" position="top" offset={5} formatter={(v) => `${v}%`} style={{ fontSize: 10, fontWeight: 600, fill: "#0F172A" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {(() => {
                  const top = [...timeSpent].sort((a, b) => b.pct - a.pct)[0];
                  return <Note className="mt-2">{fmtPct(top.pct)} of sessions last {top.label}.</Note>;
                })()}
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : notTracked}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={6}>High Value Service Lovers</Title>} subtitle="Services with the highest average order value (3+ bookings)" />
            {highValue.length ? (
              <table className="mt-3 w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: "36%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Top Services</th>
                    <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Users</th>
                    <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Avg. Order Value</th>
                    <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Repeat Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {highValue.map((row, i) => {
                    const style = HIGH_VALUE_STYLES[i % HIGH_VALUE_STYLES.length];
                    return (
                      <tr key={row.key} className="h-[30px]">
                        <td className="pr-2">
                          <span className="flex items-center gap-2.5">
                            <IconTile icon={style.icon} color={style.color} tint={style.tint} size={24} />
                            <span className={`min-w-0 truncate font-medium text-slate-800 ${T.xs}`} title={row.name}>
                              {row.name}
                            </span>
                          </span>
                        </td>
                        <td className={`text-center text-slate-700 ${T.xs}`}>{num(row.users)}</td>
                        <td className={`text-center text-slate-700 ${T.xs}`}>{rupee(row.aov)}</td>
                        <td className={`text-center text-slate-700 ${T.xs}`}>{fmtPct(row.repeat_rate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No service with 3+ bookings in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 4 - Journey speed / drop-off reasons / lifestyle segments */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={7}>User Journey Speed</Title>} subtitle="First salon view of the day to checkout" />
            {speed?.checkouts ? (
              <div className="mt-2 flex flex-1 items-center gap-5">
                <div className="flex shrink-0 flex-col items-center">
                  <Gauge value={speed.fast_share} />
                  <p className="mt-1 text-[16px] font-extrabold leading-none tracking-tight text-slate-900">{fmtPct(speed.fast_share)}</p>
                  <p className={`mt-1 text-slate-600 ${T.xs}`}>Fast Bookers</p>
                  <p className={`text-slate-400 ${T.nano}`}>(&lt; 2 min to book)</p>
                </div>

                <div className="min-w-0 flex-1">
                  <ul className="flex flex-col gap-[14px]">
                    {speed.rows.map((row) => (
                      <li key={row.key} className={`flex items-center gap-2 ${T.xs}`}>
                        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full" style={{ background: `${SPEED_COLORS[row.key]}33` }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: SPEED_COLORS[row.key] }} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-slate-700">{row.label}</span>
                        <span className="shrink-0 font-semibold text-slate-800">{fmtPct(row.share)}</span>
                      </li>
                    ))}
                  </ul>
                  <Note className="mt-3">Based on {num(speed.checkouts)} checkouts with a salon view the same day.</Note>
                </div>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `No checkouts with a salon view recorded · ${eventsNote}`}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={8} aside="(User Reported)">Drop-off Reasons</Title>} subtitle="Why users leave without booking" />
            {reasons.length ? (
              <ul className="mt-3 flex flex-1 flex-col justify-around gap-1.5">
                {reasons.map((row) => (
                  <li key={row.label} className={`flex items-center gap-3 ${T.xs}`} title={`${num(row.users)} users`}>
                    <span className="w-[134px] shrink-0 truncate text-slate-700">{row.label}</span>
                    <span className="min-w-0 flex-1">
                      <Meter pct={(row.pct / reasons[0].pct) * 100} color="linear-gradient(90deg,#8B74F5,#5B3FF0)" height={4} track="transparent" />
                    </span>
                    <span className="w-[38px] shrink-0 text-right text-slate-600">{fmtPct(row.pct)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No reasons collected yet - the app will ask users who leave checkout why."}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={9} aside="(Rule Based)">User Lifestyle Segments</Title>} subtitle="Booking customers grouped by when, how often and how much they book" />
            {lifestyle.some((r) => r.users) ? (
              <table className="mt-3 w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "21%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Segment</th>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Users</th>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Top Traits</th>
                    <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Best Time to Engage</th>
                  </tr>
                </thead>
                <tbody>
                  {lifestyle.map((row) => {
                    const style = LIFESTYLE_STYLE[row.key] || LIFESTYLE_STYLE.occasional;
                    return (
                      <tr key={row.key} className="h-[28px]">
                        <td className="pr-2">
                          <span className="flex items-center gap-2">
                            <IconTile icon={style.icon} color={style.color} tint={style.tint} size={22} />
                            <span className={`min-w-0 truncate font-medium text-slate-800 ${T.xs}`}>{row.label}</span>
                          </span>
                        </td>
                        <td className={`whitespace-nowrap pr-2 text-slate-700 ${T.xs}`}>
                          {num(row.users)} ({fmtPct(row.share)})
                        </td>
                        <td className={`truncate pr-2 text-slate-600 ${T.xs}`} title={row.traits}>
                          {row.traits}
                        </td>
                        <td className={`whitespace-nowrap text-slate-700 ${T.xs}`}>{row.best_time || DASH}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 5 - Timeline / push opportunities / key insights */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title={<Title index={10} aside="(Latest Booking)">Behavior Timeline</Title>} subtitle="The latest paying customer's steps that day" />
            {timeline.length ? (
              <div className="relative mt-4 flex flex-1 items-start justify-between">
                {/* The connector runs behind the icons. */}
                <span className="absolute left-[8%] right-[8%] top-[18px] h-px bg-slate-200" />
                {timeline.slice(-6).map((step, i) => {
                  const style = STEP_STYLE[step.kind] || STEP_STYLE.tap;
                  const Icon = style.icon;
                  const sub = step.kind === "screen_view" ? SCREEN_LABEL[step.screen] || step.screen : step.element || (step.store_id ? `Salon #${step.store_id}` : step.kind === "booking" ? "Confirmed" : "");
                  return (
                    <div key={`${step.at}-${i}`} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                      <span className="grid h-9 w-9 place-items-center rounded-full border bg-white" style={{ borderColor: `${style.color}55`, color: style.color, background: style.tint }}>
                        <Icon size={16} />
                      </span>
                      <span className={`mt-3 text-slate-500 ${T.nano}`}>{moment(step.at).format("h:mm A")}</span>
                      <span className={`mt-1.5 font-semibold text-slate-800 ${T.xs}`}>{style.name}</span>
                      <span className={`max-w-full truncate px-1 text-slate-500 ${T.nano}`}>{sub}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `No tracked journey to a paid booking yet · ${eventsNote}`}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title={<Title index={11}>Push &amp; Offer Opportunities</Title>} subtitle={opportunities ? `Users from ${fmtRange(opportunities.from, opportunities.to)}` : "Personalized opportunities based on behavior"} />
            {opportunities?.rows?.length ? (
              <ul className="mt-3 flex flex-1 flex-col justify-around gap-1">
                {opportunities.rows.map((row) => {
                  const style = OPPORTUNITY_STYLE[row.key] || OPPORTUNITY_STYLE.viewed_not_booked;
                  return (
                    <li key={row.key} className="flex items-center gap-2.5">
                      <IconTile icon={style.icon} color={style.color} tint={style.tint} size={22} />
                      <button type="button" onClick={() => row.users && openList(row.key)} className={`min-w-0 flex-1 truncate text-left text-slate-700 hover:underline ${T.xs}`} title="View users">
                        {row.label}
                      </button>
                      <span className={`w-[38px] shrink-0 text-right font-semibold text-slate-800 ${T.xs}`}>{num(row.users)}</span>
                      <button type="button" disabled={!row.users} onClick={() => setPush({ key: row.key, count: row.users })} className={`flex shrink-0 items-center gap-1 font-semibold hover:underline disabled:opacity-40 ${T.nano}`} style={{ color: INDIGO }}>
                        <Send size={10} />
                        Push
                      </button>
                      <button type="button" disabled={!row.users || busy === row.key} onClick={() => downloadContacts(row.key)} className="shrink-0 text-slate-500 hover:text-slate-800 disabled:opacity-40" title="Download contacts for WhatsApp">
                        {busy === row.key ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No opportunities"}</EmptyNote>
            )}
          </Card>

          <div className="flex min-w-0 flex-col rounded-2xl border border-[#E6E8F0] bg-gradient-to-br from-[#F5F4FE] to-[#F8F7FF] p-4">
            <h2 className={`font-bold tracking-tight text-slate-900 ${T.title}`}>
              <Title index={12}>Key Insights</Title>
            </h2>
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-1">
              {keyInsights.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.text} className="flex items-center gap-2.5">
                    <span className="grid h-[21px] w-[21px] shrink-0 place-items-center rounded-md bg-[#E9E5FC] text-[#6D4AE0]">
                      <Icon size={11} />
                    </span>
                    <span className={`min-w-0 text-slate-700 ${T.xs}`}>{row.text}</span>
                  </li>
                );
              })}
              {!keyInsights.length && (
                <li className={`flex items-center gap-2 text-slate-400 ${T.xs}`}>
                  <Star size={11} />
                  {loading ? "Loading…" : "Not enough data for insights yet."}
                </li>
              )}
            </ul>
          </div>
        </div>
      </ScaledCanvas>

      {push && (
        <PushDialog
          count={push.count}
          audience={OPPORTUNITY_STYLE[push.key]?.audience}
          color={BRAND}
          sending={sending}
          onSend={sendPush}
          onClose={() => setPush(null)}
        />
      )}
      {dialog && (
        <ListDialog
          title={opportunities?.rows?.find((r) => r.key === dialog.key)?.label || "Users"}
          subtitle={opportunities ? fmtRange(opportunities.from, opportunities.to) : undefined}
          columns={CONTACT_COLUMNS}
          rows={dialog.rows}
          loading={dialog.loading}
          onRowClick={(row) => navigate(`/userdetails/${row.user_id}`)}
          onExport={() => downloadXlsx(`${dialog.key}_${range.to}.xlsx`, [{ name: "Users", rows: dialog.rows, columns: CONTACT_COLUMNS }])}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
};

export default BehaviorAnalyticsV2;
