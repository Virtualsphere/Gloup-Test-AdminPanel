import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  IndianRupee,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import {
  fetchInvoicePayoutsSummaryV2,
  fetchPartnerInvoiceDaysV2,
  fetchPayoutPartnersV2,
  payPartnerInvoicesV2,
  queryPayoutPartnersV2,
  setPartnerPayoutFrequencyV2,
} from "../../redux/slices/invoiceSlice";
import { downloadXlsx } from "../../utils/excelExport";
import { downloadCsv } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD } from "../v2/tokens";
import { Card, Chip as BaseChip, HeaderBell, SalonLogo as BaseSalonLogo } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Invoices & Payouts" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// An invoice is one salon's bookings on one visit day; it is paid out when an
// admin marks it paid (InvoicePayouts) - net of any subscription fee. Each
// salon's payout_frequency decides when a day's money is DUE: daily = next
// day, weekly = the Monday after its week, monthly = the 1st of next month.
// Statuses: Scheduled (not due yet), Due, Overdue (due 3+ days), Paid.
//
// Data (invoiceSlice):
//   /getInvoicePayoutsSummaryV2   KPIs, schedule overview, month summary
//   /getInvoicePayoutPartnersV2   payout table, overdue list, side panels
//   /getPartnerInvoiceDaysV2      View Details
//   /setPartnerPayoutFrequencyV2  change a salon's payout schedule
//   /payPartnerInvoicesV2         Pay Now - markinvoicepayout per due day,
//                                 oldest first, so deductions and the invoice
//                                 page's Undo work exactly as before
// Single-day actions (PDF, undo) stay on the invoice page (/invoice/:id).
// "Processing" has no data (no bank-transfer tracking) and Create Invoice has
// no meaning here (invoices come from bookings), so neither is wired.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const AMBER = "#F5A623";
const VIOLET = "#7C3AED";
const INDIGO = "#4F46E5";

// Measured card widths from the mockup, used directly as grid fr units.
const MAIN_COLS = "grid-cols-[918fr_587fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these.
//
// These sit ~18% above the values first measured off the mockup screenshot.
// That screenshot was 1536px wide (1305px of content) while this canvas is
// 1520px, so the original numbers were ~16% under-scaled relative to the
// design's own proportions - the page rendered smaller than the mockup rather
// than matching it. The column widths were already scaled by that factor, so
// raising type to match is a correction, not a redesign.
//
// `th` is deliberately a step below `xs`: table headers are short, static
// labels, and holding them back is what buys the body rows their width.
const T = {
  tiny: "text-[10px]", // email line, chips, "(Due for 3+ days)"
  xxs: "text-[12px]", // KPI label
  th: "text-[12px]", // table column headers
  xs: "text-[13px]", // table body cells, field labels
  sm: "text-[14px]", // card titles
  base: "text-[15px]", // body, buttons, inputs
  md: "text-[18px]", // KPI currency values
  lg: "text-[22px]", // payout schedule amounts
  kpi: "text-[26px]", // KPI count values
};

const GAP = "gap-3";
const DASH = "—";
const DAY = "YYYY-MM-DD";

const FREQUENCIES = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];
const FREQUENCY_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FREQUENCY_TONES = {
  daily: "bg-[#EDE7FF] text-[#5B21F0]",
  weekly: "bg-sky-50 text-sky-600",
  monthly: "bg-amber-50 text-amber-600",
};

const STATUS = {
  scheduled: { label: "Scheduled", chip: "bg-slate-100 text-slate-600" },
  due: { label: "Due", chip: "bg-amber-50 text-amber-600" },
  overdue: { label: "Overdue", chip: "bg-rose-50 text-rose-600" },
  paid: { label: "Paid", chip: "bg-emerald-50 text-emerald-600" },
};

const PAYOUT_TYPES = [
  { value: "all", label: "All Payouts" },
  { value: "daily", label: "Daily Payout" },
  { value: "weekly", label: "Weekly Payout" },
  { value: "monthly", label: "Monthly Payout" },
];
const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "due", label: "Due" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];
const PAGE_SIZE = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const istToday = () => moment().utcOffset(330).format(DAY);
const fmtInt = (n) => (n == null ? DASH : Number(n).toLocaleString("en-IN"));
const fmtMoney = (n) =>
  n == null
    ? DASH
    : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDay = (day) => (day ? moment(day, DAY).format("DD MMM YYYY") : DASH);
const fmtPaidAt = (value) => (value ? moment(value).format("DD MMM YYYY") : DASH);

// "(Tomorrow)", "(In 4 days)", "(Due today)", "(3 days overdue)".
const relativeDue = (day, today) => {
  if (!day) return "";
  const diff = moment(day, DAY).diff(moment(today, DAY), "days");
  if (diff === 0) return "(Due today)";
  if (diff === 1) return "(Tomorrow)";
  if (diff > 1) return `(In ${diff} days)`;
  return `(${-diff} day${diff === -1 ? "" : "s"} overdue)`;
};

// { value, up } percent change, or null when there's no base.
const delta = (cur, prev) => {
  if (cur == null || prev == null || !prev) return null;
  const change = ((cur - prev) / prev) * 100;
  return { value: `${Math.abs(change).toFixed(1)}%`, up: change >= 0 };
};

// The equal-length period right before [from, to].
const previousPeriod = (from, to) => {
  const days = moment(to, DAY).diff(moment(from, DAY), "days") + 1;
  return {
    from: moment(from, DAY).subtract(days, "days").format(DAY),
    to: moment(from, DAY).subtract(1, "days").format(DAY),
  };
};

// Columns of the payout export - shared by the CSV and Excel files so they
// always match. `kind` decides the Excel cell type / format.
const EXPORT_COLUMNS = [
  { header: "Partner", kind: "text", width: 32, get: (r) => r.partner_name },
  { header: "Phone", kind: "text", width: 14, get: (r) => r.partner_phone },
  { header: "Email", kind: "text", width: 30, get: (r) => r.partner_email },
  { header: "City", kind: "text", width: 16, get: (r) => r.city },
  { header: "Payout schedule", kind: "text", width: 15, get: (r) => FREQUENCY_LABEL[r.frequency] },
  { header: "Status", kind: "text", width: 11, get: (r) => STATUS[r.status].label },
  { header: "Invoices", kind: "int", width: 10, get: (r) => r.invoices },
  { header: "Bookings", kind: "int", width: 10, get: (r) => r.bookings },
  { header: "Invoiced (gross)", kind: "money", width: 16, get: (r) => r.gross },
  { header: "Paid invoices", kind: "int", width: 13, get: (r) => r.paid_invoices },
  { header: "Paid out", kind: "money", width: 14, get: (r) => r.paid_amount },
  { header: "Subscription deducted", kind: "money", width: 20, get: (r) => r.subscription_deducted },
  { header: "Unpaid (gross)", kind: "money", width: 15, get: (r) => r.unpaid_gross },
  { header: "Overdue (gross)", kind: "money", width: 15, get: (r) => r.overdue_gross },
  { header: "Estimated payout", kind: "money", width: 17, get: (r) => r.estimated_payout },
  { header: "Next payout date", kind: "date", width: 16, get: (r) => r.next_payout_date },
  { header: "Last payout date", kind: "date", width: 16, get: (r) => r.last_paid_invoice_date },
];

const defaultFilters = () => ({
  from: moment(istToday(), DAY).startOf("month").format(DAY),
  to: istToday(),
  search: "",
  payoutType: "all",
  status: "all",
});

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// Uppercase card heading used by every panel on this page.
const SectionTitle = ({ children, className = "" }) => (
  <h2
    className={`flex min-w-0 items-center gap-1.5 whitespace-nowrap font-bold uppercase tracking-wide text-slate-800 ${T.sm} ${className}`}
  >
    {children}
  </h2>
);

// Arrow + delta; `goodWhenUp` decides the colour.
const Delta = ({ value, up, goodWhenUp = true }) => {
  const good = up === goodWhenUp;
  return (
    <span className={`whitespace-nowrap font-semibold ${good ? "text-emerald-500" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {value}
    </span>
  );
};

const Chip = (props) => <BaseChip size={`px-1.5 py-[3px] ${T.tiny}`} {...props} />;

const FieldLabel = ({ children }) => (
  <span className={`mb-1 block font-medium text-slate-500 ${T.xs}`}>{children}</span>
);

// The salon's own logo when it has one, the shared initials plate otherwise.
const SalonLogo = ({ name, logo, size = 32 }) => {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={getImageUrl(logo)}
        alt=""
        onError={() => setFailed(true)}
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <BaseSalonLogo name={name || "?"} size={size} className={`rounded-md ${T.tiny}`} />;
};

// Footer call-to-action shared by the list cards.
const ViewAllButton = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#E6E8F0] bg-white px-4 py-1.5 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.xs}`}
  >
    {children}
    <ArrowRight size={12} className="shrink-0" style={{ color: BRAND }} />
  </button>
);

// Closes a popover when clicking anywhere outside `ref`.
const useOutsideClose = (ref, open, onClose) => {
  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, open, onClose]);
};

const HOW_IT_WORKS = [
  "Each visit day's bookings at a salon form one invoice: important services at full price, the rest at what the customer paid.",
  "A salon's payout schedule decides when that money is due: Daily - the next day; Weekly - the Monday after the week; Monthly - the 1st of the next month.",
  "Scheduled = not due yet. Due = due now. Overdue = due for 3+ days. Paid = marked paid.",
  "Pay Now marks every due day paid, oldest first. Each day deducts any subscription fee the salon owes, exactly like Mark as Paid on the invoice page.",
  "Single days (PDF, undo) are handled on the invoice page - open it from View Details.",
];

// Title, subtitle and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, trackingStart }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(ref, open, close);

  return (
    <PageHeaderPortal>
      <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="hidden truncate text-[11px] leading-tight text-slate-400 md:block">
            Manage salon invoices, payments and partner payouts
          </p>
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
                {trackingStart && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-slate-500">
                    Payouts are tracked from {fmtDay(trackingStart)} (the first payout recorded / go-live
                    date); earlier days are never shown as unpaid.
                  </p>
                )}
              </div>
            )}
          </div>

          <HeaderBell count={12} color={RED} className="text-slate-500" />
        </div>
      </div>
    </PageHeaderPortal>
  );
};

// Weekly / Monthly right-rail panel - same shape, different frequency.
const PayoutRailCard = ({ title, count, rows, onViewAll, loading }) => (
  <Card>
    <div className="flex items-center justify-between gap-2 border-b border-[#EDEFF5] px-3.5 py-2.5">
      <SectionTitle>
        {title} ({fmtInt(count)})
      </SectionTitle>

      <button
        type="button"
        onClick={onViewAll}
        className={`flex shrink-0 items-center gap-1 font-semibold ${T.xs}`}
        style={{ color: BRAND }}
      >
        View All
        <ArrowRight size={11} className="shrink-0" />
      </button>
    </div>

    <table className="w-full table-fixed border-collapse text-left">
      <colgroup>
        <col style={{ width: 21 }} />
        <col style={{ width: 247 }} />
        <col style={{ width: 175 }} />
        <col style={{ width: 123 }} />
        <col style={{ width: 21 }} />
      </colgroup>

      <thead>
        <tr className="border-b border-[#EDEFF5]">
          <th />
          <th className={`whitespace-nowrap py-2 pr-2 font-semibold text-slate-500 ${T.th}`}>Partner / Salon</th>
          <th className={`whitespace-nowrap py-2 pr-2 font-semibold text-slate-500 ${T.th}`}>Next Payout Date</th>
          <th className={`whitespace-nowrap py-2 pr-2 text-right font-semibold text-slate-500 ${T.th}`}>
            Estimated Payout
          </th>
          <th />
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className={`py-6 text-center text-slate-400 ${T.xs}`}>
              {loading ? "Loading…" : "No unpaid invoices on this schedule."}
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr
            key={row.store_id}
            className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
          >
            <td />
            <td className={`truncate py-2.5 pr-2 font-semibold text-slate-700 ${T.xs}`}>{row.partner_name}</td>
            <td className={`whitespace-nowrap py-2.5 pr-2 text-slate-600 ${T.xs}`}>{fmtDay(row.next_payout_date)}</td>
            <td className={`whitespace-nowrap py-2.5 pr-2 text-right font-bold text-slate-900 ${T.xs}`}>
              {fmtMoney(row.estimated_payout)}
            </td>
            <td />
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
      <span className={`whitespace-nowrap text-slate-400 ${T.xs}`}>
        {count > rows.length ? `+ ${fmtInt(count - rows.length)} more partners` : " "}
      </span>
      <ViewAllButton onClick={onViewAll}>View All</ViewAllButton>
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// View Details - a salon's invoice days. Rendered outside ScaledCanvas (a
// fixed overlay inside the transformed canvas would be positioned and scaled
// relative to it).
// ---------------------------------------------------------------------------

const DetailsDialog = ({ storeId, busy, onPay, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let alive = true;
    dispatch(fetchPartnerInvoiceDaysV2({ storeId }))
      .unwrap()
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error: String(error) }));
    return () => {
      alive = false;
    };
  }, [dispatch, storeId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const partner = state.data?.partner;
  const days = state.data?.days || [];
  const dueDays = days.filter((d) => d.status === "due" || d.status === "overdue");
  const unpaidGross = days.filter((d) => d.status !== "paid").reduce((s, d) => s + d.gross, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Partner payouts"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-slate-900">{partner?.partner_name || "Partner"}</h2>
            {partner && (
              <p className="mt-0.5 text-sm text-slate-500">
                {[partner.partner_phone, partner.partner_email, partner.city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {state.loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : state.error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                ["Payout schedule", FREQUENCY_LABEL[partner.frequency]],
                ["Unpaid (gross)", fmtMoney(unpaidGross)],
                ["Due now", `${dueDays.length} day${dueDays.length === 1 ? "" : "s"}`],
                ["Subscription owed", fmtMoney(partner.subscription_owed_now)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Visit day</th>
                    <th className="px-3 py-2 text-right font-semibold">Bookings</th>
                    <th className="px-3 py-2 text-right font-semibold">Invoice</th>
                    <th className="px-3 py-2 font-semibold">Due</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid out</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {days.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                        No invoices since payouts started being tracked ({fmtDay(state.data.tracking_start)}).
                      </td>
                    </tr>
                  )}
                  {days.map((d) => (
                    <tr key={d.invoice_date}>
                      <td className="px-3 py-2 text-slate-700">{fmtDay(d.invoice_date)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{d.bookings}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtMoney(d.gross)}</td>
                      <td className="px-3 py-2 text-slate-600">{fmtDay(d.due_date)}</td>
                      <td className="px-3 py-2">
                        <Chip className={STATUS[d.status].chip}>{STATUS[d.status].label}</Chip>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {d.payout_amount == null ? (
                          DASH
                        ) : (
                          <span title={d.subscription_deducted > 0 ? `${fmtMoney(d.subscription_deducted)} subscription deducted` : undefined}>
                            {fmtMoney(d.payout_amount)}
                            <span className="block text-[11px] text-slate-400">{fmtPaidAt(d.paid_at)}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/invoice/${storeId}?date=${d.invoice_date}`)}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50"
                          title="Open this day's invoice (PDF, mark paid / undo)"
                        >
                          Invoice
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Payout = invoice total minus any subscription fee owed. Days before {fmtDay(state.data.tracking_start)} aren't tracked.
              </p>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => onPay({ store_id: storeId, partner_name: partner.partner_name, due_invoices: dueDays.length })}
                  disabled={busy || dueDays.length === 0}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: BRAND }}
                >
                  {busy ? "Paying…" : `Pay ${dueDays.length} due day${dueDays.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const InvoicePayoutsV2 = ({ title = "Invoices & Payouts" }) => {
  const dispatch = useDispatch();
  const {
    summaryV2: summary,
    summaryV2Error,
    partnersV2,
    partnersV2Loading,
    partnersV2Error,
    actionV2Loading,
  } = useSelector((state) => state.invoice);

  // Draft filters edit freely; Apply Filters makes them the applied set.
  const [draft, setDraft] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [panels, setPanels] = useState({ overdue: null, weekly: null, monthly: null });
  const [panelsLoading, setPanelsLoading] = useState(false);
  const [details, setDetails] = useState(null); // store_id
  const [menuFor, setMenuFor] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const tableRef = useRef(null);
  const exportRef = useRef(null);
  const closeExportMenu = useCallback(() => setExportMenuOpen(false), []);
  useOutsideClose(exportRef, exportMenuOpen, closeExportMenu);

  const today = istToday();
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const setDraftField = (field) => (value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const applyFilters = () => {
    if (draft.from > draft.to) {
      toast.error("The start date is after the end date", { id: "invoices-v2-filter" });
      return;
    }
    setFilters(draft);
    setActiveTab(draft.payoutType);
    setPage(1);
  };
  const clearFilters = () => {
    const fresh = defaultFilters();
    setDraft(fresh);
    setFilters(fresh);
    setActiveTab("all");
    setPage(1);
  };
  const selectTab = (key) => {
    setActiveTab(key);
    setDraft((prev) => ({ ...prev, payoutType: key }));
    setPage(1);
  };

  // ---- data ---------------------------------------------------------------

  const tableParams = useMemo(() => {
    const params = { from: filters.from, to: filters.to, sort: "urgency" };
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status !== "all") params.status = filters.status;
    if (activeTab !== "all") params.frequency = activeTab;
    return params;
  }, [filters, activeTab]);

  useEffect(() => {
    dispatch(fetchPayoutPartnersV2({ ...tableParams, page, limit: PAGE_SIZE }));
  }, [dispatch, tableParams, page, reloadKey]);

  useEffect(() => {
    const prev = previousPeriod(filters.from, filters.to);
    dispatch(
      fetchInvoicePayoutsSummaryV2({
        ranges: [
          { key: "cur", from: filters.from, to: filters.to },
          { key: "prev", ...prev },
          { key: "month", from: moment(today, DAY).startOf("month").format(DAY), to: today },
        ],
      })
    );
  }, [dispatch, filters.from, filters.to, today, reloadKey]);

  // Side panels look at everything unpaid, not just the filtered window.
  useEffect(() => {
    let alive = true;
    setPanelsLoading(true);
    const query = (params) => dispatch(queryPayoutPartnersV2({ limit: 5, ...params })).unwrap();
    Promise.all([
      query({ status: "overdue", sort: "urgency" }),
      query({ frequency: "weekly", sort: "next_payout" }),
      query({ frequency: "monthly", sort: "next_payout" }),
    ])
      .then(([overdue, weekly, monthly]) => alive && setPanels({ overdue, weekly, monthly }))
      .catch((error) => toast.error(String(error), { id: "invoices-v2-panels" }))
      .finally(() => alive && setPanelsLoading(false));
    return () => {
      alive = false;
    };
  }, [dispatch, reloadKey]);

  // Close the row menu on any click outside it.
  useEffect(() => {
    if (menuFor === null) return undefined;
    const close = (e) => !e.target.closest("[data-payout-menu]") && setMenuFor(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor]);

  const rows = partnersV2?.rows || [];
  const total = partnersV2?.total || 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);

  // ---- actions ------------------------------------------------------------

  const payNow = async (row) => {
    const dueCount = row.due_invoices ?? 0;
    if (!window.confirm(`Mark ${row.partner_name}'s ${dueCount} due invoice day${dueCount === 1 ? "" : "s"} as paid? Any subscription fee owed is deducted, oldest day first.`)) return;
    const toastId = "invoices-v2-pay";
    toast.loading("Marking payouts…", { id: toastId });
    try {
      const res = await dispatch(payPartnerInvoicesV2({ storeId: row.store_id })).unwrap();
      const msg = `${res.paid.length} day${res.paid.length === 1 ? "" : "s"} paid · ${fmtMoney(res.total_paid_out)} paid out${
        res.total_deducted > 0 ? ` · ${fmtMoney(res.total_deducted)} subscription deducted` : ""
      }`;
      if (res.failed) {
        toast.error(`${msg}. Stopped at ${fmtDay(res.failed.invoice_date)}: ${res.failed.message}`, { id: toastId, duration: 7000 });
      } else {
        toast.success(msg, { id: toastId, duration: 5000 });
      }
      setDetails(null);
      reload();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to pay", { id: toastId });
    }
  };

  const changeFrequency = async (row, frequency) => {
    setMenuFor(null);
    if (row.frequency === frequency) return;
    try {
      await dispatch(setPartnerPayoutFrequencyV2({ storeIds: [row.store_id], frequency })).unwrap();
      toast.success(`${row.partner_name} is now paid ${FREQUENCY_LABEL[frequency].toLowerCase()}`, { id: "invoices-v2-frequency" });
      reload();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update", { id: "invoices-v2-frequency" });
    }
  };

  // Every row matching the current filters / tab, as Excel or CSV.
  const exportPayouts = async (format) => {
    setExportMenuOpen(false);
    setExporting(true);
    const toastId = "invoices-v2-export";
    try {
      const data = await dispatch(queryPayoutPartnersV2({ ...tableParams, page: 1, limit: 10000 })).unwrap();
      const exportRows = data?.rows || [];
      if (!exportRows.length) {
        toast.error("Nothing to export", { id: toastId });
        return;
      }
      const baseName = `payouts_${filters.from}_to_${filters.to}${activeTab === "all" ? "" : `_${activeTab}`}`;

      if (format === "xlsx") {
        await downloadXlsx(`${baseName}.xlsx`, [{ name: "Payouts", rows: exportRows, columns: EXPORT_COLUMNS }]);
      } else {
        downloadCsv(
          `${baseName}.csv`,
          EXPORT_COLUMNS.map((column) => column.header),
          exportRows.map((row) => EXPORT_COLUMNS.map((column) => column.get(row) ?? ""))
        );
      }
      toast.success(`Exported ${fmtInt(exportRows.length)} partner${exportRows.length === 1 ? "" : "s"}`, { id: toastId });
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to export", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const showTab = (key) => {
    selectTab(key);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ---- KPIs ---------------------------------------------------------------

  const cur = summary?.ranges?.cur;
  const prev = summary?.ranges?.prev;
  const month = summary?.ranges?.month;
  const totals = summary?.totals;
  const vsLabel = "vs previous period";

  const kpis = [
    { label: "Total Invoices", value: fmtInt(cur?.invoices), delta: delta(cur?.invoices, prev?.invoices), icon: FileText, color: INDIGO, tint: "#E8E9FD" },
    { label: "Paid Invoices", value: fmtInt(cur?.paid_invoices), delta: delta(cur?.paid_invoices, prev?.paid_invoices), icon: ClipboardCheck, color: GREEN, tint: "#E1F7EC" },
    { label: "Pending Invoices", value: fmtInt(cur?.pending_invoices), delta: delta(cur?.pending_invoices, prev?.pending_invoices), goodWhenUp: false, icon: Clock, color: AMBER, tint: "#FFF2DC" },
    { label: "Overdue Invoices", value: fmtInt(cur?.overdue_invoices), delta: delta(cur?.overdue_invoices, prev?.overdue_invoices), goodWhenUp: false, icon: AlertTriangle, color: RED, tint: "#FDE7E7" },
    { label: "Total Amount Paid In", value: fmtMoney(cur?.gross), money: true, delta: delta(cur?.gross, prev?.gross), note: "Customers' payments", icon: IndianRupee, color: BLUE, tint: "#E1F0FF" },
    { label: "Total Payout (All Time)", value: fmtMoney(totals?.paid_out_all_time), money: true, note: `${fmtInt(totals?.payouts_all_time)} payouts`, icon: Wallet, color: VIOLET, tint: "#EDE7FF" },
    { label: "Pending Payout (All)", value: fmtMoney(totals?.unpaid_gross), money: true, note: "Before subscription fees", icon: CheckCircle2, color: GREEN, tint: "#E1F7EC" },
    { label: "Overdue Payout", value: fmtMoney(totals?.overdue_gross), money: true, danger: true, note: `(Due for ${summary?.overdue_grace_days ?? 3}+ days)`, icon: AlertOctagon, color: RED, tint: "#FDE7E7" },
  ];

  const schedule = FREQUENCIES.map((f) => ({
    key: f.key,
    label: `${f.label} Payout`,
    bucket: summary?.by_frequency?.[f.key],
  }));

  const payoutSummary = [
    { label: "Total Invoiced", value: month?.gross, icon: CalendarDays, color: BLUE, tint: "#E1F0FF" },
    { label: "Paid Out", value: month?.paid_amount, icon: ClipboardCheck, color: GREEN, tint: "#E1F7EC" },
    { label: "Overdue", value: month?.overdue_gross, icon: AlertOctagon, color: RED, tint: "#FDE7E7" },
    { label: "Pending", value: month?.pending_gross, icon: Wallet, color: VIOLET, tint: "#EDE7FF" },
  ];

  const tabs = [
    { key: "all", label: "All", count: null },
    ...FREQUENCIES.map((f) => ({ key: f.key, label: f.label, count: summary?.by_frequency?.[f.key]?.partners })),
  ];
  const error = partnersV2Error || summaryV2Error;
  const trackingStart = summary?.tracking_start || partnersV2?.trackingStart;

  return (
    <>
      <PageHeader title={title} trackingStart={trackingStart} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {error && (
          <div className={`flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 ${T.xs}`}>
            <AlertTriangle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Failed to load: {error}</span>
            <button type="button" onClick={reload} className="shrink-0 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Export / create - the title row lives in the app bar             */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((open) => !open)}
              disabled={exporting}
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.base}`}
            >
              <FileSpreadsheet size={14} className="shrink-0 text-slate-500" />
              {exporting ? "Exporting…" : "Export"}
              <ChevronDown size={13} className="shrink-0 text-slate-400" />
            </button>
            {exportMenuOpen && (
              <div
                role="menu"
                className={`absolute right-0 top-11 z-30 flex w-[230px] flex-col rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg ${T.xs}`}
              >
                {[
                  ["xlsx", "Excel (.xlsx)", "Formatted amounts and dates"],
                  ["csv", "CSV (.csv)", "Plain text, for other tools"],
                ].map(([format, label, hint]) => (
                  <button
                    key={format}
                    type="button"
                    role="menuitem"
                    onClick={() => exportPayouts(format)}
                    className="px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="block font-semibold text-slate-700">{label}</span>
                    <span className={`block text-slate-400 ${T.tiny}`}>{hint}</span>
                  </button>
                ))}
                <span className={`border-t border-[#F1F2F6] px-3 pb-1 pt-2 text-slate-400 ${T.tiny}`}>
                  Exports every partner matching the current filters and tab.
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled
            title="Invoices are generated automatically from each day's bookings - there is nothing to create by hand"
            className={`flex cursor-not-allowed items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold text-white opacity-50 shadow-sm ${T.base}`}
            style={{ background: BRAND }}
          >
            <Plus size={14} className="shrink-0" />
            Create Invoice
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-8 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            <Card key={kpi.label} className="p-3">
              <div className="flex items-start gap-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: kpi.tint }}>
                  <Icon size={15} style={{ color: kpi.color }} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium text-slate-500 ${T.xxs}`}>{kpi.label}</p>

                  <p
                    className={`mt-0.5 truncate font-extrabold tracking-tight ${kpi.money ? T.md : T.kpi} ${kpi.danger ? "" : "text-slate-900"}`}
                    style={kpi.danger ? { color: RED } : undefined}
                  >
                    {kpi.value}
                  </p>

                  <p className={`mt-1 truncate ${T.tiny}`}>
                    {kpi.delta ? (
                      <>
                        <Delta value={kpi.delta.value} up={kpi.delta.up} goodWhenUp={kpi.goodWhenUp !== false} />{" "}
                        <span className="text-slate-400">{vsLabel}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">{kpi.note || `${vsLabel}: —`}</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`flex items-end gap-4 px-4 py-3 ${CARD}`}>
          <label className="w-[300px] shrink-0">
            <FieldLabel>Date Range (visit days)</FieldLabel>
            <span className={`flex items-center gap-1.5 rounded-lg border border-[#E6E8F0] bg-white px-2 py-1.5 text-slate-700 ${T.xs}`}>
              <CalendarDays size={14} className="shrink-0 text-slate-400" />
              <input type="date" value={draft.from} max={draft.to} onChange={(e) => setDraftField("from")(e.target.value)} className="min-w-0 flex-1 bg-transparent focus:outline-none" />
              <span className="text-slate-400">–</span>
              <input type="date" value={draft.to} max={today} onChange={(e) => setDraftField("to")(e.target.value)} className="min-w-0 flex-1 bg-transparent focus:outline-none" />
            </span>
          </label>

          <label className="w-[300px] shrink-0">
            <FieldLabel>Partner / Salon</FieldLabel>
            <span className="relative block">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={draft.search}
                onChange={(e) => setDraftField("search")(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Search salon name, phone or email..."
                className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2 pl-9 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
              />
            </span>
          </label>

          {[
            ["Payout Type", "payoutType", PAYOUT_TYPES, "w-[200px]"],
            ["Status", "status", STATUSES, "w-[190px]"],
          ].map(([label, field, options, width]) => (
            <label key={field} className={`${width} shrink-0`}>
              <FieldLabel>{label}</FieldLabel>
              <span className="relative block">
                <select
                  value={draft[field]}
                  onChange={(e) => setDraftField(field)(e.target.value)}
                  className={`w-full appearance-none rounded-lg border border-[#E6E8F0] bg-white py-2 pl-3 pr-8 text-slate-700 focus:outline-none ${T.base}`}
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </span>
            </label>
          ))}

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button type="button" onClick={clearFilters} className={`w-[92px] rounded-lg border border-[#E6E8F0] bg-white py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.base}`}>
              Clear
            </button>

            <button
              type="button"
              onClick={applyFilters}
              className={`flex w-[147px] items-center justify-center gap-1.5 rounded-lg py-2 font-semibold text-white shadow-sm ${T.base}`}
              style={{ background: BRAND }}
            >
              <Filter size={13} className="shrink-0" />
              Apply Filters
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Main grid - payout tables on the left, rails on the right         */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${MAIN_COLS} ${GAP}`}>
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            {/* Payout schedule overview ---------------------------------- */}
            <Card className="p-3.5">
              <SectionTitle className="mb-3">Payout Schedule Overview</SectionTitle>

              <div className="grid grid-cols-3 divide-x divide-[#EDEFF5] rounded-xl border border-[#E6E8F0]">
                {schedule.map((item) => (
                  <div key={item.key} className="flex flex-col items-center px-3 py-4">
                    <p className={`font-bold text-slate-800 ${T.base}`}>{item.label}</p>
                    <p className={`mt-1 text-slate-400 ${T.xs}`}>
                      {fmtInt(item.bucket?.partners_with_unpaid)} to pay · {fmtInt(item.bucket?.partners)} on schedule
                    </p>
                    <p className={`mt-2 font-extrabold tracking-tight text-slate-900 ${T.lg}`}>{fmtMoney(item.bucket?.estimated_payout)}</p>
                    <button
                      type="button"
                      onClick={() => showTab(item.key)}
                      className={`mt-2.5 flex items-center gap-1 font-semibold text-slate-500 transition-colors hover:text-slate-700 ${T.xs}`}
                    >
                      View Partners
                      <ArrowRight size={11} className="shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payout partners ------------------------------------------- */}
            <div ref={tableRef}>
              <Card>
                {/* items-end + the -mb-px below is what drops the active tab's
                    underline exactly onto the header's bottom border. */}
                <div className="flex items-end gap-10 border-b border-[#EDEFF5] px-3.5 pt-3">
                  <SectionTitle className="pb-3">Payout Partners</SectionTitle>

                  <div className="flex items-end gap-10">
                    {tabs.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => selectTab(item.key)}
                        className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${T.base} ${
                          activeTab === item.key ? "" : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                        style={activeTab === item.key ? { color: BRAND, borderColor: BRAND } : undefined}
                      >
                        {item.label}
                        {item.count != null && ` (${fmtInt(item.count)})`}
                      </button>
                    ))}
                  </div>
                </div>

                <table className={`w-full table-fixed border-collapse text-left transition-opacity ${partnersV2Loading && rows.length ? "opacity-60" : ""}`}>
                  <colgroup>
                    <col style={{ width: 20 }} />
                    <col style={{ width: 240 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 118 }} />
                    <col style={{ width: 112 }} />
                    <col style={{ width: 76 }} />
                    <col style={{ width: 98 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 16 }} />
                  </colgroup>

                  <thead>
                    <tr className="border-b border-[#EDEFF5]">
                      <th />
                      {["Partner / Salon", "Contact", "Next Payout Date", "Estimated Payout", "Status", "Last Payout", "Actions"].map((column) => (
                        <th key={column} className={`whitespace-nowrap py-2.5 pr-2 font-semibold text-slate-500 ${T.th}`}>
                          {column}
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={9} className={`py-10 text-center text-slate-400 ${T.xs}`}>
                          {partnersV2Loading ? "Loading payouts…" : "No invoices match these filters."}
                        </td>
                      </tr>
                    )}

                    {rows.map((row) => (
                      <tr key={row.store_id} className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60">
                        <td />

                        <td className="py-2.5 pr-2 align-middle">
                          <span className="flex items-center gap-2">
                            <SalonLogo name={row.partner_name} logo={row.partner_logo} />
                            <span className="min-w-0 leading-tight">
                              <span className={`block truncate font-semibold text-slate-800 ${T.xs}`}>{row.partner_name}</span>
                              <span className={`mt-0.5 flex items-center gap-1 ${T.tiny}`}>
                                <Chip className={FREQUENCY_TONES[row.frequency]}>{FREQUENCY_LABEL[row.frequency]}</Chip>
                                <span className="truncate text-slate-400">
                                  {row.invoices} invoice{row.invoices === 1 ? "" : "s"}
                                </span>
                              </span>
                            </span>
                          </span>
                        </td>

                        <td className="py-2.5 pr-2 align-middle leading-tight">
                          <span className={`flex items-center gap-1 text-slate-600 ${T.tiny}`}>
                            <Phone size={10} className="shrink-0" style={{ color: GREEN }} />
                            <span className="truncate">{row.partner_phone || DASH}</span>
                          </span>
                          <span className={`mt-0.5 flex items-center gap-1 text-slate-400 ${T.tiny}`}>
                            <Mail size={10} className="shrink-0" />
                            <span className="truncate">{row.partner_email || DASH}</span>
                          </span>
                        </td>

                        <td className="py-2.5 pr-2 align-middle leading-tight">
                          {row.next_payout_date ? (
                            <>
                              <span className={`block truncate font-semibold text-slate-700 ${T.xs}`}>{fmtDay(row.next_payout_date)}</span>
                              <span className={`block truncate ${T.tiny} ${row.status === "overdue" ? "text-rose-500" : "text-slate-400"}`}>
                                {relativeDue(row.next_payout_date, today)}
                              </span>
                            </>
                          ) : (
                            <span className={`text-slate-400 ${T.xs}`}>{DASH}</span>
                          )}
                        </td>

                        <td className="py-2.5 pr-2 align-middle leading-tight">
                          <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.xs}`}>{fmtMoney(row.estimated_payout)}</span>
                          {row.estimated_payout !== row.unpaid_gross && (
                            <span className={`block truncate text-slate-400 ${T.tiny}`} title="Subscription fee owed is deducted at payout">
                              of {fmtMoney(row.unpaid_gross)}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 pr-2 align-middle">
                          <Chip className={STATUS[row.status].chip}>{STATUS[row.status].label}</Chip>
                        </td>

                        <td className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}>
                          {fmtPaidAt(row.last_paid_at)}
                        </td>

                        <td className="py-2.5 pr-2 align-middle">
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetails(row.store_id)}
                              className={`whitespace-nowrap rounded-md border border-[#E6E8F0] bg-white px-2 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.tiny}`}
                            >
                              View Details
                            </button>
                            <span data-payout-menu className="relative">
                              <button
                                type="button"
                                onClick={() => setMenuFor(menuFor === row.store_id ? null : row.store_id)}
                                className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
                                aria-label="More actions"
                                aria-expanded={menuFor === row.store_id}
                              >
                                <MoreVertical size={13} />
                              </button>
                              {menuFor === row.store_id && (
                                <span role="menu" className={`absolute right-0 top-7 z-20 flex w-[190px] flex-col rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg ${T.xs}`}>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={actionV2Loading || row.due_invoices === 0}
                                    onClick={() => {
                                      setMenuFor(null);
                                      payNow(row);
                                    }}
                                    className="px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-300"
                                  >
                                    Pay {row.due_invoices} due day{row.due_invoices === 1 ? "" : "s"}
                                  </button>
                                  <span className="mt-1 border-t border-[#F1F2F6] px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Payout schedule
                                  </span>
                                  {FREQUENCIES.map((f) => (
                                    <button
                                      key={f.key}
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={row.frequency === f.key}
                                      disabled={actionV2Loading}
                                      onClick={() => changeFrequency(row, f.key)}
                                      className={`flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 ${row.frequency === f.key ? "font-semibold text-violet-600" : "text-slate-700"}`}
                                    >
                                      {f.label}
                                      {row.frequency === f.key && <CheckCircle2 size={13} />}
                                    </button>
                                  ))}
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

                <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                  <span className={`whitespace-nowrap text-slate-400 ${T.xs}`}>
                    {total === 0
                      ? "0 partners"
                      : `${fmtInt((currentPage - 1) * PAGE_SIZE + 1)}–${fmtInt(Math.min(currentPage * PAGE_SIZE, total))} of ${fmtInt(total)} partners · ${fmtDay(filters.from)} – ${fmtDay(filters.to)}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 disabled:text-slate-300" aria-label="Previous page">
                      <ChevronLeft size={13} />
                    </button>
                    <span className={`px-1 text-slate-500 ${T.xs}`}>
                      {currentPage} / {lastPage}
                    </span>
                    <button type="button" onClick={() => setPage(Math.min(lastPage, currentPage + 1))} disabled={currentPage === lastPage} className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-500 disabled:text-slate-300" aria-label="Next page">
                      <ChevronRight size={13} />
                    </button>
                  </span>
                </div>
              </Card>
            </div>

            {/* Overdue payout partners ----------------------------------- */}
            <div className="flex min-w-0 flex-col rounded-2xl border border-[#FBD5D1] bg-white">
              <div className="rounded-t-2xl border-b border-[#FBD5D1] bg-[#FEF4F3] px-3.5 py-2.5">
                <SectionTitle>
                  Overdue Payout Partners {panels.overdue ? `(${fmtInt(panels.overdue.total)})` : ""}
                </SectionTitle>
              </div>

              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: 234 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 129 }} />
                  <col style={{ width: 133 }} />
                  <col style={{ width: 148 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 28 }} />
                </colgroup>

                <thead>
                  <tr className="border-b border-[#F3F5F9]">
                    <th />
                    {["Partner / Salon", "Overdue Since", "Overdue Amount", "Days Overdue", "Last Payout Date"].map((column) => (
                      <th key={column} className={`whitespace-nowrap py-2.5 pr-2 font-semibold text-slate-500 ${T.th}`}>
                        {column}
                      </th>
                    ))}
                    <th className={`whitespace-nowrap py-2.5 pr-2 text-center font-semibold text-slate-500 ${T.th}`}>Action</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {(panels.overdue?.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className={`py-6 text-center text-slate-400 ${T.xs}`}>
                        {panelsLoading ? "Loading…" : "No overdue payouts. 🎉"}
                      </td>
                    </tr>
                  )}
                  {(panels.overdue?.rows || []).map((row) => (
                    <tr key={row.store_id} className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-rose-50/40">
                      <td />
                      <td className={`truncate py-2.5 pr-2 align-middle font-semibold text-slate-800 ${T.xs}`}>{row.partner_name}</td>
                      <td className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}>{fmtDay(row.next_payout_date)}</td>
                      <td className={`whitespace-nowrap py-2.5 pr-2 align-middle font-bold ${T.xs}`} style={{ color: RED }}>
                        {fmtMoney(row.overdue_gross)}
                      </td>
                      <td className={`whitespace-nowrap py-2.5 pr-2 align-middle font-semibold ${T.xs}`} style={{ color: RED }}>
                        {row.days_past_due} Day{row.days_past_due === 1 ? "" : "s"}
                      </td>
                      <td className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}>{fmtPaidAt(row.last_paid_at)}</td>
                      <td className="py-2.5 pr-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => payNow(row)}
                          disabled={actionV2Loading}
                          className={`w-[76px] rounded-md border border-[#FDA29B] bg-[#FEF3F2] py-1 font-semibold transition-colors hover:bg-[#FEE4E2] disabled:opacity-50 ${T.tiny}`}
                          style={{ color: "#D92D20" }}
                        >
                          Pay Now
                        </button>
                      </td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-center px-3.5 py-3">
                <ViewAllButton
                  onClick={() => {
                    const next = { ...defaultFilters(), from: trackingStart || defaultFilters().from, status: "overdue" };
                    setDraft(next);
                    setFilters(next);
                    showTab("all");
                  }}
                >
                  View All Overdue Partners
                </ViewAllButton>
              </div>
            </div>
          </div>

          {/* Right rail ------------------------------------------------------ */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <PayoutRailCard
              title="Weekly Payout Partners"
              count={summary?.by_frequency?.weekly?.partners_with_unpaid ?? 0}
              rows={panels.weekly?.rows || []}
              loading={panelsLoading}
              onViewAll={() => showTab("weekly")}
            />

            <PayoutRailCard
              title="Monthly Payout Partners"
              count={summary?.by_frequency?.monthly?.partners_with_unpaid ?? 0}
              rows={panels.monthly?.rows || []}
              loading={panelsLoading}
              onViewAll={() => showTab("monthly")}
            />

            <Card>
              <div className="border-b border-[#EDEFF5] px-3.5 py-2.5">
                <SectionTitle>Payout Summary (This Month)</SectionTitle>
              </div>

              <div className="grid grid-cols-4 gap-2.5 p-3.5">
                {payoutSummary.map(({ icon: Icon, ...tile }) => (
                  <div key={tile.label} className="flex min-w-0 flex-col items-center rounded-xl border border-[#E6E8F0] px-1.5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: tile.tint }}>
                      <Icon size={17} style={{ color: tile.color }} />
                    </span>
                    <p className={`mt-2 truncate text-slate-500 ${T.xs}`}>{tile.label}</p>
                    <p className={`mt-1 whitespace-nowrap font-extrabold tracking-tight text-slate-900 ${T.xs}`}>{fmtMoney(tile.value)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </ScaledCanvas>

      {details !== null && (
        <DetailsDialog storeId={details} busy={actionV2Loading} onPay={payNow} onClose={() => setDetails(null)} />
      )}
    </>
  );
};

export default InvoicePayoutsV2;
