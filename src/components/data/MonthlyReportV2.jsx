import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeIndianRupee,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  IndianRupee,
  ListFilter,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Search,
  Star,
  Target,
  X,
  XCircle,
} from "lucide-react";
import {
  downloadMonthlyInvoicePDF,
  fetchMonthlyReportSalonsV2,
  fetchMonthlyReportSummaryV2,
  fetchPlatformFee,
  queryMonthlyReportSalonsV2,
  updatePlatformFee,
} from "../../redux/slices/monthlyInvoiceSlice";
import { downloadXlsx, headerCell } from "../../utils/excelExport";
import { downloadCsv } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD, initials } from "../v2/tokens";
import { Card, Chip as BaseChip, HeaderBell } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Monthly Report" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// Data (monthlyInvoiceSlice):
//   /getMonthlyReportSummaryV2   KPIs + money strip, month vs previous month
//   /getMonthlyReportSalonsV2    the salon table (search, city, sort, paging)
//   /getplatformfee, /updateplatformfee   per-booking platform fee setting
//   V1 /getmonthlyinvoicedetails page + /downloadmonthlyinvoicepdf for a salon
// Definitions: a month is the visit month (booking_date, IST). Bookings =
// paid bookings; "served" = paid and not cancelled / refunded. Amount Paid In
// = invoice value (same pricing as the invoice pages). Platform fee = served
// bookings x the admin's per-booking fee - a reporting figure for now; the
// booking flow charges its own fee. CAC = discount Gloup funds per booking.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1460;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const AMBER = "#F5A623";
const VIOLET = "#7C3AED";
const INDIGO = "#4F46E5";
const TEAL = "#0E9F9F";
const GOLD = "#E3B85C";

// Type scale in design px on the 1460px canvas. See the note above before
// changing these.
//
// `th` is deliberately a step below `xs`: the column headers are short, static,
// uppercase labels, and holding them back is what buys fourteen columns of body
// text enough room to sit on one line each.
const T = {
  tiny: "text-[10px]", // partner id, "(126 Orders)", "(15%)", chips
  xxs: "text-[11px]", // email line, KPI delta, summary sub-line
  th: "text-[10px]", // table column headers
  xs: "text-[12px]", // table body cells
  sm: "text-[13px]", // buttons, inputs, field labels, pagination
  base: "text-[14px]", // toolbar values
  md: "text-[15px]", // table booking counts
  lg: "text-[18px]", // summary strip values, KPI currency values
  kpi: "text-[22px]", // KPI count values
};

const GAP = "gap-3";
const DASH = "—";

// Measured column widths from the mockup, in design px, scaled onto this canvas
// and then trimmed against the real Outfit metrics so that every header and
// every numeric cell clears its column with a few px to spare. They add up to
// DESIGN_WIDTH; the first and last are the card's own gutters.
const COLS = [11, 224, 143, 119, 114, 74, 72, 109, 64, 92, 54, 112, 50, 95, 115, 12];

// Column headers, in order. `sort` names the API sort the header toggles.
const COLUMNS = [
  { label: "Partner / Salon Details" },
  { label: "Contact" },
  { label: "Location" },
  { label: "Total Bookings", sort: "bookings" },
  { label: "Completed" },
  { label: "Cancelled" },
  { label: "Amount Paid In", sort: "paid_in" },
  { label: "Payout" },
  { label: "Platform Fee" },
  { label: "CAC" },
  { label: "Avg. Order Value" },
  { label: "Rating" },
  { label: "Last Booking" },
  { label: "Actions" },
];

const SORT_OPTIONS = [
  { value: "bookings_desc", label: "Total Bookings (High to Low)" },
  { value: "bookings_asc", label: "Total Bookings (Low to High)" },
  { value: "paid_in_desc", label: "Amount Paid In (High to Low)" },
  { value: "paid_in_asc", label: "Amount Paid In (Low to High)" },
  { value: "rating_desc", label: "Rating (High to Low)" },
  { value: "name_asc", label: "Salon Name (A to Z)" },
];

const ROWS_PER_PAGE = ["10", "25", "50", "100"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const istMonth = () => moment().utcOffset(330).format("YYYY-MM");
const monthLabel = (month) => (month ? moment(month, "YYYY-MM").format("MMMM YYYY") : "");
const shortMonth = (month) => (month ? moment(month, "YYYY-MM").format("MMM YYYY") : "");
// This month and the 23 before it.
const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const value = moment(istMonth(), "YYYY-MM").subtract(i, "months").format("YYYY-MM");
  return { value, label: monthLabel(value) };
});

const fmtInt = (n) => (n == null ? DASH : Number(n).toLocaleString("en-IN"));
const fmtMoney = (n, decimals = 0) =>
  n == null
    ? DASH
    : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
const fmtPct = (n) => (n == null ? DASH : `${Number(n).toFixed(1)}%`);

// { value, up } percent change, or null when there's no base.
const delta = (cur, prev) => {
  if (cur == null || prev == null || !prev) return null;
  const change = ((cur - prev) / prev) * 100;
  return { value: `${Math.abs(change).toFixed(1)}%`, up: change >= 0 };
};
// Change in percentage points, for rates.
const pointsDelta = (cur, prev) => {
  if (cur == null || prev == null) return null;
  const change = cur - prev;
  return { value: `${Math.abs(change).toFixed(1)} pts`, up: change >= 0 };
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

// Salon columns of the downloads - shared by the CSV and Excel files.
const EXPORT_COLUMNS = [
  { header: "Salon ID", kind: "int", width: 9, get: (r) => r.store_id },
  { header: "Salon", kind: "text", width: 32, get: (r) => r.partner_name },
  { header: "Type", kind: "text", width: 14, get: (r) => r.store_type },
  { header: "Phone", kind: "text", width: 14, get: (r) => r.partner_phone },
  { header: "Email", kind: "text", width: 28, get: (r) => r.partner_email },
  { header: "Area", kind: "text", width: 18, get: (r) => r.area },
  { header: "City", kind: "text", width: 16, get: (r) => r.city },
  { header: "Total bookings", kind: "int", width: 14, get: (r) => r.total_bookings },
  { header: "Completed", kind: "int", width: 11, get: (r) => r.completed },
  { header: "Completed %", kind: "percent", width: 12, get: (r) => r.completed_pct },
  { header: "Cancelled", kind: "int", width: 11, get: (r) => r.cancelled },
  { header: "Cancelled %", kind: "percent", width: 12, get: (r) => r.cancelled_pct },
  { header: "Amount paid in", kind: "money", width: 16, get: (r) => r.gross },
  { header: "Orders", kind: "int", width: 9, get: (r) => r.orders },
  { header: "Payout", kind: "money", width: 14, get: (r) => r.payout },
  { header: "Subscription deducted", kind: "money", width: 20, get: (r) => r.subscription_deducted },
  { header: "Platform fee", kind: "money", width: 14, get: (r) => r.platform_fee },
  { header: "GST", kind: "money", width: 12, get: (r) => r.gst },
  { header: "CAC spend", kind: "money", width: 13, get: (r) => r.cac_spend },
  { header: "CAC / booking", kind: "money", width: 14, get: (r) => r.cac_per_booking },
  { header: "Avg. order value", kind: "money", width: 16, get: (r) => r.avg_order_value },
  { header: "Rating", kind: "decimal", width: 8, get: (r) => r.average_rating },
  { header: "Reviews", kind: "int", width: 9, get: (r) => r.review_count },
  { header: "Last booking", kind: "date", width: 14, get: (r) => r.last_booking_at },
];

// Closes a popover when clicking anywhere outside `ref`.
const useOutsideClose = (ref, open, onClose) => {
  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, open, onClose]);
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const Delta = ({ value, up, goodWhenUp = true }) => {
  const good = up === goodWhenUp;
  return (
    <span className={`whitespace-nowrap font-semibold ${good ? "text-emerald-500" : "text-rose-500"}`}>
      {up ? "↑" : "↓"} {value}
    </span>
  );
};

const Chip = (props) => <BaseChip size={`px-1.5 py-[2px] ${T.tiny}`} {...props} />;

const FieldLabel = ({ children }) => (
  <span className={`mb-1 block font-medium text-slate-500 ${T.xxs}`}>{children}</span>
);

// The salon's own logo when it has one; otherwise initials under a star, as
// the mockup draws it.
const SalonLogo = ({ name, logo }) => {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img src={getImageUrl(logo)} alt="" onError={() => setFailed(true)} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
    );
  }
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-content-center justify-items-center rounded-lg leading-none"
      style={{ background: "linear-gradient(135deg,#2B2118,#4C3C28)" }}
    >
      <Star size={9} fill={GOLD} strokeWidth={0} />
      <span className="mt-[2px] text-[7px] font-bold tracking-tight" style={{ color: GOLD }}>
        {initials(String(name || "").replace(/[^A-Za-z ]/g, ""))}
      </span>
    </span>
  );
};

const HOW_IT_WORKS = [
  "Every figure is for the selected visit month (the day of the appointment, IST), compared with the month before.",
  "Bookings are paid bookings. Completed / cancelled are their current status; cancelled includes refunded.",
  "Amount Paid In is the invoice value - important services at full price, the rest at what the customer paid (same as the invoice pages).",
  "Platform fee = served (paid, not cancelled) bookings × the platform fee you set here.",
  "Payout is what was paid out to the salon for that month's visit days, after any subscription fee.",
  "CAC is the discount Gloup funds per booking. Ratings are all-time, active reviews only.",
];

// Title, subtitle and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, subtitle }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(ref, open, close);

  return (
    <PageHeaderPortal>
      <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h1>
          <p className="hidden truncate text-[11px] leading-tight text-slate-400 md:block">{subtitle}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-slate-500 transition-colors hover:text-slate-700"
            >
              <HelpCircle size={14} className="shrink-0 text-slate-400" />
              <span className="hidden lg:inline">How it works?</span>
            </button>
            {open && (
              <div className="absolute right-0 top-8 z-50 w-80 rounded-xl border border-[#E6E8F0] bg-white p-4 text-[12px] leading-relaxed text-slate-600 shadow-xl">
                <ul className="list-disc space-y-1.5 pl-4">
                  {HOW_IT_WORKS.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <HeaderBell count={12} color={RED} className="text-slate-500" />
        </div>
      </div>
    </PageHeaderPortal>
  );
};

// One page button in the footer - the active page is the only filled one.
const PageButton = ({ pageNumber, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`grid h-7 min-w-[28px] place-items-center rounded-lg px-1 font-semibold transition-colors ${T.sm} ${
      active ? "text-white" : "border border-[#E6E8F0] text-slate-500 hover:bg-slate-50"
    }`}
    style={active ? { background: BRAND } : undefined}
  >
    {pageNumber}
  </button>
);

// Admin-editable per-booking platform fee. Rendered outside ScaledCanvas.
const PlatformFeeDialog = ({ current, busy, onSave, onClose }) => {
  const [value, setValue] = useState(current == null ? "" : String(current));
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && n >= 0 && Math.round(n * 100) === n * 100;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Platform fee"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Platform fee</h2>
            <p className="mt-0.5 text-sm text-slate-500">Charged to the customer on every booking.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Fee per booking (₹)
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </label>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Used by this report (served bookings × fee), for every month shown. It doesn't change what the app charges at
          checkout yet.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(n)}
            disabled={!valid || busy}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: BRAND }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const MonthlyReportV2 = ({ title = "Monthly Report" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    summaryV2: summary,
    summaryV2Error,
    salonsV2,
    salonsV2Loading,
    salonsV2Error,
    platformFee,
    platformFeeSaving,
  } = useSelector((state) => state.monthlyInvoice);

  const [month, setMonth] = useState(istMonth);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [reloadKey, setReloadKey] = useState(0);
  const [feeDialog, setFeeDialog] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busyExport, setBusyExport] = useState(null); // "report" | "xlsx" | "csv"
  const [menuFor, setMenuFor] = useState(null);

  const filtersRef = useRef(null);
  const exportRef = useRef(null);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  useOutsideClose(filtersRef, filtersOpen, closeFilters);
  useOutsideClose(exportRef, exportOpen, closeExport);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
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

  const salonParams = useMemo(() => {
    const params = { month, sort };
    if (search) params.search = search;
    if (city) params.city = city;
    return params;
  }, [month, sort, search, city]);

  useEffect(() => {
    dispatch(fetchMonthlyReportSalonsV2({ ...salonParams, page, limit: Number(rowsPerPage) }));
  }, [dispatch, salonParams, page, rowsPerPage, reloadKey]);

  useEffect(() => {
    dispatch(fetchMonthlyReportSummaryV2({ month }));
  }, [dispatch, month, reloadKey]);

  useEffect(() => {
    dispatch(fetchPlatformFee());
  }, [dispatch]);

  // Close the row menu on any click outside it.
  useEffect(() => {
    if (menuFor === null) return undefined;
    const close = (e) => !e.target.closest("[data-report-menu]") && setMenuFor(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor]);

  const rows = salonsV2?.rows || [];
  const total = salonsV2?.total || 0;
  const size = Number(rowsPerPage);
  const lastPage = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, lastPage);
  const cur = summary?.month === month ? summary.current : null;
  const prev = summary?.month === month ? summary.previous : null;
  const feeUsed = summary?.platform_fee ?? platformFee;
  const vsLabel = prev ? `vs ${shortMonth(prev.month)}` : "";

  // ---- actions ------------------------------------------------------------

  const saveFee = async (fee) => {
    try {
      await dispatch(updatePlatformFee({ fee })).unwrap();
      toast.success(`Platform fee set to ${fmtMoney(fee, 2)} per booking`, { id: "monthly-v2-fee" });
      setFeeDialog(false);
      reload();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save", { id: "monthly-v2-fee" });
    }
  };

  const downloadPdf = async (row) => {
    setMenuFor(null);
    const toastId = "monthly-v2-pdf";
    toast.loading("Generating monthly invoice PDF…", { id: toastId });
    try {
      const blob = await dispatch(downloadMonthlyInvoicePDF({ partnerId: row.store_id, month })).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MonthlyInvoice_${row.partner_name}_${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Monthly invoice PDF downloaded", { id: toastId });
    } catch {
      toast.error("Failed to download the PDF", { id: toastId });
    }
  };

  const allSalons = async (params) =>
    ((await dispatch(queryMonthlyReportSalonsV2({ ...params, page: 1, limit: 10000 })).unwrap())?.rows || []);

  // Table export: every salon matching the current search / city / sort.
  const exportTable = async (format) => {
    setExportOpen(false);
    setBusyExport(format);
    const toastId = "monthly-v2-export";
    try {
      const data = await allSalons(salonParams);
      if (!data.length) {
        toast.error("Nothing to export", { id: toastId });
        return;
      }
      const baseName = `monthly_report_${month}`;
      if (format === "xlsx") {
        await downloadXlsx(`${baseName}.xlsx`, [{ name: "Salons", rows: data, columns: EXPORT_COLUMNS }]);
      } else {
        downloadCsv(
          `${baseName}.csv`,
          EXPORT_COLUMNS.map((c) => c.header),
          data.map((row) => EXPORT_COLUMNS.map((c) => c.get(row) ?? ""))
        );
      }
      toast.success(`Exported ${fmtInt(data.length)} salons`, { id: toastId });
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to export", { id: toastId });
    } finally {
      setBusyExport(null);
    }
  };

  // Full month report: a Summary sheet (this month vs last) + every salon.
  const downloadReport = async () => {
    if (!cur || !prev) return;
    setBusyExport("report");
    const toastId = "monthly-v2-report";
    try {
      const data = await allSalons({ month, sort: "bookings_desc" });
      const line = (label, a, b, kind = "money") => {
        const cell = (v) => {
          if (v == null) return null;
          if (kind === "money") return { type: Number, value: Number(v), format: '"₹"#,##0.00' };
          if (kind === "percent") return { type: Number, value: Number(v), format: '0.0"%"' };
          if (kind === "decimal") return { type: Number, value: Number(v), format: "0.00" };
          return { type: Number, value: Number(v), format: "0" };
        };
        return [{ value: label }, cell(a), cell(b)];
      };
      const summarySheet = [
        [{ value: `Monthly Report - ${monthLabel(month)}`, fontWeight: "bold" }],
        [{ value: `Platform fee used: ₹${Number(feeUsed).toFixed(2)} per served booking` }],
        [],
        [headerCell("Metric"), headerCell(monthLabel(cur.month)), headerCell(monthLabel(prev.month))],
        line("Partners (salons with bookings)", cur.partners, prev.partners, "int"),
        line("Total bookings (paid)", cur.total_bookings, prev.total_bookings, "int"),
        line("Completed bookings", cur.completed, prev.completed, "int"),
        line("Cancelled bookings", cur.cancelled, prev.cancelled, "int"),
        line("Avg. bookings per partner", cur.avg_bookings_per_partner, prev.avg_bookings_per_partner, "decimal"),
        line("Amount paid in (invoice value)", cur.gross, prev.gross),
        line("Platform fee", cur.platform_fee_total, prev.platform_fee_total),
        line("GST collected", cur.gst, prev.gst),
        line("Partner payout", cur.payout, prev.payout),
        line("Subscription fees deducted", cur.subscription_deducted, prev.subscription_deducted),
        line("CAC spend", cur.cac_spend, prev.cac_spend),
        line("CAC per booking", cur.cac_per_booking, prev.cac_per_booking),
        line("Customers", cur.customers, prev.customers, "int"),
        line("New customers", cur.new_customers, prev.new_customers, "int"),
        line("Repeat customers", cur.repeat_customers, prev.repeat_customers, "int"),
        line("Returning rate", cur.returning_rate, prev.returning_rate, "percent"),
      ];
      await downloadXlsx(`monthly_report_${month}_full.xlsx`, [
        { name: "Summary", data: summarySheet, widths: [34, 18, 18] },
        { name: "Salons", rows: data, columns: EXPORT_COLUMNS },
      ]);
      toast.success("Monthly report downloaded", { id: toastId });
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to build the report", { id: toastId });
    } finally {
      setBusyExport(null);
    }
  };

  // Header click toggles that column's sort direction.
  const toggleSort = (key) => {
    const next = sort === `${key}_desc` ? `${key}_asc` : `${key}_desc`;
    onFilter(setSort)(next);
  };

  // ---- KPIs + summary strip -----------------------------------------------

  const kpis = [
    { label: "Total Bookings", value: fmtInt(cur?.total_bookings), delta: delta(cur?.total_bookings, prev?.total_bookings), icon: CalendarDays, color: BLUE, tint: "#E1F0FF" },
    { label: "Total Partners", value: fmtInt(cur?.partners), delta: delta(cur?.partners, prev?.partners), icon: Briefcase, color: GREEN, tint: "#E1F7EC" },
    { label: "Completed Bookings", value: fmtInt(cur?.completed), delta: delta(cur?.completed, prev?.completed), icon: CheckCircle2, color: AMBER, tint: "#FFF2DC" },
    { label: "Cancelled Bookings", value: fmtInt(cur?.cancelled), delta: delta(cur?.cancelled, prev?.cancelled), goodWhenUp: false, icon: XCircle, color: RED, tint: "#FDE7E7" },
    { label: "Avg. Bookings / Partner", value: cur?.avg_bookings_per_partner == null ? DASH : cur.avg_bookings_per_partner.toFixed(1), delta: delta(cur?.avg_bookings_per_partner, prev?.avg_bookings_per_partner), icon: Clock, color: VIOLET, tint: "#EDE7FF" },
    { label: "Total Amount Paid In", value: fmtMoney(cur?.gross), money: true, delta: delta(cur?.gross, prev?.gross), icon: IndianRupee, color: INDIGO, tint: "#E8E9FD" },
    { label: "Total Payout", value: fmtMoney(cur?.payout), money: true, delta: delta(cur?.payout, prev?.payout), icon: BadgeIndianRupee, color: TEAL, tint: "#DCF5F2" },
    { label: "CAC / Booking", value: fmtMoney(cur?.cac_per_booking, 2), money: true, delta: delta(cur?.cac_per_booking, prev?.cac_per_booking), goodWhenUp: false, icon: Target, color: VIOLET, tint: "#EDE7FF" },
  ];

  const strip = [
    { label: "Total Amount Paid In", value: fmtMoney(cur?.gross, 2), note: "(From Customers)" },
    { label: "Total Platform Fee", value: fmtMoney(cur?.platform_fee_total, 2), note: cur ? `(${fmtInt(cur.active_bookings)} × ${fmtMoney(feeUsed, 2)})` : "" },
    { label: "Total GST", value: fmtMoney(cur?.gst, 2), note: "(Collected)" },
    { label: "Total Partner Payout", value: fmtMoney(cur?.payout, 2), note: "(To Partners)" },
    { label: "Estimated CAC", value: fmtMoney(cur?.cac_spend, 2), note: "(This Month)" },
    { label: "Total New Customers", value: fmtInt(cur?.new_customers), delta: delta(cur?.new_customers, prev?.new_customers), note: "First booking this month" },
    { label: "Repeat Customers", value: fmtInt(cur?.repeat_customers), delta: delta(cur?.repeat_customers, prev?.repeat_customers), note: "Booked before" },
    { label: "Returning Rate", value: fmtPct(cur?.returning_rate), delta: pointsDelta(cur?.returning_rate, prev?.returning_rate), note: "Repeat ÷ customers" },
  ];

  const error = salonsV2Error || summaryV2Error;
  const cityOptions = summary?.month === month ? summary.cities || [] : [];

  return (
    <>
      <PageHeader title={title} subtitle={`Salon wise appointment summary for ${monthLabel(month)}`} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {error && (
          <div className={`flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 ${T.sm}`}>
            <AlertTriangle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Failed to load: {error}</span>
            <button type="button" onClick={reload} className="shrink-0 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Platform fee + month picker + report download                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-end justify-end gap-3">
          <div className="mr-auto">
            <FieldLabel>Platform fee</FieldLabel>
            <button
              type="button"
              onClick={() => setFeeDialog(true)}
              className={`flex items-center gap-2 rounded-xl border border-[#E6E8F0] bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.sm}`}
              title="Set the per-booking platform fee this report uses"
            >
              {fmtMoney(platformFee, 2)} per booking
              <Pencil size={12} className="shrink-0 text-slate-400" />
            </button>
          </div>

          <label className="w-[170px] shrink-0">
            <FieldLabel>Month</FieldLabel>
            <span className="relative block">
              <select
                value={month}
                onChange={(e) => onFilter(setMonth)(e.target.value)}
                className={`w-full appearance-none rounded-xl border border-[#E6E8F0] bg-white py-2 pl-3 pr-8 font-medium text-slate-700 focus:outline-none ${T.sm}`}
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <CalendarDays size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </span>
          </label>

          <button
            type="button"
            onClick={downloadReport}
            disabled={!cur || busyExport !== null}
            className={`flex w-[160px] shrink-0 items-center justify-center gap-2 rounded-xl border bg-white py-2 font-semibold transition-colors hover:bg-[#F8F5FF] disabled:opacity-50 ${T.sm}`}
            style={{ borderColor: "#D6C9FB", color: BRAND }}
            title="Excel file: month summary vs last month + every salon"
          >
            <Download size={14} className="shrink-0" />
            {busyExport === "report" ? "Preparing…" : "Download Report"}
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-8 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            // p-3 / 32px icon / gap-1.5 rather than p-3.5 / 36 / gap-2: the 10px
            // reclaimed is what keeps "Avg. Bookings / Partner" on one line.
            <Card key={kpi.label} className="p-3">
              <div className="flex items-start gap-1.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: kpi.tint }}>
                  <Icon size={17} style={{ color: kpi.color }} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`truncate font-extrabold leading-none tracking-tight text-slate-900 ${kpi.money ? T.lg : T.kpi}`}>
                    {kpi.value}
                  </p>
                  <p className={`mt-1.5 truncate font-medium text-slate-500 ${T.tiny}`}>{kpi.label}</p>
                  <p className={`mt-1.5 truncate ${T.xxs}`}>
                    {kpi.delta ? <Delta value={kpi.delta.value} up={kpi.delta.up} goodWhenUp={kpi.goodWhenUp !== false} /> : <span className="text-slate-300">{DASH}</span>}
                  </p>
                  <p className={`mt-0.5 truncate text-slate-400 ${T.tiny}`}>{vsLabel}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Toolbar - search, filters, sort, export                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-3">
          <span className="relative block w-[440px] shrink-0">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by salon name, phone or email..."
              className={`w-full rounded-xl border border-[#E6E8F0] bg-white py-2 pl-10 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
            />
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div ref={filtersRef} className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex w-[110px] items-center justify-center gap-1.5 rounded-xl border bg-white py-2 font-semibold transition-colors hover:bg-slate-50 ${T.base} ${
                  city ? "border-violet-300 text-violet-700" : "border-[#E6E8F0] text-slate-700"
                }`}
              >
                <Filter size={13} className="shrink-0" style={{ color: BRAND }} />
                Filters
                <ListFilter size={11} className="shrink-0 text-slate-400" />
              </button>
              {filtersOpen && (
                <div className="absolute right-0 top-11 z-30 w-[240px] rounded-xl border border-[#E6E8F0] bg-white p-3 shadow-lg">
                  <FieldLabel>City</FieldLabel>
                  <select
                    value={city}
                    onChange={(e) => onFilter(setCity)(e.target.value)}
                    className={`w-full rounded-lg border border-[#E6E8F0] bg-white px-2 py-1.5 text-slate-700 focus:outline-none ${T.sm}`}
                  >
                    <option value="">All cities</option>
                    {cityOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {city && (
                    <button type="button" onClick={() => onFilter(setCity)("")} className={`mt-2 font-semibold text-violet-600 ${T.xxs}`}>
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex w-[300px] shrink-0 items-center rounded-xl border border-[#E6E8F0] bg-white pl-3.5 pr-8">
              <span className={`shrink-0 whitespace-nowrap text-slate-400 ${T.base}`}>Sort by</span>
              <select
                value={sort}
                onChange={(e) => onFilter(setSort)(e.target.value)}
                className={`min-w-0 flex-1 appearance-none truncate bg-transparent py-2 pl-1.5 font-semibold text-slate-700 focus:outline-none ${T.base}`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div ref={exportRef} className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                disabled={busyExport !== null}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                className={`flex w-[126px] items-center justify-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.base}`}
              >
                <FileSpreadsheet size={14} className="shrink-0" style={{ color: BRAND }} />
                {busyExport === "xlsx" || busyExport === "csv" ? "Exporting…" : "Export"}
                <ChevronDown size={12} className="shrink-0 text-slate-400" />
              </button>
              {exportOpen && (
                <div role="menu" className={`absolute right-0 top-11 z-30 flex w-[220px] flex-col rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg ${T.sm}`}>
                  {[
                    ["xlsx", "Excel (.xlsx)", "Formatted amounts and dates"],
                    ["csv", "CSV (.csv)", "Plain text, for other tools"],
                  ].map(([format, label, hint]) => (
                    <button key={format} type="button" role="menuitem" onClick={() => exportTable(format)} className="px-3 py-2 text-left hover:bg-slate-50">
                      <span className="block font-semibold text-slate-700">{label}</span>
                      <span className={`block text-slate-400 ${T.tiny}`}>{hint}</span>
                    </button>
                  ))}
                  <span className={`border-t border-[#F1F2F6] px-3 pb-1 pt-2 text-slate-400 ${T.tiny}`}>
                    Every salon matching the current search and filters.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Money summary strip                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-8 divide-x divide-[#E6E8F0] rounded-2xl border border-[#E6E8F0] bg-[#F8F9FC]">
          {strip.map((item) => (
            <div key={item.label} className="min-w-0 px-4 py-3">
              <p className={`truncate font-medium text-slate-500 ${T.xxs}`}>{item.label}</p>
              <p className={`mt-1 truncate font-extrabold tracking-tight text-slate-900 ${T.lg}`}>{item.value}</p>
              <p className={`mt-0.5 truncate ${T.tiny}`}>
                {item.delta ? (
                  <>
                    <Delta value={item.delta.value} up={item.delta.up} /> <span className="text-slate-400">{vsLabel}</span>
                  </>
                ) : (
                  <span className="text-slate-400">{item.note}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Salon table                                                       */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <table className={`w-full table-fixed border-collapse text-left transition-opacity ${salonsV2Loading && rows.length ? "opacity-60" : ""}`}>
            <colgroup>
              {COLS.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>

            <thead>
              <tr className="border-b border-[#EDEFF5]">
                <th />
                {COLUMNS.map((column) => (
                  <th key={column.label} className={`whitespace-nowrap py-3 pr-1.5 font-semibold uppercase tracking-wide text-slate-400 ${T.th}`}>
                    {column.sort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.sort)}
                        className={`flex items-center gap-1 uppercase ${sort.startsWith(column.sort) ? "text-violet-600" : ""}`}
                      >
                        {column.label}
                        <ArrowUpDown size={9} className="shrink-0" />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} className={`py-10 text-center text-slate-400 ${T.sm}`}>
                    {salonsV2Loading ? "Loading report…" : `No bookings in ${monthLabel(month)}${search || city ? " match these filters" : ""}.`}
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.store_id} className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60">
                  <td />

                  {/* Partner / Salon Details */}
                  <td className="py-3 pr-1.5 align-middle">
                    <span className="flex items-center gap-2.5">
                      <SalonLogo name={row.partner_name} logo={row.partner_logo} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className={`truncate font-bold text-slate-800 ${T.xs}`}>{row.partner_name}</span>
                          {row.salon_deleted ? (
                            <Chip className="bg-slate-100 text-slate-500">Deleted</Chip>
                          ) : (
                            <Chip className="bg-[#EDE7FF] text-[#5B21F0]">Partner</Chip>
                          )}
                        </span>
                        <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>{row.store_type || DASH}</span>
                        <span className={`mt-0.5 block truncate text-slate-400 ${T.tiny}`}>Partner ID: #{row.store_id}</span>
                      </span>
                    </span>
                  </td>

                  {/* Contact */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`flex items-center gap-1.5 text-slate-600 ${T.xxs}`}>
                      <Phone size={11} className="shrink-0" style={{ color: GREEN }} />
                      <span className="truncate">{row.partner_phone || DASH}</span>
                    </span>
                    <span className={`mt-1 flex items-center gap-1.5 text-slate-400 ${T.tiny}`}>
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{row.partner_email || DASH}</span>
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`flex items-center gap-1.5 text-slate-600 ${T.xxs}`}>
                      <MapPin size={11} className="shrink-0" style={{ color: RED }} />
                      <span className="truncate">{row.area || DASH}</span>
                    </span>
                    <span className={`mt-1 block truncate pl-[17px] text-slate-400 ${T.tiny}`}>
                      {[row.city, row.state].filter(Boolean).join(", ") || DASH}
                    </span>
                  </td>

                  {/* Total Bookings */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block font-extrabold text-slate-900 ${T.md}`}>{fmtInt(row.total_bookings)}</span>
                    <Chip className="mt-1 bg-[#EAF2FE] text-[#2E90FA]">Bookings</Chip>
                  </td>

                  {/* Completed */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block font-bold text-slate-800 ${T.md}`}>{fmtInt(row.completed)}</span>
                    <span className={`mt-1 block font-semibold ${T.tiny}`} style={{ color: GREEN }}>{fmtPct(row.completed_pct)}</span>
                  </td>

                  {/* Cancelled */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block font-bold text-slate-800 ${T.md}`}>{fmtInt(row.cancelled)}</span>
                    <span className={`mt-1 block font-semibold ${T.tiny}`} style={{ color: RED }}>{fmtPct(row.cancelled_pct)}</span>
                  </td>

                  {/* Amount Paid In */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.xs}`}>{fmtMoney(row.gross)}</span>
                    <span className={`mt-1 block truncate text-slate-400 ${T.tiny}`}>({fmtInt(row.orders)} Orders)</span>
                  </td>

                  {/* Payout */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.xs}`}>{fmtMoney(row.payout)}</span>
                    {row.subscription_deducted > 0 && (
                      <span className={`mt-1 block truncate text-slate-400 ${T.tiny}`} title="Subscription fee deducted from payouts">
                        −{fmtMoney(row.subscription_deducted)} sub.
                      </span>
                    )}
                  </td>

                  {/* Platform Fee */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.xs}`}>{fmtMoney(row.platform_fee)}</span>
                    <span className={`mt-1 block truncate text-slate-400 ${T.tiny}`}>
                      ({fmtInt(row.active_bookings)} × {fmtMoney(feeUsed, 2)})
                    </span>
                  </td>

                  {/* CAC */}
                  <td className={`whitespace-nowrap py-3 pr-1.5 align-middle font-semibold text-slate-700 ${T.xs}`} title={`Total CAC spend: ${fmtMoney(row.cac_spend, 2)}`}>
                    {fmtMoney(row.cac_per_booking, 2)}
                  </td>

                  {/* Avg. Order Value */}
                  <td className={`whitespace-nowrap py-3 pr-1.5 align-middle font-bold text-slate-900 ${T.xs}`}>{fmtMoney(row.avg_order_value)}</td>

                  {/* Rating */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    {row.average_rating == null ? (
                      <span className={`text-slate-300 ${T.xs}`}>{DASH}</span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          <Star size={11} className="shrink-0" fill={AMBER} strokeWidth={0} />
                          <span className={`font-bold text-slate-800 ${T.xs}`}>{row.average_rating.toFixed(1)}</span>
                        </span>
                        <span className={`mt-1 block text-slate-400 ${T.tiny}`}>({fmtInt(row.review_count)})</span>
                      </>
                    )}
                  </td>

                  {/* Last Booking */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    {row.last_booking_at ? (
                      <>
                        <span className={`block whitespace-nowrap font-semibold text-slate-700 ${T.xs}`}>
                          {moment(row.last_booking_at.slice(0, 10), "YYYY-MM-DD").format("DD MMM YYYY")}
                        </span>
                        {row.last_booking_at.length > 10 && (
                          <span className={`mt-1 block whitespace-nowrap text-slate-400 ${T.tiny}`}>
                            {moment.parseZone(row.last_booking_at).format("hh:mm A")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className={`text-slate-300 ${T.xs}`}>{DASH}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 pr-1.5 align-middle">
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/monthly-report/${row.store_id}?month=${month}`)}
                        disabled={row.salon_deleted}
                        className={`whitespace-nowrap rounded-md border border-[#E6E8F0] bg-white px-2 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 ${T.tiny}`}
                      >
                        View Details
                      </button>
                      <span data-report-menu className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuFor(menuFor === row.store_id ? null : row.store_id)}
                          disabled={row.salon_deleted}
                          className="shrink-0 text-slate-300 transition-colors hover:text-slate-500 disabled:opacity-40"
                          aria-label="More actions"
                          aria-expanded={menuFor === row.store_id}
                        >
                          <MoreVertical size={13} />
                        </button>
                        {menuFor === row.store_id && (
                          <span role="menu" className={`absolute right-0 top-6 z-20 flex w-[200px] flex-col rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg ${T.xs}`}>
                            <button type="button" role="menuitem" onClick={() => downloadPdf(row)} className="px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50">
                              Download monthly invoice PDF
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => navigate(`/partnerdetails/${row.store_id}`)}
                              className="px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                            >
                              Open partner profile
                            </button>
                          </span>
                        )}
                      </span>
                    </span>
                  </td>

                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Pagination                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${CARD}`}>
          <p className={`whitespace-nowrap text-slate-500 ${T.sm}`}>
            {total === 0
              ? "Showing 0 salons"
              : `Showing ${fmtInt((currentPage - 1) * size + 1)} to ${fmtInt(Math.min(currentPage * size, total))} of ${fmtInt(total)} salons`}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {pageList(currentPage, lastPage).map((item) =>
              typeof item === "number" ? (
                <PageButton key={item} pageNumber={item} active={currentPage === item} onClick={() => setPage(item)} />
              ) : (
                <span key={item} className={`px-0.5 text-slate-400 ${T.sm}`}>
                  ...
                </span>
              )
            )}

            <button
              type="button"
              onClick={() => setPage(Math.min(lastPage, currentPage + 1))}
              disabled={currentPage === lastPage}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`whitespace-nowrap text-slate-500 ${T.sm}`}>Rows per page</span>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(e) => onFilter(setRowsPerPage)(e.target.value)}
                className={`appearance-none rounded-lg border border-[#E6E8F0] bg-white py-1.5 pl-3 pr-7 font-medium text-slate-700 focus:outline-none ${T.sm}`}
              >
                {ROWS_PER_PAGE.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </ScaledCanvas>

      {feeDialog && (
        <PlatformFeeDialog current={platformFee} busy={platformFeeSaving} onSave={saveFee} onClose={() => setFeeDialog(false)} />
      )}
    </>
  );
};

export default MonthlyReportV2;
