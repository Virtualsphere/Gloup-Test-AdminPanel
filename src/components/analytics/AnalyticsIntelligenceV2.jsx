import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Download,
  EyeOff,
  Loader2,
  Send,
  X,
} from "lucide-react";
import ScaledCanvas from "../v2/ScaledCanvas";
import {
  exportAnalyticsUninstalledV2,
  fetchAnalyticsGravityV2,
  fetchAnalyticsProfitabilityV2,
  fetchAnalyticsSwitchingV2,
  fetchAnalyticsUninstalledV2,
} from "../../redux/slices/analyticsSlice";
import { downloadXlsx } from "../../utils/excelExport";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved mockup, on a fixed DESIGN_WIDTH canvas that
// ScaledCanvas scales to the available width.
//
// DESIGN_WIDTH is tuned to the NARROWEST canvas the content fits in with zero
// overflow (verified element-by-element in a browser). That matters for
// readability: a narrower canvas means a higher scale factor, so the text lands
// bigger on screen. Raising the px sizes in T below does the opposite - it
// forces a wider canvas, which then scales down further and reads smaller.
//
// Data: analyticsSlice (getAnalytics*V2). Profitability, switching, gravity
// (customers / repeat / retention) and uninstalled users are live. Time-to-
// book, switch reasons, where customers live and travel distance have no data
// source yet (the app logs no events or locations) and say so on the card.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
const BRAND = "#5B21F0";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW1_COLS = "grid-cols-[1811fr_1383fr_1923fr]";
const ROW2_COLS = "grid-cols-[1740fr_1888fr_1454fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these - bigger numbers here make the rendered text smaller.
const T = {
  xs: "text-[10px]",      // table headers
  sm: "text-[11px]",      // deltas, legend
  base: "text-[12px]",    // stat labels
  md: "text-[13px]",      // body, table cells
  lg: "text-[14px]",      // sub-titles, links
  xl: "text-[16px]",      // card headings
  h1: "text-[20px]",      // page title
  stat: "text-[24px]",    // stat values
  statSm: "text-[18px]",  // estimated reach
};

const PAD = "p-4";
const GAP = "gap-3";
const DASH = "—";
const TOP_ROWS = 5;

// Header period presets -> { from, to } as YYYY-MM-DD (weeks start Monday).
const PERIODS = [
  { key: "this_week", label: "This Week", range: () => [moment().startOf("isoWeek"), moment()] },
  {
    key: "last_week",
    label: "Last Week",
    range: () => [moment().subtract(1, "week").startOf("isoWeek"), moment().subtract(1, "week").endOf("isoWeek")],
  },
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    key: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
  { key: "last_90", label: "Last 90 Days", range: () => [moment().subtract(89, "days"), moment()] },
];
const REFRESH_OPTIONS = [
  { label: "Off", ms: 0 },
  { label: "15 sec", ms: 15000 },
  { label: "30 sec", ms: 30000 },
  { label: "1 min", ms: 60000 },
  { label: "5 min", ms: 300000 },
];
const CHANNELS = [
  { key: "WhatsApp", enabled: true },
  { key: "SMS", enabled: true },
  { key: "Push Notification", enabled: false, why: "uninstalled apps can't receive push" },
  { key: "Email", enabled: false, why: "no email sending is set up" },
];
const AUDIENCES = [
  { key: "all", label: "All re-engageable" },
  { key: "high_value", label: "High value only" },
];

const fmtInt = (n) => (n == null ? DASH : Number(n).toLocaleString("en-IN"));
const fmtMoney = (n) => {
  if (n == null) return DASH;
  const abs = `₹${Math.abs(Number(n)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return Number(n) < 0 ? `-${abs}` : abs;
};
const fmtPct = (n) => (n == null ? DASH : `${Number(n).toFixed(1)}%`);
const share = (part, whole) => (whole ? (part / whole) * 100 : null);
const fmtDate = (v) => (v ? moment(v).format("DD MMM YYYY") : DASH);
const fmtRange = (from, to) => {
  const a = moment(from);
  const b = moment(to);
  return `${a.format(a.year() === b.year() ? "D MMM" : "D MMM YYYY")} – ${b.format("D MMM YYYY")}`;
};

// Percent change vs the previous window, or null when there's no base.
const change = (cur, prev) => {
  if (cur == null || !prev) return null;
  return ((cur - prev) / prev) * 100;
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const toneClass = {
  green: "text-emerald-500",
  amber: "text-amber-500",
  red: "text-rose-500",
};

// min-w-0 is what lets these shrink inside the grid instead of forcing overflow.
const Card = ({ children, className = "" }) => (
  <div
    className={`flex min-w-0 flex-col rounded-2xl border border-[#E3E7EF] bg-white ${PAD} ${className}`}
  >
    {children}
  </div>
);

const CardTitle = ({ index, children }) => (
  <h2
    className={`mb-3 border-b border-slate-100 pb-3 font-extrabold uppercase tracking-wide text-slate-900 ${T.md}`}
  >
    {index ? `${index}. ` : ""}
    {children}
  </h2>
);

const SubTitle = ({ children }) => (
  <h3 className={`mb-3 font-bold text-slate-900 ${T.lg}`}>{children}</h3>
);

// Compare-mode line under a stat: change vs the previous window.
const DeltaLine = ({ cur, prev, upIsGood = true }) => {
  const pct = change(cur, prev);
  if (pct == null) {
    return <p className={`mt-1 text-slate-400 ${T.xs}`}>prev {fmtInt(prev)}</p>;
  }
  const up = pct >= 0;
  const good = pct === 0 || up === upIsGood;
  return (
    <p className={`mt-1 whitespace-nowrap font-medium ${T.xs} ${good ? "text-emerald-500" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs prev
    </p>
  );
};

const StatTile = ({ label, value, pct, tone, labelClass = T.sm, compare }) => (
  <div className="min-w-0">
    <p className={`leading-snug tracking-tight text-slate-500 ${labelClass}`}>{label}</p>
    <div className="mt-1.5 flex flex-nowrap items-baseline gap-x-1.5">
      <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
        {value}
      </span>
      {pct && (
        <span className={`font-semibold ${T.xs} ${toneClass[tone] || "text-slate-500"}`}>
          {pct}
        </span>
      )}
    </div>
    {compare && <DeltaLine {...compare} />}
  </div>
);

const ViewLink = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`mt-auto flex w-full items-center justify-center gap-1.5 pt-4 font-bold hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline ${T.lg}`}
    style={{ color: BRAND }}
  >
    {children}
    <ArrowRight size={14} className="shrink-0" />
  </button>
);

// Change in percentage points; for switching, going up is bad.
const Trend = ({ pts, upIsBad = true }) => {
  if (pts == null) return <span className={`text-slate-400 ${T.md}`}>{DASH}</span>;
  const up = pts > 0;
  const bad = pts !== 0 && up === upIsBad;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-medium ${T.md} ${
        bad ? "text-rose-500" : "text-emerald-500"
      }`}
      title="Percentage points vs the previous period"
    >
      {up ? "▲" : pts < 0 ? "▼" : "•"} {Math.abs(pts).toFixed(1)} pts
    </span>
  );
};

const TIER_STYLES = {
  High: "bg-emerald-50 text-emerald-600",
  Medium: "bg-amber-50 text-amber-500",
  Low: "bg-amber-50 text-amber-500",
  Negative: "bg-rose-50 text-rose-500",
};

const Pill = ({ tag, styles = TIER_STYLES }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${T.md} ${
      styles[tag] || "bg-slate-100 text-slate-600"
    }`}
  >
    {tag}
  </span>
);

const RISK_STYLES = {
  High: "bg-rose-50 text-rose-500",
  Medium: "bg-amber-50 text-amber-500",
  Low: "bg-emerald-50 text-emerald-600",
};

// Placeholder for a metric the platform has no data for yet.
const NotTracked = ({ title = "Not tracked yet", children, className = "" }) => (
  <div
    className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center ${className}`}
  >
    <EyeOff size={18} className="shrink-0 text-slate-300" />
    <p className={`mt-2 font-bold text-slate-600 ${T.md}`}>{title}</p>
    <p className={`mt-1 leading-snug text-slate-400 ${T.sm}`}>{children}</p>
  </div>
);

const Empty = ({ children }) => (
  <p className={`py-6 text-center text-slate-400 ${T.md}`}>{children}</p>
);

const SalonName = ({ row }) => (
  <span className={row.salon_deleted ? "italic text-slate-400" : undefined}>{row.salon_name}</span>
);

// Compact table used by the four summary cards in the bottom row.
const MiniTable = ({ columns, rows, empty = "No data for this period" }) =>
  rows.length ? (
    <table className="w-full table-auto border-collapse text-left">
      <thead>
        <tr className="border-b border-slate-200">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`pb-2.5 pr-1 font-bold uppercase leading-tight text-slate-400 ${T.xs} ${
                col.align === "right" ? "pr-0 text-right" : ""
              }`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.store_id ?? i}>
            {columns.map((col) => (
              <td
                key={col.key}
                className={`whitespace-nowrap py-2.5 pr-1 ${T.md} ${
                  col.align === "right" ? "pr-0 text-right" : ""
                } ${col.className || "text-slate-700"} ${col.truncate ? "max-w-[120px] truncate" : ""}`}
              >
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <Empty>{empty}</Empty>
  );

const Select = ({ value, onChange, children, className = "" }) => (
  <div className="relative mt-2">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-2.5 pr-6 text-slate-800 focus:outline-none ${T.md} ${className}`}
    >
      {children}
    </select>
    <ChevronDown
      size={13}
      className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </div>
);

const useOutsideClose = (open, onClose) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);
  return ref;
};

// ---------------------------------------------------------------------------
// Full-list dialog ("View all" links). Rendered outside ScaledCanvas, since a
// transformed ancestor would trap position: fixed. Columns are
// { header, kind, width, get, render? } - the same list feeds the Excel file.
// ---------------------------------------------------------------------------

const displayCell = (column, row) => {
  if (column.render) return column.render(row);
  const value = column.get(row);
  switch (column.kind) {
    case "int":
      return fmtInt(value);
    case "money":
      return fmtMoney(value);
    case "percent":
      return fmtPct(value);
    case "date":
      return fmtDate(value);
    default:
      return value ?? DASH;
  }
};

const ListDialog = ({ title, subtitle, columns, rows, loading, note, onExport, onClose }) => {
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runExport = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
          </div>
          {onExport && (
            <button
              type="button"
              onClick={runExport}
              disabled={exporting || loading || !rows.length}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export Excel
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 pb-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : rows.length ? (
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200">
                  {columns.map((c) => (
                    <th
                      key={c.header}
                      className={`whitespace-nowrap py-3 pr-3 text-[11px] font-bold uppercase text-slate-400 ${
                        c.kind && c.kind !== "text" && c.kind !== "date" ? "text-right" : ""
                      }`}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.store_id ?? row.user_id ?? i} className="border-b border-slate-50">
                    {columns.map((c) => (
                      <td
                        key={c.header}
                        className={`whitespace-nowrap py-2.5 pr-3 text-slate-700 ${
                          c.kind && c.kind !== "text" && c.kind !== "date" ? "text-right tabular-nums" : ""
                        }`}
                      >
                        {displayCell(c, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Nothing in this period</Empty>
          )}
          {note && <p className="mt-3 text-[12px] leading-snug text-slate-400">{note}</p>}
        </div>
      </div>
    </div>
  );
};

// Column lists for the dialogs and their Excel files.
const PROFIT_COLUMNS = [
  { header: "Salon", kind: "text", width: 30, get: (r) => r.salon_name, render: (r) => <SalonName row={r} /> },
  { header: "City", kind: "text", width: 16, get: (r) => r.city },
  { header: "Bookings", kind: "int", width: 11, get: (r) => r.bookings },
  { header: "GMV", kind: "money", width: 14, get: (r) => r.gmv },
  { header: "Platform Fees", kind: "money", width: 14, get: (r) => r.platform_fee_revenue },
  { header: "Subscription", kind: "money", width: 14, get: (r) => r.subscription_revenue },
  { header: "GloUp Revenue", kind: "money", width: 14, get: (r) => r.revenue },
  { header: "CAC", kind: "money", width: 12, get: (r) => r.cac_spend },
  { header: "Contribution", kind: "money", width: 14, get: (r) => r.contribution },
  { header: "Margin %", kind: "percent", width: 10, get: (r) => r.margin_pct },
  { header: "Profitability", kind: "text", width: 13, get: (r) => r.tier, render: (r) => <Pill tag={r.tier} /> },
];
const GRAVITY_COLUMNS = [
  { header: "Salon", kind: "text", width: 30, get: (r) => r.salon_name, render: (r) => <SalonName row={r} /> },
  { header: "Area", kind: "text", width: 18, get: (r) => r.area },
  { header: "City", kind: "text", width: 16, get: (r) => r.city },
  { header: "Bookings", kind: "int", width: 11, get: (r) => r.bookings },
  { header: "Customers", kind: "int", width: 11, get: (r) => r.customers },
  { header: "Repeat Customers", kind: "int", width: 16, get: (r) => r.repeat_customers },
  { header: "Repeat %", kind: "percent", width: 10, get: (r) => r.repeat_pct },
  { header: "Prev. Period Customers", kind: "int", width: 20, get: (r) => r.previous_customers },
  { header: "Came Back", kind: "int", width: 11, get: (r) => r.retained_customers },
  { header: "Retention %", kind: "percent", width: 11, get: (r) => r.retention_pct },
];
const RISK_COLUMNS = [
  { header: "Salon", kind: "text", width: 30, get: (r) => r.salon_name, render: (r) => <SalonName row={r} /> },
  { header: "Customers", kind: "int", width: 11, get: (r) => r.customers },
  { header: "Stayed", kind: "int", width: 9, get: (r) => r.stayed },
  { header: "Switched", kind: "int", width: 10, get: (r) => r.switched },
  { header: "No Booking Again", kind: "int", width: 16, get: (r) => r.no_return },
  { header: "Switching %", kind: "percent", width: 12, get: (r) => r.switching_pct },
  { header: "Prev. Switching %", kind: "percent", width: 16, get: (r) => r.previous_switching_pct },
  { header: "Trend (pts)", kind: "decimal", width: 11, get: (r) => r.trend_pts, render: (r) => <Trend pts={r.trend_pts} /> },
  { header: "Risk", kind: "text", width: 9, get: (r) => r.risk, render: (r) => <Pill tag={r.risk} styles={RISK_STYLES} /> },
];
// Phone / Name / Gender first: the Marketing page's broadcast upload reads
// exactly these headers from the first sheet.
const CONTACT_COLUMNS = [
  { header: "Phone", kind: "text", width: 14, get: (r) => r.phone },
  { header: "Name", kind: "text", width: 24, get: (r) => r.name },
  { header: "Gender", kind: "text", width: 9, get: (r) => r.gender },
  { header: "User ID", kind: "int", width: 9, get: (r) => r.user_id },
  { header: "Served Bookings", kind: "int", width: 15, get: (r) => r.served_bookings },
  { header: "Last Active", kind: "date", width: 13, get: (r) => r.last_active_at },
  { header: "Uninstall Detected", kind: "date", width: 17, get: (r) => r.detected_at },
  { header: "Segment", kind: "text", width: 22, get: (r) => r.segment_label },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AnalyticsIntelligenceV2 = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { profitability, switching, gravity, uninstalled } = useSelector((state) => state.analytics);

  const [period, setPeriod] = useState("last_90");
  const [custom, setCustom] = useState(null); // { from, to } when period === "custom"
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [compare, setCompare] = useState(false);
  const [refreshMs, setRefreshMs] = useState(60000);
  const [selectedSalon, setSelectedSalon] = useState("all");
  const [channel, setChannel] = useState("WhatsApp");
  const [audience, setAudience] = useState("all");
  const [dialog, setDialog] = useState(null); // "profit" | "gravity" | "risk" | "uninstalled"
  const [uninstalledList, setUninstalledList] = useState({ loading: false, rows: [] });
  const [contactsBusy, setContactsBusy] = useState(false);

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[4]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);
  const periodLabel = period === "custom" ? "Custom" : PERIODS.find((p) => p.key === period)?.label;

  const load = useCallback(() => {
    const body = { from: range.from, to: range.to };
    dispatch(fetchAnalyticsProfitabilityV2(body));
    dispatch(fetchAnalyticsSwitchingV2(body));
    dispatch(fetchAnalyticsGravityV2(body));
    dispatch(fetchAnalyticsUninstalledV2(body));
  }, [dispatch, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto refresh, paused while the tab is hidden.
  useEffect(() => {
    if (!refreshMs) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, load]);

  const closeRange = useCallback(() => setRangeOpen(false), []);
  const rangeRef = useOutsideClose(rangeOpen, closeRange);
  const openRange = () => {
    setDraft({ from: range.from, to: range.to });
    setRangeOpen((open) => !open);
  };
  const applyRange = () => {
    if (!draft.from || !draft.to || draft.from > draft.to) {
      toast.error("Pick a start date on or before the end date", { id: "analytics-v2-range" });
      return;
    }
    if (moment(draft.to).diff(moment(draft.from), "days") > 365) {
      toast.error("The range can be at most 366 days", { id: "analytics-v2-range" });
      return;
    }
    setCustom({ from: draft.from, to: draft.to });
    setPeriod("custom");
    setRangeOpen(false);
  };

  const errors = [profitability, switching, gravity, uninstalled].map((s) => s.error).filter(Boolean);
  const value = (section, render) => {
    if (section.data) return render(section.data);
    return section.loading ? "…" : DASH;
  };

  // --- 1. profitability ----------------------------------------------------
  const prof = profitability.data;
  const profRows = useMemo(() => prof?.rows || [], [prof]);
  const profByBookings = useMemo(
    () => [...profRows].sort((a, b) => b.bookings - a.bookings || b.gmv - a.gmv).slice(0, TOP_ROWS),
    [profRows]
  );
  const ps = prof?.stats;
  const pps = prof?.previous_stats;
  const profitStats = [
    { label: "Total Sales", value: value(profitability, () => fmtInt(ps.total_sales)), compare: ps && { cur: ps.total_sales, prev: pps.total_sales } },
    {
      label: "Profitable Sales",
      value: value(profitability, () => fmtInt(ps.profitable_sales)),
      pct: ps && ps.total_sales ? fmtPct(share(ps.profitable_sales, ps.total_sales)) : null,
      tone: "green",
      compare: ps && { cur: ps.profitable_sales, prev: pps.profitable_sales },
    },
    {
      label: "Low Contribution",
      value: value(profitability, () => fmtInt(ps.low_sales)),
      pct: ps && ps.total_sales ? fmtPct(share(ps.low_sales, ps.total_sales)) : null,
      tone: "amber",
      compare: ps && { cur: ps.low_sales, prev: pps.low_sales, upIsGood: false },
    },
    {
      label: "Negative Contribution",
      value: value(profitability, () => fmtInt(ps.negative_sales)),
      pct: ps && ps.total_sales ? fmtPct(share(ps.negative_sales, ps.total_sales)) : null,
      tone: "red",
      compare: ps && { cur: ps.negative_sales, prev: pps.negative_sales, upIsGood: false },
    },
  ];

  // --- 2. gravity ----------------------------------------------------------
  const grav = gravity.data;
  const gravSalons = useMemo(() => grav?.salons || [], [grav]);
  useEffect(() => {
    if (selectedSalon !== "all" && grav && !gravSalons.some((s) => String(s.store_id) === selectedSalon)) {
      setSelectedSalon("all");
    }
  }, [grav, gravSalons, selectedSalon]);
  const gravSel =
    selectedSalon === "all" ? grav?.overall : gravSalons.find((s) => String(s.store_id) === selectedSalon);
  const gravityTop = gravSalons.filter((s) => s.customers > 0).slice(0, TOP_ROWS);

  // --- 3. switching --------------------------------------------------------
  const sw = switching.data;
  const ss = sw?.stats;
  const pss = sw?.previous_stats;
  const switchStats = [
    {
      label: `Total Customers (${periodLabel})`,
      value: value(switching, () => fmtInt(ss.customers)),
      compare: ss && { cur: ss.customers, prev: pss.customers },
    },
    {
      label: "Stayed with same salon",
      value: value(switching, () => fmtInt(ss.stayed)),
      pct: ss && ss.customers ? fmtPct(share(ss.stayed, ss.customers)) : null,
      tone: "green",
      compare: ss && { cur: ss.stayed, prev: pss.stayed },
    },
    {
      label: "Switched Salon",
      value: value(switching, () => fmtInt(ss.switched)),
      pct: ss && ss.customers ? fmtPct(share(ss.switched, ss.customers)) : null,
      tone: "amber",
      compare: ss && { cur: ss.switched, prev: pss.switched, upIsGood: false },
    },
    {
      label: "No Booking Again",
      value: value(switching, () => fmtInt(ss.no_return)),
      pct: ss && ss.customers ? fmtPct(share(ss.no_return, ss.customers)) : null,
      tone: "amber",
      compare: ss && { cur: ss.no_return, prev: pss.no_return, upIsGood: false },
    },
  ];

  // --- 5. uninstalled ------------------------------------------------------
  const un = uninstalled.data;
  const us = un?.stats;
  const pus = un?.previous_stats;
  const unStats = [
    {
      label: `Uninstalled Users (${periodLabel})`,
      value: value(uninstalled, () => fmtInt(us.uninstalled)),
      compare: us && { cur: us.uninstalled, prev: pus.uninstalled, upIsGood: false },
    },
    {
      label: "Can be Re-engaged",
      value: value(uninstalled, () => fmtInt(us.reachable)),
      pct: us && us.uninstalled ? fmtPct(share(us.reachable, us.uninstalled)) : null,
      tone: "green",
      compare: us && { cur: us.reachable, prev: pus.reachable },
    },
    {
      label: "High Value Users",
      value: value(uninstalled, () => fmtInt(us.high_value)),
      pct: us && us.uninstalled ? fmtPct(share(us.high_value, us.uninstalled)) : null,
      tone: "green",
      compare: us && { cur: us.high_value, prev: pus.high_value },
    },
  ];
  const reach = us ? (audience === "high_value" ? us.high_value_reachable : us.reachable) : null;
  const channelInfo = CHANNELS.find((c) => c.key === channel);
  const segmentLabels = useMemo(
    () => Object.fromEntries((un?.segments || []).map((s) => [s.key, s.label])),
    [un]
  );

  const fetchUninstalledUsers = async () => {
    const data = await dispatch(exportAnalyticsUninstalledV2({ from: range.from, to: range.to })).unwrap();
    return (data.users || []).map((u) => ({ ...u, segment_label: segmentLabels[u.segment] || u.segment }));
  };

  const downloadContacts = async () => {
    const toastId = "analytics-v2-contacts";
    setContactsBusy(true);
    toast.loading("Preparing contact list…", { id: toastId });
    try {
      let users = (await fetchUninstalledUsers()).filter((u) => u.reachable);
      if (audience === "high_value") users = users.filter((u) => u.high_value);
      if (!users.length) {
        toast.error("No reachable users in this period", { id: toastId });
        return;
      }
      await downloadXlsx(`uninstalled_users_${range.from}_${range.to}.xlsx`, [
        { name: "Contacts", rows: users, columns: CONTACT_COLUMNS },
      ]);
      toast.success(`Downloaded ${fmtInt(users.length)} contacts - upload the sheet on Marketing to send`, {
        id: toastId,
      });
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to build the contact list", { id: toastId });
    } finally {
      setContactsBusy(false);
    }
  };

  const openUninstalledList = async () => {
    setDialog("uninstalled");
    setUninstalledList({ loading: true, rows: [] });
    try {
      setUninstalledList({ loading: false, rows: await fetchUninstalledUsers() });
    } catch (err) {
      setUninstalledList({ loading: false, rows: [] });
      toast.error(typeof err === "string" ? err : "Failed to load users", { id: "analytics-v2-uninstalled" });
    }
  };

  const exportRows = (name, columns, rows) => () =>
    downloadXlsx(`${name}_${range.from}_${range.to}.xlsx`, [{ name: "Report", rows, columns }]).catch(() =>
      toast.error("Failed to export", { id: `analytics-v2-${name}` })
    );

  const dialogProps = {
    profit: {
      title: "Salon Profitability",
      subtitle: `${fmtRange(range.from, range.to)} · ${fmtInt(profRows.length)} salons`,
      columns: PROFIT_COLUMNS,
      rows: profRows,
      note: prof
        ? `GloUp revenue = ₹${prof.platform_fee} platform fee × served bookings + subscription fees deducted from payouts. Contribution = revenue − CAC (GloUp-funded discounts). Margin = contribution ÷ GMV. High ≥ 20%, Medium ≥ 10%, Low ≥ 0%, else Negative.`
        : null,
      onExport: exportRows("salon_profitability", PROFIT_COLUMNS, profRows),
    },
    gravity: {
      title: "Customer Gravity by Salon",
      subtitle: `${fmtRange(range.from, range.to)} · ${fmtInt(gravSalons.length)} salons`,
      columns: GRAVITY_COLUMNS,
      rows: gravSalons,
      note: "Repeat = customers with 2+ served bookings at the salon up to the period end. Retention = customers from the previous period of the same length who booked the salon again in this one.",
      onExport: exportRows("customer_gravity", GRAVITY_COLUMNS, gravSalons),
    },
    risk: {
      title: "Salon Switching",
      subtitle: `${fmtRange(range.from, range.to)} · salons with ${sw?.risk_min_customers ?? 2}+ customers`,
      columns: RISK_COLUMNS,
      rows: sw?.risk || [],
      note: "Each customer is counted at the salon of their first booking in the period, by where their next booking went (any time after). Risk: High ≥ 30% switched, Medium ≥ 20%. Trend is in percentage points vs the previous period.",
      onExport: exportRows("switching_risk", RISK_COLUMNS, sw?.risk || []),
    },
    uninstalled: {
      title: "Uninstalled Users",
      subtitle: `Detected ${fmtRange(range.from, range.to)} · ${fmtInt(uninstalledList.rows.length)} users`,
      columns: CONTACT_COLUMNS,
      rows: uninstalledList.rows,
      loading: uninstalledList.loading,
      note: "Detected when a push to the user's phone came back as unregistered and no new token has been saved since. Users we haven't sent a push to recently can't be detected.",
      onExport: exportRows("uninstalled_users", CONTACT_COLUMNS, uninstalledList.rows),
    },
  }[dialog];

  return (
    <>
      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ------------------------------------------------------------------ */}
        {/* Page header + filter bar                                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`font-extrabold tracking-tight text-slate-900 ${T.h1}`}>
              Analytics Intelligence
            </h1>
            <p className={`mt-0.5 text-slate-500 ${T.md}`}>
              Deep insights to grow GloUp smarter
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={rangeRef}>
              <button
                type="button"
                onClick={openRange}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 ${T.md}`}
              >
                {fmtRange(range.from, range.to)}
                <CalendarDays size={13} className="shrink-0 text-slate-400" />
              </button>
              {rangeOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <p className={`font-bold text-slate-800 ${T.md}`}>Custom range</p>
                  {[
                    ["from", "From"],
                    ["to", "To"],
                  ].map(([key, label]) => (
                    <label key={key} className={`mt-2 block text-slate-500 ${T.base}`}>
                      {label}
                      <input
                        type="date"
                        value={draft[key]}
                        max={moment().format("YYYY-MM-DD")}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        className={`mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-slate-800 focus:outline-none ${T.md}`}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={applyRange}
                    className={`mt-3 w-full rounded-lg py-2 font-bold text-white ${T.md}`}
                    style={{ backgroundColor: BRAND }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className={`appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-7 font-medium text-slate-700 focus:outline-none ${T.md}`}
              >
                {PERIODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
                {period === "custom" && <option value="custom">Custom</option>}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setCompare((prev) => !prev)}
              title="Show the change vs the previous period of the same length"
              className={`whitespace-nowrap rounded-xl border px-3.5 py-2 font-medium transition-colors ${T.md} ${
                compare
                  ? "border-transparent bg-[#5B21F0] text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Compare
            </button>

            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${refreshMs ? "bg-emerald-500" : "bg-slate-300"}`} />
              <div className="leading-tight">
                <p className={`whitespace-nowrap font-semibold text-slate-700 ${T.base}`}>
                  Auto refresh
                </p>
                <div className="relative">
                  <select
                    value={refreshMs}
                    onChange={(e) => setRefreshMs(Number(e.target.value))}
                    className={`appearance-none bg-transparent pr-3 text-slate-500 focus:outline-none ${T.sm}`}
                  >
                    {REFRESH_OPTIONS.map((o) => (
                      <option key={o.label} value={o.ms}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={10}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className={`flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 ${T.md}`}>
            <AlertTriangle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Failed to load: {errors[0]}</span>
            <button type="button" onClick={load} className="shrink-0 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Row 1 — Profitability / Gravity / Switching                         */}
        {/* ------------------------------------------------------------------ */}
        <div className={`grid ${ROW1_COLS} ${GAP}`}>
          {/* 1. Salon Profitability Intelligence */}
          <Card>
            <CardTitle index={1}>Salon Profitability Intelligence</CardTitle>

            <div
              className={`grid grid-cols-4 gap-2 rounded-xl border border-slate-100 bg-slate-50/70 ${PAD}`}
            >
              {profitStats.map((s) => (
                <StatTile key={s.label} {...s} compare={compare ? s.compare : null} />
              ))}
            </div>

            {profByBookings.length ? (
              <table className="mt-4 w-full table-auto border-collapse text-left">
                <thead>
                  <tr>
                    {["Salon", "Bookings", "GMV", "GloUp Revenue", "Contribution", "Margin %"].map(
                      (h) => (
                        <th
                          key={h}
                          className={`pb-3 pr-1 font-bold uppercase leading-tight text-slate-400 ${T.xs}`}
                        >
                          {h}
                        </th>
                      )
                    )}
                    <th
                      className={`pb-3 text-center font-bold uppercase leading-snug tracking-wide text-slate-400 ${T.xs}`}
                    >
                      Profitability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profByBookings.map((row) => {
                    const negative = row.contribution < 0;
                    return (
                      <tr key={row.store_id}>
                        <td className={`max-w-[150px] truncate whitespace-nowrap py-2.5 pr-1 text-slate-800 ${T.md}`}>
                          <span className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-slate-900 align-middle" />
                          <SalonName row={row} />
                        </td>
                        <td className={`py-2.5 pr-1.5 text-slate-700 ${T.md}`}>{fmtInt(row.bookings)}</td>
                        <td className={`py-2.5 pr-1.5 text-slate-700 ${T.md}`}>{fmtMoney(row.gmv)}</td>
                        <td className={`py-2.5 pr-1.5 text-slate-700 ${T.md}`}>{fmtMoney(row.revenue)}</td>
                        <td
                          className={`py-2.5 pr-1.5 font-semibold ${T.md} ${
                            negative ? "text-rose-500" : "text-emerald-600"
                          }`}
                        >
                          {fmtMoney(row.contribution)}
                        </td>
                        <td className={`py-2.5 pr-1.5 ${T.md} ${negative ? "text-rose-500" : "text-slate-400"}`}>
                          {fmtPct(row.margin_pct)}
                        </td>
                        <td className="py-2.5 text-center">
                          <Pill tag={row.tier} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <Empty>{profitability.loading ? "Loading…" : "No salon bookings in this period"}</Empty>
            )}
            {prof && (
              <p className={`mt-2 leading-snug text-slate-400 ${T.sm}`}>
                Revenue = ₹{prof.platform_fee} platform fee × served bookings + subscription fees. Contribution =
                revenue − CAC. Margin = contribution ÷ GMV.
              </p>
            )}

            <ViewLink onClick={() => setDialog("profit")} disabled={!profRows.length}>
              View Full Profitability Report
            </ViewLink>
          </Card>

          {/* 2. Customer -> Salon Gravity */}
          <Card>
            <CardTitle index={2}>Customer → Salon Gravity</CardTitle>

            <div className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] gap-4">
              <div className="min-w-0 border-r border-slate-100 pr-4">
                <p className={`text-slate-500 ${T.md}`}>Selected Salon</p>
                <Select value={selectedSalon} onChange={setSelectedSalon}>
                  <option value="all">All salons</option>
                  {gravSalons.map((s) => (
                    <option key={s.store_id} value={String(s.store_id)}>
                      {s.salon_name}
                    </option>
                  ))}
                </Select>

                <div className="mt-5">
                  <p className={`text-slate-500 ${T.md}`}>Total Customers</p>
                  <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                    {value(gravity, () => fmtInt(gravSel?.customers ?? 0))}
                  </p>
                </div>

                <div className="mt-5">
                  <p className={`text-slate-500 ${T.md}`}>Repeat Customers</p>
                  <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                    {value(gravity, () => fmtInt(gravSel?.repeat_customers ?? 0))}
                    {gravSel?.repeat_pct != null && (
                      <span className={`ml-1.5 font-medium text-slate-500 ${T.md}`}>
                        ({fmtPct(gravSel.repeat_pct)})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <SubTitle>Where your customers come from</SubTitle>
                <NotTracked>
                  Customer locations aren&apos;t stored - the app only keeps an optional city, which almost no one
                  fills in. Needs location capture in the app.
                </NotTracked>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70">
              <div className={PAD}>
                <p className={`leading-snug text-slate-500 ${T.base}`}>
                  Average Travel Distance
                </p>
                <p className={`mt-1.5 font-extrabold tracking-tight text-slate-300 ${T.stat}`}>{DASH}</p>
                <p className={`mt-1 text-slate-400 ${T.xs}`}>Needs customer location</p>
              </div>
              <div className={PAD}>
                <p className={`leading-snug text-slate-500 ${T.base}`}>Customer Retention</p>
                <p className={`mt-1.5 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                  {value(gravity, () => fmtPct(gravSel?.retention_pct))}
                </p>
                {gravSel && (
                  <p className={`mt-1 text-slate-400 ${T.xs}`}>
                    {compare
                      ? `${fmtInt(gravSel.retained_customers)} of ${fmtInt(gravSel.previous_customers)} from the previous period came back`
                      : "of previous period's customers came back"}
                  </p>
                )}
              </div>
            </div>

            <ViewLink onClick={() => setDialog("gravity")} disabled={!gravSalons.length}>
              View Full Gravity Report
            </ViewLink>
          </Card>

          {/* 3. Salon Switching Intelligence */}
          <Card>
            <CardTitle index={3}>Salon Switching Intelligence</CardTitle>

            <div className="grid grid-cols-4 gap-2">
              {switchStats.map((s) => (
                <div
                  key={s.label}
                  className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-3"
                >
                  <StatTile {...s} labelClass={T.xs} compare={compare ? s.compare : null} />
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="min-w-0 border-r border-slate-100 pr-4">
                <SubTitle>Why customers switch salons?</SubTitle>
                <NotTracked>
                  The app doesn&apos;t ask customers why they moved. Needs a short feedback prompt after a booking at
                  a new salon.
                </NotTracked>
              </div>

              <div className="min-w-0">
                <SubTitle>Top salons customers switched to</SubTitle>
                {sw?.switched_to?.length ? (
                  <ul className="space-y-2">
                    {sw.switched_to.slice(0, TOP_ROWS).map((s, i) => (
                      <li key={s.store_id} className={`flex items-center gap-2 ${T.md}`}>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-500 ${T.base}`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 truncate font-medium text-slate-800">
                          <SalonName row={s} />
                        </span>
                        <span className="ml-auto whitespace-nowrap text-slate-500">
                          {fmtInt(s.customers)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>{switching.loading && !sw ? "Loading…" : "No one switched in this period"}</Empty>
                )}
              </div>
            </div>

            <ViewLink onClick={() => setDialog("risk")} disabled={!sw?.risk?.length}>
              View Switching Analysis
            </ViewLink>
          </Card>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Row 2 — Time-to-book / Re-engagement / Message preview              */}
        {/* ------------------------------------------------------------------ */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          {/* 4. Time-to-Book Intelligence */}
          <Card>
            <CardTitle index={4}>Time-to-Book Intelligence</CardTitle>

            <div className="grid grid-cols-4 gap-2">
              {["App Open", "Search", "Salon View", "Offer View"].map((step) => (
                <div
                  key={step}
                  className="flex min-w-0 flex-col rounded-xl border border-slate-100 bg-slate-50/70 px-1.5 py-3"
                >
                  <p className={`leading-snug text-slate-500 ${T.base}`}>Avg Time: {step} → Booking</p>
                  <p className="mt-2 whitespace-nowrap text-[22px] font-extrabold tracking-tight text-slate-300">
                    {DASH}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 min-w-0">
              <SubTitle>Time distribution (Search → Booking)</SubTitle>
              <NotTracked className="h-[210px]">
                The app doesn&apos;t record when customers open it, search, or view a salon or offer - only the
                booking itself. Needs app event tracking (timestamps for those steps) before this can be measured.
              </NotTracked>
            </div>

            <ViewLink disabled>View Full Time Analysis</ViewLink>
          </Card>

          {/* 5. Uninstalled Users — Re-engagement */}
          <Card>
            <CardTitle index={5}>Uninstalled Users — Re-engagement</CardTitle>

            <div
              className={`grid grid-cols-3 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 ${PAD}`}
            >
              {unStats.map((s) => (
                <StatTile key={s.label} {...s} compare={compare ? s.compare : null} />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <SubTitle>Segment Uninstalled Users</SubTitle>
                <ul className="space-y-3.5 rounded-xl border border-slate-200 p-3.5">
                  {(un?.segments || []).map((s) => (
                    <li key={s.key} className={`flex items-center gap-2 ${T.md}`}>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      </span>
                      <span className="min-w-0 leading-snug text-slate-500">{s.label}</span>
                      <span className="ml-auto whitespace-nowrap font-bold text-slate-900">
                        {fmtInt(s.users)}
                        {us?.uninstalled ? ` (${fmtPct(share(s.users, us.uninstalled))})` : ""}
                      </span>
                    </li>
                  ))}
                  {!un && <li className={`text-slate-400 ${T.md}`}>{uninstalled.loading ? "Loading…" : DASH}</li>}
                </ul>
                <p className={`mt-2 leading-snug text-slate-400 ${T.sm}`}>
                  Last active = latest sign-up, OTP login or booking.
                </p>
              </div>

              <div className="min-w-0">
                <SubTitle>Re-engagement Action</SubTitle>
                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="min-w-0">
                      <p className={`leading-snug text-slate-500 ${T.base}`}>Select Channel</p>
                      <Select value={channel} onChange={setChannel}>
                        {CHANNELS.map((c) => (
                          <option key={c.key} value={c.key} disabled={!c.enabled}>
                            {c.enabled ? c.key : `${c.key} (not possible)`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="min-w-0">
                      <p className={`leading-snug text-slate-500 ${T.base}`}>Audience</p>
                      <Select value={audience} onChange={setAudience}>
                        {AUDIENCES.map((a) => (
                          <option key={a.key} value={a.key}>
                            {a.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <p className={`mt-3.5 text-slate-500 ${T.base}`}>Estimated Reach</p>
                  <p
                    className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.statSm}`}
                  >
                    {reach == null ? (uninstalled.loading ? "…" : DASH) : `${fmtInt(reach)} users`}
                  </p>

                  <button
                    type="button"
                    onClick={downloadContacts}
                    disabled={contactsBusy || !reach || !channelInfo?.enabled}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-white disabled:opacity-50 ${T.lg}`}
                    style={{ backgroundColor: BRAND }}
                  >
                    {contactsBusy ? (
                      <Loader2 size={14} className="shrink-0 animate-spin" />
                    ) : (
                      <Download size={14} className="shrink-0" />
                    )}
                    <span className="truncate">Download {channel} list</span>
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/marketing")}
                    className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 font-bold ${T.base}`}
                    style={{ color: BRAND }}
                    title="Upload the downloaded sheet on the Marketing page to send"
                  >
                    <Send size={12} className="shrink-0" />
                    Send via Marketing
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Scheduling isn't available yet"
                    className={`cursor-not-allowed whitespace-nowrap rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 font-bold opacity-50 ${T.base}`}
                    style={{ color: BRAND }}
                  >
                    Schedule Campaign
                  </button>
                </div>
              </div>
            </div>

            <ViewLink onClick={openUninstalledList} disabled={!us?.uninstalled}>
              View Uninstalled Users
            </ViewLink>
          </Card>

          {/* Quick Message Preview */}
          <Card>
            <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
              Quick Message Preview
            </h2>

            <div className={`rounded-2xl bg-emerald-50 ${PAD}`}>
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                  <span className="h-3 w-3 rounded-full border-[3px] border-emerald-600" />
                </span>

                <div
                  className={`min-w-0 flex-1 space-y-3.5 leading-relaxed text-slate-800 ${T.md}`}
                >
                  <p>Hey {"{{name}}"}! 👋</p>
                  <p>We miss you on GloUp! 💜</p>
                  <p>
                    Book your favorite services again and{" "}
                    <span className="font-bold">get FLAT 30% OFF* this week!</span>
                  </p>
                  <p>
                    Zero waiting. Best salons. Best offers.
                    <br />
                    👇
                  </p>
                  <p>Book now before slots fill up!</p>
                  <p>Check &amp; Book Now:</p>
                  <div className="flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-slate-400">
                      {"{{deeplink}}"}
                    </span>
                    <span className={`shrink-0 whitespace-nowrap text-slate-400 ${T.base}`}>
                      11:30 AM ✓✓
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className={`mt-3.5 leading-snug text-slate-500 ${T.md}`}>
              Example copy. What actually goes out is the approved {channel === "SMS" ? "DLT SMS" : "WhatsApp"}{" "}
              template chosen on the Marketing page.
            </p>
          </Card>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Row 3 — Summary tables                                              */}
        {/* ------------------------------------------------------------------ */}
        <div className={`grid grid-cols-4 ${GAP}`}>
          <Card>
            <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
              Top Profitable Salons
            </h2>
            <MiniTable
              columns={[
                { key: "salon", label: "Salon", truncate: true, render: (r) => <SalonName row={r} /> },
                { key: "gmv", label: "GMV", render: (r) => fmtMoney(r.gmv) },
                { key: "revenue", label: "GloUp Revenue", render: (r) => fmtMoney(r.revenue) },
                { key: "contribution", label: "Contribution", render: (r) => fmtMoney(r.contribution) },
                {
                  key: "margin",
                  label: "Margin %",
                  align: "right",
                  className: "font-semibold",
                  render: (r) => (
                    <span className={r.contribution < 0 ? "text-rose-500" : "text-emerald-600"}>
                      {fmtPct(r.margin_pct)}
                    </span>
                  ),
                },
              ]}
              rows={profRows.slice(0, TOP_ROWS)}
            />
            <ViewLink onClick={() => setDialog("profit")} disabled={!profRows.length}>
              View All
            </ViewLink>
          </Card>

          <Card>
            <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
              Top Customer Gravity (By Salon)
            </h2>
            <MiniTable
              columns={[
                { key: "salon", label: "Salon", truncate: true, render: (r) => <SalonName row={r} /> },
                { key: "customers", label: "Customers", render: (r) => fmtInt(r.customers) },
                { key: "repeat", label: "Repeat", render: (r) => fmtPct(r.repeat_pct) },
                { key: "retention", label: "Retention", align: "right", render: (r) => fmtPct(r.retention_pct) },
              ]}
              rows={gravityTop}
            />
            <ViewLink onClick={() => setDialog("gravity")} disabled={!gravSalons.length}>
              View All
            </ViewLink>
          </Card>

          <Card>
            <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
              Switching Risk Salons
            </h2>
            <MiniTable
              columns={[
                { key: "salon", label: "Salon", truncate: true, render: (r) => <SalonName row={r} /> },
                { key: "switching", label: "Switching %", render: (r) => fmtPct(r.switching_pct) },
                { key: "trend", label: "Trend", render: (r) => <Trend pts={r.trend_pts} /> },
                {
                  key: "risk",
                  label: "Risk Level",
                  align: "right",
                  render: (r) => <Pill tag={r.risk} styles={RISK_STYLES} />,
                },
              ]}
              rows={(sw?.risk || []).slice(0, TOP_ROWS)}
              empty={`No salon had ${sw?.risk_min_customers ?? 2}+ customers in this period`}
            />
            <ViewLink onClick={() => setDialog("risk")} disabled={!sw?.risk?.length}>
              View All
            </ViewLink>
          </Card>

          <Card>
            <h2 className={`mb-3 font-extrabold text-slate-900 ${T.xl}`}>
              Time-to-Book by Category
            </h2>
            <NotTracked className="flex-1">
              Needs app event tracking - see Time-to-Book Intelligence above.
            </NotTracked>
            <ViewLink disabled>View All</ViewLink>
          </Card>
        </div>
      </ScaledCanvas>

      {dialogProps && <ListDialog {...dialogProps} onClose={() => setDialog(null)} />}
    </>
  );
};

export default AnalyticsIntelligenceV2;
