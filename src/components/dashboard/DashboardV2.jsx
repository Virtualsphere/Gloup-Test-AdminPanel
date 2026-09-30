import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Gift,
  Info,
  IndianRupee,
  ShoppingCart,
  Slash,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  getDashboardV2Alerts,
  getDashboardV2Metrics,
} from "../../redux/slices/dashboardSlice";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved executive dashboard mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// Data: one /getDashboardV2Metrics call returns the same metrics for every
// date range the page needs (the selected period, the two before it, and
// the last 12 calendar months for the charts), plus /getDashboardV2Alerts.
// Definitions of each metric live next to the backend query.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const PINK = "#EC4899";
const AMBER = "#F5A623";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[541fr_528fr_571fr]";
const ROW3_COLS = "grid-cols-[606fr_451fr_571fr]";
const ROW4_COLS = "grid-cols-[651fr_606fr_383fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these.
const T = {
  xs: "text-[10px]", // table headers
  sm: "text-[11px]", // deltas, legend, captions
  base: "text-[12px]", // stat labels, table cells
  md: "text-[13px]", // body, card headings
  lg: "text-[14px]", // links
  h1: "text-[22px]", // page title
  kpi: "text-[20px]", // KPI values
  stat: "text-[18px]", // in-card stat values
};

const PAD = "p-4";
const GAP = "gap-3";

// Filter options exactly as drawn in the mockup.
const PERIODS = ["This Month", "Last Month", "This Week", "Last 90 Days", "This Year"];
// Set from the date pill's picker; only listed in the dropdown while active.
const CUSTOM_PERIOD = "Custom Range";
const CARD_PERIODS = ["This Month", "Last Month", "Last 6 Months"];
const REFRESH_MS = { Off: 0, "15 sec": 15000, "30 sec": 30000, "1 min": 60000, "5 min": 300000 };

// Calendar months fetched for the charts: enough for "Last 6 Months" plus
// the 6 months it is compared against.
const HISTORY_MONTHS = 12;

// A salon with no paid bookings created in this many days is flagged.
const IDLE_SALON_DAYS = 7;
// How far back unpaid daily invoices count as overdue payouts.
const OVERDUE_PAYOUT_DAYS = 30;

// Scorecard bands, as % change vs the prior period.
const GROWTH_GOOD = 10;
const GROWTH_ATTENTION = -2;
const LOWER_BETTER_BAND = 5;

// ---------------------------------------------------------------------------
// Date helpers - all on "YYYY-MM-DD" / "YYYY-MM" strings in local time
// ---------------------------------------------------------------------------

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s, n) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const monthKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const parseMonthKey = (key) => key.split("-").map(Number);
const shiftMonth = (key, n) => {
  const [y, m] = parseMonthKey(key);
  return monthKeyOf(new Date(y, m - 1 + n, 1));
};
const monthName = (key, short = false) => {
  const [, m] = parseMonthKey(key);
  return (short ? MONTHS_SHORT : MONTHS_LONG)[m - 1];
};
// Oldest first, ending at `endKey`.
const monthRange = (endKey, count) =>
  Array.from({ length: count }, (_, i) => shiftMonth(endKey, i - count + 1));
// A calendar month as a range; the current month stops at today.
const monthSpan = (key, today) => {
  const [y, m] = parseMonthKey(key);
  const last = ymd(new Date(y, m, 0));
  return { from: `${key}-01`, to: last > today ? today : last };
};
const fmtDay = (s) => {
  const d = parseYmd(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
// Inclusive day count between two "YYYY-MM-DD" dates.
const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;

// The selected header period plus the two equal periods before it
// (index 0 = selected). Month-based periods compare against whole months;
// a custom range compares against the same number of days right before it.
const resolvePeriod = (period, today, custom) => {
  const t = parseYmd(today);
  const thisMonth = monthKeyOf(t);
  const year = t.getFullYear();

  if (period === CUSTOM_PERIOD && custom) {
    const len = daysBetween(custom.from, custom.to);
    const ranges = [0, 1, 2].map((i) => {
      const from = addDays(custom.from, -len * i);
      const to = addDays(from, len - 1);
      return { from, to, label: `${fmtDay(from)} – ${fmtDay(to)}` };
    });
    return {
      ranges,
      unit: "Period",
      compareLabel: `vs previous ${len} day${len === 1 ? "" : "s"}`,
    };
  }

  if (period === "This Week") {
    const monday = addDays(today, -((t.getDay() + 6) % 7));
    const ranges = [0, 1, 2].map((i) => {
      const from = addDays(monday, -7 * i);
      const to = i === 0 ? today : addDays(from, 6);
      return { from, to, label: `${fmtDay(from)} – ${fmtDay(to)}` };
    });
    return { ranges, unit: "Week", compareLabel: "vs previous week" };
  }

  if (period === "Last 90 Days") {
    const ranges = [0, 1, 2].map((i) => {
      const to = addDays(today, -90 * i);
      const from = addDays(to, -89);
      return { from, to, label: `${fmtDay(from)} – ${fmtDay(to)}` };
    });
    return { ranges, unit: "Period", compareLabel: "vs previous 90 days" };
  }

  if (period === "This Year") {
    const ranges = [0, 1, 2].map((i) => ({
      from: `${year - i}-01-01`,
      to: i === 0 ? today : `${year - i}-12-31`,
      label: String(year - i),
    }));
    return { ranges, unit: "Year", compareLabel: `vs ${year - 1}` };
  }

  const end = period === "Last Month" ? shiftMonth(thisMonth, -1) : thisMonth;
  const keys = [end, shiftMonth(end, -1), shiftMonth(end, -2)];
  return {
    ranges: keys.map((key) => ({ ...monthSpan(key, today), label: monthName(key) })),
    unit: "Month",
    compareLabel: `vs ${monthName(keys[1], true)} ${parseMonthKey(keys[1])[0]}`,
  };
};

// Months shown / summed by a card-level filter (bookings & acquisition cards).
const resolveCardWindow = (win, thisMonth) => {
  if (win === "Last 6 Months") {
    return {
      chart: monthRange(thisMonth, 6),
      current: monthRange(thisMonth, 6),
      previous: monthRange(shiftMonth(thisMonth, -6), 6),
      compareLabel: "vs previous 6 months",
    };
  }
  const end = win === "Last Month" ? shiftMonth(thisMonth, -1) : thisMonth;
  const prev = shiftMonth(end, -1);
  return {
    chart: monthRange(end, 3),
    current: [end],
    previous: [prev],
    compareLabel: `vs ${monthName(prev, true)}`,
  };
};

// ---------------------------------------------------------------------------
// Number helpers
// ---------------------------------------------------------------------------

const pctChange = (cur, prev) =>
  cur == null || prev == null || prev === 0 ? null : ((cur - prev) / prev) * 100;

// { value: "12.3%", up } for <Delta>, or null when there is nothing to compare.
const toDelta = (pct) =>
  pct == null ? null : { value: `${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };

const rateOf = (m) =>
  m?.bookings ? (m.cancellations / m.bookings) * 100 : null;

const DASH = "—";
const fmtInt = (v) => (v == null ? DASH : Number(v).toLocaleString("en-IN"));
const fmtInr = (v) =>
  v == null
    ? DASH
    : `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => (v == null ? DASH : `${v.toFixed(2)}%`);
const fmtCompact = (v) =>
  v == null ? DASH : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`;
const fmtSigned = (v, fmt) => (v < 0 ? `-${fmt(Math.abs(v))}` : `+${fmt(v)}`);

const inr = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// min-w-0 is what lets these shrink inside the grid instead of forcing overflow.
const Card = ({ children, className = "" }) => (
  <div
    className={`flex min-w-0 flex-col rounded-2xl border border-[#E3E7EF] bg-white ${PAD} ${className}`}
  >
    {children}
  </div>
);

const CardTitle = ({ children, right }) => (
  <div className="mb-3 flex items-start justify-between gap-3">
    <h2 className={`font-extrabold uppercase tracking-wide text-slate-900 ${T.md}`}>
      {children}
    </h2>
    {right}
  </div>
);

// `good` colours the delta independently of its direction, for metrics where
// going down is the good outcome (cancellation rate, CAC).
const Delta = ({ value, up, good = up }) => (
  <span
    className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${good ? "text-emerald-500" : "text-rose-500"
      }`}
  >
    {up ? "↑" : "↓"} {value}
  </span>
);

const ViewLink = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`mt-auto flex w-full items-center justify-center gap-1.5 pt-4 font-bold hover:underline ${T.lg}`}
    style={{ color: BRAND }}
  >
    {children}
    <ArrowRight size={14} className="shrink-0" />
  </button>
);

const Select = ({ value, onChange, options, compact = false }) => (
  <div className="relative shrink-0">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none ${compact ? `py-1.5 pl-2.5 pr-6 ${T.base}` : `py-2 pl-3 pr-7 ${T.md}`
        }`}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
    <ChevronDown
      size={compact ? 11 : 13}
      className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </div>
);

const LegendDot = ({ color, label }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600 ${T.sm}`}>
    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
    {label}
  </span>
);

// Bordered mini stat used under the bookings chart and in the acquisition card.
const StatBox = ({ label, value, delta, good, note }) => (
  <div className="min-w-0 rounded-xl border border-[#E3E7EF] px-3 py-2.5">
    <p className={`truncate text-slate-500 ${T.sm}`}>{label}</p>
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <span className={`truncate font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
        {value}
      </span>
      {delta && (
        <span className={T.sm}>
          <Delta {...delta} good={good ?? delta.up} />
        </span>
      )}
    </div>
    {note && <p className={`mt-0.5 truncate text-slate-400 ${T.xs}`}>{note}</p>}
  </div>
);

const STATUS_STYLES = {
  GOOD: "bg-emerald-50 text-emerald-600",
  ATTENTION: "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
  STABLE: "bg-slate-100 text-slate-600",
  "N/A": "bg-slate-50 text-slate-400",
};

const STATUS_DOT = {
  GOOD: BRAND,
  ATTENTION: AMBER,
  STABLE: "#94A3B8",
  "N/A": "#CBD5E1",
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-md px-2 py-1 font-bold ${T.xs} ${STATUS_STYLES[status]}`}
  >
    {status}
  </span>
);

// Placeholder for a metric the backend doesn't provide yet - shown instead of
// made-up numbers so it's obvious what still needs an API.
const Pending = ({ children, className = "" }) => (
  <div
    className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center ${className}`}
  >
    <span
      className={`rounded-md bg-slate-200/70 px-2 py-0.5 font-bold uppercase tracking-wide text-slate-500 ${T.xs}`}
    >
      Backend pending
    </span>
    <p className={`max-w-[300px] text-slate-500 ${T.sm}`}>{children}</p>
  </div>
);

// Shared by the two period-on-period comparison tables.
const ComparisonTable = ({ columns, rows }) => (
  <table className="w-full table-auto border-collapse text-left">
    <thead>
      <tr className="border-b border-slate-200">
        {columns.map((col) => (
          <th
            key={col}
            className={`whitespace-nowrap pb-2.5 pr-2 font-bold uppercase tracking-wide text-slate-400 ${T.xs}`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.metric} className="border-b border-slate-50 last:border-0">
          <td className={`whitespace-nowrap py-2.5 pr-2 font-medium text-slate-700 ${T.base}`}>
            {row.metric}
          </td>
          <td className={`whitespace-nowrap py-2.5 pr-2 text-slate-600 ${T.base}`}>{row.a}</td>
          <td className={`whitespace-nowrap py-2.5 pr-2 text-slate-600 ${T.base}`}>{row.b}</td>
          <td
            className={`whitespace-nowrap py-2.5 pr-2 font-semibold ${T.base} ${!row.change
                ? "text-slate-400"
                : row.good
                  ? "text-emerald-600"
                  : "text-rose-500"
              }`}
          >
            {row.change || "N/A"}
          </td>
          <td className={`whitespace-nowrap py-2.5 ${T.base}`}>
            {row.delta ? (
              <Delta {...row.delta} good={row.good} />
            ) : (
              <span className="text-slate-400">N/A</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// One of the three mini panels inside the growth card.
const GrowthMini = ({ title, caption, value, delta, children }) => (
  <div className="flex min-w-0 flex-col rounded-xl border border-[#E3E7EF] p-3">
    <p className={`font-bold text-slate-900 ${T.md}`}>{title}</p>
    <p className={`mt-0.5 text-slate-500 ${T.sm}`}>{caption}</p>
    <div className="mt-2 h-[112px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex items-baseline justify-between gap-2">
      <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{value}</span>
      {delta && (
        <span className={T.sm}>
          <Delta {...delta} />
        </span>
      )}
    </div>
  </div>
);

// Growth metrics: higher is better.
const growthStatus = (pct) => {
  if (pct == null) return { status: "N/A", logic: "Not enough history" };
  if (pct >= GROWTH_GOOD) return { status: "GOOD", logic: `Beyond the +${GROWTH_GOOD}% band` };
  if (pct <= GROWTH_ATTENTION) return { status: "ATTENTION", logic: `Beyond the ${GROWTH_ATTENTION}% band` };
  return { status: "STABLE", logic: `Within ${GROWTH_ATTENTION}% to +${GROWTH_GOOD}%` };
};

// Cost-style metrics (cancellation rate, CAC per booking): lower is better.
const lowerBetterStatus = (pct) => {
  if (pct == null) return { status: "N/A", logic: "Not enough history" };
  if (pct <= -LOWER_BETTER_BAND) return { status: "GOOD", logic: `Beyond the -${LOWER_BETTER_BAND}% band` };
  if (pct >= LOWER_BETTER_BAND) return { status: "ATTENTION", logic: `Beyond the +${LOWER_BETTER_BAND}% band` };
  return { status: "STABLE", logic: `Within ±${LOWER_BETTER_BAND}%` };
};

// Popover under the date pill for picking any from/to range. Absolutely
// positioned inside the canvas (not fixed), so the scaling doesn't trap it.
const DateRangePicker = ({ initial, today, onApply, onClose }) => {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const error = !from || !to
    ? "Pick both dates"
    : from > to
      ? "Start date must be before end date"
      : to > today
        ? "End date can't be in the future"
        : null;

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-[280px] rounded-2xl border border-[#E3E7EF] bg-white p-4 shadow-lg">
      <p className={`mb-3 font-bold text-slate-900 ${T.md}`}>Custom date range</p>
      {[
        ["From", from, setFrom],
        ["To", to, setTo],
      ].map(([label, value, set]) => (
        <label key={label} className={`mb-2 flex items-center justify-between gap-3 text-slate-600 ${T.base}`}>
          {label}
          <input
            type="date"
            value={value}
            max={today}
            onChange={(e) => set(e.target.value)}
            className={`rounded-lg border border-slate-200 px-2 py-1.5 text-slate-800 focus:outline-none ${T.base}`}
          />
        </label>
      ))}
      <p className={`min-h-[16px] text-rose-500 ${T.sm}`}>{error}</p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`rounded-lg px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 ${T.base}`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!!error}
          onClick={() => onApply({ from, to })}
          className={`rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-40 ${T.base}`}
          style={{ background: BRAND }}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

const HOW_IT_WORKS = [
  {
    title: "Filters",
    items: [
      "The period dropdown (or a custom range from the date pill) drives the KPI tiles, the scorecard, the comparison tables and the monthly charts. Every change is compared with the equal period just before it: whole months for This / Last Month, the previous week, the previous 90 days, the previous year, or the same number of days before a custom range.",
      "The Bookings & Revenue and Acquisition cards have their own filter. \"Last 6 Months\" is compared with the 6 months before it.",
      "The growth, partner, subscription and cancellation charts show the 3 calendar months ending with the selected period.",
    ],
  },
  {
    title: "Metrics",
    items: [
      "Bookings: paid appointments, by appointment date. Checkouts whose payment failed or expired are not bookings.",
      "Revenue (GMV): amount paid on completed appointments - the same figure as the V1 dashboard's total sales.",
      "Cancellations: paid bookings later cancelled or refunded. Cancellation rate = cancellations ÷ bookings.",
      "CAC spend: the discount Gloup funds on each booking (service price minus what the customer paid, nothing for \"important\" services) - the invoice page's Acquisition Cost column. CAC per booking = CAC spend ÷ non-cancelled bookings.",
      "Users, partners and subscriptions are running totals at the end of the period. Users count from their registration date; users older than that field with no history are counted as existing from the start.",
    ],
  },
  {
    title: "Scorecard status",
    items: [
      `Growth metrics: GOOD at +${GROWTH_GOOD}% or more, ATTENTION at ${GROWTH_ATTENTION}% or less, otherwise STABLE.`,
      `Cancellation rate and CAC per booking (lower is better): GOOD at -${LOWER_BETTER_BAND}% or less, ATTENTION at +${LOWER_BETTER_BAND}% or more.`,
    ],
  },
  {
    title: "Alerts",
    items: [
      `Zero bookings: active salons, listed for over ${IDLE_SALON_DAYS} days, with no paid booking in the last ${IDLE_SALON_DAYS} days.`,
      `Overdue payout: past invoice days (up to ${OVERDUE_PAYOUT_DAYS} days back) with bookings but no payout marked. The amount is the invoice total before any subscription deduction.`,
      "Checkout drop-offs: customers whose payment failed or expired today.",
      "Subscription dues: what active partner subscriptions owe right now, including GST.",
    ],
  },
];

// Rendered outside ScaledCanvas - a fixed overlay inside the transformed
// canvas would be positioned (and scaled) relative to it.
const HowItWorksModal = ({ dataStartDate, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How the dashboard works"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-extrabold text-slate-900">How the dashboard works</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {HOW_IT_WORKS.map((section) => (
          <div key={section.title} className="mb-4">
            <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-slate-500">
              {section.title}
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {dataStartDate
            ? `Booking, revenue, CAC and partner numbers only count activity from ${dataStartDate} (the go-live date set on the V1 dashboard).`
            : "No go-live date is set, so booking, revenue, CAC and partner numbers cover all time."}{" "}
          Meta reach, the ad-channel split and the area / price-point alerts need data the platform doesn&apos;t collect yet.
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const DashboardV2 = ({ title = "Dashboard" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [period, setPeriod] = useState("This Month");
  const [refreshInterval, setRefreshInterval] = useState("30 sec");
  const [bookingsWindow, setBookingsWindow] = useState("This Month");
  const [acquisitionWindow, setAcquisitionWindow] = useState("This Month");
  const [customRange, setCustomRange] = useState(null);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState([]);

  const { dashboardV2Metrics, dashboardV2Alerts } = useSelector((state) => state.dashboard);

  const today = ymd(new Date());
  const thisMonth = today.slice(0, 7);
  const periodInfo = useMemo(
    () => resolvePeriod(period, today, customRange),
    [period, today, customRange]
  );
  // The chart months, plus the 3 months ending with the selected period in
  // case a custom range reaches back further than that.
  const periodEndMonth = periodInfo.ranges[0].to.slice(0, 7);
  const historyKeys = useMemo(
    () => [...new Set([...monthRange(periodEndMonth, 3), ...monthRange(thisMonth, HISTORY_MONTHS)])],
    [periodEndMonth, thisMonth]
  );

  const selectPeriod = (value) => {
    if (value !== CUSTOM_PERIOD) setCustomRange(null);
    setPeriod(value);
  };
  const applyCustomRange = (range) => {
    setCustomRange(range);
    setPeriod(CUSTOM_PERIOD);
    setShowRangePicker(false);
  };
  const closeHowItWorks = useCallback(() => setShowHowItWorks(false), []);

  // Keys: "p0".."p2" for the header period, "YYYY-MM" for chart months.
  const ranges = useMemo(
    () => [
      ...periodInfo.ranges.map(({ from, to }, i) => ({ key: `p${i}`, from, to })),
      ...historyKeys.map((key) => ({ key, ...monthSpan(key, today) })),
    ],
    [periodInfo, historyKeys, today]
  );

  // Everything is re-fetched on each refresh. Promise.allSettled so one failing
  // endpoint only blanks its own cards instead of the whole page.
  const load = useCallback(async () => {
    const requests = [
      ["Dashboard metrics", getDashboardV2Metrics(ranges)],
      [
        "Alerts",
        getDashboardV2Alerts({ idle_days: IDLE_SALON_DAYS, overdue_days: OVERDUE_PAYOUT_DAYS }),
      ],
    ];
    const results = await Promise.allSettled(
      requests.map(([, thunk]) => dispatch(thunk).unwrap())
    );
    setFailed(requests.filter((_, i) => results[i].status === "rejected").map(([name]) => name));
    setLoaded(true);
  }, [dispatch, ranges]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ms = REFRESH_MS[refreshInterval];
    if (!ms) return undefined;
    const id = setInterval(load, ms);
    return () => clearInterval(id);
  }, [load, refreshInterval]);

  // -------------------------------------------------------------------------
  // Metric lookups
  // -------------------------------------------------------------------------

  const byKey = dashboardV2Metrics?.ranges || {};
  const at = (key) => byKey[key] || null;
  const pick = (key, field) => at(key)?.[field] ?? null;

  // Additive metrics summed over several months (null only if all are null).
  const sumOver = (keys, field) => {
    const values = keys.map((k) => pick(k, field)).filter((v) => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };
  const cacPerBooking = (keys) => {
    const spend = sumOver(keys, "cac_spend");
    const count = sumOver(keys, "cac_bookings");
    return spend == null || !count ? null : spend / count;
  };

  const [cur, last, before] = ["p0", "p1", "p2"].map((key) => {
    const m = at(key);
    return m ? { ...m, rate: rateOf(m) } : {};
  });
  const [curRange, lastRange, beforeRange] = periodInfo.ranges;
  const compareLabel = periodInfo.compareLabel;
  const rangeLabel = `${fmtDay(curRange.from)} – ${fmtDay(curRange.to)} ${curRange.to.slice(0, 4)}`;

  const change = (field) => pctChange(cur[field] ?? null, last[field] ?? null);
  const pct = {
    bookings: change("bookings"),
    revenue: change("revenue"),
    rate: pctChange(cur.rate ?? null, last.rate ?? null),
    cac: change("cac_per_booking"),
    users: change("total_users"),
    partners: change("total_partners"),
    subscriptions: change("active_subscriptions"),
  };

  const kpis = [
    { label: "Total Bookings", value: fmtInt(cur.bookings), delta: toDelta(pct.bookings), icon: CalendarCheck, tint: "#EDE7FF", color: BRAND },
    { label: "Total Revenue (GMV)", value: fmtInr(cur.revenue), delta: toDelta(pct.revenue), icon: IndianRupee, tint: "#E1F7EC", color: GREEN },
    { label: "Total Users", value: fmtCompact(cur.total_users), delta: toDelta(pct.users), icon: Users, tint: "#FFF2DC", color: "#E08700" },
    { label: "Total Partners", value: fmtInt(cur.total_partners), delta: toDelta(pct.partners), icon: Store, tint: "#E6EFFF", color: BLUE },
    { label: "Total Subscriptions", value: fmtInt(cur.active_subscriptions), delta: toDelta(pct.subscriptions), icon: Gift, tint: "#FDE6F0", color: PINK },
    { label: "Cancellation Rate", value: fmtPct(cur.rate), delta: toDelta(pct.rate), invert: true, icon: Slash, tint: "#DCF3F0", color: "#0E9384" },
  ];

  const scorecard = [
    { metric: "Bookings Growth", value: fmtInt(cur.bookings), delta: toDelta(pct.bookings), ...growthStatus(pct.bookings) },
    { metric: "Revenue Growth", value: fmtInr(cur.revenue), delta: toDelta(pct.revenue), ...growthStatus(pct.revenue) },
    { metric: "CAC efficiency (per booking)", value: fmtInr(cur.cac_per_booking), delta: toDelta(pct.cac), invert: true, ...lowerBetterStatus(pct.cac) },
    { metric: "Cancellation Rate", value: fmtPct(cur.rate), delta: toDelta(pct.rate), invert: true, ...lowerBetterStatus(pct.rate) },
    { metric: "User Growth", value: fmtCompact(cur.total_users), delta: toDelta(pct.users), ...growthStatus(pct.users) },
    { metric: "Partner Growth", value: fmtInt(cur.total_partners), delta: toDelta(pct.partners), ...growthStatus(pct.partners) },
    { metric: "Subscription Growth", value: fmtInt(cur.active_subscriptions), delta: toDelta(pct.subscriptions), ...growthStatus(pct.subscriptions) },
  ];

  // Bookings & revenue card - its own filter.
  const bw = resolveCardWindow(bookingsWindow, thisMonth);
  const bwShort = bw.chart.length > 3;
  const bookingsRevenue = bw.chart.map((key) => ({
    month: monthName(key, bwShort),
    bookings: pick(key, "bookings"),
    revenue: pick(key, "revenue"),
  }));
  const revenueMax = Math.max(0, ...bookingsRevenue.map((d) => d.revenue || 0)) || 1;
  const bwBookings = sumOver(bw.current, "bookings");
  const bwRevenue = sumOver(bw.current, "revenue");

  // Acquisition card - its own filter.
  const aw = resolveCardWindow(acquisitionWindow, thisMonth);
  const awShort = aw.chart.length > 3;
  const awSpend = sumOver(aw.current, "cac_spend");
  const awCac = cacPerBooking(aw.current);
  const acquisitionSpend = aw.chart.map((key) => ({
    month: monthName(key, awShort),
    spend: pick(key, "cac_spend"),
  }));

  // Monthly charts follow the header period: the 3 months ending at its end.
  const growthMonths = monthRange(periodEndMonth, 3);
  const growthSeries = (field) =>
    growthMonths.map((key) => ({ month: monthName(key, true), value: pick(key, field) }));

  const cancellations = growthMonths.map((key) => {
    const rate = rateOf(at(key));
    return {
      month: monthName(key),
      count: pick(key, "cancellations"),
      rate: rate == null ? null : Number(rate.toFixed(2)),
    };
  });
  const cancelMax = Math.max(0, ...cancellations.map((d) => d.count || 0)) || 1;
  const rateMax = Math.max(0, ...cancellations.map((d) => d.rate || 0)) || 1;

  const comparisonRows = (a, b) => {
    const row = (metric, va, vb, fmt, lowerIsBetter = false) => {
      const diff = va == null || vb == null ? null : vb - va;
      const p = pctChange(vb, va);
      const up = diff != null && diff >= 0;
      return {
        metric,
        a: fmt(va),
        b: fmt(vb),
        change: diff == null ? null : fmtSigned(diff, fmt),
        delta: toDelta(p),
        good: diff === 0 || (lowerIsBetter ? !up : up),
      };
    };
    return [
      row("Bookings", a.bookings ?? null, b.bookings ?? null, fmtInt),
      row("Revenue", a.revenue ?? null, b.revenue ?? null, fmtInr),
      row("CAC Spend", a.cac_spend ?? null, b.cac_spend ?? null, fmtInr, true),
      row("Cancellations", a.cancellations ?? null, b.cancellations ?? null, fmtInt, true),
      row("Users", a.total_users ?? null, b.total_users ?? null, fmtCompact),
      row("Partners", a.total_partners ?? null, b.total_partners ?? null, fmtInt),
      row("Subscriptions", a.active_subscriptions ?? null, b.active_subscriptions ?? null, fmtInt),
    ];
  };

  const alertsData = dashboardV2Alerts || {};
  const alerts = [];
  if (alertsData.idle_salons?.count > 0) {
    const n = alertsData.idle_salons.count;
    alerts.push({
      icon: AlertTriangle,
      tint: "#FEE4E2",
      color: RED,
      title: `${n} salon${n === 1 ? " has" : "s have"} zero bookings`,
      sub: `for ${alertsData.idle_salons.days} days`,
      action: "View Partners",
      to: "/partner",
      critical: true,
    });
  }
  if (alertsData.overdue_payouts?.invoices > 0) {
    const { amount, partners } = alertsData.overdue_payouts;
    alerts.push({
      icon: Clock,
      tint: "#FFF2DC",
      color: "#E08700",
      title: `${inr(Math.round(amount))} overdue payout`,
      sub: `to ${partners} partner${partners === 1 ? "" : "s"}`,
      action: "View Payouts",
      to: "/invoice",
    });
  }
  if (alertsData.checkout_dropoffs?.users > 0) {
    const n = alertsData.checkout_dropoffs.users;
    alerts.push({
      icon: ShoppingCart,
      tint: "#EDE7FF",
      color: BRAND,
      title: `${n} user${n === 1 ? "" : "s"} dropped off at checkout`,
      sub: "today",
      action: "View",
      // Failed/expired checkouts end up cancelled with payment_status failed;
      // /bookings filters by created date, the same basis as this count.
      to: `/bookings?fromDate=${today}&toDate=${today}&status=cancelled&paymentStatus=failed`,
    });
  }
  if (alertsData.subscription_dues?.partners > 0) {
    const { amount, partners } = alertsData.subscription_dues;
    alerts.push({
      icon: Wallet,
      tint: "#FDE6F0",
      color: PINK,
      title: `${inr(Math.round(amount))} subscription dues`,
      sub: `from ${partners} partner${partners === 1 ? "" : "s"}`,
      action: "View",
      to: "/partner-subscriptions",
    });
  }
  if (dashboardV2Alerts?.date && alerts.length === 0) {
    alerts.push({
      icon: CheckCircle2,
      tint: "#E1F7EC",
      color: GREEN,
      title: "Nothing needs attention",
      sub: "no idle salons, overdue payouts or dues",
    });
  }

  const unitLabel = periodInfo.unit;

  return (
    <>
    <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Page header + filter bar                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`font-extrabold tracking-tight text-slate-900 ${T.h1}`}>{title}</h1>
            <p className={`mt-0.5 text-slate-500 ${T.md}`}>
              {loaded ? "Real-time overview of GloUp platform performance" : "Loading dashboard…"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRangePicker((open) => !open)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3 py-2 font-medium text-slate-700 hover:border-slate-300 ${T.md} ${period === CUSTOM_PERIOD ? "border-[#5B21F0]" : "border-slate-200"
                  }`}
              >
                {rangeLabel}
                <CalendarDays size={13} className="shrink-0 text-slate-400" />
              </button>
              {showRangePicker && (
                <DateRangePicker
                  initial={curRange}
                  today={today}
                  onApply={applyCustomRange}
                  onClose={() => setShowRangePicker(false)}
                />
              )}
            </div>

            <Select
              value={period}
              onChange={selectPeriod}
              options={period === CUSTOM_PERIOD ? [...PERIODS, CUSTOM_PERIOD] : PERIODS}
            />

            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${REFRESH_MS[refreshInterval] ? "bg-emerald-500" : "bg-slate-300"
                  }`}
              />
              <div className="leading-tight">
                <p className={`whitespace-nowrap font-semibold text-slate-700 ${T.base}`}>
                  Auto refresh
                </p>
                <div className="relative">
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(e.target.value)}
                    className={`appearance-none bg-transparent pr-3 text-slate-500 focus:outline-none ${T.sm}`}
                  >
                    {Object.keys(REFRESH_MS).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={10}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className={`flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-600 hover:text-slate-900 ${T.md}`}
            >
              <Info size={14} className="shrink-0 text-slate-400" />
              How it works?
            </button>
          </div>
        </div>

        {failed.length > 0 && (
          <div
            className={`rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-600 ${T.base}`}
          >
            Couldn&apos;t load: {failed.join(", ")}. Affected cards show “{DASH}”.
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <div
              key={kpi.label}
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#E3E7EF] bg-white p-3.5"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: kpi.tint }}
              >
                <Icon size={20} style={{ color: kpi.color }} />
              </div>

              <div className="min-w-0">
                <p className={`truncate text-slate-500 ${T.base}`}>{kpi.label}</p>
                <p
                  className={`mt-0.5 whitespace-nowrap font-extrabold tracking-tight text-slate-900 ${T.kpi}`}
                >
                  {kpi.value}
                </p>
                <p className={`mt-0.5 flex items-center gap-1.5 ${T.sm}`}>
                  {kpi.delta && (
                    <Delta {...kpi.delta} good={kpi.invert ? !kpi.delta.up : kpi.delta.up} />
                  )}
                  <span className="truncate text-slate-400">{compareLabel}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Scorecard / Bookings & revenue / Acquisition cost         */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          {/* Performance scorecard */}
          <Card>
            <CardTitle>Performance Scorecard</CardTitle>

            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  {[
                    "Metric",
                    "Latest Value",
                    `Change vs Prior ${unitLabel}`,
                    "Status",
                    "Logic Applied",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`pb-2.5 pr-2 font-bold uppercase leading-tight tracking-wide text-slate-400 ${T.xs}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorecard.map((row) => (
                  <tr key={row.metric}>
                    <td className={`py-2 pr-2 ${T.base}`}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: STATUS_DOT[row.status] }}
                        />
                        <span className="font-medium text-slate-700">{row.metric}</span>
                      </span>
                    </td>
                    <td className={`whitespace-nowrap py-2 pr-2 text-slate-600 ${T.base}`}>
                      {row.value}
                    </td>
                    <td className={`whitespace-nowrap py-2 pr-2 ${T.base}`}>
                      {row.delta ? (
                        <Delta {...row.delta} good={row.invert ? !row.delta.up : row.delta.up} />
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill status={row.status} />
                    </td>
                    {/* 10px keeps "Beyond the +10% band" on one line in this column. */}
                    <td className={`whitespace-nowrap py-2 text-slate-400 ${T.xs}`}>{row.logic}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ViewLink onClick={() => navigate("/monthly-report")}>
              View Full Performance Report
            </ViewLink>
          </Card>

          {/* Bookings & revenue performance */}
          <Card>
            <CardTitle
              right={
                <Select
                  compact
                  value={bookingsWindow}
                  onChange={setBookingsWindow}
                  options={CARD_PERIODS}
                />
              }
            >
              Bookings &amp; Revenue Performance
            </CardTitle>

            <div className="mb-1 flex items-center gap-4">
              <LegendDot color={BRAND} label="Total Bookings" />
              <LegendDot color={GREEN} label="Total Revenue (₹)" />
            </div>

            <div className="h-[232px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={bookingsRevenue}
                  margin={{ top: 22, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, (dataMax) => Math.max(4, Math.ceil(dataMax * 1.25))]}
                    allowDecimals={false}
                    tickCount={6}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={46}
                  />
                  {/* The revenue axis is hidden and unlabelled, so its floor is
                      offset below zero purely to park the line in a clear band
                      above the bars and their value labels - at 0 the line cut
                      straight through the tallest bar. Exact values are still in
                      the tooltip and the stat boxes below. */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[-revenueMax * 1.13, revenueMax * 1.18]}
                    hide
                  />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(91,33,240,0.05)" }}
                    formatter={(value, name) =>
                      name === "Total Revenue (₹)" ? inr(value) : value
                    }
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    name="Total Bookings"
                    fill={BRAND}
                    radius={[5, 5, 0, 0]}
                    barSize={bwShort ? 34 : 54}
                  >
                    <LabelList
                      dataKey="bookings"
                      position="top"
                      offset={8}
                      style={{ fontSize: 12, fontWeight: 700, fill: "#0F172A" }}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="revenue"
                    name="Total Revenue (₹)"
                    stroke={GREEN}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: GREEN, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={`mt-3 grid grid-cols-2 ${GAP}`}>
              <StatBox
                label="Total Bookings"
                value={fmtInt(bwBookings)}
                delta={toDelta(pctChange(bwBookings, sumOver(bw.previous, "bookings")))}
                note={bw.compareLabel}
              />
              <StatBox
                label="Total Revenue"
                value={fmtInr(bwRevenue)}
                delta={toDelta(pctChange(bwRevenue, sumOver(bw.previous, "revenue")))}
                note={bw.compareLabel}
              />
            </div>

            <ViewLink onClick={() => navigate("/analytics-intelligence")}>
              View Detailed Analytics
            </ViewLink>
          </Card>

          {/* Acquisition cost & marketing efficiency. CAC here is what the
              invoice page calls "Acquisition Cost": the discount Gloup funds
              on each non-important service. */}
          <Card>
            <CardTitle
              right={
                <Select
                  compact
                  value={acquisitionWindow}
                  onChange={setAcquisitionWindow}
                  options={CARD_PERIODS}
                />
              }
            >
              Acquisition Cost &amp; Marketing Efficiency
            </CardTitle>

            <div className={`grid grid-cols-3 ${GAP}`}>
              {(() => {
                const spendDelta = toDelta(pctChange(awSpend, sumOver(aw.previous, "cac_spend")));
                const cacDelta = toDelta(pctChange(awCac, cacPerBooking(aw.previous)));
                return (
                  <>
                    <StatBox
                      label="CAC Spend"
                      value={fmtInr(awSpend)}
                      delta={spendDelta}
                      good={spendDelta ? !spendDelta.up : undefined}
                      note={aw.compareLabel}
                    />
                    <StatBox
                      label="CAC (Overall)"
                      value={fmtInr(awCac)}
                      delta={cacDelta}
                      good={cacDelta ? !cacDelta.up : undefined}
                      note="per booking"
                    />
                    <StatBox label="Meta Reach" value={DASH} note="Backend pending" />
                  </>
                );
              })()}
            </div>

            <p className={`mt-4 font-bold text-slate-900 ${T.md}`}>
              Acquisition Spend by Month (₹)
            </p>

            <div className="mt-2 flex items-center gap-4">
              <LegendDot color={BRAND} label="Discounts funded (CAC)" />
              <span className={`text-slate-400 ${T.sm}`}>
                Meta / Other / Organic split: backend pending
              </span>
            </div>

            <div className="mt-1 h-[186px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acquisitionSpend} margin={{ top: 22, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  <YAxis hide domain={[0, (dataMax) => Math.max(1, dataMax * 1.2)]} />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(91,33,240,0.05)" }}
                    formatter={(value) => inr(value)}
                  />
                  <Bar
                    dataKey="spend"
                    name="CAC Spend"
                    fill={BRAND}
                    barSize={awShort ? 40 : 82}
                    radius={[5, 5, 0, 0]}
                  >
                    <LabelList
                      dataKey="spend"
                      position="top"
                      offset={6}
                      formatter={(v) => (v == null ? "" : inr(Math.round(v)))}
                      style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ViewLink onClick={() => navigate("/invoice")}>View Invoices</ViewLink>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Growth / Cancellations / Meta                             */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          {/* Customer, partner & subscription growth */}
          <Card>
            <CardTitle>Customer, Partner &amp; Subscription Growth</CardTitle>

            <div className={`grid grid-cols-3 ${GAP}`}>
              <GrowthMini
                title="User Growth"
                caption="Total users by month"
                value={fmtCompact(cur.total_users)}
                delta={toDelta(pct.users)}
              >
                <LineChart data={growthSeries("total_users")} margin={{ top: 8, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={4} />
                  <YAxis hide domain={[(min) => Math.floor(min * 0.95), (max) => Math.ceil(max * 1.05)]} />
                  <Tooltip {...TOOLTIP} formatter={(v) => Number(v).toLocaleString("en-IN")} />
                  <Line
                    type="linear"
                    dataKey="value"
                    name="Users"
                    stroke={BLUE}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: BLUE, strokeWidth: 0 }}
                  />
                </LineChart>
              </GrowthMini>

              <GrowthMini
                title="Partner / Salon Network"
                caption="Total partners by month"
                value={fmtInt(cur.total_partners)}
                delta={toDelta(pct.partners)}
              >
                <BarChart data={growthSeries("total_partners")} margin={{ top: 8, right: 10, bottom: 0, left: 10 }}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={4} />
                  <YAxis hide />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(240,68,56,0.05)" }} />
                  <Bar
                    dataKey="value"
                    name="Partners"
                    fill={RED}
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                </BarChart>
              </GrowthMini>

              <GrowthMini
                title="Subscription Growth"
                caption="Total subscriptions by month"
                value={fmtInt(cur.active_subscriptions)}
                delta={toDelta(pct.subscriptions)}
              >
                <BarChart
                  data={growthSeries("active_subscriptions")}
                  margin={{ top: 8, right: 10, bottom: 0, left: 10 }}
                >
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={4} />
                  <YAxis hide />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(18,183,106,0.05)" }} />
                  <Bar
                    dataKey="value"
                    name="Subscriptions"
                    fill={GREEN}
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                </BarChart>
              </GrowthMini>
            </div>

            <ViewLink onClick={() => navigate("/partner")}>View All Growth Reports</ViewLink>
          </Card>

          {/* Cancellation analysis */}
          <Card>
            <CardTitle>Cancellation Analysis</CardTitle>
            <p className={`-mt-2 mb-2 text-slate-500 ${T.sm}`}>
              Bars: cancellations • Line: cancellation rate (%)
            </p>

            <div className="mb-1 flex items-center gap-4">
              <LegendDot color={PINK} label="Cancellations" />
              <LegendDot color={AMBER} label="Cancellation Rate (%)" />
            </div>

            <div className="h-[236px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={cancellations}
                  margin={{ top: 18, right: 10, bottom: 0, left: 10 }}
                >
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  {/* Same idea as the bookings chart: headroom on the bar axis
                      plus a tighter rate axis keeps the rate line clear of the
                      bars instead of running behind them. */}
                  <YAxis yAxisId="left" domain={[0, cancelMax * 1.55]} hide />
                  <YAxis yAxisId="right" orientation="right" domain={[0, rateMax * 1.1]} hide />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ fill: "rgba(236,72,153,0.05)" }}
                    formatter={(value, name) =>
                      name === "Cancellation Rate (%)" ? `${value}%` : value
                    }
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Cancellations"
                    fill={PINK}
                    radius={[5, 5, 0, 0]}
                    barSize={54}
                  />
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="rate"
                    name="Cancellation Rate (%)"
                    stroke={AMBER}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: AMBER, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className={`text-slate-500 ${T.sm}`}>Total Cancellations</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                  {fmtInt(cur.cancellations)}
                </p>
              </div>
              <div className="min-w-0">
                <p className={`text-slate-500 ${T.sm}`}>Cancellation Rate</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>
                    {fmtPct(cur.rate)}
                  </span>
                  {pct.rate != null && (
                    <span className={T.sm}>
                      <Delta {...toDelta(pct.rate)} good={pct.rate < 0} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Meta performance overview */}
          <Card>
            <CardTitle>Meta Performance Overview</CardTitle>
            <Pending>
              Meta Ads reach isn&apos;t tracked yet - it needs a Meta Marketing API
              integration (or manual entry) on the backend.
            </Pending>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Period-on-period tables / Alerts                          */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card>
            <CardTitle>{unitLabel}-on-{unitLabel} Performance</CardTitle>
            <ComparisonTable
              columns={["Metric", beforeRange.label, lastRange.label, "Change", "% Change"]}
              rows={comparisonRows(before, last)}
            />
          </Card>

          <Card>
            <CardTitle>
              {lastRange.label} → {curRange.label}
            </CardTitle>
            <ComparisonTable
              columns={["Metric", lastRange.label, curRange.label, "Change", "% Change"]}
              rows={comparisonRows(last, cur)}
            />
          </Card>

          <Card>
            <CardTitle>Alerts &amp; Insights</CardTitle>

            <div className="flex flex-col gap-2">
              {alerts.map(({ icon: Icon, ...alert }) => (
                <div
                  key={alert.title}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${alert.critical ? "border-rose-100 bg-rose-50/60" : "border-[#E3E7EF] bg-white"
                    }`}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: alert.tint }}
                  >
                    <Icon size={14} style={{ color: alert.color }} />
                  </div>

                  {/* This card is the narrowest on the canvas - the type here is
                      one step down so the longest alert still fits on one line. */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold text-slate-800 ${T.sm}`}>
                      {alert.title}
                    </p>
                    <p className={`truncate text-slate-400 ${T.xs}`}>{alert.sub}</p>
                  </div>

                  {alert.action && (
                    <button
                      type="button"
                      onClick={() => navigate(alert.to)}
                      className={`flex shrink-0 items-center gap-1 font-semibold hover:underline ${T.xs}`}
                      style={{ color: BRAND }}
                    >
                      {alert.action}
                      <ArrowRight size={11} className="shrink-0" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Pending className="mt-2">
              Area demand vs supply and price-point conversion alerts need search
              and listing-view tracking.
            </Pending>
          </Card>
        </div>
    </ScaledCanvas>

    {showHowItWorks && (
      <HowItWorksModal
        dataStartDate={dashboardV2Metrics?.dashboard_data_start_date}
        onClose={closeHowItWorks}
      />
    )}
    </>
  );
};

export default DashboardV2;
