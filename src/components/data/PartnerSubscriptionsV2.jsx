import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  IndianRupee,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  assignSubscription,
  deactivateSubscription,
  exportSubscriptionsV2,
  fetchFreeBookingLimit,
  fetchPartnersNeedingSubscription,
  fetchSubscriptionHistoryV2,
  fetchSubscriptionsListV2,
  fetchSubscriptionsSummaryV2,
  updateFreeBookingLimit,
  updateSubscription,
} from "../../redux/slices/partnerManualSubscriptionSlice";
import { getDashboardV2Metrics } from "../../redux/slices/dashboardSlice";
import { downloadCsv } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP } from "../v2/tokens";
import {
  Card,
  Chip,
  HeaderBell,
  HeaderSearch,
  SalonLogo as BaseSalonLogo,
  SectionTitle as BaseSectionTitle,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Partner Subscriptions" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// "Subscriptions" are the manual system (PartnerManualSubscriptions): one row
// per salon with a flat monthly amount (+18% GST), recovered by deducting it
// from the salon's daily invoice payout when an admin marks it paid. There
// are no plan names and no expiry - plans show as their amount, and statuses
// are Active (settled) / Payment Due / Deactivated, plus Pending for salons
// past their free bookings with no subscription yet.
//
// Data:
//   /getManualSubscriptionsListV2     the table (server-side filters/paging),
//                                     incl. what each salon owes today
//   /getManualSubscriptionsSummaryV2  collected per period, status counts,
//                                     owed now, plan mix, top partners, filters
//   /getManualSubscriptionHistoryV2   the View dialog's deduction history
//   /getDashboardV2Metrics            Total Partners, Bookings, Active
//                                     Subscriptions deltas and the trend
//   V1 manual-subscription APIs       assign / renew, edit, deactivate,
//                                     free-booking limit, Add picker
// Import Partners stays disabled: there is no bulk partner-create API.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#7C3AED";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const SLATE = "#CBD5E1";
const PLAN_COLORS = ["#FACC15", BRAND, GREEN, "#F97316", BLUE, "#EC4899", "#14B8A6"];

// Measured card widths from the mockup, used directly as grid fr units.
const PANEL_COLS = "grid-cols-[378fr_398fr_355fr_346fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these. The mockup screenshot was 1536px wide with 1328px of
// content, so every measured size is carried across at ~1.14x to keep the
// design's own proportions on this slightly wider canvas.
const T = {
  tiny: "text-[11px]", // email line, chips, "N bookings", delta sub
  th: "text-[11px]", // uppercase table column headers
  xxs: "text-[12px]", // legend rows, dropdowns, pagination
  xs: "text-[13px]", // KPI label, table body cells, partner names
  sm: "text-[14px]", // amounts
  base: "text-[15px]", // buttons, inputs
  title: "text-[16px]", // card titles
  donut: "text-[26px]", // donut centre total
  kpi: "text-[27px]", // KPI values
};

const GAP = "gap-3";
const DASH = "—";
const DAY = "YYYY-MM-DD";
// Same rate the backend bills (partnerSubscriptionBilling.GST_RATE); only
// used to preview a fee the admin is typing in.
const GST_RATE = 18;

const STATUS = {
  active: { label: "Active", chip: "bg-emerald-50 text-emerald-600", color: GREEN },
  due: { label: "Payment Due", chip: "bg-amber-50 text-amber-600", color: AMBER },
  inactive: { label: "Deactivated", chip: "bg-slate-100 text-slate-500", color: SLATE },
  pending: { label: "Pending", chip: "bg-violet-50 text-violet-600", color: BRAND },
};

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "due", label: "Payment Due" },
  { value: "inactive", label: "Deactivated" },
  { value: "pending", label: "Pending" },
];
const DUE_FILTERS = [
  { value: "all", label: "Due: All" },
  { value: "0", label: "Due now" },
  { value: "7", label: "Due in 7 days" },
  { value: "15", label: "Due in 15 days" },
  { value: "30", label: "Due in 30 days" },
];
const TREND_RANGES = [
  { value: "6", label: "Last 6 Months" },
  { value: "12", label: "Last 12 Months" },
  { value: "3", label: "Last 3 Months" },
];
const PAGE_SIZES = ["10", "25", "50", "100"];
const HEADER_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtInt = (n) => (n == null ? DASH : Number(n).toLocaleString("en-IN"));
const fmtMoney = (n, decimals = 2) =>
  n == null
    ? DASH
    : `₹${Number(n).toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
const cycleFee = (amount) => Number((Number(amount) * (1 + GST_RATE / 100)).toFixed(2));
const planLabel = (amount) => `${fmtMoney(amount, 0)} / Month`;
const fmtDay = (day) => (day ? moment(day, DAY).format("DD MMM YYYY") : DASH);
const istToday = () => moment().utcOffset(330).format(DAY);

// Current period, the equal-length one before it, and 12 chart months
// (m0 oldest), as inclusive day ranges.
const buildRanges = (days) => {
  const today = moment(istToday(), DAY);
  const fmt = (m) => m.format(DAY);
  const ranges = [
    { key: "cur", from: fmt(today.clone().subtract(days - 1, "days")), to: fmt(today) },
    {
      key: "prev",
      from: fmt(today.clone().subtract(days * 2 - 1, "days")),
      to: fmt(today.clone().subtract(days, "days")),
    },
  ];
  for (let i = 0; i < 12; i++) {
    const start = today.clone().startOf("month").subtract(11 - i, "months");
    ranges.push({
      key: `m${i}`,
      from: fmt(start),
      to: fmt(moment.min(start.clone().endOf("month"), today)),
    });
  }
  return ranges;
};

// { value, up } percent change, or null when either side is missing / zero.
const delta = (cur, prev) => {
  if (cur == null || prev == null || !prev) return null;
  const change = ((cur - prev) / prev) * 100;
  return { value: `${Math.abs(change).toFixed(1)}%`, up: change >= 0 };
};

// Compact page list: 1 … 4 5 6 … 20.
const pageList = (page, last) => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const keep = [...new Set([1, last, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  const out = [];
  keep.forEach((n, i) => {
    if (i > 0 && n - keep[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
};

// One /getManualSubscriptionsListV2 row -> what the table renders.
const toRow = (r, today) => ({
  key: `${r.kind}-${r.store_id}`,
  storeId: r.store_id,
  name: r.partner_name || DASH,
  phone: r.partner_phone || DASH,
  email: r.partner_email || null,
  city: r.city || null,
  logo: r.partner_logo,
  planAmount: r.plan_amount,
  cycleFee: r.cycle_fee,
  bookings: r.total_booking_count,
  status: r.status,
  owed: r.owed_now,
  storedOwed: r.stored_outstanding,
  nextDue: r.next_due_date,
  daysToDue: r.next_due_date ? moment(r.next_due_date, DAY).diff(moment(today, DAY), "days") : null,
  start: r.activated_at,
  deactivatedAt: r.deactivated_at,
  collected: r.collected_total,
  lastDeducted: r.last_deducted_on,
  needsSubscription: r.needs_subscription,
});

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const SectionTitle = (props) => <BaseSectionTitle size={T.title} {...props} />;

const Delta = ({ value, up }) => (
  <span className={`whitespace-nowrap font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
    {up ? "▲" : "▼"} {value}
  </span>
);

// The salon's own logo when it has one, the shared initials plate otherwise.
const SalonLogo = ({ name, logo, round = false, size = 34 }) => {
  const [failed, setFailed] = useState(false);
  const radius = round ? "rounded-full" : "rounded-lg";
  if (logo && !failed) {
    return (
      <img
        src={getImageUrl(logo)}
        alt=""
        onError={() => setFailed(true)}
        className={`shrink-0 object-cover ${radius}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <BaseSalonLogo name={name} size={size} className={`${radius} ${T.tiny}`} />;
};

// The small bordered dropdowns in the card headers, the filter bar and the
// table footer.
const Select = ({ size = T.xxs, ...props }) => <BaseSelect size={size} {...props} />;

// Donut + right-hand legend, shared by "Subscription Overview" and
// "Plan Distribution" - same shape, different dataset and centre caption.
const DonutPanel = ({ data, total, caption, size }) => {
  const sum = data.reduce((acc, slice) => acc + slice.value, 0);
  const slices = sum ? data : [{ name: "None", value: 1, color: "#E2E8F0" }];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={sum ? 1 : 0}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            {sum > 0 && <Tooltip {...TOOLTIP} />}
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center">
          <span className={`font-extrabold leading-none tracking-tight text-slate-900 ${T.donut}`}>
            {total}
          </span>
          <span className={`mt-1 leading-none text-slate-400 ${T.tiny}`}>{caption}</span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
        {data.length === 0 && <li className={`text-slate-400 ${T.xxs}`}>No subscriptions yet.</li>}
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
            <span className={`min-w-0 flex-1 truncate text-slate-500 ${T.xxs}`}>{slice.name}</span>
            <span className={`shrink-0 whitespace-nowrap font-semibold text-slate-700 ${T.xxs}`}>
              {slice.value} ({sum ? ((slice.value / sum) * 100).toFixed(1) : "0.0"}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Title, breadcrumb and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, search, setSearch }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="hidden items-center gap-1 truncate text-[11px] leading-tight text-slate-400 md:flex">
          Home
          <ChevronRight size={10} className="shrink-0" />
          <span className="text-slate-500">{title}</span>
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 xl:flex">
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium text-slate-600 focus:outline-none"
          >
            {HEADER_RANGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="shrink-0 text-slate-400" />
        </span>

        <HeaderSearch
          value={search}
          onChange={setSearch}
          placeholder="Search partner or plan..."
          width={150}
          shortcut
        />

        <HeaderBell count={12} color={RED} className="text-slate-500" />
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Dialogs - rendered outside ScaledCanvas (a fixed overlay inside the
// transformed canvas would be positioned and scaled relative to it).
// ---------------------------------------------------------------------------

const Dialog = ({ title, subtitle, onClose, busy, children, footer, wide = false }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

const btnGhost = "rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100";
const btnPrimary = "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";

// Assign (new / renew) or edit a subscription's monthly amount.
const PlanDialog = ({ mode, row, candidates, busy, onSubmit, onClose }) => {
  const [storeId, setStoreId] = useState(row ? String(row.storeId) : "");
  const [amount, setAmount] = useState(mode === "edit" && row ? String(row.planAmount) : "");
  const value = Number(amount);
  const valid = value > 0 && storeId;
  const title = { assign: "Assign Subscription", renew: "Renew Subscription", edit: "Edit Subscription" }[mode];

  return (
    <Dialog
      title={title}
      subtitle={row ? row.name : "Pick a partner that has used up its free bookings."}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ storeId: Number(storeId), planAmount: value })}
            disabled={!valid || busy}
            className={btnPrimary}
            style={{ background: BRAND }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      {!row && (
        <label className="mb-3 block text-sm font-semibold text-slate-700">
          Partner
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="">Select a partner…</option>
            {candidates.map((c) => (
              <option key={c.partner_id} value={c.partner_id}>
                {c.partner_name} · {c.total_booking_count} bookings
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <span className="mt-1 block text-xs font-normal text-slate-400">
              No partner currently needs a subscription.
            </span>
          )}
        </label>
      )}

      <label className="block text-sm font-semibold text-slate-700">
        Plan amount (₹ per month, before 18% GST)
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 699 or 999"
          autoFocus
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </label>
      {value > 0 && (
        <p className="mt-1.5 text-xs text-slate-500">
          Deducted per cycle: {fmtMoney(cycleFee(value))} ({fmtMoney(value)} + 18% GST)
        </p>
      )}

      {mode === "edit" ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          The new amount applies from the next billing cycle. Dues already accrued stay as they are.
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          The first month's fee is due today and is deducted from the partner's next daily payout.
        </p>
      )}
      {mode === "renew" && row?.storedOwed > 0 && (
        <p className="mt-2 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          This partner still owes {fmtMoney(row.storedOwed)} from before it was deactivated. Renewing
          carries that over, on top of the new first month.
        </p>
      )}
    </Dialog>
  );
};

// The subscription with what it owes today, and every fee deduction taken
// from its daily payouts.
const ViewDialog = ({ row, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let alive = true;
    dispatch(fetchSubscriptionHistoryV2({ storeId: row.storeId, limit: 100 }))
      .unwrap()
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error: String(error) }));
    return () => {
      alive = false;
    };
  }, [dispatch, row.storeId]);

  const sub = state.data?.subscription;
  const facts = [
    ["Plan", row.planAmount ? `${planLabel(row.planAmount)} + GST = ${fmtMoney(row.cycleFee)}` : DASH],
    ["Started", fmtDay(row.start)],
    [row.status === "inactive" ? "Deactivated" : "Next due date", fmtDay(row.status === "inactive" ? row.deactivatedAt : row.nextDue)],
    ["Owed today", fmtMoney(sub ? sub.owed_now : row.owed)],
    ["Collected so far", fmtMoney(state.data ? state.data.collected_total : row.collected)],
    ["Lifetime bookings", fmtInt(row.bookings)],
  ];

  return (
    <Dialog
      title={row.name}
      subtitle={[row.phone !== DASH && row.phone, row.email, row.city, STATUS[row.status].label]
        .filter(Boolean)
        .join(" · ")}
      onClose={onClose}
      wide
      footer={
        <>
          <button
            type="button"
            onClick={() => navigate(`/invoice/${row.storeId}`)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink size={14} />
            Today's invoice
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>
            Close
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <p className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
        Deductions from payouts{state.data ? ` (${state.data.total})` : ""}
      </p>
      {state.loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : state.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : state.data.deductions.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-sm text-slate-500">
          Nothing deducted yet - fees are recovered when a daily invoice is marked paid.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 font-semibold">Invoice day</th>
                <th className="px-3 py-2 text-right font-semibold">Invoice</th>
                <th className="px-3 py-2 text-right font-semibold">Deducted</th>
                <th className="px-3 py-2 text-right font-semibold">Paid out</th>
                <th className="px-3 py-2 font-semibold">Marked paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.data.deductions.map((d) => (
                <tr key={`${d.invoice_date}-${d.paid_at}`}>
                  <td className="px-3 py-2 text-slate-700">{fmtDay(d.invoice_date)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmtMoney(d.invoice_total)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-violet-600">− {fmtMoney(d.deducted)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{fmtMoney(d.payout_amount)}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {d.paid_at ? moment(d.paid_at).format("DD MMM YYYY, hh:mm A") : DASH}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
};

const FreeLimitDialog = ({ current, busy, onSubmit, onClose }) => {
  const [value, setValue] = useState(current == null ? "" : String(current));
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(n) && n >= 0;
  return (
    <Dialog
      title="Free bookings"
      subtitle="Paid bookings a partner gets before they need a subscription."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(n)}
            disabled={!valid || busy}
            className={btnPrimary}
            style={{ background: BRAND }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
      />
      <p className="mt-2 text-xs text-slate-500">
        Partners at or above this many lifetime paid bookings, with no subscription, appear as
        Pending. 0 means every partner needs one.
      </p>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PartnerSubscriptionsV2 = ({ title = "Partner Subscriptions" }) => {
  const dispatch = useDispatch();
  const {
    needingSubscription,
    actionLoading,
    freeBookingLimit,
    listV2,
    listV2Loading,
    listV2Error,
    summaryV2: summary,
    summaryV2Loading,
    summaryV2Error,
  } = useSelector((state) => state.partnerManualSubscription);

  const [headerRange, setHeaderRange] = useState("30");
  const [overviewPlan, setOverviewPlan] = useState("all");
  const [trendRange, setTrendRange] = useState(TREND_RANGES[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(null);
  const [dialog, setDialog] = useState(null); // { type, row?, mode? }
  const [menuFor, setMenuFor] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const today = istToday();
  const ranges = useMemo(() => buildRanges(Number(headerRange)), [headerRange]);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Any filter change sends the table back to page 1.
  const onFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  // The search box is typed into freely; the API sees it 300ms after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ---- data ---------------------------------------------------------------

  const filters = useMemo(() => {
    const params = {};
    if (search) params.search = search;
    if (status !== "all") params.status = status;
    if (plan !== "all") params.plan_amount = Number(plan);
    if (city !== "all") params.city = city;
    if (dueFilter !== "all") params.due_within = Number(dueFilter);
    return params;
  }, [search, status, plan, city, dueFilter]);

  useEffect(() => {
    dispatch(fetchSubscriptionsListV2({ ...filters, page, limit: Number(pageSize) }));
  }, [dispatch, filters, page, pageSize, reloadKey]);

  useEffect(() => {
    dispatch(
      fetchSubscriptionsSummaryV2({ ranges: ranges.filter((r) => !r.key.startsWith("m")), focus: "cur" })
    );
    setMetricsError(null);
    dispatch(getDashboardV2Metrics(ranges))
      .unwrap()
      .then((data) => setMetrics(data?.ranges || null))
      .catch((error) => setMetricsError(String(error)));
  }, [dispatch, ranges, reloadKey]);

  useEffect(() => {
    dispatch(fetchPartnersNeedingSubscription());
    dispatch(fetchFreeBookingLimit());
  }, [dispatch, reloadKey]);

  // Close the row menu on any click outside it.
  useEffect(() => {
    if (menuFor === null) return undefined;
    const close = (e) => !e.target.closest("[data-sub-menu]") && setMenuFor(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor]);

  const rows = useMemo(() => (listV2?.rows || []).map((r) => toRow(r, today)), [listV2, today]);
  const total = listV2?.total || 0;
  const size = Number(pageSize);
  const lastPage = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, lastPage);

  // ---- KPIs / panels ------------------------------------------------------

  const cur = metrics?.cur;
  const prev = metrics?.prev;
  const collectedCur = summary?.ranges?.cur?.collected;
  const collectedPrev = summary?.ranges?.prev?.collected;

  const kpis = [
    {
      label: "Total Partners",
      value: fmtInt(cur?.total_partners),
      delta: delta(cur?.total_partners, prev?.total_partners),
      icon: Users,
      color: BLUE,
      tint: "#E1EFFE",
    },
    {
      label: "Active Subscriptions",
      value: fmtInt(summary?.live_subscriptions),
      delta: delta(cur?.active_subscriptions, prev?.active_subscriptions),
      icon: ShieldCheck,
      color: GREEN,
      tint: "#DCFCE7",
    },
    {
      label: "Total Bookings (Partners)",
      value: fmtInt(cur?.bookings),
      delta: delta(cur?.bookings, prev?.bookings),
      icon: CalendarDays,
      color: BLUE,
      tint: "#E1EFFE",
    },
    {
      label: "Subscription Revenue",
      value: collectedCur == null ? DASH : fmtMoney(collectedCur, 0),
      delta: delta(collectedCur, collectedPrev),
      note: "Collected from payouts this period",
      icon: IndianRupee,
      color: BRAND,
      tint: "#EDE9FE",
    },
    {
      label: "Outstanding Amount",
      value: summary ? fmtMoney(summary.owed_now, 0) : DASH,
      note: summary ? `${summary.owing_partners} partners owe, as of today` : "",
      icon: AlertTriangle,
      color: AMBER,
      tint: "#FEF3C7",
    },
    {
      label: "Due Soon",
      value: fmtInt(summary?.due_within_7_days),
      note: "Owing now or due within 7 days",
      icon: Clock,
      color: RED,
      tint: "#FEE2E2",
    },
  ];

  const planAmounts = summary?.plan_amounts || [];
  const planOptions = [
    { value: "all", label: "All Plans" },
    ...planAmounts.map((amount) => ({ value: String(amount), label: planLabel(amount) })),
  ];
  const cityOptions = [
    { value: "all", label: "All Cities" },
    ...(summary?.cities || []).map((name) => ({ value: name, label: name })),
  ];

  const overviewCounts =
    overviewPlan === "all"
      ? summary?.counts || {}
      : summary?.counts_by_plan?.[overviewPlan] || { active: 0, due: 0, inactive: 0 };
  const overview = [
    { name: STATUS.active.label, value: overviewCounts.active || 0, color: STATUS.active.color },
    { name: STATUS.due.label, value: overviewCounts.due || 0, color: STATUS.due.color },
    { name: STATUS.inactive.label, value: overviewCounts.inactive || 0, color: STATUS.inactive.color },
    ...(overviewPlan === "all"
      ? [{ name: STATUS.pending.label, value: overviewCounts.pending || 0, color: STATUS.pending.color }]
      : []),
  ];
  const overviewTotal = overview.reduce((acc, slice) => acc + slice.value, 0);
  const overviewLive = overview[0].value + overview[1].value;

  const planDistribution = (summary?.plan_distribution || []).map((p, i) => ({
    name: planLabel(p.plan_amount),
    value: p.count,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  const topPartners = summary?.top_partners || [];
  const topBookings = Math.max(1, ...topPartners.map((p) => p.bookings));

  const trend = useMemo(() => {
    const months = Number(trendRange);
    return Array.from({ length: months }, (_, i) => {
      const index = 12 - months + i;
      const start = moment(istToday(), DAY).startOf("month").subtract(11 - index, "months");
      return {
        month: start.format(months > 6 ? "MMM YY" : "MMM"),
        subs: metrics?.[`m${index}`]?.active_subscriptions ?? 0,
      };
    });
  }, [metrics, trendRange]);

  // ---- actions ------------------------------------------------------------

  const run = async (thunk, args, success) => {
    const toastId = "partner-subscriptions-v2-toast";
    try {
      await dispatch(thunk(args)).unwrap();
      toast.success(success, { id: toastId });
      setDialog(null);
      reload();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Something went wrong", { id: toastId });
    }
  };

  const submitPlan = ({ storeId, planAmount }) => {
    if (dialog.mode === "edit") {
      run(updateSubscription, { storeId, planAmount }, "Subscription updated");
    } else {
      run(
        assignSubscription,
        { storeId, planAmount },
        dialog.mode === "renew" ? "Subscription renewed" : "Subscription assigned"
      );
    }
  };

  const deactivate = (row) => {
    setMenuFor(null);
    if (!window.confirm(`Deactivate ${row.name}'s subscription? Deductions stop until it's renewed.`)) return;
    run(deactivateSubscription, { storeId: row.storeId }, "Subscription deactivated");
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const data = (await dispatch(exportSubscriptionsV2(filters)).unwrap()).map((r) => toRow(r, today));
      if (!data.length) {
        toast.error("Nothing to export", { id: "partner-subscriptions-export" });
        return;
      }
      downloadCsv(
        `partner_subscriptions_${today}.csv`,
        [
          "Partner",
          "Phone",
          "Email",
          "City",
          "Status",
          "Plan (₹/month)",
          "Per cycle incl. GST",
          "Owed today",
          "Collected so far",
          "Start date",
          "Next due date",
          "Lifetime bookings",
        ],
        data.map((row) => [
          row.name,
          row.phone,
          row.email || "",
          row.city || "",
          STATUS[row.status].label,
          row.planAmount ?? "",
          row.cycleFee ?? "",
          row.status === "active" || row.status === "due" ? row.owed : "",
          row.collected,
          row.start || "",
          row.nextDue || "",
          row.bookings,
        ])
      );
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to export", { id: "partner-subscriptions-export" });
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setPlan("all");
    setStatus("all");
    setCity("all");
    setDueFilter("all");
    setPage(1);
    reload();
  };

  const error = listV2Error || summaryV2Error || metricsError;
  const loading = listV2Loading || summaryV2Loading;

  const pageButton = (number) => (
    <button
      key={number}
      type="button"
      onClick={() => setPage(number)}
      className={`h-7 min-w-7 rounded-lg px-1.5 font-semibold transition-colors ${T.xxs} ${
        currentPage === number
          ? "text-white"
          : "border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
      }`}
      style={currentPage === number ? { background: BRAND } : undefined}
    >
      {number}
    </button>
  );

  return (
    <>
      <PageHeader
        title={title}
        range={headerRange}
        setRange={setHeaderRange}
        search={searchInput}
        setSearch={setSearchInput}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {error && (
          <div
            className={`flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 ${T.xs}`}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Failed to load: {error}</span>
            <button type="button" onClick={reload} className="shrink-0 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Action row                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setDialog({ type: "limit" })}
            title="Paid bookings a partner gets before needing a subscription"
            className={`mr-auto flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
          >
            <Settings2 size={14} className="shrink-0 text-slate-500" />
            Free bookings: {freeBookingLimit ?? DASH}
          </button>

          <button
            type="button"
            onClick={exportReport}
            disabled={exporting}
            className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.base}`}
          >
            <Download size={14} className="shrink-0 text-slate-500" />
            {exporting ? "Exporting…" : "Export Report"}
          </button>

          <button
            type="button"
            disabled
            title="Backend pending: there is no API to create partners in bulk"
            className={`flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-400 ${T.base}`}
          >
            <Upload size={14} className="shrink-0" />
            Import Partners
          </button>

          <button
            type="button"
            onClick={() => setDialog({ type: "plan", mode: "assign", row: null })}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold text-white shadow-sm ${T.base}`}
            style={{ background: BRAND }}
          >
            <Plus size={14} className="shrink-0" />
            Add Subscription
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <Card key={kpi.label} className="p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ background: kpi.tint }}
                >
                  <Icon size={15} style={{ color: kpi.color }} />
                </span>
                <p className={`min-w-0 flex-1 truncate font-semibold text-slate-600 ${T.xs}`}>
                  {kpi.label}
                </p>
              </div>

              <p className={`mt-2.5 truncate font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>
                {kpi.value}
              </p>

              <p className={`mt-2 truncate ${T.tiny}`}>
                {kpi.delta ? (
                  <>
                    <Delta value={kpi.delta.value} up={kpi.delta.up} />{" "}
                    <span className="text-slate-400">vs previous period</span>
                  </>
                ) : (
                  <span className="text-slate-400">{kpi.note || "vs previous period: —"}</span>
                )}
              </p>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Overview / trend / top partners / plan mix                       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${PANEL_COLS} ${GAP}`}>
          {/* Subscription overview -------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-3">
              <SectionTitle>Subscription Overview</SectionTitle>
              <Select value={overviewPlan} onChange={setOverviewPlan} options={planOptions} className="w-[120px]" />
            </div>

            <DonutPanel data={overview} total={fmtInt(overviewLive)} caption="Active" size={150} />

            <div className="border-t border-[#EDEFF5] px-3.5 py-2.5">
              <span className={`font-bold ${T.xs}`} style={{ color: GREEN }}>
                {overviewTotal ? `${((overviewLive / overviewTotal) * 100).toFixed(1)}%` : DASH}
              </span>
              <span className={`ml-1.5 text-slate-500 ${T.xs}`}>Active Subscriptions</span>
            </div>
          </Card>

          {/* Subscriptions trend ---------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-3">
              <SectionTitle>Subscriptions Trend</SectionTitle>
              <Select value={trendRange} onChange={setTrendRange} options={TREND_RANGES} className="w-[132px]" />
            </div>

            <div className="h-[196px] w-full px-1.5 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 18, right: 14, bottom: 0, left: -14 }}>
                  <defs>
                    <linearGradient id="subsTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} interval={0} />
                  <YAxis
                    domain={[0, (max) => Math.max(4, max)]}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={48}
                    tickFormatter={(value) => (value >= 1000 ? `${value / 1000}K` : value)}
                  />
                  <Tooltip {...TOOLTIP} />
                  <Area
                    type="linear"
                    dataKey="subs"
                    name="Active subscriptions"
                    stroke={BRAND}
                    strokeWidth={2.5}
                    fill="url(#subsTrendFill)"
                    dot={{ r: 4, fill: BRAND, strokeWidth: 0 }}
                    activeDot={{ r: 5.5 }}
                  >
                    {trend.length <= 6 && (
                      <LabelList
                        dataKey="subs"
                        position="top"
                        offset={9}
                        style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                      />
                    )}
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top partners by bookings ----------------------------------- */}
          {/* Paid bookings in the header period, among active subscribers. */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-3">
              <SectionTitle>Top Partners by Bookings</SectionTitle>
              <button
                type="button"
                onClick={() => onFilter(setStatus)("all")}
                className={`shrink-0 font-semibold ${T.xxs}`}
                style={{ color: BRAND }}
              >
                View All
              </button>
            </div>

            <ul className="flex flex-1 flex-col justify-center gap-2.5 px-3.5 py-2.5">
              {topPartners.length === 0 && (
                <li className={`text-center text-slate-400 ${T.xs}`}>
                  {summaryV2Loading ? "Loading…" : "No bookings for subscribed partners in this period."}
                </li>
              )}
              {topPartners.map((partner) => (
                <li key={partner.store_id} className="flex items-center gap-2.5">
                  <SalonLogo name={partner.partner_name || "?"} logo={partner.partner_logo} round size={30} />

                  <div className="w-[128px] min-w-0 shrink-0 leading-tight">
                    <p className={`truncate font-semibold text-slate-700 ${T.xs}`}>{partner.partner_name}</p>
                    <p className={`truncate text-slate-400 ${T.tiny}`}>{fmtInt(partner.bookings)} bookings</p>
                  </div>

                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEF0F6]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(partner.bookings / topBookings) * 100}%`, background: BRAND }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Plan distribution ------------------------------------------ */}
          <Card>
            <div className="px-3.5 pb-1 pt-3">
              <SectionTitle>Plan Distribution</SectionTitle>
            </div>

            <DonutPanel
              data={planDistribution}
              total={fmtInt(summary?.live_subscriptions)}
              caption="Total"
              size={128}
            />
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Subscriptions table                                              */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          {/* Filter bar ------------------------------------------------- */}
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span className="relative block min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by partner name, phone, email..."
                className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2 pl-9 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
              />
            </span>

            <Select value={plan} onChange={onFilter(setPlan)} options={planOptions} className="w-[150px]" size={T.base} />
            <Select
              value={status}
              onChange={onFilter(setStatus)}
              options={STATUS_FILTERS}
              className="w-[150px]"
              size={T.base}
            />
            <Select
              value={city}
              onChange={onFilter(setCity)}
              options={cityOptions}
              className="w-[150px]"
              size={T.base}
              truncate
            />
            <Select
              value={dueFilter}
              onChange={onFilter(setDueFilter)}
              options={DUE_FILTERS}
              className="w-[150px]"
              size={T.base}
            />

            <button
              type="button"
              onClick={resetFilters}
              disabled={loading}
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
              aria-label="Reset filters and refresh"
              title="Reset filters and refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Table ------------------------------------------------------ */}
          <table
            className={`w-full table-fixed border-collapse text-left transition-opacity ${
              listV2Loading && rows.length ? "opacity-60" : ""
            }`}
          >
            <colgroup>
              <col style={{ width: 15 }} />
              <col style={{ width: 52 }} />
              <col style={{ width: 242 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 175 }} />
              <col style={{ width: 105 }} />
              <col style={{ width: 167 }} />
              <col style={{ width: 125 }} />
              <col style={{ width: 125 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 153 }} />
              <col style={{ width: 25 }} />
            </colgroup>

            <thead>
              <tr className="border-y border-[#EDEFF5] bg-[#F9FAFC]">
                <th />
                {["#", "Partner", "Contact", "Plan", "Bookings", "Amount (+18% GST)", "Status", "Start Date", "Next Due Date"].map(
                  (column) => (
                    <th
                      key={column}
                      className={`whitespace-nowrap py-2.5 pr-2 font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                    >
                      {column}
                    </th>
                  )
                )}
                <th
                  className={`whitespace-nowrap py-2.5 pr-2 text-center font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                >
                  Actions
                </th>
                <th />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className={`py-10 text-center text-slate-400 ${T.xs}`}>
                    {listV2Loading ? "Loading subscriptions…" : "No partners match these filters."}
                  </td>
                </tr>
              )}

              {rows.map((row, index) => {
                const live = row.status === "active" || row.status === "due";
                return (
                  <tr
                    key={row.key}
                    className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                  >
                    <td />

                    <td className={`py-2.5 pr-2 align-middle text-slate-400 ${T.xs}`}>
                      {(currentPage - 1) * size + index + 1}
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <SalonLogo name={row.name} logo={row.logo} />
                        <span className="min-w-0 leading-tight">
                          <span className={`block truncate font-semibold text-slate-800 ${T.xs}`}>{row.name}</span>
                          <span className={`block truncate text-slate-400 ${T.tiny}`}>
                            {row.email || `Partner #${row.storeId}`}
                          </span>
                        </span>
                      </span>
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      <span className={`block whitespace-nowrap text-slate-600 ${T.xs}`}>{row.phone}</span>
                      {row.city && <span className={`block truncate text-slate-400 ${T.tiny}`}>{row.city}</span>}
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      {row.planAmount ? (
                        <Chip className="bg-violet-50 text-violet-600">{planLabel(row.planAmount)}</Chip>
                      ) : (
                        <span className={`text-slate-400 ${T.xs}`}>No plan yet</span>
                      )}
                      {row.needsSubscription && (
                        <span className={`mt-1 block truncate text-violet-500 ${T.tiny}`}>Over free limit</span>
                      )}
                    </td>

                    <td
                      className={`whitespace-nowrap py-2.5 pr-2 align-middle font-semibold text-slate-700 ${T.xs}`}
                      title="Lifetime paid bookings"
                    >
                      {fmtInt(row.bookings)}
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      {row.planAmount ? (
                        <>
                          <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.sm}`}>
                            {fmtMoney(row.cycleFee)}
                          </span>
                          <span className={`block truncate text-slate-400 ${T.tiny}`}>
                            {fmtMoney(row.planAmount)} + GST
                          </span>
                        </>
                      ) : (
                        <span className={`text-slate-400 ${T.xs}`}>{DASH}</span>
                      )}
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <Chip className={STATUS[row.status].chip}>{STATUS[row.status].label}</Chip>
                    </td>

                    <td className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}>
                      {fmtDay(row.start)}
                    </td>

                    <td className="py-2.5 pr-2 align-middle leading-tight">
                      {live ? (
                        <>
                          <span className={`block whitespace-nowrap text-slate-700 ${T.xs}`}>{fmtDay(row.nextDue)}</span>
                          <span
                            className={`block whitespace-nowrap font-semibold ${T.tiny}`}
                            style={{ color: row.owed > 0 ? RED : row.daysToDue <= 7 ? AMBER : GREEN }}
                          >
                            {row.owed > 0
                              ? `${fmtMoney(row.owed)} owed now`
                              : `${row.daysToDue} day${row.daysToDue === 1 ? "" : "s"} left`}
                          </span>
                        </>
                      ) : row.status === "pending" ? (
                        <span className={`text-slate-400 ${T.tiny}`}>Needs a subscription</span>
                      ) : (
                        <span className={`block text-slate-400 ${T.tiny}`}>
                          Deactivated {row.deactivatedAt ? fmtDay(row.deactivatedAt) : ""}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 pr-2 align-middle">
                      <span className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDialog({ type: "view", row })}
                          disabled={row.status === "pending"}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                          aria-label="View subscription"
                          title="View dues and deductions"
                        >
                          <Eye size={13} />
                        </button>

                        {row.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => setDialog({ type: "plan", mode: "assign", row })}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white transition-colors hover:bg-slate-50"
                            style={{ color: BRAND }}
                            aria-label="Assign subscription"
                            title="Assign subscription"
                          >
                            <Plus size={13} />
                          </button>
                        ) : row.status === "inactive" ? (
                          <button
                            type="button"
                            onClick={() => setDialog({ type: "plan", mode: "renew", row })}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white transition-colors hover:bg-slate-50"
                            style={{ color: BLUE }}
                            aria-label="Renew subscription"
                            title="Renew subscription"
                          >
                            <RefreshCw size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDialog({ type: "plan", mode: "edit", row })}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50"
                            aria-label="Edit subscription"
                            title="Edit amount"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        <span data-sub-menu className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuFor(menuFor === row.key ? null : row.key)}
                            disabled={!live}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                            aria-label="More actions"
                            aria-expanded={menuFor === row.key}
                          >
                            <MoreVertical size={13} />
                          </button>
                          {menuFor === row.key && (
                            <span
                              role="menu"
                              className={`absolute right-0 top-8 z-20 flex w-[170px] flex-col rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg ${T.xs}`}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                disabled={actionLoading}
                                onClick={() => deactivate(row)}
                                className="flex items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                              >
                                <Power size={14} />
                                Deactivate
                              </button>
                            </span>
                          )}
                        </span>
                      </span>
                    </td>

                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer ----------------------------------------------------- */}
          <div className="flex items-center gap-4 border-t border-[#EDEFF5] px-3.5 py-3">
            <span className={`whitespace-nowrap text-slate-400 ${T.xxs}`}>
              {total === 0
                ? "Showing 0 partners"
                : `Showing ${fmtInt((currentPage - 1) * size + 1)} to ${fmtInt(
                    Math.min(currentPage * size, total)
                  )} of ${fmtInt(total)} partners`}
            </span>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:text-slate-300"
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
              </button>

              {pageList(currentPage, lastPage).map((item) =>
                typeof item === "number" ? (
                  pageButton(item)
                ) : (
                  <span key={item} className={`px-0.5 text-slate-400 ${T.xxs}`}>
                    ...
                  </span>
                )
              )}

              <button
                type="button"
                onClick={() => setPage(Math.min(lastPage, currentPage + 1))}
                disabled={currentPage === lastPage}
                className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:text-slate-300"
                aria-label="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={`whitespace-nowrap text-slate-400 ${T.xxs}`}>Rows per page</span>
              <Select value={pageSize} onChange={onFilter(setPageSize)} options={PAGE_SIZES} className="w-[68px]" />
            </div>
          </div>
        </Card>
      </ScaledCanvas>

      {dialog?.type === "plan" && (
        <PlanDialog
          mode={dialog.mode}
          row={dialog.row}
          candidates={needingSubscription || []}
          busy={actionLoading}
          onSubmit={submitPlan}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "view" && <ViewDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.type === "limit" && (
        <FreeLimitDialog
          current={freeBookingLimit}
          busy={actionLoading}
          onSubmit={(limit) => run(updateFreeBookingLimit, { limit }, "Free booking limit updated")}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
};

export default PartnerSubscriptionsV2;
