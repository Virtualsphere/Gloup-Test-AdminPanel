import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileDown,
  IndianRupee,
  Lightbulb,
  MoreVertical,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD } from "../v2/tokens";
import { Card, Chip as BaseChip, HeaderBell, HeaderSearch } from "../v2/ui";
import { useListUiState } from "../../hooks/useListUiState";
import { downloadCsv } from "../../utils/format";
import {
  bookingpdfDownload,
  fetchBookingsByOrderDate,
  fetchBookingsListV2,
  fetchBookingsSummaryV2,
  fetchTopSalonsByDateRange,
  getBookingsListV2,
  refundBooking,
  updateBookingStatus,
} from "../../redux/slices/bookingSlice";
import { fetchServiceCategories } from "../../redux/slices/partnersSlice";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Bookings by Order Date" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// The table comes from /admin/app/getBookingsListV2 (phone, salon city, slot
// time, services/categories, and SQL-side search / payment / booking-type
// filters). Like the V1 page it filters on the appointment date
// (booking_date), despite the page name. Counts (KPIs, status donut, today's
// activity) are V1's /getBookingsDetailsByOrderDate totalCount with limit 1;
// Top Performing Salon is /getTopSalonsByDateRange; revenue, avg order value,
// today's revenue and peak hours are /getBookingsSummaryV2 (revenue uses the
// invoice pages' pricing rule, peak hours = hour the booking was placed).
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1320;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const AMBER = "#F5A623";
const VIOLET = "#7C3AED";
const SLATE = "#94A3B8";

// Measured card widths from the mockup, used directly as grid fr units.
const MAIN_COLS = "grid-cols-[1040fr_267fr]";
const BOTTOM_COLS = "grid-cols-[372fr_356fr_592fr]";

// Type scale in design px on the 1320px canvas. See the note above before
// changing these.
const T = {
  xxs: "text-[9px]", // GST sub-line, donut caption
  xs: "text-[10px]", // chips, legend, breadcrumb
  sm: "text-[11px]", // table headers, secondary cell text
  base: "text-[12px]", // body, buttons, card headings
  md: "text-[13px]", // emphasised body
  kpi: "text-[26px]", // KPI values
  h1: "text-[20px]", // page title
};

const GAP = "gap-3";

// Default window, matching the mockup's "vs last 30 days".
const DEFAULT_DAYS = 30;
const ROWS_PER_PAGE = ["10", "25", "50", "100"];
// Upper bound for "Export Report" in one request.
const EXPORT_LIMIT = 10000;

const UI_KEY = "bookingsByOrderDateV2";

// Payment tab -> getBookingsListV2 `payment` filter.
const PAYMENT_TAB_FILTER = { All: "", Paid: "paid", Unpaid: "unpaid" };
// Search hits the API, so wait for typing to pause.
const SEARCH_DEBOUNCE_MS = 350;

// appointments.status values, in donut order.
const STATUS_META = {
  completed: { label: "Completed", color: GREEN, chip: "bg-emerald-50 text-emerald-600" },
  booked: { label: "Booked", color: AMBER, chip: "bg-amber-50 text-amber-600" },
  confirmed: { label: "Confirmed", color: BLUE, chip: "bg-sky-50 text-sky-600" },
  cancelled: { label: "Cancelled", color: RED, chip: "bg-rose-50 text-rose-500" },
  refunded: { label: "Refunded", color: VIOLET, chip: "bg-violet-50 text-violet-600" },
  pending: { label: "Pending", color: SLATE, chip: "bg-slate-100 text-slate-500" },
};
const COUNTED_STATUSES = ["completed", "booked", "confirmed", "cancelled", "refunded"];

// getBookingsListV2 `payment` filters, in donut order.
const PAYMENT_META = {
  paid: { label: "Paid", color: GREEN },
  unpaid: { label: "Unpaid", color: AMBER },
  failed: { label: "Failed", color: SLATE },
  refunded: { label: "Refunded", color: VIOLET },
};
const COUNTED_PAYMENTS = Object.keys(PAYMENT_META);

const PAYMENT_STYLES = {
  Paid: "bg-emerald-50 text-emerald-600",
  Unpaid: "bg-rose-50 text-rose-500",
  Failed: "bg-slate-100 text-slate-500",
  Refunded: "bg-violet-50 text-violet-600",
};

// Both spellings are written by the booking flow.
const PAID_STATUSES = ["success", "sucssess"];

const paymentLabel = (row) => {
  if (row.status === "refunded") return "Refunded";
  if (PAID_STATUSES.includes(row.payment_status)) return "Paid";
  if (row.payment_status === "failed") return "Failed";
  return "Unpaid";
};

// Row menu, mirroring the booking detail page (BookingForm) and the backend's
// rules: ALLOWED_STATUS_TRANSITIONS for status changes, and refunds only for
// completed bookings whose payment_status is exactly "success".
const rowActions = (row) => [
  { key: "view", label: "View details", icon: Eye },
  row.status === "booked" && { key: "confirmed", label: "Confirm booking", icon: CheckCircle2 },
  row.status === "confirmed" && { key: "completed", label: "Mark completed", icon: CheckCircle2 },
  ["booked", "confirmed"].includes(row.status) && { key: "cancel", label: "Cancel booking", icon: XCircle, danger: true },
  row.status === "completed" && row.payment_status === "success" && { key: "refund", label: "Mark refunded", icon: Wallet, danger: true },
  { key: "pdf", label: "Download PDF", icon: FileDown },
].filter(Boolean);

// The mockup uses photo avatars; initials on a tinted disc stand in for them
// until the API returns user images.
const AVATAR_TINTS = [
  ["#E6EFFF", BLUE],
  ["#FDE6F0", "#DB2777"],
  ["#E1F7EC", "#0E9384"],
  ["#FFF2DC", "#E08700"],
  ["#EDE7FF", BRAND],
];

// ---------------------------------------------------------------------------
// Date + number helpers
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
};
const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;

// "2026-09-03" -> "03 Sep, 2026"
const fmtYmd = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d} ${MONTHS[Number(m) - 1]}, ${y}`;
};
// "2026-09-03" -> "Sep 3, 2026" (app-bar range label)
const fmtYmdLong = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// created_at comes back as a UTC ISO string; show it in IST.
const IST_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const fmtOrderTime = (value) => {
  if (!value) return { date: "—", time: "" };
  const parts = Object.fromEntries(
    IST_PARTS.formatToParts(new Date(value)).map((p) => [p.type, p.value])
  );
  return {
    // Month as a number, mapped through MONTHS - en-GB spells September "Sept".
    date: `${parts.day} ${MONTHS[Number(parts.month) - 1]}, ${parts.year}`,
    time: `${parts.hour}:${parts.minute} ${String(parts.dayPeriod || "").toUpperCase()}`,
  };
};

// Slots.from "14:30:00" -> "02:30 PM"
const fmtSlot = (value) => {
  if (!value) return "";
  const [h, m] = String(value).split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return `${pad2(((h + 11) % 12) + 1)}:${pad2(m || 0)} ${h >= 12 ? "PM" : "AM"}`;
};

// Peak Booking Hours: the busiest run of this many consecutive hours.
const PEAK_WINDOW_HOURS = 3;
// 24 heat cells share the width evenly, so ticks every 4 hours line up.
const HOUR_TICKS = ["12AM", "4AM", "8AM", "12PM", "4PM", "8PM", "12AM"];

// 0-24 -> "12:00 AM" … "11:00 PM" (24 wraps to midnight).
const hourLabel = (hour) => {
  const h = hour % 24;
  return `${((h + 11) % 12) + 1}:00 ${h >= 12 ? "PM" : "AM"}`;
};

// { start, total } of the busiest PEAK_WINDOW_HOURS-hour run, or null if empty.
const peakWindow = (hours) => {
  let best = null;
  for (let start = 0; start + PEAK_WINDOW_HOURS <= hours.length; start++) {
    const total = hours.slice(start, start + PEAK_WINDOW_HOURS).reduce((a, b) => a + b, 0);
    if (total > 0 && (!best || total > best.total)) best = { start, total };
  }
  return best;
};

const DASH = "—";
const fmtInt = (v) => (v == null ? DASH : Number(v).toLocaleString("en-IN"));
const fmtInr = (v) =>
  v == null || Number.isNaN(Number(v))
    ? DASH
    : `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctOf = (part, total) => (part == null || !total ? null : (part / total) * 100);
const pctChange = (cur, prev) => (cur == null || !prev ? null : ((cur - prev) / prev) * 100);

const defaultUi = () => {
  const today = ymd(new Date());
  return {
    fromDate: addDays(today, -(DEFAULT_DAYS - 1)),
    toDate: today,
    status: "",
    paymentTab: "All",
    bookingType: "",
    search: "",
    page: 1,
    rowsPerPage: "10",
  };
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardTitle = ({ children, right }) => (
  <div className="mb-2.5 flex items-center justify-between gap-2">
    <h2 className={`font-bold text-slate-900 ${T.base}`}>{children}</h2>
    {right}
  </div>
);

const Delta = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${
      up ? "text-emerald-500" : "text-rose-500"
    }`}
  >
    {up ? "↑" : "↓"} {value}
  </span>
);

const Chip = (props) => <BaseChip size={`px-1.5 py-[3px] ${T.xs}`} {...props} />;

const Checkbox = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    aria-label={label}
    className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border transition-colors ${
      checked ? "border-transparent" : "border-slate-300 bg-white"
    }`}
    style={checked ? { background: BRAND } : undefined}
  >
    {checked && (
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
        <path
          d="M2.5 6.2 5 8.6l4.5-5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);

const IconButton = ({ children, label, onClick }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
  >
    {children}
  </button>
);

const Avatar = ({ name, index }) => {
  const [tint, color] = AVATAR_TINTS[index % AVATAR_TINTS.length];
  const initials =
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-bold ${T.xs}`}
      style={{ background: tint, color }}
    >
      {initials}
    </span>
  );
};

const RowMenu = ({ row, open, onToggle, onAction }) => (
  <span className="relative" data-row-menu>
    <IconButton label="More actions" onClick={onToggle}>
      <MoreVertical size={12} />
    </IconButton>
    {open && (
      <div className="absolute right-0 top-full z-30 mt-1 w-[150px] rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg">
        {rowActions(row).map(({ key, label, icon: Icon, danger }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAction(key, row)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-medium hover:bg-slate-50 ${T.sm} ${
              danger ? "text-rose-500" : "text-slate-700"
            }`}
          >
            <Icon size={12} className="shrink-0" />
            {label}
          </button>
        ))}
      </div>
    )}
  </span>
);

const CONFIRM_COPY = {
  cancel: {
    title: "Cancel this booking?",
    body: (row) => `Booking #${row.id} for ${row.user_name || "this customer"} at ${row.salon_name || "the salon"} will be cancelled. This can't be undone.`,
    action: "Cancel booking",
  },
  refund: {
    title: "Mark this booking as refunded?",
    body: (row) => `Booking #${row.id} will be set to Refunded and the customer gets a WhatsApp refund message. No money is sent - the Razorpay refund isn't built in the backend yet, so refund the payment separately.`,
    action: "Mark refunded",
  },
};

// Rendered outside ScaledCanvas - a fixed overlay inside the transformed
// canvas would be positioned (and scaled) relative to it.
const ConfirmDialog = ({ confirming, busy, onCancel, onConfirm }) => {
  const copy = CONFIRM_COPY[confirming.key];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={copy.title}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-extrabold text-slate-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{copy.body(confirming.row)}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {busy ? "Working…" : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
};

const DateInput = ({ value, onChange, inputRef, label }) => (
  <input
    ref={inputRef}
    type="date"
    value={value}
    aria-label={label}
    onChange={(e) => e.target.value && onChange(e.target.value)}
    className={`w-[128px] shrink-0 rounded-xl border border-[#E6E8F0] bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none ${T.base}`}
  />
);

// Donut + legend, shared by the two breakdown cards on the right rail.
const DonutCard = ({ title, total, slices }) => (
  <Card className="p-3.5">
    <CardTitle>{title}</CardTitle>

    <div className="flex items-center gap-2.5">
      <div className="relative h-[96px] w-[96px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.length ? slices : [{ label: "None", value: 1, color: "#EEF1F6" }]}
              dataKey="value"
              innerRadius={29}
              outerRadius={46}
              paddingAngle={slices.length > 1 ? 2 : 0}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {(slices.length ? slices : [{ label: "None", color: "#EEF1F6" }]).map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-extrabold tracking-tight text-slate-900 ${T.base}`}>
            {total}
          </span>
          <span className={`text-slate-400 ${T.xxs}`}>Total</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between gap-1.5">
            <span className={`flex min-w-0 items-center gap-1.5 text-slate-600 ${T.xs}`}>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className={`shrink-0 whitespace-nowrap text-slate-400 ${T.xxs}`}>
              {slice.value.toLocaleString("en-IN")} ({slice.pct})
            </span>
          </div>
        ))}
        {slices.length === 0 && (
          <span className={`text-slate-400 ${T.xs}`}>No bookings in this range</span>
        )}
      </div>
    </div>
  </Card>
);

// Title, breadcrumb and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, rangeLabel, onRangeClick, search, setSearch }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="hidden items-center gap-1 truncate text-[11px] leading-tight text-slate-400 md:flex">
          Home
          <ChevronRight size={10} className="shrink-0" />
          Bookings
          <ChevronRight size={10} className="shrink-0" />
          <span className="font-semibold" style={{ color: BRAND }}>
            By Order Date
          </span>
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onRangeClick}
          className="hidden items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 xl:flex"
        >
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          {rangeLabel}
          <ChevronDown size={13} className="shrink-0 text-slate-400" />
        </button>

        <HeaderSearch
          value={search}
          onChange={setSearch}
          placeholder="Search booking ID, user, phone, salon..."
          width={180}
          shortcut
        />

        <HeaderBell count={12} color={RED} className="text-slate-500" />
      </div>
    </div>
  </PageHeaderPortal>
);

// Page buttons: 1 … (page-1) page (page+1) … last
const pageNumbers = (page, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = [1];
  if (page > 3) pages.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
  if (page < totalPages - 2) pages.push("…");
  pages.push(totalPages);
  return pages;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BookingsByOrderDateV2 = ({ title = "Bookings by Order Date" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fromInputRef = useRef(null);

  const defaults = useMemo(defaultUi, []);
  const [ui, setField] = useListUiState(UI_KEY, defaults);
  const { fromDate, toDate, status, paymentTab, bookingType, search, page, rowsPerPage } = ui;
  const limit = Number(rowsPerPage);

  const [selected, setSelected] = useState([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [counts, setCounts] = useState(null);
  const [today, setToday] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [topSalon, setTopSalon] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const {
    bookingsV2 = [],
    totalV2 = 0,
    loadingV2,
    errorV2,
  } = useSelector((state) => state.allBookings || {});
  const serviceCategories = useSelector((state) => state.allPartners?.serviceCategories);

  useEffect(() => {
    if (!Array.isArray(serviceCategories) || serviceCategories.length === 0) {
      dispatch(fetchServiceCategories());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // Any filter change goes back to page 1.
  const setFilter = (field, value) => {
    setField(field, value);
    setField("page", 1);
    setSelected([]);
  };

  // ---- Table page (every filter runs in SQL) ------------------------------
  const listFilters = useMemo(
    () => ({
      fromDate,
      toDate,
      status,
      payment: PAYMENT_TAB_FILTER[paymentTab] || "",
      search: debouncedSearch.trim(),
      service_category_id: bookingType,
    }),
    [fromDate, toDate, status, paymentTab, debouncedSearch, bookingType]
  );

  useEffect(() => {
    dispatch(getBookingsListV2({ ...listFilters, page, limit }));
  }, [dispatch, listFilters, page, limit, reloadKey]);

  // ---- Top performing salon for the range ---------------------------------
  useEffect(() => {
    let cancelled = false;
    dispatch(fetchTopSalonsByDateRange({ fromDate, toDate, limit: 1 }))
      .unwrap()
      .then((salons) => !cancelled && setTopSalon({ salon: salons[0] || null }))
      .catch(() => !cancelled && setTopSalon({ failed: true }));
    return () => {
      cancelled = true;
    };
  }, [dispatch, fromDate, toDate, reloadKey]);

  // ---- Revenue (invoice rule), AOV, today's revenue, booking hours ---------
  // The previous equal period is fetched too, for the KPI deltas.
  useEffect(() => {
    let cancelled = false;
    const len = daysBetween(fromDate, toDate);
    const prevTo = addDays(fromDate, -1);
    const prevFrom = addDays(prevTo, -(len - 1));
    Promise.all([
      dispatch(fetchBookingsSummaryV2({ fromDate, toDate })).unwrap(),
      dispatch(fetchBookingsSummaryV2({ fromDate: prevFrom, toDate: prevTo })).unwrap(),
    ])
      .then(([current, previous]) => !cancelled && setSummary({ current, previous }))
      .catch(() => !cancelled && setSummary({ failed: true }));
    return () => {
      cancelled = true;
    };
  }, [dispatch, fromDate, toDate, reloadKey]);

  // ---- Range counts: total, per status, and the previous equal period -----
  const count = useCallback(
    (params) => dispatch(fetchBookingsByOrderDate({ ...params, limit: 1 })).unwrap().then((r) => r.total),
    [dispatch]
  );
  // Payment split needs getBookingsListV2's payment filter.
  const countByPayment = useCallback(
    (params) => dispatch(fetchBookingsListV2({ ...params, limit: 1 })).unwrap().then((r) => r.total),
    [dispatch]
  );

  useEffect(() => {
    let cancelled = false;
    const len = daysBetween(fromDate, toDate);
    const prevTo = addDays(fromDate, -1);
    const prevFrom = addDays(prevTo, -(len - 1));

    Promise.all([
      count({ fromDate, toDate }),
      count({ fromDate: prevFrom, toDate: prevTo }),
      ...COUNTED_STATUSES.map((s) => count({ fromDate, toDate, status: s })),
      ...COUNTED_PAYMENTS.map((payment) => countByPayment({ fromDate, toDate, payment })),
    ])
      .then(([total, previous, ...rest]) => {
        if (cancelled) return;
        const byStatus = rest.slice(0, COUNTED_STATUSES.length);
        const byPayment = rest.slice(COUNTED_STATUSES.length);
        setCounts({
          total,
          previous,
          days: len,
          byStatus: Object.fromEntries(COUNTED_STATUSES.map((s, i) => [s, byStatus[i]])),
          byPayment: Object.fromEntries(COUNTED_PAYMENTS.map((p, i) => [p, byPayment[i]])),
        });
      })
      .catch(() => !cancelled && setCounts({ failed: true }));

    return () => {
      cancelled = true;
    };
  }, [count, countByPayment, fromDate, toDate, reloadKey]);

  // ---- Today's activity (appointments dated today) ------------------------
  useEffect(() => {
    let cancelled = false;
    const day = ymd(new Date());
    Promise.all([
      count({ fromDate: day, toDate: day }),
      count({ fromDate: day, toDate: day, status: "completed" }),
      count({ fromDate: day, toDate: day, status: "cancelled" }),
    ])
      .then(([scheduled, completed, cancelledCount]) => {
        if (!cancelled) setToday({ scheduled, completed, cancelled: cancelledCount });
      })
      .catch(() => !cancelled && setToday({ failed: true }));
    return () => {
      cancelled = true;
    };
  }, [count, reloadKey]);

  const rows = Array.isArray(bookingsV2) ? bookingsV2 : [];
  const total = Number(totalV2) || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const toggleRow = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelected(allSelected ? [] : rows.map((row) => row.id));

  const copyId = (id) => {
    navigator.clipboard?.writeText(String(id));
    toast.success(`Copied #${id}`, { id: "copy-booking-id" });
  };

  const refresh = () => setReloadKey((k) => k + 1);

  // Close the row menu on any click outside it.
  useEffect(() => {
    if (menuFor == null) return undefined;
    const close = (e) => !e.target.closest("[data-row-menu]") && setMenuFor(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor]);

  const changeStatus = async (row, nextStatus) => {
    setActionBusy(true);
    try {
      await dispatch(updateBookingStatus({ id: row.id, status: nextStatus })).unwrap();
      const label = STATUS_META[nextStatus]?.label.toLowerCase() || nextStatus;
      toast.success(`Booking #${row.id} ${label}`, { id: "booking-action-toast" });
      refresh();
      return true;
    } catch {
      toast.error(`Couldn't update booking #${row.id}`, { id: "booking-action-toast" });
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const downloadPdf = async (id) => {
    const toastId = toast.loading("Generating PDF...", { id: "booking-pdf-toast" });
    try {
      const blob = await dispatch(bookingpdfDownload(id)).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Booking_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: toastId });
    } catch {
      toast.error("Failed to download PDF", { id: toastId });
    }
  };

  const runAction = (key, row) => {
    setMenuFor(null);
    if (key === "view") navigate(`/bookings/${row.id}`);
    else if (key === "pdf") downloadPdf(row.id);
    else if (key === "cancel" || key === "refund") setConfirming({ key, row });
    else changeStatus(row, key);
  };

  const confirmAction = async () => {
    const { key, row } = confirming;
    if (key === "cancel") {
      if (await changeStatus(row, "cancelled")) setConfirming(null);
      return;
    }
    setActionBusy(true);
    try {
      await dispatch(refundBooking({ id: row.id })).unwrap();
      toast.success(`Booking #${row.id} marked refunded`, { id: "booking-action-toast" });
      setConfirming(null);
      refresh();
    } catch {
      toast.error(`Couldn't refund booking #${row.id}`, { id: "booking-action-toast" });
    } finally {
      setActionBusy(false);
    }
  };

  const clearFilters = () => {
    const fresh = defaultUi();
    Object.entries(fresh).forEach(([field, value]) => setField(field, value));
    setSelected([]);
  };

  // ---- Export: selected rows, or every booking matching the filters -------
  const csvRow = (row) => {
    const order = fmtOrderTime(row.created_at);
    return [
      row.id,
      row.user_name || "",
      row.user_phone || "",
      row.salon_name || "",
      [row.salon_area, row.salon_city].filter(Boolean).join(", "),
      (row.service_categories || []).join(" / "),
      (row.services || []).join(" / "),
      STATUS_META[row.status]?.label || row.status || "",
      paymentLabel(row),
      Number(row.discounted_amount).toFixed(2),
      Number(row.gst_amount).toFixed(2),
      Number(row.payable_amount).toFixed(2),
      `${order.date} ${order.time}`.trim(),
      fmtYmd(row.booking_date),
      fmtSlot(row.slot_from),
    ];
  };

  const exportReport = async () => {
    const header = ["Booking ID", "User", "Phone", "Salon", "Salon Area / City", "Booking Type", "Services", "Status", "Payment", "Amount", "GST", "Payable", "Order Date", "Booking Date", "Booking Time"];
    if (selected.length) {
      const picked = rows.filter((r) => selected.includes(r.id));
      downloadCsv(`bookings-selected-${fromDate}-to-${toDate}.csv`, header, picked.map(csvRow));
      return;
    }
    setExporting(true);
    try {
      const { rows: all, total: found } = await dispatch(
        fetchBookingsListV2({ ...listFilters, page: 1, limit: EXPORT_LIMIT })
      ).unwrap();
      if (found > EXPORT_LIMIT) {
        toast(`Exported the first ${EXPORT_LIMIT.toLocaleString("en-IN")} of ${found.toLocaleString("en-IN")} bookings - narrow the date range for the rest.`, { id: "bookings-export-toast" });
      }
      downloadCsv(`bookings-${fromDate}-to-${toDate}.csv`, header, all.map(csvRow));
    } catch (error) {
      toast.error(String(error || "Export failed"), { id: "bookings-export-toast" });
    } finally {
      setExporting(false);
    }
  };

  // ---- KPIs + breakdowns ---------------------------------------------------
  const ok = counts && !counts.failed;
  const byStatus = ok ? counts.byStatus : {};
  const rangeTotal = ok ? counts.total : null;
  const change = ok ? pctChange(counts.total, counts.previous) : null;
  const compareLabel = ok ? `vs previous ${counts.days} day${counts.days === 1 ? "" : "s"}` : "";
  const noteOf = (v) => {
    const p = pctOf(v, rangeTotal);
    return p == null ? DASH : `${p.toFixed(1)}% of total`;
  };

  // Revenue summary (null until loaded / on failure).
  const cur = summary && !summary.failed ? summary.current : null;
  const prev = summary && !summary.failed ? summary.previous : null;
  const toDelta = (p) => (p == null ? null : { value: `${Math.abs(p).toFixed(1)}%`, up: p >= 0 });
  const hours = cur?.booking_hours || [];
  const peak = peakWindow(hours);
  const maxHour = Math.max(0, ...hours);

  const kpis = [
    {
      label: "Total Bookings",
      value: fmtInt(rangeTotal),
      delta: change == null ? null : { value: `${Math.abs(change).toFixed(1)}%`, up: change >= 0 },
      sub: compareLabel,
      icon: Users,
      color: BLUE,
      tint: "#E6EFFF",
    },
    { label: "Completed", value: fmtInt(byStatus.completed), note: noteOf(byStatus.completed), icon: CheckCircle2, color: GREEN, solid: true, round: true },
    { label: "Booked", value: fmtInt(byStatus.booked), note: noteOf(byStatus.booked), icon: Package, color: AMBER, solid: true },
    { label: "Cancelled", value: fmtInt(byStatus.cancelled), note: noteOf(byStatus.cancelled), icon: XCircle, color: RED, solid: true, round: true },
    {
      label: "Total Revenue",
      value: cur ? `₹${Math.round(cur.revenue).toLocaleString("en-IN")}` : DASH,
      delta: toDelta(cur && prev ? pctChange(cur.revenue, prev.revenue) : null),
      sub: compareLabel,
      icon: Building2,
      color: GREEN,
      solid: true,
    },
    {
      label: "Avg. Order Value",
      value: fmtInr(cur?.avg_order_value),
      delta: toDelta(cur && prev ? pctChange(cur.avg_order_value, prev.avg_order_value) : null),
      sub: compareLabel,
      icon: Wallet,
      color: VIOLET,
      solid: true,
    },
  ];

  const statusSlices = ok
    ? [
      ...COUNTED_STATUSES.map((s) => ({ key: s, value: byStatus[s] })),
      // Anything else (e.g. checkouts still awaiting payment).
      { key: "pending", value: Math.max(0, rangeTotal - COUNTED_STATUSES.reduce((a, s) => a + byStatus[s], 0)) },
    ]
      .filter((s) => s.value > 0)
      .map((s) => ({
        label: s.key === "pending" ? "Other" : STATUS_META[s.key].label,
        value: s.value,
        pct: `${pctOf(s.value, rangeTotal).toFixed(1)}%`,
        color: STATUS_META[s.key].color,
      }))
    : [];

  const paymentSlices = ok
    ? [
      ...COUNTED_PAYMENTS.map((key) => ({ key, value: counts.byPayment[key] })),
      { key: "other", value: Math.max(0, rangeTotal - COUNTED_PAYMENTS.reduce((a, k) => a + counts.byPayment[k], 0)) },
    ]
      .filter((slice) => slice.value > 0)
      .map((slice) => ({
        label: slice.key === "other" ? "Other" : PAYMENT_META[slice.key].label,
        value: slice.value,
        pct: `${pctOf(slice.value, rangeTotal).toFixed(1)}%`,
        color: slice.key === "other" ? "#CBD5E1" : PAYMENT_META[slice.key].color,
      }))
    : [];

  const todayRows = [
    { label: "Scheduled Today", value: today && !today.failed ? fmtInt(today.scheduled) : DASH, icon: CalendarPlus, color: BLUE },
    { label: "Completed", value: today && !today.failed ? fmtInt(today.completed) : DASH, icon: CheckCircle2, color: GREEN },
    { label: "Cancelled", value: today && !today.failed ? fmtInt(today.cancelled) : DASH, icon: XCircle, color: RED },
  ];

  const openFromPicker = () => {
    try {
      fromInputRef.current?.showPicker();
    } catch {
      fromInputRef.current?.focus();
    }
  };

  const firstShown = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastShown = Math.min(page * limit, total);

  return (
    <>
      <PageHeader
        title={title}
        rangeLabel={`${fmtYmdLong(fromDate)} - ${fmtYmdLong(toDate)}`}
        onRangeClick={openFromPicker}
        search={search}
        setSearch={(v) => setFilter("search", v)}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Export / refresh                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={exportReport}
            disabled={exporting}
            className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.base}`}
          >
            <Download size={13} className="shrink-0 text-slate-500" />
            {exporting
              ? "Exporting…"
              : selected.length
                ? `Export ${selected.length} Selected`
                : "Export Report"}
          </button>

          <button
            type="button"
            onClick={refresh}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-white shadow-sm ${T.base}`}
            style={{ background: BRAND }}
          >
            <RefreshCw size={13} className={`shrink-0 ${loadingV2 ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <Card key={kpi.label} className="p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center ${
                    kpi.round ? "rounded-full" : "rounded-lg"
                  }`}
                  style={{ background: kpi.solid ? kpi.color : kpi.tint }}
                >
                  <Icon size={14} style={{ color: kpi.solid ? "#fff" : kpi.color }} />
                </span>
                <span className={`truncate font-semibold text-slate-600 ${T.base}`}>
                  {kpi.label}
                </span>
              </div>

              <p
                className={`mt-2.5 truncate font-extrabold tracking-tight text-slate-900 ${T.kpi}`}
              >
                {kpi.value}
              </p>

              <p className={`mt-1 whitespace-nowrap ${T.sm}`}>
                {kpi.delta ? (
                  <>
                    <Delta value={kpi.delta.value} up={kpi.delta.up} />{" "}
                    <span className="text-slate-400">{kpi.sub}</span>
                  </>
                ) : (
                  <span className="text-slate-400">{kpi.note || kpi.sub}</span>
                )}
              </p>
            </Card>
          ))}
        </div>

        {counts?.failed && (
          <div className={`rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-600 ${T.base}`}>
            Couldn&apos;t load the booking counts. The table below is unaffected.
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`relative flex items-center gap-2.5 px-3 py-2.5 ${CARD}`}>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#E6E8F0] p-0.5">
            {["All", "Paid", "Unpaid"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter("paymentTab", tab)}
                className={`rounded-lg px-3 py-1 font-semibold transition-colors ${T.base} ${
                  paymentTab === tab
                    ? "text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                style={paymentTab === tab ? { background: GREEN } : undefined}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search booking ID, user, phone, salon..."
              className={`w-full rounded-xl border border-[#E6E8F0] bg-white py-1.5 pl-8 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
            />
          </div>

          {/* Booking type = service category of any service in the booking. */}
          <div className="relative shrink-0">
            <select
              value={bookingType}
              onChange={(e) => setFilter("bookingType", e.target.value)}
              className={`w-[150px] appearance-none rounded-xl border bg-white py-1.5 pl-3 pr-7 font-medium text-slate-700 focus:outline-none ${T.base} ${
                bookingType ? "border-[#5B21F0]" : "border-[#E6E8F0]"
              }`}
            >
              <option value="">All Booking Types</option>
              {(Array.isArray(serviceCategories) ? serviceCategories : []).map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <DateInput
            inputRef={fromInputRef}
            label="From date"
            value={fromDate}
            onChange={(v) => {
              setFilter("fromDate", v);
              if (v > toDate) setField("toDate", v);
            }}
          />

          <span className={`shrink-0 text-slate-400 ${T.base}`}>to</span>

          <DateInput
            label="To date"
            value={toDate}
            onChange={(v) => {
              setFilter("toDate", v);
              if (v < fromDate) setField("fromDate", v);
            }}
          />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMoreFilters((open) => !open)}
              className={`flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.base} ${
                status ? "border-[#5B21F0]" : "border-[#E6E8F0]"
              }`}
            >
              <SlidersHorizontal size={13} className="shrink-0 text-slate-400" />
              More Filters
              {status && (
                <span
                  className={`rounded-full px-1.5 font-bold text-white ${T.xxs}`}
                  style={{ background: BRAND }}
                >
                  1
                </span>
              )}
              <ChevronDown size={13} className="shrink-0 text-slate-400" />
            </button>

            {showMoreFilters && (
              <div className="absolute right-0 top-full z-20 mt-2 w-[200px] rounded-xl border border-[#E6E8F0] bg-white p-3 shadow-lg">
                <label className={`block font-semibold text-slate-600 ${T.sm}`}>
                  Status
                  <select
                    value={status}
                    onChange={(e) => {
                      setFilter("status", e.target.value);
                      setShowMoreFilters(false);
                    }}
                    className={`mt-1 block w-full rounded-lg border border-[#E6E8F0] bg-white px-2 py-1.5 font-medium text-slate-700 focus:outline-none ${T.base}`}
                  >
                    <option value="">All statuses</option>
                    {Object.entries(STATUS_META).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className={`shrink-0 px-1 font-semibold text-slate-500 hover:text-slate-700 ${T.base}`}
          >
            Clear
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Table + right rail                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${MAIN_COLS} ${GAP}`}>
          <Card>
            {errorV2 && (
              <div className={`m-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-600 ${T.base}`}>
                Failed to load bookings: {String(errorV2)}
              </div>
            )}

            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: 34 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 128 }} />
                <col style={{ width: 142 }} />
                <col style={{ width: 84 }} />
                <col style={{ width: 74 }} />
                <col style={{ width: 74 }} />
                <col style={{ width: 98 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 116 }} />
                <col style={{ width: 66 }} />
              </colgroup>

              <thead>
                <tr className="border-b border-[#EDEFF5]">
                  <th className="py-2.5 pl-4">
                    <Checkbox checked={allSelected} onChange={toggleAll} label="Select all" />
                  </th>
                  {[
                    "Booking ID",
                    "User",
                    "Salon",
                    "Booking Type",
                    "Status",
                    "Payment",
                    "Amount",
                    "Order Date",
                    "Booking Date & Time",
                    "Actions",
                  ].map((column) => (
                    <th
                      key={column}
                      className={`whitespace-nowrap py-2.5 pr-2 font-semibold text-slate-500 ${T.sm} ${
                        column === "Actions" ? "pr-4 text-right" : ""
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className={`py-10 text-center text-slate-400 ${T.base}`}>
                      {loadingV2 ? "Loading bookings…" : "No bookings match these filters."}
                    </td>
                  </tr>
                )}

                {rows.map((row, index) => {
                  const order = fmtOrderTime(row.created_at);
                  const payment = paymentLabel(row);
                  const types = row.service_categories?.length ? row.service_categories : row.services || [];
                  const location = [row.salon_area, row.salon_city].filter(Boolean).join(", ");
                  const statusMeta = STATUS_META[row.status];

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="py-2.5 pl-4 align-middle">
                        <Checkbox
                          checked={selected.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                          label={`Select booking ${row.id}`}
                        />
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <span className="flex items-center gap-1">
                          <span className={`truncate font-semibold text-slate-800 ${T.sm}`}>
                            #{row.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyId(row.id)}
                            aria-label={`Copy booking ID ${row.id}`}
                            className="shrink-0 text-slate-300 hover:text-slate-500"
                          >
                            <Copy size={11} />
                          </button>
                        </span>
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <span className="flex items-center gap-2">
                          <Avatar name={row.user_name} index={index} />
                          <span className="min-w-0 leading-tight">
                            <span className={`block truncate font-semibold text-slate-800 ${T.sm}`}>
                              {row.user_name || DASH}
                            </span>
                            {row.user_phone && (
                              <span className={`block truncate text-slate-400 ${T.xxs}`}>
                                {row.user_phone}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <span className="flex items-start gap-1.5">
                          <Store size={12} className="mt-[1px] shrink-0 text-slate-400" />
                          <span className="min-w-0 leading-tight">
                            <span className={`block truncate font-semibold text-slate-700 ${T.sm}`}>
                              {row.salon_name || DASH}
                            </span>
                            {location && (
                              <span className={`block truncate text-slate-400 ${T.xxs}`}>{location}</span>
                            )}
                          </span>
                        </span>
                      </td>

                      <td className="py-2.5 pr-2 align-middle" title={(row.services || []).join(", ")}>
                        {types.length ? (
                          <span className="flex min-w-0 items-center gap-1">
                            <Chip className="min-w-0 truncate bg-indigo-50 text-indigo-600">{types[0]}</Chip>
                            {types.length > 1 && (
                              <span className={`shrink-0 font-semibold text-slate-400 ${T.xxs}`}>
                                +{types.length - 1}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className={`text-slate-300 ${T.sm}`}>{DASH}</span>
                        )}
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <Chip className={statusMeta?.chip || "bg-slate-100 text-slate-500"}>
                          {statusMeta?.label || row.status || DASH}
                        </Chip>
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <Chip className={PAYMENT_STYLES[payment]}>{payment}</Chip>
                      </td>

                      <td className="py-2.5 pr-2 align-middle leading-tight">
                        <span className={`block truncate font-bold text-slate-900 ${T.sm}`}>
                          {fmtInr(row.discounted_amount)}
                        </span>
                        <span className={`block truncate text-slate-400 ${T.xxs}`}>
                          + {fmtInr(row.gst_amount)} GST
                        </span>
                      </td>

                      <td className="py-2.5 pr-2 align-middle leading-tight">
                        <span className={`block truncate text-slate-700 ${T.sm}`}>{order.date}</span>
                        <span className={`block truncate text-slate-400 ${T.xxs}`}>{order.time}</span>
                      </td>

                      {/* booking_date is date-only; the time is the booked slot's start. */}
                      <td className="py-2.5 pr-2 align-middle leading-tight">
                        <span className={`block truncate text-slate-700 ${T.sm}`}>
                          {fmtYmd(row.booking_date)}
                        </span>
                        <span className={`block truncate text-slate-400 ${T.xxs}`}>
                          {fmtSlot(row.slot_from)}
                        </span>
                      </td>

                      <td className="py-2.5 pr-4 align-middle">
                        <span className="flex items-center justify-end gap-1.5">
                          <IconButton label="View booking" onClick={() => navigate(`/bookings/${row.id}`)}>
                            <Eye size={12} />
                          </IconButton>
                          <RowMenu
                            row={row}
                            open={menuFor === row.id}
                            onToggle={() => setMenuFor((open) => (open === row.id ? null : row.id))}
                            onAction={runAction}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#EDEFF5] px-4 py-2.5">
              <p className={`whitespace-nowrap text-slate-500 ${T.sm}`}>
                Showing {fmtInt(firstShown)} to {fmtInt(lastShown)} of {fmtInt(total)} bookings
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setField("page", Math.max(1, page - 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>

                {pageNumbers(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className={`px-0.5 text-slate-400 ${T.sm}`}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setField("page", p)}
                      className={`grid h-6 min-w-[24px] place-items-center rounded-lg px-1 font-semibold transition-colors ${T.sm} ${
                        page === p
                          ? "text-white"
                          : "border border-[#E6E8F0] text-slate-500 hover:bg-slate-50"
                      }`}
                      style={page === p ? { background: BRAND } : undefined}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setField("page", Math.min(totalPages, page + 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`whitespace-nowrap text-slate-500 ${T.sm}`}>
                  Rows per page
                </span>
                <div className="relative">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setFilter("rowsPerPage", e.target.value)}
                    className={`appearance-none rounded-lg border border-[#E6E8F0] bg-white py-1 pl-2 pr-6 font-medium text-slate-700 focus:outline-none ${T.sm}`}
                  >
                    {ROWS_PER_PAGE.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={11}
                    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Right rail */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <DonutCard title="Bookings by Status" total={fmtInt(rangeTotal)} slices={statusSlices} />

            <DonutCard title="Bookings by Payment" total={fmtInt(rangeTotal)} slices={paymentSlices} />

            <Card className="p-3.5">
              <CardTitle>Today&apos;s Activity</CardTitle>
              <div className="flex flex-col gap-2.5">
                {todayRows.map(({ icon: Icon, ...row }) => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className={`flex min-w-0 items-center gap-2 text-slate-600 ${T.sm}`}>
                      <Icon size={14} className="shrink-0" style={{ color: row.color }} />
                      <span className="truncate">{row.label}</span>
                    </span>
                    <span className={`shrink-0 whitespace-nowrap font-bold text-slate-900 ${T.sm}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex min-w-0 items-center gap-2 text-slate-600 ${T.sm}`}>
                    <IndianRupee size={14} className="shrink-0" style={{ color: GREEN }} />
                    <span className="truncate">Revenue</span>
                  </span>
                  <span className={`shrink-0 whitespace-nowrap font-bold text-slate-900 ${T.sm}`}>
                    {cur ? `₹${Math.round(cur.today.revenue).toLocaleString("en-IN")}` : DASH}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Insights / top salon / peak hours                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${BOTTOM_COLS} ${GAP}`}>
          <Card className="p-3.5">
            <CardTitle>
              <span className="flex items-center gap-1.5">
                Insights
                <Lightbulb size={13} style={{ color: AMBER }} />
              </span>
            </CardTitle>
            <p className={`text-slate-600 ${T.base}`}>
              {change == null ? (
                "Not enough data to compare with the previous period."
              ) : (
                <>
                  Bookings are{" "}
                  <span className={`font-bold ${change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {Math.abs(change).toFixed(1)}%
                  </span>{" "}
                  {change >= 0 ? "higher" : "lower"} than the previous {counts.days} day
                  {counts.days === 1 ? "" : "s"}.
                </>
              )}
            </p>
          </Card>

          <Card className="p-3.5">
            <CardTitle>Top Performing Salon</CardTitle>
            {topSalon?.salon ? (
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: "#EDE7FF" }}
                >
                  <Store size={18} style={{ color: BRAND }} />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className={`truncate font-bold text-slate-900 ${T.md}`}>
                    {topSalon.salon.salon_name || DASH}
                  </p>
                  <p className={`mt-1 flex items-center gap-3 ${T.sm}`}>
                    <span className="text-slate-500">{fmtInt(topSalon.salon.bookings)} bookings</span>
                    <span className="font-semibold text-emerald-500">
                      ₹{Math.round(topSalon.salon.revenue).toLocaleString("en-IN")} revenue
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className={`text-slate-400 ${T.base}`}>
                {topSalon?.failed
                  ? "Couldn't load the top salon."
                  : topSalon
                    ? "No paid bookings in this range."
                    : "Loading…"}
              </p>
            )}
          </Card>

          <Card className="p-3.5">
            <CardTitle
              right={
                <span className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E6E8F0] px-1.5 py-1 text-slate-300">
                  <BarChart3 size={13} />
                </span>
              }
            >
              Peak Booking Hours
            </CardTitle>

            {/* Paid bookings in the range by the hour they were placed (IST). */}
            <p className={`text-slate-500 ${T.sm}`}>
              {summary?.failed ? (
                "Couldn't load booking hours."
              ) : !cur ? (
                "Loading…"
              ) : peak ? (
                <>
                  Most bookings are placed between{" "}
                  <span className="font-bold text-slate-800">
                    {hourLabel(peak.start)} – {hourLabel(peak.start + PEAK_WINDOW_HOURS)}
                  </span>
                </>
              ) : (
                "No paid bookings in this range."
              )}
            </p>

            <div className="mt-2.5 flex h-2.5 w-full items-stretch gap-[2px] overflow-hidden rounded-full">
              {Array.from({ length: 24 }, (_, hour) => {
                const count = hours[hour] || 0;
                const intensity = maxHour ? count / maxHour : 0;
                return (
                  <span
                    key={hour}
                    title={`${hourLabel(hour)} – ${hourLabel(hour + 1)}: ${count.toLocaleString("en-IN")} booking${count === 1 ? "" : "s"}`}
                    className="flex-1"
                    style={{ background: `rgba(245, 166, 35, ${0.12 + intensity * 0.88})` }}
                  />
                );
              })}
            </div>

            <div className={`mt-1.5 flex items-center justify-between text-slate-400 ${T.xs}`}>
              {HOUR_TICKS.map((tick, i) => (
                <span key={`${tick}-${i}`}>{tick}</span>
              ))}
            </div>
          </Card>
        </div>
      </ScaledCanvas>

      {confirming && (
        <ConfirmDialog
          confirming={confirming}
          busy={actionBusy}
          onCancel={() => setConfirming(null)}
          onConfirm={confirmAction}
        />
      )}
    </>
  );
};

export default BookingsByOrderDateV2;
