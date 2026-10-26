import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
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
  Loader2,
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
import { fetchGrowthDashboardV2, fetchGrowthListV2, sendBulkUserPushV2 } from "../../redux/slices/analyticsSlice";
import { downloadXlsx } from "../../utils/excelExport";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  Card,
  Donut as BaseDonut,
  HeaderBell,
  HeaderSelect,
  LegendDot as BaseLegendDot,
  ListDialog,
  Meter,
  PushDialog,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Dashboard - Real-time intelligence to grow GloUp" mockup (a
// separate page from Dashboard V2), on a fixed DESIGN_WIDTH canvas that
// ScaledCanvas scales to the available width (see there for why bigger px
// sizes in T read smaller on screen).
//
// Data: getGrowthDashboardV2 (analyticsSlice `growth`). The header Date drives
// the "today" cards (intent, drop-off, empty slots, supply vs demand, alerts),
// the header Period the others; each card's chip says which. App activity and
// salon views come from the User Analytics tracking (heartbeat / UserEvents),
// locations from the app's /v2/location reports - cards say so while those
// are still empty. "Selected Slot" is the checkout itself: V2 saves the slot
// and the payment order on the appointment in one step. Search counts,
// "viewed service" and AI drop reasons have no data, so demand is salon
// viewers and the drop-off box lists data-based causes instead.
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
const DASH = "–";

const DEMAND_STATUS = {
  high_demand: { label: "High Demand", color: RED },
  balanced: { label: "Balanced", color: GREEN },
  moderate: { label: "Moderate Demand", color: ORANGE },
  low_supply: { label: "Low Supply", color: ORANGE },
};
const TRACKER_STYLE = {
  booked_again: { color: GREEN, text: "#0E9F6E" },
  active_not_booked: { color: "#F97316", text: "#EA580C" },
  no_activity: { color: "#FBBF24", text: "#D18B05" },
  churn_risk: { color: RED, text: "#DC2626" },
};
const FREQUENCY_COLORS = [BRAND, BLUE, "#3FA1E8", "#12A87A", "#F5B83D", "#F0584A"];
const INTENT_COLORS = { slot: BRAND, multiple: "#3B82F6", revisit: "#22B8CF" };
const DAYS_COLORS = [BLUE, BRAND, "#D63FBE", RED];
const ALERT_STYLE = {
  high: { icon: TriangleAlert, color: RED, tint: "#FEE4E2" },
  medium: { icon: OctagonAlert, color: "#EA580C", tint: "#FFEDD5" },
  low: { icon: MapPin, color: "#EA580C", tint: "#FFEDD5" },
};
const ALERTS_PREVIEW = 5;
const FUNNEL_BAR_MAX = 46; // px for the first stage

const PERIODS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_week", label: "This Week" },
  { value: "last_90", label: "Last 90 Days" },
];
const REFRESH = [
  { value: "0", label: "Off" },
  { value: "15000", label: "15 sec" },
  { value: "30000", label: "30 sec" },
  { value: "60000", label: "1 min" },
  { value: "300000", label: "5 min" },
];

// A valid 10-digit Indian mobile: reachable by WhatsApp / SMS.
const isReachable = (phone) => /^[6-9]\d{9}$/.test(String(phone || ""));

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const fmtInt = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN") : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const pctOf = (part, whole) => (isNum(part) && isNum(whole) && Number(whole) ? (part / whole) * 100 : null);
// ₹7.4L / ₹1.2K style for the potential revenue tile.
const fmtLakh = (v) => {
  if (!isNum(v)) return DASH;
  const n = Number(v);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};
const compact = (v) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}K` : `${v}`);
const fmtDateTime = (v) => (v ? moment(v).format("DD MMM, h:mm A") : DASH);

const periodRange = (key, date) => {
  const d = moment(date);
  switch (key) {
    case "last_month":
      return [d.clone().subtract(1, "month").startOf("month"), d.clone().subtract(1, "month").endOf("month")];
    case "this_week":
      return [d.clone().startOf("isoWeek"), d.clone()];
    case "last_90":
      return [d.clone().subtract(89, "days"), d.clone()];
    default:
      return [d.clone().startOf("month"), d.clone()];
  }
};

// ---------------------------------------------------------------------------
// "View" dialog lists (columns also feed the Excel export)
// ---------------------------------------------------------------------------

const userCol = { header: "User", kind: "text", width: 24, get: (r) => r.name || `User #${r.user_id}` };
const phoneCol = { header: "Phone", kind: "text", width: 14, get: (r) => r.phone };
const LISTS = {
  high_intent: {
    title: "High-Intent Users",
    columns: [
      userCol,
      phoneCol,
      { header: "Gender", kind: "text", width: 9, get: (r) => r.gender },
      { header: "Intent", kind: "text", width: 24, get: (r) => r.segment_label },
      { header: "Checkout Attempts", kind: "int", width: 12, get: (r) => r.checkout_attempts },
      { header: "Salons Viewed", kind: "int", width: 12, get: (r) => r.salons_viewed },
      { header: "Last Seen", kind: "text", width: 18, get: (r) => fmtDateTime(r.last_seen_at) },
    ],
    users: true,
  },
  checkout_dropoff: {
    title: "Dropped at Checkout",
    columns: [
      userCol,
      phoneCol,
      { header: "Checkout Attempts", kind: "int", width: 12, get: (r) => r.checkout_attempts },
      { header: "Last Seen", kind: "text", width: 18, get: (r) => fmtDateTime(r.last_seen_at) },
    ],
    users: true,
  },
  first_time: {
    title: "First Booking → Second Booking Tracker",
    columns: [
      userCol,
      phoneCol,
      { header: "First Booking", kind: "date", width: 14, get: (r) => r.first_booking_at },
      { header: "Last Active", kind: "date", width: 14, get: (r) => r.last_active_at },
      { header: "Status", kind: "text", width: 22, get: (r) => r.status_label },
    ],
    users: true,
  },
  second_booking: {
    title: "Active but Not Booked Again",
    columns: [
      userCol,
      phoneCol,
      { header: "First Booking", kind: "date", width: 14, get: (r) => r.first_booking_at },
      { header: "Last Active", kind: "date", width: 14, get: (r) => r.last_active_at },
    ],
    users: true,
  },
  empty_slots: {
    title: "Empty Slot Opportunities",
    columns: [
      { header: "Salon", kind: "text", width: 28, get: (r) => r.salon_name },
      { header: "Area", kind: "text", width: 18, get: (r) => r.area },
      { header: "Free Seats", kind: "int", width: 11, get: (r) => r.free_seats },
      { header: "Total Seats", kind: "int", width: 11, get: (r) => r.total_seats },
      { header: "Avg. Booking Value", kind: "money", width: 14, get: (r) => r.avg_booking_value },
      { header: "Potential Revenue", kind: "money", width: 15, get: (r) => r.potential_revenue },
    ],
  },
  locations: {
    title: "User Location Intelligence",
    columns: [
      { header: "Area", kind: "text", width: 20, get: (r) => r.area },
      { header: "City", kind: "text", width: 14, get: (r) => r.city },
      { header: "Salons", kind: "int", width: 8, get: (r) => r.salons },
      { header: "Users", kind: "int", width: 9, get: (r) => r.users },
      { header: "Active Users", kind: "int", width: 11, get: (r) => r.active_users },
      { header: "Bookings", kind: "int", width: 10, get: (r) => r.bookings },
      { header: "Conversion", kind: "percent", width: 11, get: (r) => r.conversion_pct },
      { header: "Demand (Viewers)", kind: "int", width: 14, get: (r) => r.demand },
      { header: "Free Capacity", kind: "int", width: 12, get: (r) => r.free_capacity },
      { header: "Status", kind: "text", width: 16, get: (r) => DEMAND_STATUS[r.status]?.label },
    ],
  },
  days_to_second: {
    title: "Days to 2nd Booking",
    columns: [userCol, phoneCol, { header: "Days to 2nd Booking", kind: "int", width: 16, get: (r) => r.days }],
    users: true,
  },
};

// Phone / Name / Gender first: the Marketing page's broadcast upload reads
// exactly these headers.
const CONTACT_COLUMNS = [
  { header: "Phone", kind: "text", width: 14, get: (r) => r.phone },
  { header: "Name", kind: "text", width: 24, get: (r) => r.name },
  { header: "Gender", kind: "text", width: 9, get: (r) => r.gender },
];

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

// Which window a card is showing (header Date or header Period).
const WindowChip = ({ children }) => (
  <span className={`rounded-md border border-[#E6E8F0] bg-white px-2 py-1 font-medium text-slate-500 ${T.micro}`}>
    {children}
  </span>
);

const ViewLink = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`mt-auto flex w-full items-center justify-center gap-1.5 pt-3 font-semibold hover:underline disabled:cursor-default disabled:opacity-40 disabled:no-underline ${T.sm}`}
    style={{ color: BRAND }}
  >
    {children}
    <ArrowRight size={13} className="shrink-0" />
  </button>
);

const Th = ({ children, className = "" }) => (
  <th className={`pb-2.5 font-semibold uppercase tracking-wide text-slate-500 ${T.micro} ${className}`}>{children}</th>
);

// Header cell for the div-based grids (a <th> is only valid inside a table).
const ColHead = ({ children, className = "" }) => (
  <span className={`font-semibold uppercase tracking-wide text-slate-500 ${T.micro} ${className}`}>{children}</span>
);

const Donut = (props) => (
  <BaseDonut centerSize={T.donut} captionSize={T.xs} formatter={(v) => Number(v).toLocaleString("en-IN")} {...props} />
);

const LegendSquare = ({ color, label }) => <BaseLegendDot square color={color} label={label} size={T.xs} />;

// Centred grey note for a card with nothing to show yet.
const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[300px]">{children}</p>
  </div>
);

// Date, period and auto-refresh live in the app bar next to the title.
const PageHeader = ({ title, date, setDate, dateOptions, period, setPeriod, refresh, setRefresh, alertCount }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Real-time intelligence to grow GloUp</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <HeaderSelect icon={CalendarDays} label="Date" value={date} onChange={setDate} options={dateOptions} className="hidden lg:flex" />
        <HeaderSelect label="Period" value={period} onChange={setPeriod} options={PERIODS} className="hidden xl:flex" />

        <span className="hidden items-center gap-2 xl:flex">
          <span className={`h-2 w-2 shrink-0 rounded-full ${refresh !== "0" ? "bg-emerald-500" : "bg-slate-300"}`} />
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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { growth } = useSelector((state) => state.analytics);
  const today = moment().format("YYYY-MM-DD");
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState(PERIODS[0].value);
  const [refresh, setRefresh] = useState("30000");
  const [dialog, setDialog] = useState(null); // { list, loading, rows }
  const [pushOpen, setPushOpen] = useState(false);
  const [busy, setBusy] = useState(null); // "push" | "whatsapp"
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const dateOptions = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = moment().subtract(i, "days");
        return { value: d.format("YYYY-MM-DD"), label: `${d.format("D MMM YYYY")}${i === 0 ? " (Today)" : ""}` };
      }),
    []
  );
  const body = useMemo(() => {
    const [from, to] = periodRange(period, date);
    return { date, from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [date, period]);

  const load = useCallback(
    () =>
      dispatch(fetchGrowthDashboardV2(body))
        .unwrap()
        .catch((message) => toast.error(message || "Failed to load the dashboard", { id: "growth-v2" })),
    [dispatch, body]
  );
  useEffect(() => {
    load();
  }, [load]);

  // Auto refresh, paused while the tab is hidden.
  useEffect(() => {
    const ms = Number(refresh);
    if (!ms) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, ms);
    return () => clearInterval(id);
  }, [refresh, load]);

  const data = growth.data;
  const loading = growth.loading && !data;
  const k = data?.kpis || {};
  const shown = (v, fmt = fmtInt) => (loading ? "…" : fmt(v));
  const dayLabel = date === today ? "Today" : moment(date).format("D MMM");
  const periodLabel = PERIODS.find((p) => p.value === period)?.label;
  const monthLabel = period === "this_month" ? moment(date).format("MMM") : periodLabel;

  const fetchList = useCallback(
    (list) => dispatch(fetchGrowthListV2({ ...body, include_list: list })).unwrap().then((res) => res.rows || []),
    [dispatch, body]
  );
  const openList = async (list) => {
    setDialog({ list, loading: true, rows: [] });
    try {
      setDialog({ list, loading: false, rows: await fetchList(list) });
    } catch (message) {
      toast.error(message || "Failed to load the list", { id: "growth-list" });
      setDialog(null);
    }
  };

  const sendPush = async (pushTitle, message) => {
    setBusy("push");
    try {
      const users = await fetchList("high_intent");
      if (!users.length) {
        toast.error("No high-intent users to notify", { id: "growth-push" });
        return;
      }
      const result = await dispatch(
        sendBulkUserPushV2({ user_ids: users.map((u) => u.user_id), title: pushTitle, description: message })
      ).unwrap();
      const noToken = result.push?.no_token || 0;
      toast.success(
        `Sent to ${fmtInt(result.push?.success || 0)} devices${noToken ? ` · ${fmtInt(noToken)} users have no push token (in-app only)` : ""}`,
        { id: "growth-push" }
      );
      setPushOpen(false);
    } catch (message2) {
      toast.error(message2 || "Failed to send push notifications", { id: "growth-push" });
    } finally {
      setBusy(null);
    }
  };

  const downloadContacts = async () => {
    setBusy("whatsapp");
    toast.loading("Preparing contact list…", { id: "growth-contacts" });
    try {
      const users = (await fetchList("high_intent")).filter((u) => isReachable(u.phone));
      if (!users.length) {
        toast.error("No high-intent users with a valid mobile number", { id: "growth-contacts" });
        return;
      }
      await downloadXlsx(`high_intent_users_${date}.xlsx`, [{ name: "Contacts", rows: users, columns: CONTACT_COLUMNS }]);
      toast.success(`Downloaded ${fmtInt(users.length)} contacts - upload the sheet on Marketing to send on WhatsApp`, {
        id: "growth-contacts",
      });
    } catch (message) {
      toast.error(typeof message === "string" ? message : "Failed to build the contact list", { id: "growth-contacts" });
    } finally {
      setBusy(null);
    }
  };

  // ---- KPI tiles ----------------------------------------------------------
  const kpis = [
    { label: "High-Intent Users", value: shown(k.high_intent), caption: `Users who almost booked · ${dayLabel}`, link: "View Details", list: "high_intent", icon: UsersRound, color: BRAND, tint: "#EEEAFD" },
    { label: "Dropoff at Checkout", value: shown(k.checkout_dropoff), caption: `Picked a slot, didn't pay · ${dayLabel}`, link: "View List", list: "checkout_dropoff", icon: ShoppingCart, color: "#F97316", tint: "#FFEDD5" },
    { label: `1st Time Users (${monthLabel})`, value: shown(k.first_time_users), caption: "First-ever booking in the period", link: "View Tracker", list: "first_time", icon: UserPlus, color: GREEN, tint: "#DCFCE7" },
    { label: "Users for 2nd Booking", value: shown(k.second_booking_users), caption: "Active but not booked again", link: "View Details", list: "second_booking", icon: Users, color: BLUE, tint: "#E0EBFF" },
    { label: "Empty Slot Opportunity", value: shown(k.empty_slots), caption: date === today ? "Free seats left today" : `Free seats on ${dayLabel}`, link: "View Opportunities", list: "empty_slots", icon: CalendarClock, color: PINK, tint: "#FDE7F3" },
    { label: "Potential Revenue", value: shown(k.potential_revenue, fmtLakh), caption: "If empty slots fill (est.)", link: "View Details", list: "empty_slots", icon: IndianRupee, color: GREEN, tint: "#DCFCE7" },
  ];

  // ---- Cards ----------------------------------------------------------------
  const locations = data?.locations?.rows || [];
  const supply = data?.supply_demand || [];
  const tracker = (data?.tracker?.rows || []).map((t) => ({
    ...t,
    ...TRACKER_STYLE[t.key],
    name: t.label,
    value: t.users,
    pct: pctOf(t.users, data.tracker.total),
  }));
  const frequency = data?.frequency?.rows || [];
  const freqMax = Math.max(0, ...frequency.map((r) => r.users));
  const levels = data?.levels || [];
  const almost = (data?.almost_booked?.rows || []).map((r) => ({
    ...r,
    name: r.label,
    value: r.users,
    color: INTENT_COLORS[r.key],
    pct: pctOf(r.users, data.almost_booked.total),
  }));
  const funnel = data?.funnel;
  const stages = funnel?.stages || [];
  const firstStageUsers = stages.find((s) => isNum(s.users))?.users || 0;
  const causes = funnel?.causes || {};
  const daysToSecond = (data?.days_to_second?.rows || []).map((r, i) => ({ ...r, color: DAYS_COLORS[i] }));
  const alerts = data?.alerts || [];
  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, ALERTS_PREVIEW);

  const causeLines = [
    causes.unpaid_checkouts ? `${fmtInt(causes.unpaid_checkouts)} users picked a slot but didn't pay` : null,
    causes.viewers_without_slot ? `${fmtInt(causes.viewers_without_slot)} viewers left without picking a slot` : null,
    causes.fully_booked_salons ? `${fmtInt(causes.fully_booked_salons)} salons fully booked` : null,
    causes.closed_salons ? `${fmtInt(causes.closed_salons)} salons closed (holiday)` : null,
  ].filter(Boolean);

  const runAlert = (alert) => {
    if (alert.action?.list) openList(alert.action.list);
    else if (alert.action?.route) navigate(alert.action.route);
  };

  const listConfig = dialog && LISTS[dialog.list];

  return (
    <>
      <PageHeader
        title={title}
        date={date}
        setDate={setDate}
        dateOptions={dateOptions}
        period={period}
        setPeriod={setPeriod}
        refresh={refresh}
        setRefresh={setRefresh}
        alertCount={alerts.length}
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
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl" style={{ background: kpi.tint }}>
                    <Icon size={24} style={{ color: kpi.color }} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold uppercase tracking-wide text-slate-600 ${T.micro}`}>{kpi.label}</p>
                    <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>{kpi.value}</p>
                    <p className={`mt-0.5 truncate text-slate-500 ${T.xs}`}>{kpi.caption}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openList(kpi.list)}
                  disabled={!data}
                  className={`mt-3 flex items-center gap-1.5 self-start pl-[64px] font-semibold hover:underline disabled:opacity-40 ${T.xs}`}
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
            <CardTitle index={1} right={<WindowChip>{periodLabel}</WindowChip>}>
              User Location Intelligence
            </CardTitle>

            {locations.length ? (
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
                    const status = DEMAND_STATUS[row.status] || DEMAND_STATUS.balanced;
                    return (
                      <tr key={row.key} className="h-[32px]">
                        <td className={`max-w-[110px] truncate whitespace-nowrap pr-2 font-medium text-slate-800 ${T.xs}`}>{row.area}</td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtInt(row.users)}</td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtInt(row.active_users)}</td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtInt(row.bookings)}</td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtPct(row.conversion_pct)}</td>
                        <td className={`whitespace-nowrap pl-4 font-semibold ${T.xs}`} style={{ color: status.color }}>
                          <span className="flex items-center gap-1.5" title={`${fmtInt(row.demand)} interested vs ${fmtInt(row.free_capacity)} free seats`}>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: status.color }} />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No salon areas found"}</EmptyNote>
            )}
            {data && !data.location_since && (
              <p className={`mt-2 text-slate-400 ${T.micro}`}>Users / active users fill in once the app sends user locations.</p>
            )}

            <ViewLink onClick={() => openList("locations")} disabled={!data}>
              View All Locations{data?.locations?.total ? ` (${fmtInt(data.locations.total)})` : ""}
            </ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={2} right={<WindowChip>{dayLabel}</WindowChip>}>
              Salon Supply vs Customer Demand
            </CardTitle>

            <div className="flex items-center gap-5">
              <LegendSquare color={BRAND} label="Customer Demand (Salon Viewers)" />
              <LegendSquare color={GREEN} label="Available Capacity (Free Seats)" />
            </div>

            {supply.length ? (
              <div className="mt-1 min-h-[180px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supply} margin={{ top: 8, right: 6, bottom: 0, left: -8 }} barGap={3}>
                    <CartesianGrid stroke="#EEF1F6" vertical={false} />
                    <XAxis
                      dataKey="area"
                      tickLine={false}
                      axisLine={false}
                      tick={AXIS}
                      dy={4}
                      interval={0}
                      tickFormatter={(v) => (String(v).length > 12 ? `${String(v).slice(0, 11)}…` : v)}
                    />
                    <YAxis allowDecimals={false} tickFormatter={compact} tickLine={false} axisLine={false} tick={AXIS} width={40} />
                    <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(91,63,240,0.05)" }} />
                    <Bar dataKey="demand" name="Customer demand" fill={BRAND} barSize={19} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="capacity" name="Free seats" fill={GREEN} barSize={19} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No salon areas found"}</EmptyNote>
            )}

            <ViewLink onClick={() => openList("locations")} disabled={!data}>
              View Full Analysis
            </ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={3} right={<WindowChip>{periodLabel}</WindowChip>}>
              First Booking → Second Booking Tracker
            </CardTitle>

            {data?.tracker?.total ? (
              <div className="flex flex-1 items-center gap-5">
                <Donut data={tracker} size={176} inner="64%" center={fmtInt(data.tracker.total)} caption="1st Time Users" />
                <ul className="flex min-w-0 flex-1 flex-col gap-[18px]">
                  {tracker.map((row) => (
                    <li key={row.key} className={`flex items-center gap-2 ${T.xs}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="min-w-0 flex-1 truncate" style={{ color: row.text }}>
                        {row.name}
                      </span>
                      <span className="w-[28px] shrink-0 text-right font-bold text-slate-900">{fmtInt(row.value)}</span>
                      <span className="w-[40px] shrink-0 text-right font-semibold" style={{ color: GREEN }}>
                        {fmtPct(row.pct)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No first-time bookings in this period"}</EmptyNote>
            )}
            {data && (
              <p className={`mt-2 text-slate-400 ${T.micro}`}>Churn risk = no activity for {data.tracker.churn_risk_days}+ days.</p>
            )}

            <ViewLink onClick={() => openList("first_time")} disabled={!data?.tracker?.total}>
              View Full Tracker
            </ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Frequency / level conversion / almost booked              */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className={PAD}>
            <CardTitle index={4} right={<WindowChip>All time</WindowChip>}>
              Booking Frequency Intelligence
            </CardTitle>

            <div className="grid grid-cols-[1fr_76px_76px] items-center gap-y-[5px]">
              <span />
              <ColHead className="text-right">Users</ColHead>
              <ColHead className="text-right">% of Total</ColHead>

              {frequency.map((row, i) => (
                <div key={row.key} className="contents">
                  <span className="block w-[272px] max-w-full">
                    <span
                      className={`flex h-[22px] items-center rounded-[4px] px-3 font-semibold text-white ${T.xs}`}
                      style={{
                        // Square-root scale so the small buckets stay readable.
                        width: `${freqMax ? 30 + 70 * Math.sqrt(row.users / freqMax) : 30}%`,
                        minWidth: 92,
                        background: FREQUENCY_COLORS[i],
                      }}
                    >
                      <span className="truncate">{row.label}</span>
                    </span>
                  </span>
                  <span className={`text-right text-slate-700 ${T.xs}`}>{fmtInt(row.users)}</span>
                  <span className={`text-right text-slate-700 ${T.xs}`}>{fmtPct(pctOf(row.users, data.frequency.total_users))}</span>
                </div>
              ))}
            </div>
            {!frequency.length && <EmptyNote>{loading ? "Loading…" : DASH}</EmptyNote>}

            <ViewLink onClick={() => navigate("/allusers")}>View Full Report</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={5} right={<WindowChip>All time</WindowChip>}>
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
                {levels.map((row) => (
                  <tr key={row.label} className="h-[33px]">
                    <td className={`whitespace-nowrap pr-2 font-medium text-slate-800 ${T.xs}`}>{row.label}</td>
                    <td className={`whitespace-nowrap pr-2 text-center text-slate-700 ${T.xs}`}>
                      {fmtInt(row.to_users)} / {fmtInt(row.from_users)}
                    </td>
                    <td className="pl-1">
                      <span className="flex items-center gap-2.5">
                        <span className="w-[54px] shrink-0">
                          <Meter pct={row.rate || 0} height={5} color="linear-gradient(90deg,#6D3AE8,#3B82F6)" />
                        </span>
                        <span className={`text-slate-700 ${T.xs}`}>{fmtPct(row.rate)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!levels.length && <EmptyNote>{loading ? "Loading…" : DASH}</EmptyNote>}

            <ViewLink onClick={() => navigate("/user-analytics-v2")}>View Cohort Analysis</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={6} right={<WindowChip>{dayLabel}</WindowChip>}>
              Users Who Almost Booked
            </CardTitle>

            {data?.almost_booked?.total ? (
              <div className="flex items-center gap-5">
                <Donut data={almost} size={132} inner="68%" center={fmtInt(data.almost_booked.total)} caption="Total Users" />
                <ul className="min-w-0 flex-1 divide-y divide-slate-100">
                  {almost.map((row) => (
                    <li key={row.key} className={`flex items-center gap-2 py-[9px] ${T.xs}`}>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                      <span className="w-[28px] shrink-0 text-right font-bold text-slate-900">{fmtInt(row.value)}</span>
                      <span className="w-[40px] shrink-0 text-right font-semibold" style={{ color: GREEN }}>
                        {fmtPct(row.pct)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `No users almost booked ${dayLabel === "Today" ? "today" : `on ${dayLabel}`}`}</EmptyNote>
            )}

            <div className={`mt-3.5 grid grid-cols-3 ${GAP}`}>
              {[
                { key: "push", label: "Send Push", icon: MessageSquareText, background: BRAND, onClick: () => setPushOpen(true) },
                { key: "whatsapp", label: "Send WhatsApp", icon: MessageCircle, background: "#12A150", onClick: downloadContacts, title: "Downloads the contacts to upload on the Marketing page" },
                { key: "offer", label: "Create Offer", icon: Gift, background: "#1E78E8", onClick: () => navigate("/coupon") },
              ].map((action) => {
                const Icon = busy === action.key ? Loader2 : action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    title={action.title}
                    disabled={Boolean(busy) || (action.key !== "offer" && !data?.almost_booked?.total)}
                    className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${T.xs}`}
                    style={{ background: action.background }}
                  >
                    <Icon size={14} className={`shrink-0 ${busy === action.key ? "animate-spin" : ""}`} />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>

            <ViewLink onClick={() => openList("high_intent")} disabled={!data?.almost_booked?.total}>
              View All
            </ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Drop-off / days to 2nd booking / what needs attention     */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className={PAD}>
            <CardTitle index={7} right={<WindowChip>{dayLabel}</WindowChip>}>
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
                  {stages.map((row) => (
                    <tr key={row.key} className="h-[28px]">
                      <td className={`whitespace-nowrap pr-2 font-medium text-slate-800 ${T.xs}`}>{row.label}</td>
                      <td className="pr-2">
                        <span className="flex items-center gap-2" title={isNum(row.users) ? undefined : "Not tracked yet"}>
                          <span className="w-[46px] shrink-0">
                            <span
                              className="block h-[10px] rounded-[2px]"
                              style={{
                                width: isNum(row.users) && firstStageUsers ? Math.max(12, (row.users / firstStageUsers) * FUNNEL_BAR_MAX) : 0,
                                background: "#8B74F5",
                              }}
                            />
                          </span>
                          <span className={`text-slate-700 ${T.xs}`}>{fmtInt(row.users)}</span>
                        </span>
                      </td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtInt(row.drop)}</td>
                      <td className={`whitespace-nowrap text-right text-slate-700 ${T.xs}`}>{fmtPct(row.drop_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="w-[168px] shrink-0 rounded-xl border border-[#FBE5D6] bg-[#FFF6EF] p-3">
                <p className={`flex items-center gap-1.5 font-bold ${T.xs}`} style={{ color: RED }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: RED }} />
                  Biggest Drop
                </p>
                {funnel?.biggest ? (
                  <>
                    <p className={`mt-1.5 font-bold text-slate-900 ${T.sm}`}>
                      {funnel.biggest.from} → {funnel.biggest.to}
                    </p>
                    <p className={`mt-1 text-slate-500 ${T.micro}`}>{fmtPct(funnel.biggest.pct)} of users are leaving at this stage.</p>
                  </>
                ) : (
                  <p className={`mt-1.5 text-slate-500 ${T.micro}`}>{loading ? "Loading…" : "No drop-off yet"}</p>
                )}

                <p className={`mt-3 font-bold text-slate-900 ${T.xs}`}>Possible Causes</p>
                <ul className="mt-1.5 space-y-1.5">
                  {(causeLines.length ? causeLines : ["Nothing stands out"]).map((reason) => (
                    <li key={reason} className={`flex items-start gap-1.5 text-slate-500 ${T.micro}`}>
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ViewLink onClick={() => navigate("/user-analytics-v2")}>View Full Funnel</ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={8} right={<WindowChip>{periodLabel}</WindowChip>}>
              Days to 2nd Booking
            </CardTitle>
            <p className={`text-slate-500 ${T.micro}`}>Users whose 2nd booking was in the period</p>

            {data?.days_to_second?.total ? (
              <div className="min-h-[180px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daysToSecond} margin={{ top: 22, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke="#EEF1F6" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} dy={4} interval={0} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={40} />
                    <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(91,63,240,0.05)" }} />
                    <Bar dataKey="users" name="Users" barSize={34} radius={[3, 3, 0, 0]}>
                      {daysToSecond.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                      <LabelList dataKey="users" position="top" offset={6} style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No second bookings in this period"}</EmptyNote>
            )}

            <ViewLink onClick={() => openList("days_to_second")} disabled={!data?.days_to_second?.total}>
              View Cohort Details
            </ViewLink>
          </Card>

          <Card className={PAD}>
            <CardTitle index={9}>What Needs Attention</CardTitle>

            {visibleAlerts.length ? (
              <ul className="flex flex-col gap-2">
                {visibleAlerts.map((alert) => {
                  const style = ALERT_STYLE[alert.severity] || ALERT_STYLE.medium;
                  const Icon = style.icon;
                  return (
                    <li key={alert.key} className="flex items-center gap-2.5 rounded-lg border border-[#EEF0F5] px-2.5 py-[7px]">
                      <span
                        className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md"
                        style={{ background: style.tint, color: style.color }}
                      >
                        <Icon size={13} />
                      </span>
                      <span className={`min-w-0 flex-1 text-slate-800 ${T.micro}`}>{alert.text}</span>
                      {alert.action && (
                        <button
                          type="button"
                          onClick={() => runAlert(alert)}
                          className={`flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold hover:underline ${T.micro}`}
                          style={{ color: BRAND }}
                        >
                          {alert.action.label}
                          <ArrowRight size={11} className="shrink-0" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "Nothing needs attention right now"}</EmptyNote>
            )}

            {alerts.length > ALERTS_PREVIEW && (
              <ViewLink onClick={() => setShowAllAlerts((v) => !v)}>
                {showAllAlerts ? "Show Fewer Alerts" : `View All Alerts (${alerts.length})`}
              </ViewLink>
            )}
          </Card>
        </div>
      </ScaledCanvas>

      {listConfig && (
        <ListDialog
          title={listConfig.title}
          subtitle={`${["empty_slots", "high_intent", "checkout_dropoff"].includes(dialog.list) ? moment(date).format("D MMM YYYY") : `${moment(body.from).format("D MMM")} – ${moment(body.to).format("D MMM YYYY")}`} · ${fmtInt(dialog.rows.length)} rows`}
          columns={listConfig.columns}
          rows={dialog.rows}
          loading={dialog.loading}
          onRowClick={listConfig.users ? (row) => navigate(`/userdetails/${row.user_id}`) : undefined}
          onExport={() =>
            downloadXlsx(`${dialog.list}_${date}.xlsx`, [{ name: listConfig.title.slice(0, 30), rows: dialog.rows, columns: listConfig.columns }])
          }
          onClose={() => setDialog(null)}
        />
      )}
      {pushOpen && (
        <PushDialog
          count={k.high_intent || 0}
          audience="high-intent users"
          color={BRAND}
          sending={busy === "push"}
          onSend={sendPush}
          onClose={() => setPushOpen(false)}
        />
      )}
    </>
  );
};

export default GrowthDashboardV2;
