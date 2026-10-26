import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  BlockAndUnblockSlot,
  deleteService,
  fetchServiceCategories,
  generateDefaultSlots,
  getAllPayoutLogs,
  getBlockedSlots,
  getPartnerDetail,
  getStoreServices,
  updateServiceAmount,
  updateServiceImportant,
} from "../../redux/slices/partnersSlice";
import { fetchMonthlyInvoiceDetails, queryMonthlyReportSalonsV2 } from "../../redux/slices/monthlyInvoiceSlice";
import { exportReviewsV2 } from "../../redux/slices/reviewSlice";
import {
  fetchPartnerInvoiceDaysV2,
  payPartnerInvoicesV2,
  setPartnerPayoutFrequencyV2,
} from "../../redux/slices/invoiceSlice";
import { fetchSubscriptionHistoryV2 } from "../../redux/slices/partnerManualSubscriptionSlice";
import { getCategoryDiscountOverview } from "../../redux/slices/categoryDiscountSlice";
import CreateServiceModal from "../create/CreateService";
import EditServiceModal from "../create/EditService";
import BulkUploadServiceModal from "../create/BulkUploadServiceModal";
import PartnerHolidaysPanel from "./PartnerHolidaysPanel";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, initials } from "../v2/tokens";
import { Card, CardHeader as BaseCardHeader, Chip, Delta, Select as BaseSelect } from "../v2/ui";

// ---------------------------------------------------------------------------
// The tabs after Overview on the redesigned Partner Details page
// (PartnerDetailsV2.jsx). They put the classic Partner Details page's backend
// (details/PartnerDetails.jsx) and the per-salon APIs other pages already use
// into the V2 kit, on the page's 1520px canvas:
//
//   Analytics      the page's getPartnerOverviewV2 payload: period vs previous,
//                  daily bookings, revenue by category, weekday / hour totals
//   Bookings       the overview's recent bookings, /getmonthlyinvoicedetails by
//                  month, the classic slot calendar (/getallpartnerdetails,
//                  /getblockedslots, /blockandunblockslot, /generateDefaultSlots)
//                  and PartnerHolidaysPanel
//   Services       the classic services manager (/getservices, the create /
//                  edit / bulk-upload modals, delete, important, payout amount)
//                  and the stylists from /getallpartnerdetails
//   Offers         /getcategorydiscountoverview for this salon's categories,
//                  and each service's shown-price offer from /getservices
//   Performance    /getMonthlyReportSalonsV2 for the last six months
//   Reviews        /getReviewsListV2 for this salon (the not-stored variant)
//   Payouts        /getPartnerInvoiceDaysV2, Pay Now and the payout schedule
//                  (as on the Invoices page), plus the classic /getpayoutlogs
//   Subscriptions  the overview's plan + /getManualSubscriptionHistoryV2
//   Activity Log   the overview's activity feed, in full
//
// Classic APIs get the id as a string, as the classic page sends it from the
// URL. Its modals are portalled to <body>: inside the scaled canvas a `fixed`
// overlay would be positioned and scaled relative to the canvas. The type
// scale and colours match PartnerDetailsV2's.
// ---------------------------------------------------------------------------

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const RED = "#EF4444";

const T = {
  micro: "text-[10px]",
  tiny: "text-[11px]",
  xs: "text-[12px]",
  sm: "text-[13px]",
  title: "text-[14.5px]",
  stat: "text-[21px]",
};

const GAP = "gap-3";
const PAD = "p-4";
const DASH = "–";
const DAY = "YYYY-MM-DD";
const PAGE_SIZE = 10;

const RECENT_STATUS = {
  completed: ["Completed", "bg-emerald-50 text-emerald-600"],
  upcoming: ["Upcoming", "bg-blue-50 text-blue-600"],
  cancelled: ["Cancelled", "bg-rose-50 text-rose-600"],
  refunded: ["Refunded", "bg-amber-50 text-amber-700"],
  not_completed: ["Not Marked", "bg-slate-100 text-slate-600"],
};

const INVOICE_STATUS = {
  scheduled: ["Scheduled", "bg-slate-100 text-slate-600"],
  due: ["Due", "bg-amber-50 text-amber-600"],
  overdue: ["Overdue", "bg-rose-50 text-rose-600"],
  paid: ["Paid", "bg-emerald-50 text-emerald-600"],
};

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isNum = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : DASH);
const rupee = (v) => (isNum(v) ? `₹${num(v)}` : DASH);
const money = (v) =>
  isNum(v) ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : DASH;
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const fmtDate = (d) => (d ? moment(d).format("MMM D, YYYY") : DASH);
const fmtDay = (d) => (d ? moment(d, DAY).format("MMM D, YYYY") : DASH);
const fmtDateTime = (d) => (d ? moment(d).format("MMM D, YYYY · hh:mm A") : DASH);
const fmtTime = (t) => (t ? moment(t, ["HH:mm:ss", "HH:mm"]).format("h:mm A") : "");
const change = (cur, prev) => (isNum(cur) && isNum(prev) && Number(prev) ? ((cur - prev) / prev) * 100 : null);
const errorText = (e, fallback) => (typeof e === "string" ? e : e?.message || fallback);

// { loading, data, error } for one async call; reload() runs it again and
// keeps the last data on screen meanwhile.
const useLoad = (run, deps) => {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [key, setKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    run()
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((e) => alive && setState({ loading: false, data: null, error: errorText(e, "Failed to load") }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, key]);
  return { ...state, reload: () => setKey((k) => k + 1) };
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.tiny} {...props} />;

const Select = ({ className = "w-[130px] [&_select]:py-1", ...props }) => (
  <BaseSelect size={T.tiny} className={className} {...props} />
);

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-8 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[320px]">{children}</p>
  </div>
);

// Loading / error / empty, or the content.
const Status = ({ state, empty, emptyText, children }) => {
  if (state.loading && !state.data) return <EmptyNote>Loading…</EmptyNote>;
  if (state.error) return <EmptyNote>{state.error}</EmptyNote>;
  if (empty) return <EmptyNote>{emptyText}</EmptyNote>;
  return children;
};

const LinkButton = ({ children, onClick, icon: Icon = ExternalLink }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-md border border-[#E6E8F0] bg-white px-3 py-1 font-semibold text-blue-600 hover:bg-slate-50 ${T.xs}`}
  >
    <Icon size={12} className="shrink-0" />
    {children}
  </button>
);

const PrimaryButton = ({ children, icon: Icon, onClick, disabled, tone = BRAND }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${T.xs}`}
    style={{ background: tone }}
  >
    {Icon && <Icon size={13} className="shrink-0" />}
    {children}
  </button>
);

const OutlineButton = ({ children, icon: Icon, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E6E8F0] bg-white px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.xs}`}
  >
    {Icon && <Icon size={13} className="shrink-0" />}
    {children}
  </button>
);

const Th = ({ children, right, className = "", title }) => (
  <th className={`whitespace-nowrap py-2.5 pr-3 font-semibold text-slate-500 ${T.tiny} ${right ? "text-right" : ""} ${className}`} title={title}>
    {children}
  </th>
);

const Td = ({ children, right, className = "", title }) => (
  <td className={`py-2.5 pr-3 align-middle text-slate-700 ${T.xs} ${right ? "text-right" : ""} ${className}`} title={title}>
    {children}
  </td>
);

const Tag = ({ tone, children }) => (
  <Chip size={`px-2 py-[3px] ${T.tiny}`} className={tone}>
    {children}
  </Chip>
);

const Fact = ({ label, value, note }) => (
  <div className="min-w-0 rounded-xl bg-[#F7F8FB] px-3.5 py-3">
    <p className={`truncate text-slate-500 ${T.tiny}`}>{label}</p>
    <p className={`mt-1 truncate font-bold text-slate-900 ${T.sm}`}>{value}</p>
    {note && <p className={`mt-0.5 truncate text-slate-500 ${T.tiny}`}>{note}</p>}
  </div>
);

const Stars = ({ rating, size = 13 }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} strokeWidth={0} fill="currentColor" className={n <= rating ? "text-amber-400" : "text-slate-200"} />
    ))}
  </span>
);

// Previous / page x of y / next under a client-side paged list.
const Pager = ({ page, total, size = PAGE_SIZE, onPage, noun }) => {
  const last = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const first = (page - 1) * size + 1;
  const button = "grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50 disabled:text-slate-300";
  return (
    <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <span className={`text-slate-500 ${T.tiny}`}>
        Showing {num(first)}–{num(Math.min(page * size, total))} of {num(total)} {noun}
      </span>
      <span className="flex items-center gap-1.5">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page" className={button}>
          <ChevronLeft size={13} />
        </button>
        <span className={`px-1 text-slate-500 ${T.tiny}`}>
          {page} / {last}
        </span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page === last} aria-label="Next page" className={button}>
          <ChevronRight size={13} />
        </button>
      </span>
    </div>
  );
};

const Overlay = ({ children }) => createPortal(children, document.body);

// A small confirm dialog, portalled out of the canvas.
const ConfirmDialog = ({ title, body, action, busy, onCancel, onConfirm }) => (
  <Overlay>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={busy ? undefined : onCancel}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
            Keep
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
            {busy ? "Working…" : action}
          </button>
        </div>
      </div>
    </div>
  </Overlay>
);

const lastMonths = (count) =>
  Array.from({ length: count }, (_, i) => {
    const month = moment().startOf("month").subtract(i, "months");
    return { value: month.format("YYYY-MM"), label: month.format("MMMM YYYY") };
  });

// ===========================================================================
// Analytics
// ===========================================================================

const METRICS = [
  { label: "Total bookings", key: "bookings", fmt: num },
  { label: "Completed bookings", key: "completed_bookings", fmt: num },
  { label: "Completion rate", key: "completion_rate", fmt: fmtPct },
  { label: "Cancellation rate", key: "cancellation_rate", fmt: fmtPct, inverse: true },
  { label: "Total revenue (GMV)", key: "gmv", fmt: rupee },
  { label: "GloUp revenue", key: "gloup_revenue", fmt: rupee },
  { label: "Platform fee revenue", key: "platform_fee_revenue", fmt: rupee },
  { label: "Subscription revenue", key: "subscription_revenue", fmt: rupee },
  { label: "Customers", key: "customers", fmt: num },
  { label: "New customers", key: "new_customers", fmt: num },
  { label: "Average order value", key: "aov", fmt: rupee },
  { label: "Services sold", key: "services_sold", fmt: num },
  { label: "Empty seat hours", key: "empty_seat_hours", fmt: num, inverse: true },
];

const BarTooltip = ({ active, payload, label, unit = "bookings" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E3E7EF] bg-white px-3 py-2 shadow-lg">
      <p className={`font-bold text-slate-900 ${T.xs}`}>{label}</p>
      <p className={`mt-1 text-slate-600 ${T.tiny}`}>
        {num(payload[0].value)} {unit}
      </p>
    </div>
  );
};

export const AnalyticsTab = ({ data, loading, periodLabel, periodSelect }) => {
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const trend = (data?.trend || []).map((d) => ({ ...d, label: moment(d.day).format("D MMM") }));
  const split = data?.revenue_split || [];
  const splitMax = Math.max(0, ...split.map((s) => Number(s.gmv) || 0));
  const peak = data?.peak;
  const weekdays = peak ? peak.weekdays.map((name, r) => ({ name, bookings: peak.values[r].reduce((a, b) => a + b, 0) })) : [];
  const weekdayMax = Math.max(0, ...weekdays.map((w) => w.bookings));
  const hours = peak
    ? peak.hours.map((h, c) => ({ label: moment({ hour: h % 24 }).format("h A"), bookings: peak.values.reduce((sum, row) => sum + (row[c] || 0), 0) }))
    : [];

  return (
    <div className={`flex flex-col ${GAP}`}>
      <div className={`grid grid-cols-[1.45fr_1fr] ${GAP}`}>
        <Card className={PAD}>
          <CardHeader title="Period Comparison" subtitle={`${periodLabel} against the equal period before it`} right={periodSelect} />
          {loading && !data ? (
            <EmptyNote>Loading…</EmptyNote>
          ) : (
            <table className="mt-3 w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th className="w-[34%]">Metric</Th>
                  <Th right>{periodLabel}</Th>
                  <Th right>Previous period</Th>
                  <Th right>Change</Th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const d = change(k[m.key], pk[m.key]);
                  return (
                    <tr key={m.key} className="border-b border-slate-50 last:border-0">
                      <Td className="font-medium text-slate-800">{m.label}</Td>
                      <Td right className="font-semibold text-slate-900">{m.fmt(k[m.key])}</Td>
                      <Td right>{m.fmt(pk[m.key])}</Td>
                      <Td right>
                        {isNum(d) ? (
                          <Delta value={`${Math.abs(d).toFixed(1)}%`} up={d >= 0} good={m.inverse ? d < 0 : d >= 0} size={T.tiny} iconSize={11} />
                        ) : (
                          <span className="text-slate-400">{DASH}</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card className={PAD}>
          <CardHeader title="Revenue by Category" subtitle={`GMV per service category, ${periodLabel.toLowerCase()}`} />
          {split.length ? (
            <ul className="mt-4 flex flex-col gap-3.5">
              {split.map((s) => (
                <li key={s.name}>
                  <div className={`flex items-center justify-between gap-3 ${T.xs}`}>
                    <span className="truncate font-medium text-slate-800">{s.name}</span>
                    <span className="shrink-0 text-slate-600">
                      {rupee(s.gmv)} <span className="text-slate-400">({isNum(s.share) ? `${Math.round(s.share)}%` : DASH})</span>
                    </span>
                  </div>
                  <span className="mt-1.5 block h-[6px] overflow-hidden rounded-full bg-[#EEF0F6]">
                    <span className="block h-full rounded-full" style={{ width: `${splitMax ? (Number(s.gmv) / splitMax) * 100 : 0}%`, background: INDIGO }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{loading ? "Loading…" : "No revenue in this period"}</EmptyNote>
          )}
        </Card>
      </div>

      <Card className={PAD}>
        <CardHeader title="Daily Bookings" subtitle={periodLabel} right={periodSelect} />
        {trend.some((d) => d.bookings) ? (
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#EEF0F6" vertical={false} />
                <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={16} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} width={36} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "#F1F3FA" }} />
                <Bar dataKey="bookings" fill={BRAND} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyNote>{loading ? "Loading…" : `No bookings in ${periodLabel.toLowerCase()}`}</EmptyNote>
        )}
      </Card>

      <div className={`grid grid-cols-[1fr_1.6fr] ${GAP}`}>
        <Card className={PAD}>
          <CardHeader title="Bookings by Weekday" subtitle={periodLabel} />
          {weekdayMax ? (
            <ul className="mt-4 flex flex-col gap-3">
              {weekdays.map((w) => (
                <li key={w.name} className={`grid grid-cols-[44px_1fr_44px] items-center gap-3 ${T.xs}`}>
                  <span className="text-slate-600">{w.name}</span>
                  <span className="block h-[8px] overflow-hidden rounded-full bg-[#EEF0F6]">
                    <span className="block h-full rounded-full" style={{ width: `${(w.bookings / weekdayMax) * 100}%`, background: GREEN }} />
                  </span>
                  <span className="text-right font-semibold text-slate-800">{num(w.bookings)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{loading ? "Loading…" : "No timed bookings in this period"}</EmptyNote>
          )}
        </Card>

        <Card className={PAD}>
          <CardHeader title="Bookings by Hour" subtitle="When the appointments are, across the period" />
          {hours.some((h) => h.bookings) ? (
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="#EEF0F6" vertical={false} />
                  <XAxis dataKey="label" interval={1} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} width={36} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#F1F3FA" }} />
                  <Bar dataKey="bookings" fill={ORANGE} radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyNote>{loading ? "Loading…" : "No timed bookings in this period"}</EmptyNote>
          )}
        </Card>
      </div>
    </div>
  );
};

// ===========================================================================
// Bookings
// ===========================================================================

// The classic page's week calendar of slots: pick a day, block / unblock slots
// (one at a time or a selection), generate the default slots. Holidays are read
// from the holidays slice, which PartnerHolidaysPanel keeps loaded.
const SlotCalendar = ({ storeId }) => {
  const dispatch = useDispatch();
  const sid = String(storeId);
  const detail = useLoad(() => dispatch(getPartnerDetail({ id: sid })).unwrap(), [sid]);
  const { holidays = [], weekly = [] } = useSelector((state) => state.holidays) || {};

  const [weekStart, setWeekStart] = useState(() => moment().startOf("week"));
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = weekStart.clone().add(i, "days");
        return {
          date,
          ymd: date.format(DAY),
          label: date.format("ddd"),
          number: date.date(),
          day: date.format("dddd"),
          isPast: date.isBefore(moment(), "day"),
          isToday: date.isSame(moment(), "day"),
        };
      }),
    [weekStart]
  );
  const [selectedYmd, setSelectedYmd] = useState(null);
  useEffect(() => {
    setSelectedYmd((days.find((d) => !d.isPast) || days[0]).ymd);
  }, [days]);
  const selected = days.find((d) => d.ymd === selectedYmd) || null;

  const oneOff = useMemo(() => new Set(holidays.map((h) => String(h.holiday_date || h.date || "").slice(0, 10))), [holidays]);
  const weeklySet = useMemo(() => new Set(weekly.map((w) => Number(w.weekday))), [weekly]);
  const isHoliday = (d) => oneOff.has(d.ymd) || weeklySet.has(d.date.day());

  const [blocked, setBlocked] = useState(new Set());
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!selectedYmd) return undefined;
    let alive = true;
    setPicked([]);
    dispatch(getBlockedSlots({ storeId: sid, date: selectedYmd }))
      .unwrap()
      .then((rows) => alive && setBlocked(new Set((rows || []).map((r) => r.slot_id))))
      .catch(() => alive && setBlocked(new Set()));
    return () => {
      alive = false;
    };
  }, [dispatch, sid, selectedYmd]);

  const slots = (detail.data?.timeslots || [])
    .filter((s) => selected && s.day === selected.day)
    .sort((a, b) => String(a.from).localeCompare(String(b.from)));
  const isPastSlot = (slot) => selected?.isToday && moment(`${selected.ymd} ${slot.from}`, `${DAY} HH:mm:ss`).isSameOrBefore(moment());
  const pastDay = selected?.isPast;

  const setSlots = async (ids, action) => {
    setBusy(true);
    try {
      await Promise.all(ids.map((slotId) => dispatch(BlockAndUnblockSlot({ storeId: sid, slotId, status: action, date: selectedYmd })).unwrap()));
      setBlocked((prev) => {
        const next = new Set(prev);
        ids.forEach((slotId) => (action === "block" ? next.add(slotId) : next.delete(slotId)));
        return next;
      });
      setPicked([]);
      toast.success(`${ids.length} slot${ids.length === 1 ? "" : "s"} ${action === "block" ? "blocked" : "unblocked"}`, { id: "partner-slots" });
    } catch (e) {
      toast.error(errorText(e, `Failed to ${action} slots`), { id: "partner-slots" });
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      await dispatch(generateDefaultSlots(sid)).unwrap();
      toast.success("Default slots created", { id: "partner-slots" });
      detail.reload();
    } catch (e) {
      toast.error(errorText(e, "Failed to create slots"), { id: "partner-slots" });
    } finally {
      setBusy(false);
    }
  };

  const navButton = "grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50";

  return (
    <Card className={PAD}>
      <CardHeader
        title="Slots & Availability"
        subtitle="Block or unblock a day's slots; past days are read-only"
        right={
          <OutlineButton icon={RefreshCw} onClick={generate} disabled={busy}>
            Generate Default Slots
          </OutlineButton>
        }
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setWeekStart((w) => w.clone().subtract(7, "days"))} className={navButton} aria-label="Previous week">
          <ChevronLeft size={14} />
        </button>
        <p className={`font-semibold text-slate-800 ${T.sm}`}>
          Week of {weekStart.format("MMM D, YYYY")}
        </p>
        <button type="button" onClick={() => setWeekStart((w) => w.clone().add(7, "days"))} className={navButton} aria-label="Next week">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map((d) => {
          const closed = isHoliday(d);
          const active = d.ymd === selectedYmd;
          return (
            <button
              key={d.ymd}
              type="button"
              disabled={d.isPast}
              onClick={() => setSelectedYmd(d.ymd)}
              className={`flex flex-col items-center rounded-xl border px-2 py-2 transition-colors ${T.xs} ${
                d.isPast
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                  : active
                    ? closed
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "border-transparent text-white"
                    : closed
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-[#E6E8F0] bg-white text-slate-700 hover:bg-slate-50"
              }`}
              style={active && !closed && !d.isPast ? { background: BRAND } : undefined}
            >
              <span className={T.tiny}>{d.label}</span>
              <span className="text-[17px] font-bold leading-tight">{d.number}</span>
              <span className={`${T.micro} ${active ? "text-white/90" : closed ? "text-rose-500" : "text-slate-400"}`}>
                {closed && !d.isPast ? "Holiday" : d.isToday ? "Today" : " "}
              </span>
            </button>
          );
        })}
      </div>

      {selected && isHoliday(selected) && (
        <p className={`mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center text-rose-700 ${T.xs}`}>
          This day is marked as a holiday - the salon is closed and new bookings are blocked.
        </p>
      )}

      {picked.length > 0 && (
        <div className="mt-3 flex justify-center gap-2">
          <PrimaryButton tone={RED} onClick={() => setSlots(picked, "block")} disabled={busy}>
            Block ({picked.length})
          </PrimaryButton>
          <PrimaryButton tone="#16A34A" onClick={() => setSlots(picked, "unblock")} disabled={busy}>
            Unblock ({picked.length})
          </PrimaryButton>
        </div>
      )}

      <Status state={detail} empty={slots.length === 0} emptyText={`No slots set for ${selected?.day || "this day"}.`}>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {slots.map((slot) => {
            const isBlocked = blocked.has(slot.id);
            const off = pastDay || isPastSlot(slot);
            const isPicked = picked.includes(slot.id);
            return (
              <div key={slot.id} className="group relative">
                <button
                  type="button"
                  disabled={off}
                  onClick={() => setPicked((prev) => (prev.includes(slot.id) ? prev.filter((s) => s !== slot.id) : [...prev, slot.id]))}
                  className={`w-full rounded-full border py-2 font-medium transition-colors ${T.xs} ${
                    off
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300"
                      : isPicked
                        ? "border-transparent text-white"
                        : isBlocked
                          ? "border-rose-200 bg-rose-50 text-rose-500 line-through"
                          : "border-[#C9C2FB] text-slate-700 hover:bg-[#F4F2FF]"
                  }`}
                  style={isPicked && !off ? { background: BRAND } : undefined}
                  title={isBlocked ? "Blocked for this day" : undefined}
                >
                  {fmtTime(slot.from)} – {fmtTime(slot.to)}
                </button>
                {!pastDay && (
                  <button
                    type="button"
                    onClick={() => setSlots([slot.id], isBlocked ? "unblock" : "block")}
                    disabled={busy}
                    className={`absolute -top-2 right-2 rounded bg-white px-1.5 py-0.5 font-semibold text-slate-700 opacity-0 shadow transition-opacity group-hover:opacity-100 ${T.micro}`}
                  >
                    {isBlocked ? "Unblock" : "Block"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Status>
    </Card>
  );
};

// One month's served bookings from the monthly invoice (one row per
// appointment; the invoice lists each service separately).
const MonthlyBookings = ({ storeId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const months = useMemo(() => lastMonths(12), []);
  const [month, setMonth] = useState(months[0].value);
  const [page, setPage] = useState(1);
  const state = useLoad(() => dispatch(fetchMonthlyInvoiceDetails({ partnerId: String(storeId), month })).unwrap(), [storeId, month]);

  const rows = useMemo(() => {
    const byId = new Map();
    (state.data?.items || []).forEach((item) => {
      const row = byId.get(item.appointment_id) || {
        id: item.appointment_id,
        date: item.appointment_date,
        time: item.booking_time,
        services: [],
        amount: 0,
      };
      row.services.push(item.service_name);
      row.amount += Number(item.amount) || 0;
      byId.set(item.appointment_id, row);
    });
    return [...byId.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.time).localeCompare(String(a.time)));
  }, [state.data]);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className={PAD}>
      <CardHeader
        title="Bookings by Month"
        subtitle={state.data ? `${num(state.data.total_bookings ?? rows.length)} bookings · ${money(state.data.total_amount)} invoiced` : "From the salon's monthly invoice"}
        right={
          <span className="flex items-center gap-2">
            <Select
              value={month}
              onChange={(v) => {
                setMonth(v);
                setPage(1);
              }}
              options={months}
              className="w-[150px] [&_select]:py-1"
            />
            <LinkButton onClick={() => navigate(`/monthly-report/${storeId}?month=${month}`)}>Monthly report</LinkButton>
          </span>
        }
      />
      <Status state={state} empty={rows.length === 0} emptyText="No invoiced bookings this month.">
        <table className="mt-3 w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <Th className="w-[110px]">Booking</Th>
              <Th className="w-[130px]">Date</Th>
              <Th className="w-[100px]">Time</Th>
              <Th>Services</Th>
              <Th right className="w-[120px]">Amount</Th>
              <Th right className="w-[70px]" />
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <Td className="font-semibold text-slate-900">#{row.id}</Td>
                <Td>{fmtDay(String(row.date).slice(0, 10))}</Td>
                <Td>{fmtTime(row.time) || DASH}</Td>
                <Td className="truncate" title={row.services.join(", ")}>
                  {row.services.join(", ")}
                </Td>
                <Td right className="font-semibold text-slate-900">{money(row.amount)}</Td>
                <Td right>
                  <button type="button" onClick={() => navigate(`/bookings/${row.id}`)} className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
                    View
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} total={rows.length} onPage={setPage} noun="bookings" />
      </Status>
    </Card>
  );
};

export const BookingsTab = ({ storeId, recent, loading }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const rows = recent || [];
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={`flex flex-col ${GAP}`}>
      <Card className={PAD}>
        <CardHeader title="Recent Bookings" subtitle="Latest paid bookings, any status" />
        {rows.length ? (
          <>
            <table className="mt-3 w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th className="w-[230px]">Customer</Th>
                  <Th>Services</Th>
                  <Th className="w-[150px]">Date & Time</Th>
                  <Th right className="w-[110px]">Amount</Th>
                  <Th className="w-[120px]">Status</Th>
                  <Th right className="w-[70px]" />
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const [label, tone] = RECENT_STATUS[row.status] || RECENT_STATUS.not_completed;
                  return (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0">
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EEEAFD] font-bold ${T.tiny}`} style={{ color: BRAND }}>
                            {initials(row.customer || "Guest")}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900">{row.customer || "Customer"}</span>
                            <span className={`block text-slate-500 ${T.tiny}`}>{row.phone || DASH}</span>
                          </span>
                        </span>
                      </Td>
                      <Td className="truncate" title={row.services}>
                        {row.services || DASH}
                      </Td>
                      <Td>
                        <span className="block">{fmtDate(row.day)}</span>
                        <span className={`block text-slate-500 ${T.tiny}`}>{fmtTime(row.time)}</span>
                      </Td>
                      <Td right className="font-semibold text-slate-900">{rupee(row.amount)}</Td>
                      <Td>
                        <Tag tone={tone}>{label}</Tag>
                      </Td>
                      <Td right>
                        <button type="button" onClick={() => navigate(`/bookings/${row.id}`)} className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
                          View
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pager page={page} total={rows.length} onPage={setPage} noun="bookings" />
          </>
        ) : (
          <EmptyNote>{loading ? "Loading…" : "No bookings yet"}</EmptyNote>
        )}
      </Card>

      <MonthlyBookings storeId={storeId} />

      <div className={`grid grid-cols-[1.5fr_1fr] items-start ${GAP}`}>
        <SlotCalendar storeId={storeId} />
        <Card className={PAD}>
          <CardHeader title="Holidays" subtitle="Weekly rules close every matching weekday; one-day holidays cancel that date's bookings" />
          <div className="mt-3">
            <PartnerHolidaysPanel storeId={String(storeId)} showToaster={false} />
          </div>
        </Card>
      </div>
    </div>
  );
};

// ===========================================================================
// Services
// ===========================================================================

// The classic page's service list: an array, or { services }.
const toServices = (res) => (Array.isArray(res) ? res : Array.isArray(res?.services) ? res.services : []);

// Priority services first (by priority), then the rest in API order.
const byPriority = (a, b) => {
  const ap = Number(a.priority) || 0;
  const bp = Number(b.priority) || 0;
  if (ap > 0 && bp > 0) return ap - bp;
  if (ap > 0) return -1;
  if (bp > 0) return 1;
  return 0;
};

export const ServicesTab = ({ storeId }) => {
  const dispatch = useDispatch();
  const sid = String(storeId);
  const [category, setCategory] = useState("all");
  const [services, setServices] = useState([]);
  const [modal, setModal] = useState(null); // { kind: "create" | "edit" | "bulk", service? }
  const [deleting, setDeleting] = useState(null); // service
  const [busy, setBusy] = useState(false);
  const [editingAmount, setEditingAmount] = useState(null); // service id
  const [amountDraft, setAmountDraft] = useState("");

  const categories = useLoad(() => dispatch(fetchServiceCategories()).unwrap(), []);
  const list = useLoad(
    () => dispatch(getStoreServices({ id: sid, category_id: category !== "all" ? category : null })).unwrap().then(toServices),
    [sid, category]
  );
  useEffect(() => {
    if (list.data) setServices(list.data);
  }, [list.data]);
  const detail = useLoad(() => dispatch(getPartnerDetail({ id: sid })).unwrap(), [sid]);
  const stylists = detail.data?.professionals || [];

  // The modals call setShowModal(false) when they're done; reload either way.
  const closeModal = (open) => {
    if (open) return;
    setModal(null);
    list.reload();
  };

  const toggleImportant = async (service) => {
    const next = !service.important;
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, important: next } : s)));
    try {
      await dispatch(updateServiceImportant({ id: service.id, important: next })).unwrap();
    } catch (e) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, important: service.important } : s)));
      toast.error(errorText(e, "Failed to update service"), { id: "partner-service" });
    }
  };

  const saveAmount = async (service) => {
    const amount = Number(amountDraft);
    setEditingAmount(null);
    if (amountDraft === "" || Number.isNaN(amount) || amount === Number(service.amount)) return;
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, amount } : s)));
    try {
      await dispatch(updateServiceAmount({ id: service.id, amount })).unwrap();
      toast.success(`${service.service_name}: payout set to ${money(amount)}`, { id: "partner-service" });
    } catch (e) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, amount: service.amount } : s)));
      toast.error(errorText(e, "Failed to update service amount"), { id: "partner-service" });
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await dispatch(deleteService(deleting.id)).unwrap();
      setServices((prev) => prev.filter((s) => s.id !== deleting.id));
      toast.success("Service deleted", { id: "partner-service" });
      setDeleting(null);
    } catch (e) {
      toast.error(errorText(e, "Failed to delete service"), { id: "partner-service" });
    } finally {
      setBusy(false);
    }
  };

  const chips = [{ id: "all", name: "All" }, ...(categories.data || []).map((c) => ({ id: c.id, name: c.name }))];
  const rows = [...services].sort(byPriority);

  return (
    <div className={`flex flex-col ${GAP}`}>
      <Card className={PAD}>
        <CardHeader
          title="Services"
          subtitle="Click a row to edit · double-click Payout to change it · tick Important to keep a service at full price"
          right={
            <span className="flex items-center gap-2">
              <OutlineButton icon={Upload} onClick={() => setModal({ kind: "bulk" })}>
                Bulk Upload
              </OutlineButton>
              <PrimaryButton icon={Plus} onClick={() => setModal({ kind: "create" })}>
                Add Service
              </PrimaryButton>
            </span>
          }
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${T.xs} ${
                String(category) === String(c.id) ? "border-transparent text-white" : "border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
              }`}
              style={String(category) === String(c.id) ? { background: BRAND } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>

        <Status state={list} empty={rows.length === 0} emptyText="No services in this category.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th className="w-[80px] text-center">Important</Th>
                <Th>Service</Th>
                <Th right className="w-[100px]">Payin</Th>
                <Th right className="w-[100px]">CAC</Th>
                <Th right className="w-[120px]">Payout</Th>
                <Th right className="w-[100px]">Fake Price</Th>
                <Th right className="w-[90px]">Duration</Th>
                <Th right className="w-[96px]">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const important = !!s.important;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setModal({ kind: "edit", service: s })}
                    className={`cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50 ${important ? "bg-blue-50/50" : ""}`}
                  >
                    <Td className="text-center">
                      <input
                        type="checkbox"
                        checked={important}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleImportant(s)}
                        className="h-4 w-4 cursor-pointer accent-[#5B3FF0]"
                        aria-label={`Mark ${s.service_name} important`}
                      />
                    </Td>
                    <Td className="font-medium text-slate-900">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{s.service_name}</span>
                        {Number(s.priority) > 0 && <Tag tone="bg-emerald-50 text-emerald-600">Priority {s.priority}</Tag>}
                      </span>
                    </Td>
                    <Td right>{money(s.discounted_amount)}</Td>
                    <Td right>{important ? DASH : money(Number(s.amount || 0) - Number(s.discounted_amount || 0))}</Td>
                    <Td right>
                      {editingAmount === s.id ? (
                        <input
                          type="number"
                          autoFocus
                          value={amountDraft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setAmountDraft(e.target.value)}
                          onBlur={() => saveAmount(s)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            if (e.key === "Escape") setEditingAmount(null);
                          }}
                          className={`w-[96px] rounded border border-blue-400 px-2 py-1 text-right focus:outline-none ${T.xs}`}
                        />
                      ) : (
                        <span
                          title="Double-click to edit"
                          className="rounded px-1 font-semibold text-slate-900 hover:bg-white"
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAmount(s.id);
                            setAmountDraft(String(s.amount ?? ""));
                          }}
                        >
                          {money(s.amount)}
                        </span>
                      )}
                    </Td>
                    <Td right>{s.fake_price ? money(s.fake_price) : DASH}</Td>
                    <Td right>{s.duration ? `${s.duration} min` : DASH}</Td>
                    <Td right>
                      <span className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ kind: "edit", service: s });
                          }}
                          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
                          aria-label={`Edit ${s.service_name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(s);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-md text-rose-500 hover:bg-rose-50"
                          aria-label={`Delete ${s.service_name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Status>
      </Card>

      <Card className={PAD}>
        <CardHeader title="Stylists" subtitle={`${stylists.length} on this salon's team`} />
        <Status state={detail} empty={stylists.length === 0} emptyText="No stylists found.">
          <ul className="mt-3 grid grid-cols-4 gap-3">
            {stylists.map((pro, i) => (
              <li key={pro.id ?? i} className="flex gap-3 rounded-xl border border-[#E6E8F0] p-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EEEAFD] font-bold ${T.xs}`} style={{ color: BRAND }}>
                  {initials(pro.name || "?")}
                </span>
                <span className={`min-w-0 flex-1 text-slate-600 ${T.tiny}`}>
                  <span className={`flex items-center gap-2 font-semibold text-slate-900 ${T.xs}`}>
                    <span className="truncate">{pro.name || DASH}</span>
                    {pro.status && <Tag tone={pro.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}>{pro.status}</Tag>}
                  </span>
                  <span className="mt-0.5 block truncate">{[pro.designation, pro.gender].filter(Boolean).join(" · ") || DASH}</span>
                  <span className="block truncate">{pro.phone ?? "N/A"}</span>
                  <span className="block truncate">{pro.email || DASH}</span>
                  {(pro.address || pro.country) && <span className="block truncate">{[pro.address, pro.country].filter(Boolean).join(", ")}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Status>
      </Card>

      {modal?.kind === "create" && (
        <Overlay>
          <CreateServiceModal setShowModal={closeModal} storeId={sid} />
        </Overlay>
      )}
      {modal?.kind === "edit" && (
        <Overlay>
          <EditServiceModal setShowModal={closeModal} storeId={sid} serviceId={modal.service.id} serviceData={modal.service} />
        </Overlay>
      )}
      {modal?.kind === "bulk" && (
        <Overlay>
          <BulkUploadServiceModal setShowModal={closeModal} storeId={sid} />
        </Overlay>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this service?"
          body={`${deleting.service_name} will be removed from the salon. This can't be undone.`}
          action="Delete service"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

// ===========================================================================
// Offers
// ===========================================================================

export const OffersTab = ({ storeId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const services = useLoad(() => dispatch(getStoreServices({ id: String(storeId), category_id: null })).unwrap().then(toServices), [storeId]);
  const discounts = useLoad(() => dispatch(getCategoryDiscountOverview()).unwrap(), []);

  const list = services.data || [];
  const perCategory = list.reduce((acc, s) => {
    const key = String(s.service_category ?? "");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categories = (discounts.data || []).filter((c) => perCategory[String(c.id)]);
  const priceOffers = list
    .filter((s) => Number(s.fake_price) > Number(s.discounted_amount))
    .map((s) => ({
      ...s,
      off: ((Number(s.fake_price) - Number(s.discounted_amount)) / Number(s.fake_price)) * 100,
      funded: s.important ? 0 : Number(s.amount || 0) - Number(s.discounted_amount || 0),
    }))
    .sort((a, b) => b.off - a.off);

  return (
    <div className={`grid grid-cols-[1fr_1.35fr] items-start ${GAP}`}>
      <Card className={PAD}>
        <CardHeader
          title="Category Discounts"
          subtitle="Platform-wide discounts on the categories this salon offers"
          right={<LinkButton onClick={() => navigate("/category-discount")}>Manage</LinkButton>}
        />
        <Status state={discounts.loading || services.loading ? { loading: true } : discounts.error ? discounts : services} empty={categories.length === 0} emptyText="None of this salon's categories has a discount set.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Category</Th>
                <Th right className="w-[90px]">Services</Th>
                <Th className="w-[200px]">Discount</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <Td className="font-medium text-slate-900">{c.name}</Td>
                  <Td right>{num(perCategory[String(c.id)])}</Td>
                  <Td>
                    {c.is_active && c.active_discount ? (
                      <Tag tone="bg-emerald-50 text-emerald-600">
                        {c.active_discount.discount_percent}% off until {fmtDate(c.active_discount.ends_at)}
                      </Tag>
                    ) : c.upcoming_count > 0 ? (
                      <Tag tone="bg-blue-50 text-blue-600">{c.upcoming_count} upcoming</Tag>
                    ) : (
                      <span className="text-slate-400">No discount</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Status>
      </Card>

      <Card className={PAD}>
        <CardHeader title="Service Price Offers" subtitle="Services shown with a struck-out price in the app, biggest saving first" />
        <Status state={services} empty={priceOffers.length === 0} emptyText="No service shows a struck-out price.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Service</Th>
                <Th right className="w-[110px]">Shown price</Th>
                <Th right className="w-[110px]">Customer pays</Th>
                <Th right className="w-[80px]">Saving</Th>
                <Th right className="w-[130px]" title="Payout minus payin, paid by GloUp">
                  GloUp-funded
                </Th>
              </tr>
            </thead>
            <tbody>
              {priceOffers.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0">
                  <Td className="truncate font-medium text-slate-900">{s.service_name}</Td>
                  <Td right className="text-slate-400 line-through">{money(s.fake_price)}</Td>
                  <Td right className="font-semibold text-slate-900">{money(s.discounted_amount)}</Td>
                  <Td right>
                    <Tag tone="bg-emerald-50 text-emerald-600">{Math.round(s.off)}% off</Tag>
                  </Td>
                  <Td right>{s.funded > 0 ? money(s.funded) : DASH}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Status>
      </Card>
    </div>
  );
};

// ===========================================================================
// Performance
// ===========================================================================

const MONTHS_BACK = 6;

export const PerformanceTab = ({ storeId, salonName }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const months = useMemo(() => lastMonths(MONTHS_BACK), []);
  // Monthly Report rows for this salon, one call per month (matched by id
  // after a search on the name). Months with no bookings have no row.
  const state = useLoad(
    () =>
      Promise.all(
        months.map((m) =>
          dispatch(queryMonthlyReportSalonsV2({ month: m.value, search: salonName, page: 1, limit: 50 }))
            .unwrap()
            .then((data) => ({ ...m, row: (data?.rows || []).find((r) => Number(r.store_id) === Number(storeId)) || null }))
        )
      ),
    [storeId, salonName]
  );
  const rows = state.data || [];
  const chart = [...rows].reverse().map((m) => ({
    month: moment(m.value, "YYYY-MM").format("MMM"),
    bookings: Number(m.row?.total_bookings) || 0,
    gross: Number(m.row?.gross) || 0,
  }));

  return (
    <div className={`flex flex-col ${GAP}`}>
      <Card className={PAD}>
        <CardHeader title="Monthly Performance" subtitle={`Last ${MONTHS_BACK} months, from the Monthly Report (visit month, paid bookings)`} />
        <Status state={salonName ? state : { loading: true }} empty={chart.every((c) => !c.bookings)} emptyText="No bookings in the last six months.">
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
                <CartesianGrid stroke="#EEF0F6" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 11 }} />
                <YAxis yAxisId="b" allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} width={40} />
                <YAxis yAxisId="g" orientation="right" tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} width={56} tickFormatter={(v) => `₹${num(v)}`} />
                <Tooltip {...TOOLTIP} formatter={(value, name) => (name === "gross" ? [rupee(value), "Amount paid in"] : [num(value), "Bookings"])} />
                <Bar yAxisId="b" dataKey="bookings" fill={INDIGO} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                <Line yAxisId="g" type="monotone" dataKey="gross" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Status>
      </Card>

      <Card className={PAD}>
        <CardHeader title="Month by Month" />
        <Status state={salonName ? state : { loading: true }} empty={rows.length === 0} emptyText="No months to show.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th className="w-[140px]">Month</Th>
                <Th right>Bookings</Th>
                <Th right>Completed</Th>
                <Th right>Cancelled</Th>
                <Th right>Paid in</Th>
                <Th right>Payout</Th>
                <Th right>Platform fee</Th>
                <Th right>CAC</Th>
                <Th right>Avg. order</Th>
                <Th right>Rating</Th>
                <Th right className="w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ value, label, row }) => (
                <tr key={value} className="border-b border-slate-50 last:border-0">
                  <Td className="font-medium text-slate-900">{label}</Td>
                  {row ? (
                    <>
                      <Td right className="font-semibold text-slate-900">{num(row.total_bookings)}</Td>
                      <Td right>
                        {num(row.completed)} <span className="text-slate-400">({fmtPct(row.completed_pct)})</span>
                      </Td>
                      <Td right>
                        {num(row.cancelled)} <span className="text-slate-400">({fmtPct(row.cancelled_pct)})</span>
                      </Td>
                      <Td right>{rupee(row.gross)}</Td>
                      <Td right>{rupee(row.payout)}</Td>
                      <Td right>{rupee(row.platform_fee)}</Td>
                      <Td right>{rupee(row.cac_spend)}</Td>
                      <Td right>{rupee(row.avg_order_value)}</Td>
                      <Td right>{isNum(row.average_rating) && Number(row.average_rating) > 0 ? `${Number(row.average_rating).toFixed(1)} ★` : DASH}</Td>
                      <Td right>
                        <button type="button" onClick={() => navigate(`/monthly-report/${storeId}?month=${value}`)} className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
                          Report
                        </button>
                      </Td>
                    </>
                  ) : (
                    <td colSpan={10} className={`py-2.5 text-slate-400 ${T.xs}`}>
                      No bookings this month
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Status>
      </Card>
    </div>
  );
};

// ===========================================================================
// Reviews
// ===========================================================================

const REVIEW_STATUS_TONES = {
  Active: "bg-emerald-50 text-emerald-600",
  Reported: "bg-rose-50 text-rose-600",
  Hidden: "bg-slate-100 text-slate-500",
};

// One /getReviewsListV2 row -> what the list shows (as on the Reviews page).
const toReview = (r) => ({
  id: r.review_id,
  customer: r.customer_name || DASH,
  contact: r.user_phone || r.user_email || DASH,
  tag: r.customer_tag,
  rating: Math.round(Number(r.rating) || 0),
  text: r.review_description || "",
  status: r.review_status === "inactive" ? "Hidden" : r.request_id ? "Reported" : "Active",
  reply: r.reply || null,
  created: r.created_at,
});

export const ReviewsTab = ({ storeId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useLoad(() => dispatch(exportReviewsV2({ store_id: storeId, sort: "newest" })).unwrap().then((rows) => rows.map(toReview)), [storeId]);
  const [rating, setRating] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const all = state.data || [];
  const rows = all.filter((r) => (rating === "all" || r.rating === Number(rating)) && (status === "all" || r.status === status));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const average = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
  const responded = all.filter((r) => r.reply).length;
  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <Card className={PAD}>
      <CardHeader
        title="Reviews"
        subtitle={all.length ? `${num(all.length)} reviews · ${average.toFixed(1)} average · ${num(responded)} replied` : "Every review of this salon"}
        right={
          <span className="flex items-center gap-2">
            <Select
              value={rating}
              onChange={filter(setRating)}
              options={[{ value: "all", label: "All ratings" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` }))]}
            />
            <Select
              value={status}
              onChange={filter(setStatus)}
              options={[{ value: "all", label: "All status" }, ...Object.keys(REVIEW_STATUS_TONES).map((s) => ({ value: s, label: s }))]}
            />
            <LinkButton onClick={() => navigate("/review")}>Moderate in Reviews</LinkButton>
          </span>
        }
      />
      <Status state={state} empty={rows.length === 0} emptyText={all.length ? "No reviews match these filters." : "No reviews yet."}>
        <table className="mt-3 w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <Th className="w-[210px]">Customer</Th>
              <Th className="w-[120px]">Rating</Th>
              <Th>Review</Th>
              <Th className="w-[100px]">Status</Th>
              <Th className="w-[130px]">Date</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 align-top last:border-0">
                <Td>
                  <span className="block truncate font-semibold text-slate-900">{r.customer}</span>
                  <span className={`flex items-center gap-1.5 text-slate-500 ${T.tiny}`}>
                    <span className="truncate">{r.contact}</span>
                    {r.tag && <Tag tone="bg-violet-50 text-violet-600">{r.tag}</Tag>}
                  </span>
                </Td>
                <Td>
                  <Stars rating={r.rating} />
                </Td>
                <Td>
                  <p className="whitespace-pre-line text-slate-800">{r.text || <span className="text-slate-400">No written review</span>}</p>
                  {r.reply && (
                    <p className={`mt-1.5 rounded-lg bg-[#F7F8FB] px-2.5 py-1.5 text-slate-600 ${T.tiny}`}>
                      <span className="font-semibold text-slate-700">Reply: </span>
                      {r.reply}
                    </p>
                  )}
                </Td>
                <Td>
                  <Tag tone={REVIEW_STATUS_TONES[r.status]}>{r.status}</Tag>
                </Td>
                <Td>{fmtDate(r.created)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} total={rows.length} onPage={setPage} noun="reviews" />
      </Status>
    </Card>
  );
};

// ===========================================================================
// Payouts
// ===========================================================================

export const PayoutsTab = ({ storeId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const days = useLoad(() => dispatch(fetchPartnerInvoiceDaysV2({ storeId })).unwrap(), [storeId]);
  const logs = useLoad(() => dispatch(getAllPayoutLogs({ id: String(storeId) })).unwrap(), [storeId]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  const partner = days.data?.partner;
  const list = days.data?.days || [];
  const due = list.filter((d) => d.status === "due" || d.status === "overdue");
  const unpaidGross = list.filter((d) => d.status !== "paid").reduce((s, d) => s + (Number(d.gross) || 0), 0);
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const logRows = Array.isArray(logs.data) ? logs.data : [];

  // Same flow as Pay Now on the Invoices page.
  const payDue = async () => {
    if (!window.confirm(`Mark ${partner?.partner_name || "this salon"}'s ${due.length} due invoice day${due.length === 1 ? "" : "s"} as paid? Any subscription fee owed is deducted, oldest day first.`)) return;
    setBusy(true);
    const toastId = "partner-payouts-pay";
    toast.loading("Marking payouts…", { id: toastId });
    try {
      const res = await dispatch(payPartnerInvoicesV2({ storeId })).unwrap();
      const msg = `${res.paid.length} day${res.paid.length === 1 ? "" : "s"} paid · ${money(res.total_paid_out)} paid out${
        res.total_deducted > 0 ? ` · ${money(res.total_deducted)} subscription deducted` : ""
      }`;
      if (res.failed) toast.error(`${msg}. Stopped at ${fmtDay(res.failed.invoice_date)}: ${res.failed.message}`, { id: toastId, duration: 7000 });
      else toast.success(msg, { id: toastId, duration: 5000 });
      days.reload();
      logs.reload();
    } catch (e) {
      toast.error(errorText(e, "Failed to pay"), { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const changeFrequency = async (frequency) => {
    if (!partner || partner.frequency === frequency) return;
    setBusy(true);
    try {
      await dispatch(setPartnerPayoutFrequencyV2({ storeIds: [storeId], frequency })).unwrap();
      toast.success(`Now paid ${frequency}`, { id: "partner-payouts-frequency" });
      days.reload();
    } catch (e) {
      toast.error(errorText(e, "Failed to update"), { id: "partner-payouts-frequency" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`grid grid-cols-[1.6fr_1fr] items-start ${GAP}`}>
      <Card className={PAD}>
        <CardHeader
          title="Invoice Days"
          subtitle={days.data?.tracking_start ? `Each visit day's invoice and its payout, tracked from ${fmtDay(days.data.tracking_start)}` : "Each visit day's invoice and its payout"}
          right={
            <PrimaryButton icon={Wallet} onClick={payDue} disabled={busy || due.length === 0}>
              Pay {due.length} due day{due.length === 1 ? "" : "s"}
            </PrimaryButton>
          }
        />

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="min-w-0 rounded-xl bg-[#F7F8FB] px-3.5 py-3">
            <p className={`text-slate-500 ${T.tiny}`}>Payout schedule</p>
            <Select
              value={partner?.frequency || "daily"}
              onChange={changeFrequency}
              options={FREQUENCIES}
              className="mt-1 w-full [&_select]:py-1"
            />
          </div>
          <Fact label="Unpaid (gross)" value={money(unpaidGross)} />
          <Fact label="Due now" value={`${due.length} day${due.length === 1 ? "" : "s"}`} />
          <Fact label="Subscription owed" value={money(partner?.subscription_owed_now)} note="Deducted at payout" />
        </div>

        <Status state={days} empty={list.length === 0} emptyText="No invoices since payouts started being tracked.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Visit day</Th>
                <Th right>Bookings</Th>
                <Th right>Invoice</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th right>Paid out</Th>
                <Th right className="w-[80px]" />
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => {
                const [label, tone] = INVOICE_STATUS[d.status] || INVOICE_STATUS.scheduled;
                return (
                  <tr key={d.invoice_date} className="border-b border-slate-50 last:border-0">
                    <Td className="font-medium text-slate-900">{fmtDay(d.invoice_date)}</Td>
                    <Td right>{num(d.bookings)}</Td>
                    <Td right className="font-semibold text-slate-900">{money(d.gross)}</Td>
                    <Td>{fmtDay(d.due_date)}</Td>
                    <Td>
                      <Tag tone={tone}>{label}</Tag>
                    </Td>
                    <Td right title={d.subscription_deducted > 0 ? `${money(d.subscription_deducted)} subscription deducted` : undefined}>
                      {d.payout_amount == null ? DASH : money(d.payout_amount)}
                    </Td>
                    <Td right>
                      <button type="button" onClick={() => navigate(`/invoice/${storeId}?date=${d.invoice_date}`)} className={`font-semibold text-blue-600 hover:underline ${T.xs}`}>
                        Invoice
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pager page={page} total={list.length} onPage={setPage} noun="days" />
        </Status>
      </Card>

      <Card className={PAD}>
        <CardHeader title="Payout Logs" subtitle="Payouts recorded for this salon" />
        <Status state={logs} empty={logRows.length === 0} emptyText="No payout logs found.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Date</Th>
                <Th right>Amount</Th>
                <Th right className="w-[100px]">Status</Th>
              </tr>
            </thead>
            <tbody>
              {logRows.map((log, i) => (
                <tr key={log.id ?? i} className="border-b border-slate-50 last:border-0">
                  <Td>{fmtDateTime(log.created_at)}</Td>
                  <Td right className="font-semibold text-slate-900">{money(log.amount)}</Td>
                  <Td right>
                    <Tag tone={log.status === "completed" || log.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}>
                      {log.status || DASH}
                    </Tag>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Status>
      </Card>
    </div>
  );
};

// ===========================================================================
// Subscriptions
// ===========================================================================

const GST = 0.18;

const cycleText = (cycle, limit) => {
  if (!cycle) return DASH;
  if (cycle.state !== "waiting") return `Being collected (${limit ?? DASH} free bookings after it's paid)`;
  return `Renews ${fmtDay(cycle.renewal_date)} · ${cycle.bookings_in_cycle ?? 0}/${limit ?? DASH} free bookings`;
};

export const SubscriptionsTab = ({ storeId, subscription, loading }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const history = useLoad(() => dispatch(fetchSubscriptionHistoryV2({ storeId, limit: 100 })).unwrap(), [storeId]);
  const sub = history.data?.subscription;
  const deductions = history.data?.deductions || [];
  const plan = subscription?.plan_amount;

  return (
    <div className={`flex flex-col ${GAP}`}>
      <Card className={PAD}>
        <CardHeader
          title="Subscription"
          subtitle="A flat monthly fee (+18% GST), recovered from the salon's invoice payouts"
          right={<LinkButton onClick={() => navigate("/partner-subscriptions")}>Manage in Partner Subscriptions</LinkButton>}
        />
        {loading && !subscription && history.loading ? (
          <EmptyNote>Loading…</EmptyNote>
        ) : !subscription && !sub ? (
          <EmptyNote>This salon has no subscription. Assign one from Partner Subscriptions.</EmptyNote>
        ) : (
          <div className="mt-3 grid grid-cols-6 gap-2">
            <Fact label="Plan" value={isNum(plan) ? `${rupee(plan)} / month` : DASH} note={isNum(plan) ? `${money(plan * (1 + GST))} with GST` : ""} />
            <Fact label="Status" value={subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : DASH} />
            <Fact label="Next billing date" value={subscription?.status === "active" ? fmtDate(subscription.next_due_date) : DASH} />
            <Fact label="Owed today" value={money(sub ? sub.owed_now : subscription?.outstanding_due)} />
            <Fact label="Collected so far" value={money(history.data?.collected_total)} />
            <Fact label="Next fee" value={cycleText(sub?.cycle, sub?.renewal_booking_limit)} />
          </div>
        )}
      </Card>

      <Card className={PAD}>
        <CardHeader title="Deductions from Payouts" subtitle={history.data ? `${num(history.data.total ?? deductions.length)} deductions` : ""} />
        <Status state={history} empty={deductions.length === 0} emptyText="Nothing deducted yet - fees are recovered when a daily invoice is marked paid.">
          <table className="mt-3 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Invoice day</Th>
                <Th right>Invoice</Th>
                <Th right>Deducted</Th>
                <Th right>Paid out</Th>
                <Th>Marked paid</Th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((d) => (
                <tr key={`${d.invoice_date}-${d.paid_at}`} className="border-b border-slate-50 last:border-0">
                  <Td className="font-medium text-slate-900">{fmtDay(d.invoice_date)}</Td>
                  <Td right>{money(d.invoice_total)}</Td>
                  <Td right className="font-semibold text-violet-600">− {money(d.deducted)}</Td>
                  <Td right>{money(d.payout_amount)}</Td>
                  <Td>{fmtDateTime(d.paid_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Status>
      </Card>
    </div>
  );
};

// ===========================================================================
// Activity Log
// ===========================================================================

// `kinds` is the page's ACTIVITY map (icon, colour, title, text per kind).
export const ActivityTab = ({ activity, loading, kinds }) => {
  const [page, setPage] = useState(1);
  const rows = activity || [];
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className={PAD}>
      <CardHeader title="Activity Log" subtitle="Holidays, payouts, subscription changes and reviews, newest first" />
      {rows.length ? (
        <>
          <ul className="mt-3 flex flex-col">
            {shown.map((item, i) => {
              const meta = kinds[item.kind] || kinds.payout;
              const Icon = meta.icon || CalendarDays;
              return (
                <li key={`${item.kind}-${item.at}-${i}`} className="flex items-center gap-3 border-b border-slate-50 py-3 last:border-0">
                  <span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full border-[1.5px]" style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}14` }}>
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>{meta.title}</span>
                    <span className={`block truncate text-slate-500 ${T.tiny}`}>{meta.text(item)}</span>
                  </span>
                  <span className={`shrink-0 text-right text-slate-500 ${T.tiny}`}>
                    <span className="block">{fmtDate(item.at)}</span>
                    {item.kind !== "payout" && moment(item.at).format("HH:mm") !== "00:00" && <span className="block">{moment(item.at).format("hh:mm A")}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <Pager page={page} total={rows.length} onPage={setPage} noun="events" />
        </>
      ) : (
        <EmptyNote>{loading ? "Loading…" : "No recorded activity"}</EmptyNote>
      )}
    </Card>
  );
};
