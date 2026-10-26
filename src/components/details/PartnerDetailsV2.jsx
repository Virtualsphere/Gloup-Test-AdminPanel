import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  ExternalLink,
  FileDown,
  Gift,
  House,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Scissors,
  ShieldCheck,
  ShieldOff,
  Star,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { fetchPartnerOverviewV2, fetchPartnerPickerV2, sendPartnerNotificationV2 } from "../../redux/slices/analyticsSlice";
import { updatePartnerStatus } from "../../redux/slices/partnersSlice";
import { downloadCsv } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CARD, initials, toSpark } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Chip,
  Delta,
  Donut as BaseDonut,
  HeaderSearch,
  HeatGrid as BaseHeatGrid,
  KpiTile as BaseKpiTile,
  RampLegend,
  Select as BaseSelect,
  SalonLogo,
  Sparkline,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Partner Details" mockup (Overview tab), on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// Route /partner-details-v2/:id; without an id it shows a salon picker. Data:
// getPartnerOverviewV2 (analyticsSlice `partnerOverview`), read from the
// appointments of that salon - served bookings are paid and not cancelled /
// refunded, from go-live, by service date. GloUp revenue = the fixed platform
// fee per booking + subscription fees deducted from payouts in the window (no
// commission is charged). Empty seat hours = unbooked slot time up to today.
// Booking source isn't recorded, so that card splits bookings by who they were
// for (self / someone else). Only the Overview tab is in the mockup; the other
// tabs point at the classic page (details/PartnerDetails.jsx).
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const BLUE = "#3B82F6";
const RED = "#EF4444";

// Measured card widths from the mockup, used directly as grid fr units.
const HERO_COLS = "grid-cols-[791fr_493fr]";
const ROW2_COLS = "grid-cols-[399fr_430fr_450fr]";
const ROW3_COLS = "grid-cols-[290fr_290fr_305fr_375fr]";
const ROW4_COLS = "grid-cols-[592fr_418fr_261fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1297px of content, so measured sizes carry over at ~1.17x.
const T = {
  micro: "text-[10px]", // heat map axis, legend
  tiny: "text-[11px]", // captions, KPI labels
  xs: "text-[12px]", // table cells, list sub-lines
  sm: "text-[13px]", // body
  title: "text-[14.5px]", // card titles
  stat: "text-[21px]", // in-card headline numbers
  kpi: "text-[23px]", // KPI values
  name: "text-[25px]", // partner name
};

const GAP = "gap-3";
const PAD = "p-4";
const DASH = "–";

const TABS = ["Overview", "Analytics", "Bookings", "Services", "Offers", "Performance", "Reviews", "Payouts", "Subscriptions", "Activity Log"];
const PERIODS = [
  { value: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    value: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
  { value: "last_90", label: "Last 90 Days", range: () => [moment().subtract(89, "days"), moment()] },
];
const SPLIT_COLORS = [INDIGO, BLUE, GREEN, ORANGE, "#B8BFCE"];
const PEAK_RAMP = ["#EEF0FD", "#C7CCFA", "#8F95F2", "#5B5FE6", "#4338CA"];
const TYPE_LABEL = { men: "Men's Salon", women: "Women's Salon", unisex: "Unisex Salon", unknown: "Salon" };
const STATUS_CHIP = {
  completed: ["Completed", "bg-emerald-50 text-emerald-600"],
  upcoming: ["Upcoming", "bg-blue-50 text-blue-600"],
  cancelled: ["Cancelled", "bg-rose-50 text-rose-600"],
  refunded: ["Refunded", "bg-amber-50 text-amber-700"],
  not_completed: ["Not Marked", "bg-slate-100 text-slate-600"],
};
const AVATAR_TONES = [
  ["#E3EEFF", "#2F6FE4"],
  ["#FDE7EE", "#E5365F"],
  ["#FFF0DA", "#D97706"],
  ["#DDF5E7", "#16A34A"],
];
const ACTIVITY = {
  holiday: { icon: CalendarDays, color: "#2F6FE4", title: "Holiday Added", text: (a) => `Closed on ${moment(a.detail).format("MMM D, YYYY")}${a.note ? ` · ${a.note}` : ""}` },
  weekly_holiday: { icon: Clock, color: "#2F6FE4", title: "Weekly Holiday Set", text: (a) => `${a.detail}${a.note ? ` · ${a.note}` : ""}` },
  payout: { icon: Wallet, color: "#EA7A0C", title: "Payout Processed", text: (a) => `₹${num(a.detail)} transferred to bank account` },
  subscription_started: { icon: CircleCheck, color: "#16A34A", title: "Subscription Activated", text: (a) => `Plan ₹${num(a.detail)}` },
  subscription_stopped: { icon: ShieldOff, color: RED, title: "Subscription Stopped", text: (a) => `Plan ₹${num(a.detail)}` },
  review: { icon: Star, color: BRAND, title: "New Review", text: (a) => `${a.detail}★${a.note ? ` · ${a.note}` : ""}` },
};

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : DASH);
const rupee = (v) => (isNum(v) ? `₹${num(v)}` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const fmtDate = (d) => (d ? moment(d).format("MMM D, YYYY") : DASH);
const fmtTime = (t) => (t ? moment(t, "HH:mm").format("h:mm A") : "");
const change = (cur, prev) => (isNum(cur) && isNum(prev) && prev ? ((cur - prev) / prev) * 100 : null);
const tenure = (since) => {
  if (!since) return "";
  const months = moment().diff(moment(since), "months");
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `(${y ? `${y}y ` : ""}${m}m)`;
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.tiny} {...props} />;

const Select = ({ size = T.tiny, ...props }) => <BaseSelect size={size} className="w-[104px] [&_select]:py-1" {...props} />;

const KpiTile = (props) => <BaseKpiTile sizes={{ label: T.tiny, value: T.kpi, delta: T.xs, caption: T.tiny }} iconClass="h-[46px] w-[46px] rounded-full" iconSize={22} className="px-4 py-4" {...props} />;

const Donut = (props) => <BaseDonut size={108} inner="68%" centerSize="text-[17px]" captionSize={T.micro} formatter={(value) => num(value)} {...props} />;

const HeatGrid = (props) => <BaseHeatGrid labelSize={T.micro} labelWidth={30} cellHeight={13} gap={2} radius={2} {...props} />;

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[260px]">{children}</p>
  </div>
);

const ViewAll = ({ pill = false, onClick, label = "View All" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`font-semibold text-blue-600 hover:underline ${T.xs} ${pill ? "rounded-md border border-[#E6E8F0] bg-white px-3 py-1 hover:bg-slate-50 hover:no-underline" : ""}`}
  >
    {label}
  </button>
);

// "↑ 18.5% vs previous" under a KPI value.
const VsPrevious = ({ cur, prev, inverse = false }) => {
  const d = change(cur, prev);
  if (!isNum(d)) return <span className="text-slate-400">No earlier data</span>;
  const up = d >= 0;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Delta value={`${Math.abs(d).toFixed(1)}%`} up={up} good={inverse ? !up : up} size={T.tiny} iconSize={11} />
      <span className="text-slate-500">vs previous</span>
    </span>
  );
};

// Five stars with `rating` of them filled (4.6 fills the last one 60%).
const Stars = ({ rating, size = 16 }) => (
  <span className="relative inline-flex">
    <span className="flex gap-0.5 text-slate-200">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
    <span className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-amber-400" style={{ width: `${((rating || 0) / 5) * 100}%` }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />
      ))}
    </span>
  </span>
);

// Solid / outline action button, with a trailing chevron for menus.
const ActionButton = ({ icon, children, className = "", style, onClick, chevron = false, disabled = false }) => {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${T.xs} ${className}`}
      style={style}
    >
      <Icon size={14} className="shrink-0" />
      {children}
      {chevron && <ChevronDown size={13} className="ml-1 shrink-0" />}
    </button>
  );
};

const Logo = ({ name, logo, size, className }) => {
  const [broken, setBroken] = useState(false);
  if (logo && !broken) {
    return <img src={getImageUrl(logo)} alt="" onError={() => setBroken(true)} className={`shrink-0 object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  return <SalonLogo name={name || "Salon"} size={size} className={className} />;
};

const TrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E3E7EF] bg-white px-3 py-2 shadow-lg">
      <p className={`font-bold text-slate-900 ${T.xs}`}>{fmtDate(row.day)}</p>
      <p className={`mt-1 text-slate-600 ${T.tiny}`}>
        Bookings: <span className="font-semibold text-slate-900">{row.bookings}</span>
      </p>
    </div>
  );
};

// Push + in-app message to the salon. Rendered outside ScaledCanvas.
const MessageDialog = ({ salon, onClose, onSend }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    const ok = await onSend(title.trim(), description.trim());
    setSending(false);
    if (ok) onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-slate-900">Send Message</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">Push + in-app notification to {salon} on the partner app</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <label className="mt-4 block text-[12px] font-semibold text-slate-700">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </label>
        <label className="mt-3 block text-[12px] font-semibold text-slate-700">
          Message
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={500} className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={sending || !title.trim() || !description.trim()} className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: BRAND }}>
            {sending && <Loader2 size={14} className="animate-spin" />}
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

// Search box in the app bar with a dropdown of matching salons.
const SalonSearch = ({ onPick }) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    const id = setTimeout(() => {
      dispatch(fetchPartnerPickerV2({ search: query }))
        .unwrap()
        .then((res) => setResults(res.salons || []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(id);
  }, [dispatch, query]);
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative" onFocus={() => setOpen(true)}>
      <HeaderSearch value={query} onChange={setQuery} placeholder="Search salon by name, area, city..." width={210} />
      {open && results.length > 0 && (
        <ul className="absolute right-0 top-full z-50 mt-1 max-h-[320px] w-[320px] overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((s) => (
            <li key={s.store_id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  onPick(s.store_id);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
              >
                <Logo name={s.name} logo={s.logo} size={28} className="rounded-md text-[11px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-slate-800">{s.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{[s.area, s.city].filter(Boolean).join(", ") || `ID ${s.store_id}`}</span>
                </span>
                {!s.live && <span className="shrink-0 text-[10px] text-slate-400">Not live</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Shown at /partner-details-v2 with no id: live salons first, filtered by name.
const SalonPicker = ({ onPick }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [salons, setSalons] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => {
      dispatch(fetchPartnerPickerV2({ search }))
        .unwrap()
        .then((res) => setSalons(res.salons || []))
        .catch((message) => {
          setSalons([]);
          toast.error(message || "Failed to load salons", { id: "partner-picker" });
        });
    }, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [dispatch, search]);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className={`font-bold text-slate-900 ${T.title}`}>Choose a salon</h2>
          <p className={`mt-0.5 text-slate-500 ${T.xs}`}>Live salons are listed first. Showing up to 50.</p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, area, city or ID" className={`w-[300px] rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${T.sm}`} />
      </div>
      {salons === null ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : salons.length ? (
        <ul className="mt-4 grid grid-cols-4 gap-3">
          {salons.map((s) => (
            <li key={s.store_id}>
              <button type="button" onClick={() => onPick(s.store_id)} className="flex w-full items-center gap-3 rounded-xl border border-[#E6E8F0] p-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
                <Logo name={s.name} logo={s.logo} size={40} className="rounded-lg text-[13px]" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-semibold text-slate-900 ${T.sm}`}>{s.name}</span>
                  <span className={`block truncate text-slate-500 ${T.tiny}`}>{[TYPE_LABEL[s.type], s.area, s.city].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.live ? "bg-emerald-500" : "bg-slate-300"}`} title={s.live ? "Live" : "Not live"} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>No salons match “{search}”.</EmptyNote>
      )}
    </Card>
  );
};

// Search lives in the app bar, not the canvas.
const PageHeader = ({ onPick }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center justify-end gap-5 pl-1 pr-4">
      <SalonSearch onPick={onPick} />
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PartnerDetailsV2 = ({ title = "Partner Details" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const storeId = Number(id) || null;
  const { partnerOverview } = useSelector((state) => state.analytics);
  const [tab, setTab] = useState(TABS[0]);
  const [period, setPeriod] = useState(PERIODS[0].value);
  const [messageOpen, setMessageOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const range = useMemo(() => {
    const [from, to] = (PERIODS.find((p) => p.value === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period]);

  const load = () => {
    if (!storeId) return;
    dispatch(fetchPartnerOverviewV2({ store_id: storeId, from: range.from, to: range.to }))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load partner", { id: "partner-v2" }));
  };
  useEffect(load, [dispatch, storeId, range.from, range.to]);

  const pick = (sid) => navigate(`/partner-details-v2/${sid}`);
  const breadcrumb = (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-slate-600 ${T.xs}`}>
      <House size={14} className="text-slate-400" />
      <ChevronRight size={12} className="text-slate-300" />
      <button type="button" onClick={() => navigate("/partner")} className="hover:text-slate-900 hover:underline">
        Partners
      </button>
      <ChevronRight size={12} className="text-slate-300" />
      <span className="font-medium text-slate-800">{title}</span>
    </nav>
  );

  if (!storeId) {
    return (
      <>
        <PageHeader onPick={pick} />
        <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
          {breadcrumb}
          <SalonPicker onPick={pick} />
        </ScaledCanvas>
      </>
    );
  }

  // Only trust data for the salon in the URL (the slice may still hold the last one).
  const data = partnerOverview.data?.profile?.store_id === storeId ? partnerOverview.data : null;
  const loading = !data && (partnerOverview.loading || !partnerOverview.error);
  const failed = !data && !partnerOverview.loading && partnerOverview.error;
  const p = data?.profile;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const shown = (v, fmt = num) => (loading ? "…" : fmt(v));
  const periodLabel = (PERIODS.find((x) => x.value === period) || PERIODS[0]).label;
  const classic = () => navigate(`/partnerdetails/${storeId}`);
  const active = p?.status === "active";

  const sendMessage = async (msgTitle, description) => {
    try {
      await dispatch(sendPartnerNotificationV2({ store_id: storeId, title: msgTitle, description })).unwrap();
      toast.success(`Message sent to ${p?.name || "the salon"}`, { id: "partner-v2-message" });
      return true;
    } catch (message) {
      toast.error(message || "Failed to send message", { id: "partner-v2-message" });
      return false;
    }
  };
  const toggleStatus = async () => {
    if (!p) return;
    const next = active ? "inactive" : "active";
    if (!window.confirm(`Are you sure you want to ${active ? "deactivate" : "activate"} ${p.name}?`)) return;
    setStatusBusy(true);
    try {
      await dispatch(updatePartnerStatus({ id: storeId, status: next })).unwrap();
      toast.success(`${p.name} is now ${next}`, { id: "partner-v2-status" });
      load();
    } catch (message) {
      toast.error(typeof message === "string" ? message : "Failed to update status", { id: "partner-v2-status" });
    } finally {
      setStatusBusy(false);
    }
  };
  const exportReport = () => {
    if (!data) return;
    const rows = [
      ["Salon", p.name],
      ["Period", `${data.from} to ${data.to}`],
      ["Bookings", k.bookings],
      ["Completed bookings", k.completed_bookings],
      ["GMV (INR)", k.gmv],
      ["Platform fee revenue (INR)", k.platform_fee_revenue],
      ["Subscription revenue (INR)", k.subscription_revenue],
      ["Customers", k.customers],
      ["New customers", k.new_customers],
      ["Average order value (INR)", k.aov],
      ["Cancellation rate (%)", k.cancellation_rate],
      ["Empty seat hours", k.empty_seat_hours],
      [],
      ["Service", "Bookings", "GMV (INR)"],
      ...(data.top_services || []).map((s) => [s.name, s.bookings, s.gmv]),
    ];
    downloadCsv(`partner-${storeId}_${data.from}_${data.to}.csv`, ["Metric", "Value"], rows);
  };

  const sub = data?.subscription;
  const account = [
    { label: "Partner Since", value: fmtDate(p?.partner_since), note: tenure(p?.partner_since) },
    {
      label: "Subscription Plan",
      value: sub ? `${rupee(sub.plan_amount)}` : "No plan",
      note: sub ? (sub.status === "active" ? "active" : sub.status) : "",
      dot: sub?.status === "active",
    },
    { label: "Next Billing Date", value: sub?.status === "active" ? fmtDate(sub.next_due_date) : DASH, note: sub?.outstanding_due ? `${rupee(sub.outstanding_due)} due` : "" },
    {
      label: "Profile Status",
      chip: p?.completion_status === "completed" ? { text: "Verified", icon: CircleCheck, tone: "bg-emerald-50 text-emerald-600" } : { text: p?.completion_status || DASH, tone: "bg-amber-50 text-amber-700" },
    },
    { label: "Payouts", value: p ? p.payout_frequency.charAt(0).toUpperCase() + p.payout_frequency.slice(1) : DASH, note: data?.last_payout ? `last ${moment(data.last_payout.paid_at).format("MMM D")}` : "" },
    { label: "Bank Account", value: p?.bank?.account || "Not added", title: p?.bank ? `${p.bank.holder || ""} ${p.bank.ifsc || ""}`.trim() : undefined },
  ];

  const kpis = [
    { label: "Total Bookings", value: shown(k.bookings), caption: <VsPrevious cur={k.bookings} prev={pk.bookings} />, icon: CalendarCheck, color: "#2F6FE4", tint: "#E3EEFF" },
    { label: "Completed Bookings", value: shown(k.completed_bookings), caption: `${fmtPct(k.completion_rate)} Completion Rate`, icon: CircleCheck, color: "#16A34A", tint: "#DDF5E7" },
    { label: "Total Revenue (GMV)", value: shown(k.gmv, rupee), caption: <VsPrevious cur={k.gmv} prev={pk.gmv} />, icon: IndianRupee, color: "#EA7A0C", tint: "#FFEBD2" },
    { label: "GloUp Revenue", value: shown(k.gloup_revenue, rupee), caption: `Fee ${rupee(k.platform_fee_revenue)} + Subs ${rupee(k.subscription_revenue)}`, icon: IndianRupee, color: BRAND, tint: "#EEEAFD" },
    { label: "New Customers", value: shown(k.new_customers), caption: <VsPrevious cur={k.new_customers} prev={pk.new_customers} />, icon: Users, color: "#2F6FE4", tint: "#E3EEFF" },
    {
      label: "Empty Seat Hours",
      value: loading ? "…" : isNum(k.empty_seat_hours) ? `${num(k.empty_seat_hours)} hrs` : DASH,
      caption: isNum(k.empty_seat_hours) ? "Unbooked slot time to date" : "No slots configured",
      icon: Clock,
      color: RED,
      tint: "#FDE7E7",
    },
  ];

  const trend = data?.trend || [];
  const trendSpark = toSpark(trend.map((d) => d.bookings));
  const periodStats = data
    ? [
        { label: "Today", value: data.periods.today },
        { label: "This Week", value: data.periods.this_week },
        { label: "This Month", value: data.periods.this_month, prev: data.periods.last_month },
        { label: "Last Month", value: data.periods.last_month },
      ]
    : [];
  const split = (data?.revenue_split || []).map((s, i) => ({ name: s.name, value: s.gmv, share: s.share, color: SPLIT_COLORS[i] }));
  const topServices = data?.top_services || [];
  const bookedFor = data?.booked_for || { self: 0, guest: 0 };
  const bookedTotal = bookedFor.self + bookedFor.guest;
  const forRows = [
    { name: "For themselves", count: bookedFor.self, color: INDIGO },
    { name: "For someone else", count: bookedFor.guest, color: "#22D3EE" },
  ];
  const peak = data?.peak;
  const peakMax = peak ? Math.max(0, ...peak.values.flat()) : 0;
  const peakValues = peak ? peak.values.map((row) => row.map((v) => (peakMax ? v / peakMax : 0))) : [];
  const hourLabels = peak ? peak.hours.map((h, i) => (i % 3 === 0 ? moment({ hour: h % 24 }).format("h A") : "")) : [];
  const retention = data?.retention || { customers: 0, returning: 0, new: 0 };
  const retentionRows = [
    { name: "Returning Customers", count: retention.returning, color: INDIGO },
    { name: "New Customers", count: retention.new, color: "#C9CEDB" },
  ];
  const ratings = data?.ratings;
  const recent = data?.recent_bookings || [];
  const activity = data?.activity || [];

  const quickActions = [
    { icon: MessageSquare, label: "Send Message", color: BRAND, onClick: () => setMessageOpen(true) },
    { icon: Gift, label: "Create Offer", color: BRAND, onClick: () => navigate("/category-discount") },
    { icon: Star, label: "View Reviews", color: "#475569", onClick: () => navigate("/review") },
    { icon: FileDown, label: "Download Report", color: "#475569", onClick: exportReport },
    { icon: ExternalLink, label: "Open Classic Page", color: "#475569", onClick: classic },
    { icon: active ? ShieldOff : ShieldCheck, label: active ? "Deactivate Partner" : "Activate Partner", color: active ? RED : "#16A34A", onClick: toggleStatus, disabled: statusBusy || !p },
  ];

  return (
    <>
      <PageHeader onPick={pick} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between gap-3">
          {breadcrumb}

          <div className="flex items-center gap-3">
            <ActionButton icon={Mail} className="text-white" style={{ background: BRAND }} onClick={() => setMessageOpen(true)} disabled={!p}>
              Send Message
            </ActionButton>
            <ActionButton icon={Gift} className="text-white" style={{ background: "#16A34A" }} onClick={() => navigate("/category-discount")}>
              Create Offer
            </ActionButton>
            <div className="relative">
              <ActionButton icon={CalendarDays} chevron className="border border-[#E6E8F0] bg-white text-slate-700" onClick={() => setMoreOpen((v) => !v)}>
                More Actions
              </ActionButton>
              {moreOpen && (
                <ul className="absolute right-0 top-full z-20 mt-1 w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg" onMouseLeave={() => setMoreOpen(false)}>
                  {quickActions.slice(2).map((action) => (
                    <li key={action.label}>
                      <button
                        type="button"
                        disabled={action.disabled}
                        onClick={() => {
                          setMoreOpen(false);
                          action.onClick();
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${T.xs}`}
                      >
                        <action.icon size={14} style={{ color: action.color }} />
                        {action.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {failed ? (
          <Card className="items-center justify-center gap-2 py-24 text-center">
            <Store size={26} className="text-slate-400" />
            <p className={`font-semibold text-slate-700 ${T.sm}`}>{partnerOverview.error}</p>
            <button type="button" onClick={() => navigate("/partner-details-v2")} className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
              Choose another salon
            </button>
          </Card>
        ) : (
          <>
            {/* Profile + account summary */}
            <div className={`grid ${HERO_COLS} ${GAP}`}>
              <div className={`flex min-w-0 items-center gap-5 px-5 py-4 ${CARD}`}>
                <Logo name={p?.name} logo={p?.logo} size={116} className="rounded-xl text-[34px]" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className={`font-extrabold tracking-tight text-slate-900 ${T.name}`}>{p?.name || (loading ? "Loading…" : DASH)}</h1>
                    {p?.is_premium && (
                      <Chip size="px-2.5 py-[3px] text-[11px]" className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        <span className="flex items-center gap-1">
                          <Star size={11} />
                          Premium Partner
                        </span>
                      </Chip>
                    )}
                    {p && (
                      <Chip size="px-2.5 py-[3px] text-[11px]" className={active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Chip>
                    )}
                  </div>

                  <p className={`mt-2 flex items-center gap-2 text-slate-600 ${T.sm}`}>
                    <MapPin size={14} className="shrink-0 text-slate-500" />
                    <span className="truncate">{p?.address || DASH}</span>
                  </p>

                  <p className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 ${T.sm}`}>
                    <span className="flex items-center gap-2">
                      <Phone size={14} className="shrink-0 text-slate-500" />
                      {p?.phone || DASH}
                    </span>
                    {p?.whatsapp && (
                      <a href={`https://wa.me/91${p.whatsapp.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" title={`WhatsApp ${p.whatsapp}`}>
                        <MessageCircle size={15} className="shrink-0 text-emerald-500" aria-label="WhatsApp" />
                      </a>
                    )}
                    <span className="flex items-center gap-2">
                      <Mail size={14} className="shrink-0 text-slate-500" />
                      {p?.email || DASH}
                    </span>
                  </p>

                  <ul className={`mt-3 flex flex-wrap items-center gap-2 text-slate-600 ${T.tiny}`}>
                    {[
                      { icon: Scissors, text: TYPE_LABEL[p?.type] || "Salon" },
                      { icon: CalendarDays, text: p?.partner_since ? `Since ${moment(p.partner_since).format("MMM YYYY")}` : DASH },
                      { icon: Star, text: ratings?.average ? `${ratings.average} (${num(ratings.total)} Reviews)` : "No reviews", amber: true },
                      { text: `ID: ${storeId}` },
                    ].map(({ icon: Icon, text, amber }) => (
                      <li key={text} className="flex items-center gap-1.5 rounded-md border border-[#E6E8F0] bg-[#F8F9FC] px-2.5 py-1">
                        {Icon && <Icon size={11} className={amber ? "text-amber-400" : "text-slate-500"} fill={amber ? "currentColor" : "none"} />}
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={`grid min-w-0 grid-cols-[1.1fr_1.15fr_1fr] content-center gap-x-5 gap-y-5 px-6 py-4 ${CARD}`}>
                {account.map((item) => (
                  <div key={item.label} className="min-w-0" title={item.title}>
                    <p className={`flex items-center gap-1.5 whitespace-nowrap text-slate-500 ${T.tiny}`}>
                      {item.label}
                      {item.dot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                    </p>
                    {item.chip ? (
                      <p className="mt-2">
                        <Chip size="px-2.5 py-[3px] text-[11px]" className={item.chip.tone}>
                          <span className="flex items-center gap-1">
                            {item.chip.icon && <item.chip.icon size={11} />}
                            {item.chip.text}
                          </span>
                        </Chip>
                      </p>
                    ) : (
                      <p className={`mt-2 truncate font-semibold text-slate-900 ${T.sm}`}>
                        {loading ? "…" : item.value}
                        {item.note && <span className={`ml-1 font-normal text-slate-500 ${T.tiny}`}>{item.note}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div role="tablist" className="flex items-center gap-8 border-b border-[#E6E8F0]">
              {TABS.map((name) => {
                const isActive = name === tab;
                return (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(name)}
                    className={`-mb-px border-b-2 px-1 pb-3 pt-1 font-medium transition-colors ${T.sm} ${isActive ? "border-[#5B3FF0] text-[#5B3FF0]" : "border-transparent text-slate-600 hover:text-slate-900"}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {tab !== TABS[0] ? (
              <Card className="items-center justify-center gap-2 py-24 text-center">
                <ExternalLink size={26} className="text-slate-400" />
                <p className={`font-semibold text-slate-700 ${T.sm}`}>{tab}</p>
                <p className={`max-w-[360px] text-slate-500 ${T.xs}`}>This tab isn't redesigned yet. The classic partner page has the full details.</p>
                <button type="button" onClick={classic} className={`mt-1 font-semibold text-blue-600 hover:underline ${T.xs}`}>
                  Open classic page
                </button>
              </Card>
            ) : (
              <>
                {/* KPI tiles */}
                <div className={`grid grid-cols-6 ${GAP}`}>
                  {kpis.map(({ icon, color, tint, ...kpi }) => (
                    <KpiTile key={kpi.label} {...kpi} icon={icon} iconColor={color} iconTint={tint} />
                  ))}
                </div>

                {/* Row 2 - Trend / revenue / top services */}
                <div className={`grid ${ROW2_COLS} ${GAP}`}>
                  <Card className={PAD}>
                    <CardHeader title="Bookings Trend" right={<Select value={period} onChange={setPeriod} options={PERIODS} />} />
                    {trend.some((d) => d.bookings) ? (
                      <div className="mt-2 min-h-[150px] flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trend} margin={{ top: 8, right: 10, bottom: 0, left: -12 }}>
                            <defs>
                              <linearGradient id="pd-trend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={BRAND} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#EEF0F6" vertical={false} />
                            <XAxis dataKey="day" tickFormatter={(d) => moment(d).format("D MMM")} interval="preserveStartEnd" minTickGap={20} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} dy={4} padding={{ left: 6, right: 10 }} />
                            <YAxis domain={[0, "auto"]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} width={36} />
                            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#CBD2E0", strokeDasharray: "3 3" }} />
                            <Area type="linear" dataKey="bookings" stroke={BRAND} strokeWidth={1.6} fill="url(#pd-trend)" dot={trend.length <= 31 ? { r: 2.4, fill: BRAND, strokeWidth: 0 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : `No bookings in ${periodLabel.toLowerCase()}`}</EmptyNote>
                    )}

                    <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                      {periodStats.map((stat) => {
                        const d = change(stat.value, stat.prev);
                        return (
                          <div key={stat.label} className="min-w-0">
                            <p className={`text-slate-500 ${T.tiny}`}>{stat.label}</p>
                            <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{num(stat.value)}</p>
                            {isNum(d) && <Delta value={`${Math.abs(d).toFixed(1)}%`} up={d >= 0} size={T.tiny} iconSize={11} />}
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className={PAD}>
                    <CardHeader title="Revenue Overview" right={<Select value={period} onChange={setPeriod} options={PERIODS} />} />
                    <div className="mt-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-slate-500 ${T.tiny}`}>Total Revenue (GMV)</p>
                        <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{shown(k.gmv, rupee)}</p>
                        <p className={`mt-0.5 ${T.tiny}`}>
                          <VsPrevious cur={k.gmv} prev={pk.gmv} />
                        </p>
                        {trend.length > 1 && (
                          <div className="mt-2 w-[140px]">
                            <Sparkline id="pd-revenue-spark" data={trendSpark} color={GREEN} height={28} fillOpacity={0} domain={["dataMin", "dataMax"]} />
                          </div>
                        )}
                      </div>

                      {split.length > 0 && (
                        <>
                          <Donut data={split} formatter={rupee} />
                          <ul className="flex shrink-0 flex-col gap-2">
                            {split.map((slice) => (
                              <li key={slice.name} className={`flex items-center gap-2 text-slate-700 ${T.tiny}`} title={rupee(slice.value)}>
                                <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: slice.color }} />
                                <span className="w-[70px] truncate">{slice.name}</span>
                                <span className="w-[34px] text-right text-slate-600">{isNum(slice.share) ? `${Math.round(slice.share)}%` : DASH}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    <div className="mt-auto grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                      {[
                        { label: "Average Order Value", value: rupee(k.aov), cur: k.aov, prev: pk.aov },
                        { label: "Highest Booking", value: rupee(data?.highest_booking?.gmv), note: data?.highest_booking ? fmtDate(data.highest_booking.day) : "" },
                        { label: "Total Services Sold", value: num(k.services_sold), cur: k.services_sold, prev: pk.services_sold },
                      ].map((stat) => {
                        const d = change(stat.cur, stat.prev);
                        return (
                          <div key={stat.label} className="min-w-0">
                            <p className={`truncate text-slate-500 ${T.tiny}`}>{stat.label}</p>
                            <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.sm}`}>{loading ? "…" : stat.value}</p>
                            {isNum(d) && <Delta value={`${Math.abs(d).toFixed(1)}%`} up={d >= 0} size={T.tiny} iconSize={11} />}
                            {stat.note && <p className={`text-slate-500 ${T.tiny}`}>{stat.note}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className={PAD}>
                    <CardHeader
                      title="Top Services"
                      right={
                        <span className="flex items-center gap-3">
                          <Select value={period} onChange={setPeriod} options={PERIODS} />
                          <ViewAll pill onClick={classic} />
                        </span>
                      }
                    />
                    {topServices.length ? (
                      <div className="mt-3 flex-1 rounded-lg border border-[#E6E8F0] px-4 py-2">
                        <table className="w-full table-auto border-collapse text-left">
                          <thead>
                            <tr>
                              <th className={`py-2 font-semibold text-slate-800 ${T.tiny}`}>Service</th>
                              <th className={`py-2 text-right font-semibold text-slate-800 ${T.tiny}`}>Bookings</th>
                              <th className={`py-2 text-right font-semibold text-slate-800 ${T.tiny}`}>Revenue (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topServices.map((row) => (
                              <tr key={row.key} className="h-[27px]">
                                <td className={`max-w-[200px] truncate text-slate-700 ${T.xs}`} title={row.name}>
                                  {row.name}
                                </td>
                                <td className={`text-right text-slate-700 ${T.xs}`}>{num(row.bookings)}</td>
                                <td className={`text-right text-slate-700 ${T.xs}`}>{num(row.gmv)}</td>
                              </tr>
                            ))}
                            <tr className="h-[34px] border-t border-slate-100" title="All services, not only the top five">
                              <td className={`font-bold text-slate-900 ${T.xs}`}>Total</td>
                              <td className={`text-right font-bold text-slate-900 ${T.xs}`}>{num(k.services_sold)}</td>
                              <td className={`text-right font-bold text-slate-900 ${T.xs}`}>{num(k.gmv)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No services booked in this period"}</EmptyNote>
                    )}
                  </Card>
                </div>

                {/* Row 3 - Booked for / peak hours / retention / ratings */}
                <div className={`grid ${ROW3_COLS} ${GAP}`}>
                  <Card className={PAD}>
                    <CardHeader title="Booked For" subtitle="Booking source isn't recorded yet" right={<Select value={period} onChange={setPeriod} options={PERIODS} />} />
                    {bookedTotal ? (
                      <div className="flex flex-1 items-center gap-3 pt-2">
                        <Donut data={forRows.map((s) => ({ name: s.name, value: s.count, color: s.color }))} center={num(bookedTotal)} caption="Total" />
                        <ul className="flex min-w-0 flex-1 flex-col gap-2">
                          {forRows.map((row) => (
                            <li key={row.name} className={`flex items-center gap-1.5 text-slate-700 ${T.tiny}`}>
                              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: row.color }} />
                              <span className="min-w-0 flex-1 truncate">{row.name}</span>
                              <span className="shrink-0 whitespace-nowrap text-right text-slate-600">
                                {Math.round((row.count / bookedTotal) * 100)}% ({num(row.count)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
                    )}
                  </Card>

                  <Card className={PAD}>
                    <CardHeader
                      title={
                        <>
                          Peak Hours <span className="font-medium text-slate-500">({periodLabel})</span>
                        </>
                      }
                    />
                    {peakMax ? (
                      <>
                        <div className="mt-3 flex-1">
                          <HeatGrid
                            values={peakValues}
                            ramp={PEAK_RAMP}
                            rowLabels={peak.weekdays}
                            colLabels={hourLabels}
                            labelsAt="bottom"
                            title={(r, c) => `${peak.weekdays[r]} ${moment({ hour: peak.hours[c] % 24 }).format("h A")} · ${peak.values[r][c]} bookings`}
                          />
                        </div>
                        <div className="pt-2">
                          <RampLegend ramp={PEAK_RAMP} from="Low" to="High" size={T.micro} width={140} height={6} />
                        </div>
                      </>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No timed bookings in this period"}</EmptyNote>
                    )}
                  </Card>

                  <Card className={PAD}>
                    <CardHeader title="Customer Retention" subtitle="Returning = booked this salon before the period" right={<Select value={period} onChange={setPeriod} options={PERIODS} />} />
                    {retention.customers ? (
                      <div className="flex flex-1 items-center gap-4 pt-2">
                        <Donut data={retentionRows.map((r) => ({ name: r.name, value: r.count, color: r.color }))} inner="62%" center={`${Math.round((retention.returning / retention.customers) * 100)}%`} caption="Returning" />
                        <ul className="flex min-w-0 flex-1 flex-col gap-3">
                          {retentionRows.map((row) => (
                            <li key={row.name} className={`flex items-center gap-2 text-slate-700 ${T.tiny}`}>
                              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: row.color }} />
                              <span className="min-w-0 flex-1 truncate">{row.name}</span>
                              <span className="shrink-0 whitespace-nowrap text-slate-600">
                                {num(row.count)} ({Math.round((row.count / retention.customers) * 100)}%)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No customers in this period"}</EmptyNote>
                    )}
                  </Card>

                  <Card className={PAD}>
                    <CardHeader title="Ratings & Reviews" right={<ViewAll onClick={() => navigate("/review")} />} />
                    {ratings?.total ? (
                      <div className="flex flex-1 items-center gap-6 pt-2">
                        <div className="flex shrink-0 flex-col items-center">
                          <p className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900">{ratings.average}</p>
                          <div className="mt-2">
                            <Stars rating={ratings.average} />
                          </div>
                          <p className={`mt-2 text-slate-500 ${T.tiny}`}>{num(ratings.total)} Reviews</p>
                        </div>

                        <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
                          {ratings.bars.map((row) => (
                            <li key={row.stars} className={`flex items-center gap-2 text-slate-600 ${T.tiny}`}>
                              <span className="flex w-[22px] shrink-0 items-center gap-0.5">
                                {row.stars}
                                <Star size={10} className="text-amber-400" fill="currentColor" strokeWidth={0} />
                              </span>
                              <span className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEF0F6]">
                                <span className="block h-full rounded-full" style={{ width: `${row.share || 0}%`, background: row.stars >= 4 ? GREEN : row.stars === 3 ? ORANGE : row.stars === 2 ? "#F97316" : RED }} />
                              </span>
                              <span className="w-[56px] shrink-0 whitespace-nowrap text-right">
                                {num(row.count)} ({Math.round(row.share || 0)}%)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No reviews yet (all time)"}</EmptyNote>
                    )}
                  </Card>
                </div>

                {/* Row 4 - Recent bookings / activity / quick actions */}
                <div className={`grid ${ROW4_COLS} ${GAP}`}>
                  <Card className={PAD}>
                    <CardHeader title="Recent Bookings" subtitle="Latest paid bookings, any status" right={<ViewAll pill onClick={classic} />} />
                    {recent.length ? (
                      <ul className="mt-2 flex flex-1 flex-col justify-around">
                        {recent.slice(0, 4).map((row, i) => {
                          const [bg, fg] = AVATAR_TONES[i % AVATAR_TONES.length];
                          const [label, tone] = STATUS_CHIP[row.status] || STATUS_CHIP.not_completed;
                          return (
                            <li key={row.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.35fr)_minmax(0,1.1fr)_60px_88px] items-center gap-3 py-2">
                              <span className="flex min-w-0 items-center gap-3">
                                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${T.xs}`} style={{ background: bg, color: fg }}>
                                  {initials(row.customer || "Guest")}
                                </span>
                                <span className="min-w-0">
                                  <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>{row.customer || "Customer"}</span>
                                  <span className={`block text-slate-500 ${T.tiny}`}>{row.phone || DASH}</span>
                                </span>
                              </span>
                              <span className={`truncate text-slate-700 ${T.xs}`} title={row.services}>
                                {row.services || DASH}
                              </span>
                              <span className={`text-slate-700 ${T.xs}`}>
                                <span className="block">{fmtDate(row.day)}</span>
                                <span className={`block text-slate-500 ${T.tiny}`}>{fmtTime(row.time)}</span>
                              </span>
                              <span className={`font-semibold text-slate-900 ${T.xs}`}>{rupee(row.amount)}</span>
                              <Chip size="px-3 py-1 text-center text-[11px]" className={tone}>
                                {label}
                              </Chip>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No bookings yet"}</EmptyNote>
                    )}
                  </Card>

                  <Card className={PAD}>
                    <CardHeader
                      title={
                        <>
                          Partner Activity <span className="font-medium text-slate-500">(Latest)</span>
                        </>
                      }
                      right={<ViewAll pill onClick={classic} />}
                    />
                    {activity.length ? (
                      <ul className="mt-2 flex flex-1 flex-col justify-around gap-2">
                        {activity.slice(0, 4).map((item, i) => {
                          const meta = ACTIVITY[item.kind] || ACTIVITY.payout;
                          const Icon = meta.icon;
                          return (
                            <li key={`${item.kind}-${item.at}-${i}`} className="flex items-center gap-3">
                              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-[1.5px]" style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}14` }}>
                                <Icon size={14} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>{meta.title}</span>
                                <span className={`block truncate text-slate-500 ${T.tiny}`}>{meta.text(item)}</span>
                              </span>
                              <span className={`shrink-0 text-right text-slate-500 ${T.micro}`}>
                                <span className="block">{fmtDate(item.at)}</span>
                                {item.kind !== "payout" && moment(item.at).format("HH:mm") !== "00:00" && <span className="block">{moment(item.at).format("hh:mm A")}</span>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <EmptyNote>{loading ? "Loading…" : "No recorded activity"}</EmptyNote>
                    )}
                  </Card>

                  <Card className={PAD}>
                    <CardHeader title="Quick Actions" />
                    <ul className="mt-2 flex flex-1 flex-col justify-around">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <li key={action.label}>
                            <button
                              type="button"
                              onClick={action.onClick}
                              disabled={action.disabled}
                              className={`flex w-full items-center gap-3 rounded-md py-1.5 text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.xs}`}
                            >
                              <Icon size={15} className="shrink-0" style={{ color: action.color }} />
                              <span className="flex-1 text-left">{action.label}</span>
                              <ChevronRight size={14} className="shrink-0 text-slate-400" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </ScaledCanvas>

      {messageOpen && p && <MessageDialog salon={p.name} onClose={() => setMessageOpen(false)} onSend={sendMessage} />}
    </>
  );
};

export default PartnerDetailsV2;
