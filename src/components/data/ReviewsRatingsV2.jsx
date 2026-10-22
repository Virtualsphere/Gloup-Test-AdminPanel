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
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Filter,
  Frown,
  ListFilter,
  Meh,
  MessageSquare,
  MessageSquareText,
  MoreVertical,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Smile,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteReviewReplyV2,
  exportReviewsV2,
  getReviewsListV2,
  getReviewsSummaryV2,
  replyReviewV2,
  updateReviewRequest,
  updateReviewStatusV2,
} from "../../redux/slices/reviewSlice";
import { downloadCsv, toDate } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, toSpark as spark } from "../v2/tokens";
import {
  Card,
  Chip,
  HeaderBell,
  HeaderSearch,
  SalonLogo as BaseSalonLogo,
  SectionTitle as BaseSectionTitle,
  Select as BaseSelect,
  Sparkline as BaseSparkline,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Reviews & Ratings" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// Data (reviewSlice -> admin APIs):
//   /getReviewsListV2     one server-side page of the table (all filters in SQL)
//   /getReviewsSummaryV2  KPIs per named date range, top salons, tab badges
//   /updateReviewStatusV2 hide / restore, single or bulk
//   /replyReviewV2, /deleteReviewReplyV2   the admin reply
//   /updatereviewrequest  approve / reject a salon's removal request (V1 API)
//
// A review links only a customer and a salon - there is no booking or
// service on it, so the mockup's "By Services" tab is left out. "Hidden" =
// Reviews.status inactive; "Reported" = a salon has a pending removal
// request. Customer New / Repeat / VIP comes from completed bookings.
//
// KPI values, distribution, top salons and the summary follow the header
// date range; KPI deltas and sparklines always compare the last 30 days with
// the 30 before, as the mockup's "vs last 30 days" caption says.
//
// Still placeholders: Add Manual Review (needs a decision on whose name it
// is posted under), the bell count and the ⌘K hint.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const ROSE = "#F0445F";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const YELLOW = "#FBBF24";
const ORANGE = "#F97316";
const VIOLET = "#6D4AE0";

// Measured card widths from the mockup, used directly as grid fr units. The
// sixth KPI column is deliberately wider: it has to hold the two page action
// buttons side by side above "Salons Reviewed".
const KPI_COLS = "grid-cols-[196fr_200fr_198fr_196fr_200fr_239fr]";
const PANEL_COLS = "grid-cols-[338fr_382fr_294fr_256fr]";

// Type scale in design px on the 1520px canvas. The mockup screenshot was
// 1536px wide with ~1306px of content, so every measured size is carried
// across at ~1.16x to keep the design's own proportions.
const T = {
  tiny: "text-[11px]", // email line, chips, delta sub
  th: "text-[11px]", // uppercase table column headers
  xxs: "text-[12px]", // legend rows, dropdowns, pagination
  xs: "text-[13px]", // KPI label, table body cells
  sm: "text-[14px]", // tabs, summary values
  base: "text-[15px]", // buttons, inputs
  title: "text-[16px]", // card titles
  donut: "text-[24px]", // donut centre total
  kpi: "text-[28px]", // KPI values
};

const GAP = "gap-3";
const DASH = "—";
const DAY = "YYYY-MM-DD";
// "All time" is sent as a range starting before the platform existed.
const ALL_TIME_FROM = "2000-01-01";
const REPLY_MAX = 1000;

const STATUS_TONES = {
  Active: "bg-emerald-50 text-emerald-600",
  Reported: "bg-rose-50 text-rose-600",
  Hidden: "bg-slate-100 text-slate-500",
};

const TAG_TONES = {
  new: "bg-indigo-50 text-indigo-500",
  repeat: "bg-sky-50 text-sky-600",
  vip: "bg-orange-50 text-orange-500",
};
const TAG_LABELS = { new: "New", repeat: "Repeat", vip: "VIP" };

const RESPONSE_TONES = {
  Responded: "bg-violet-50 text-violet-500",
  Pending: "bg-amber-50 text-amber-500",
};

const STAR_COLORS = { 5: GREEN, 4: BLUE, 3: YELLOW, 2: ORANGE, 1: RED };

// `sort` is the list order each tab asks the API for.
const TABS = [
  { key: "all", label: "All Reviews", sort: "newest" },
  { key: "salons", label: "By Salons", sort: "salon" },
  { key: "ratings", label: "By Ratings", sort: "rating" },
  { key: "customers", label: "By Customers", sort: "customer" },
  { key: "awaiting", label: "Awaiting Response", sort: "newest" },
  { key: "reported", label: "Reported", sort: "newest" },
];

const RATING_FILTERS = [
  { value: "all", label: "All Ratings" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];
const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "reported", label: "Reported" },
  { value: "hidden", label: "Hidden" },
];
const RESPONSE_FILTERS = [
  { value: "all", label: "All Responses" },
  { value: "responded", label: "Responded" },
  { value: "pending", label: "Pending Response" },
];
const TAG_FILTERS = [
  { value: "all", label: "All Customers" },
  { value: "new", label: "New (0-1 visits)" },
  { value: "repeat", label: "Repeat (2-9 visits)" },
  { value: "vip", label: "VIP (10+ visits)" },
];
const BULK_ACTIONS = [
  { value: "", label: "Bulk Actions" },
  { value: "hide", label: "Hide Selected" },
  { value: "restore", label: "Restore Selected" },
];
const TREND_RANGES = [
  { value: "6", label: "Last 6 Months" },
  { value: "12", label: "Last 12 Months" },
  { value: "3", label: "Last 3 Months" },
];
const PAGE_SIZES = ["10", "25", "50", "100"];
const HEADER_RANGES = [
  { value: "all", label: "All time", days: null },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "365", label: "Last 12 months", days: 365 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Every period the page shows, as named inclusive calendar-day ranges:
// the selected period, the two 30-day windows behind the deltas, 12 weekly
// sparkline buckets (w0 oldest) and 12 chart months (m0 oldest).
const buildRanges = (days) => {
  const today = moment();
  const fmt = (m) => m.format(DAY);
  const ranges = [
    {
      key: "current",
      from: days ? fmt(today.clone().subtract(days - 1, "days")) : ALL_TIME_FROM,
      to: fmt(today),
    },
    { key: "last30", from: fmt(today.clone().subtract(29, "days")), to: fmt(today) },
    {
      key: "prev30",
      from: fmt(today.clone().subtract(59, "days")),
      to: fmt(today.clone().subtract(30, "days")),
    },
  ];
  for (let i = 0; i < 12; i++) {
    const to = today.clone().subtract((11 - i) * 7, "days");
    ranges.push({ key: `w${i}`, from: fmt(to.clone().subtract(6, "days")), to: fmt(to) });
  }
  for (let i = 0; i < 12; i++) {
    const start = today.clone().startOf("month").subtract(11 - i, "months");
    const end = moment.min(start.clone().endOf("month"), today);
    ranges.push({ key: `m${i}`, from: fmt(start), to: fmt(end) });
  }
  return ranges;
};

// One /getReviewsListV2 row -> what the table renders.
const toRow = (r) => ({
  id: r.review_id,
  storeId: String(r.store_id),
  salon: r.store_name || DASH,
  salonContact: r.store_email || r.store_phone || DASH,
  userId: r.user_id,
  customer: r.customer_name || DASH,
  customerContact: r.user_phone || r.user_email || DASH,
  tag: r.customer_tag,
  completedBookings: r.completed_bookings,
  rating: Math.round(Number(r.rating) || 0),
  review: r.review_description || "",
  status: r.review_status === "inactive" ? "Hidden" : r.request_id ? "Reported" : "Active",
  request: r.request_id ? { id: r.request_id, reason: r.request_reason } : null,
  reply: r.reply ? { text: r.reply, at: toDate(r.replied_at), by: r.replied_by_name } : null,
  created: toDate(r.created_at),
});

const fmtInt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtPct = (part, whole) => (whole ? `(${((part / whole) * 100).toFixed(1)}%)` : null);

// Percent change; null when there's no base to compare with.
const pctChange = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : null);

// { value, up } for the Delta component, or null when it can't be computed.
const countDelta = (cur, prev) => {
  const change = pctChange(cur ?? 0, prev ?? 0);
  return change === null ? null : { value: `${Math.abs(change).toFixed(1)}%`, up: change >= 0 };
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

const titleStatus = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : DASH;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const SectionTitle = (props) => <BaseSectionTitle size={T.title} {...props} />;

// Filled amber stars for `value`, outlined grey for the rest.
const Stars = ({ value, size = 14, gap = "gap-[3px]" }) => (
  <span className={`flex shrink-0 items-center ${gap}`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        strokeWidth={1.6}
        className={n <= Math.round(value) ? "text-amber-400" : "text-slate-300"}
        fill={n <= Math.round(value) ? "currentColor" : "none"}
      />
    ))}
  </span>
);

// The salon's own logo when it has one, the shared initials plate otherwise.
const SalonLogo = ({ name, logo, size }) => {
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
  return <BaseSalonLogo name={name} size={size} className={`rounded-md ${T.tiny}`} />;
};

// The small bordered dropdowns in the card headers, the filter bar and the
// table footer.
const Select = ({ size = T.xxs, ...props }) => <BaseSelect size={size} {...props} />;

// Arrow + delta + caption. Arrow follows the direction, colour follows
// whether that direction is good news. `goodWhenUp` decides that per KPI.
const Delta = ({ delta, goodWhenUp }) => {
  if (!delta) {
    return (
      <span className={`flex items-center gap-1 truncate text-slate-400 ${T.xxs}`}>
        <span className="font-semibold">{DASH}</span>
        <span className="truncate">vs last 30 days</span>
      </span>
    );
  }
  const Arrow = delta.up ? ArrowUp : ArrowDown;
  const good = delta.up === goodWhenUp;
  return (
    <span className={`flex items-center gap-1 truncate ${T.xxs}`}>
      <Arrow
        size={13}
        strokeWidth={2.4}
        className={`shrink-0 ${good ? "text-emerald-500" : "text-rose-500"}`}
      />
      <span className={`font-semibold ${good ? "text-emerald-500" : "text-rose-500"}`}>
        {delta.value}
      </span>
      <span className="truncate text-slate-400">vs last 30 days</span>
    </span>
  );
};

const Sparkline = (props) => (
  <BaseSparkline height={42} fillOpacity={0.18} domain={["dataMin - 2", "dataMax + 1"]} {...props} />
);

const KpiCard = ({ kpi, className = "" }) => {
  const Icon = kpi.icon;
  return (
    <Card className={`px-4 pb-2 pt-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: kpi.tint }}
        >
          <Icon
            size={17}
            style={{ color: kpi.color }}
            fill={kpi.stars != null ? "currentColor" : "none"}
          />
        </span>
        <p className={`min-w-0 flex-1 truncate font-semibold text-slate-800 ${T.xs}`}>
          {kpi.label}
        </p>
      </div>

      <div className="mt-3 flex min-w-0 items-baseline gap-2">
        <p className={`shrink-0 font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>
          {kpi.value}
        </p>
        {kpi.pct && <span className={`truncate text-slate-500 ${T.xxs}`}>{kpi.pct}</span>}
        {kpi.stars != null && (
          <span className="ml-2 self-center">
            <Stars value={kpi.stars} size={15} gap="gap-1.5" />
          </span>
        )}
      </div>

      <div className="mt-2">
        <Delta delta={kpi.delta} goodWhenUp={kpi.goodWhenUp} />
      </div>

      <Sparkline id={`kpi-${kpi.label.replace(/\W/g, "")}`} data={kpi.trend} color={kpi.line} />
    </Card>
  );
};

// Title and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, search, setSearch }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <h1 className="min-w-0 truncate text-[18px] font-extrabold leading-tight tracking-tight text-slate-900">
        {title}
      </h1>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 xl:flex">
          <CalendarDays size={14} className="shrink-0 text-slate-500" />
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
          <ArrowRightLeft size={13} className="ml-1 shrink-0 text-slate-500" />
        </span>

        <HeaderSearch
          value={search}
          onChange={setSearch}
          placeholder="Search anything..."
          width={150}
          shortcut
        />

        <HeaderBell count={6} color={ROSE} />

        <button type="button" className="shrink-0 text-slate-600" aria-label="Messages">
          <MessageSquare size={18} />
        </button>
      </div>
    </div>
  </PageHeaderPortal>
);

// Full review, removal-request moderation, the admin reply and hide /
// restore. Rendered outside ScaledCanvas (a fixed overlay inside the
// transformed canvas would be positioned and scaled relative to it).
const ReviewModal = ({ row, busy, startEditing, onDecide, onSetStatus, onSaveReply, onDeleteReply, onClose }) => {
  const [editing, setEditing] = useState(startEditing || !row.reply);
  const [draft, setDraft] = useState(row.reply?.text || "");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const hidden = row.status === "Hidden";
  const canSave = draft.trim() && draft.trim() !== row.reply?.text && !busy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review details"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-slate-900">{row.salon}</h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{row.salonContact}</p>
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

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <Stars value={row.rating} size={16} />
            <span className="font-semibold text-slate-700">{row.rating || DASH}</span>
          </span>
          <Chip className={STATUS_TONES[row.status]}>{row.status}</Chip>
          <span className="text-slate-500">
            {row.created ? row.created.format("D MMM YYYY, hh:mm A") : DASH}
          </span>
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>
            By <span className="font-semibold text-slate-800">{row.customer}</span>
            {row.customerContact !== DASH && ` · ${row.customerContact}`}
          </span>
          {row.tag && (
            <Chip className={TAG_TONES[row.tag]}>
              {TAG_LABELS[row.tag]} · {row.completedBookings} visit
              {row.completedBookings === 1 ? "" : "s"}
            </Chip>
          )}
        </p>

        <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {row.review || "No written review - rating only."}
        </p>

        {row.request && (
          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
              Salon asked to remove this review
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
              {row.request.reason || "No reason given."}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Approving hides the review from the apps; rejecting keeps it visible.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onDecide(row, "rejected")}
                disabled={busy}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Reject request
              </button>
              <button
                type="button"
                onClick={() => onDecide(row, "approved")}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: ROSE }}
              >
                Approve removal
              </button>
            </div>
          </div>
        )}

        {/* Reply ----------------------------------------------------------- */}
        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Admin reply</p>
            {row.reply && !editing && (
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteReply(row)}
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </span>
            )}
          </div>

          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={REPLY_MAX}
                autoFocus={startEditing}
                placeholder="Write a reply to this review…"
                className="mt-2 block w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  {draft.length}/{REPLY_MAX}
                </span>
                <span className="flex gap-2">
                  {row.reply && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(row.reply.text);
                        setEditing(false);
                      }}
                      disabled={busy}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSaveReply(row, draft.trim())}
                    disabled={!canSave}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    style={{ background: VIOLET }}
                  >
                    {busy ? "Saving…" : row.reply ? "Update reply" : "Send reply"}
                  </button>
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                {row.reply.text}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                {row.reply.by ? `By ${row.reply.by}` : "By admin"}
                {row.reply.at && ` · ${row.reply.at.format("D MMM YYYY, hh:mm A")}`}
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSetStatus(row, hidden ? "active" : "inactive")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
            {hidden ? "Restore review" : "Hide review"}
          </button>
          <button
            type="button"
            onClick={() => onClose()}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ReviewsRatingsV2 = ({ title = "Reviews & Ratings" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const list = useSelector((state) => state.allReviews.listV2);
  const listLoading = useSelector((state) => state.allReviews.listV2Loading);
  const listError = useSelector((state) => state.allReviews.listV2Error);
  const summary = useSelector((state) => state.allReviews.summaryV2);
  const summaryLoading = useSelector((state) => state.allReviews.summaryV2Loading);
  const summaryError = useSelector((state) => state.allReviews.summaryV2Error);
  const actionLoading = useSelector((state) => state.allReviews.actionV2Loading);
  const requestLoading = useSelector((state) => state.allReviews.updateLoading);

  const [headerRange, setHeaderRange] = useState(HEADER_RANGES[0].value);
  const [tab, setTab] = useState("all");
  const [trendRange, setTrendRange] = useState(TREND_RANGES[0].value);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [salon, setSalon] = useState("all");
  const [rating, setRating] = useState("all");
  const [status, setStatus] = useState("all");
  const [response, setResponse] = useState("all");
  const [customerTag, setCustomerTag] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [menuFor, setMenuFor] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);

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

  const rangeDays = HEADER_RANGES.find((r) => r.value === headerRange)?.days ?? null;

  // ---- data ---------------------------------------------------------------

  // Everything the list query depends on, minus paging (export reuses it).
  const filters = useMemo(() => {
    const params = { sort: TABS.find((t) => t.key === tab)?.sort || "newest" };
    if (search) params.search = search;
    if (salon !== "all") params.store_id = salon;
    if (rating !== "all") params.rating = rating;
    if (customerTag !== "all") params.customer_tag = customerTag;
    if (tab === "reported") params.status = "reported";
    else if (status !== "all") params.status = status;
    if (tab === "awaiting") params.response = "pending";
    else if (response !== "all") params.response = response;
    // The Reported tab is the moderation queue, so it ignores the date range.
    if (rangeDays && tab !== "reported") {
      params.from = moment().subtract(rangeDays - 1, "days").format(DAY);
      params.to = moment().format(DAY);
    }
    return params;
  }, [tab, search, salon, rating, customerTag, status, response, rangeDays]);

  useEffect(() => {
    dispatch(getReviewsListV2({ ...filters, page, limit: Number(pageSize) }));
  }, [dispatch, filters, page, pageSize, reloadKey]);

  useEffect(() => {
    dispatch(getReviewsSummaryV2({ ranges: buildRanges(rangeDays), focus: "current" }));
  }, [dispatch, rangeDays, reloadKey]);

  const rows = useMemo(() => (list?.rows || []).map(toRow), [list]);

  // Selection only ever covers the rows on screen.
  useEffect(() => {
    setSelected(new Set());
    setMenuFor(null);
  }, [list]);

  // Close the row menu on any click outside it.
  useEffect(() => {
    if (menuFor === null) return undefined;
    const close = (e) => !e.target.closest("[data-review-menu]") && setMenuFor(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor]);

  // ---- KPIs ---------------------------------------------------------------

  const ranges = useMemo(() => summary?.ranges || {}, [summary]);
  const cur = ranges.current;

  const kpis = useMemo(() => {
    const last30 = ranges.last30 || {};
    const prev30 = ranges.prev30 || {};
    const weeks = Array.from({ length: 12 }, (_, i) => ranges[`w${i}`] || {});
    let lastAvg = 0;
    const avgTrend = weeks.map((week) => (lastAvg = week.avg_rating ?? lastAvg));
    const m = cur || {};
    const rated = (m.positive || 0) + (m.neutral || 0) + (m.negative || 0);

    return {
      avg: {
        label: "Average Rating",
        value: m.avg_rating == null ? DASH : m.avg_rating.toFixed(1),
        stars: m.avg_rating ?? 0,
        delta:
          last30.avg_rating != null && prev30.avg_rating != null
            ? {
                value: Math.abs(last30.avg_rating - prev30.avg_rating).toFixed(1),
                up: last30.avg_rating >= prev30.avg_rating,
              }
            : null,
        goodWhenUp: true,
        icon: Star,
        color: "#4F46E5",
        tint: "#E0E7FF",
        line: "#4F46E5",
        trend: spark(avgTrend),
      },
      list: [
        {
          label: "Total Reviews",
          value: fmtInt(m.total),
          delta: countDelta(last30.total, prev30.total),
          goodWhenUp: true,
          icon: MessageSquareText,
          color: "#16A34A",
          tint: "#DCFCE7",
          line: GREEN,
          trend: spark(weeks.map((w) => w.total || 0)),
        },
        {
          label: "Positive Reviews",
          value: fmtInt(m.positive),
          pct: fmtPct(m.positive, rated),
          delta: countDelta(last30.positive, prev30.positive),
          goodWhenUp: true,
          icon: Smile,
          color: AMBER,
          tint: "#FEF3C7",
          line: YELLOW,
          trend: spark(weeks.map((w) => w.positive || 0)),
        },
        {
          label: "Neutral Reviews",
          value: fmtInt(m.neutral),
          pct: fmtPct(m.neutral, rated),
          delta: countDelta(last30.neutral, prev30.neutral),
          goodWhenUp: false,
          icon: Meh,
          color: ORANGE,
          tint: "#FFEDD5",
          line: ORANGE,
          trend: spark(weeks.map((w) => w.neutral || 0)),
        },
        {
          label: "Negative Reviews",
          value: fmtInt(m.negative),
          pct: fmtPct(m.negative, rated),
          delta: countDelta(last30.negative, prev30.negative),
          goodWhenUp: false,
          icon: Frown,
          color: RED,
          tint: "#FEE2E2",
          line: RED,
          trend: spark(weeks.map((w) => w.negative || 0)),
        },
      ],
      salons: {
        label: "Salons Reviewed",
        value: fmtInt(m.salons),
        delta: countDelta(last30.salons, prev30.salons),
        goodWhenUp: true,
        icon: Building2,
        color: VIOLET,
        tint: "#EDE9FE",
        line: VIOLET,
        trend: spark(weeks.map((w) => w.salons || 0)),
      },
    };
  }, [ranges, cur]);

  // ---- panels -------------------------------------------------------------

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const value = cur?.stars?.[stars] || 0;
    const rated = cur ? cur.positive + cur.neutral + cur.negative : 0;
    return {
      name: stars === 1 ? "1 Star" : `${stars} Stars`,
      value,
      pct: rated ? `${((value / rated) * 100).toFixed(1)}%` : "0%",
      color: STAR_COLORS[stars],
    };
  });
  const distributionTotal = distribution.reduce((acc, slice) => acc + slice.value, 0);

  // Monthly review counts, independent of the header range.
  const reviewsTrend = useMemo(() => {
    const months = Number(trendRange);
    return Array.from({ length: months }, (_, i) => {
      const index = 12 - months + i;
      const start = moment().startOf("month").subtract(11 - index, "months");
      return {
        month: start.format(months > 6 ? "MMM YY" : "MMM"),
        reviews: ranges[`m${index}`]?.total || 0,
      };
    });
  }, [ranges, trendRange]);
  const trendMax = Math.max(0, ...reviewsTrend.map((point) => point.reviews));

  const thisMonth = ranges.m11?.total || 0;
  const lastMonth = ranges.m10?.total || 0;
  const growth = pctChange(thisMonth, lastMonth);
  const responded = cur?.responded || 0;
  const summaryRows = [
    { label: "Total Reviews", value: fmtInt(cur?.total) },
    { label: "Responded", value: fmtInt(responded), pct: fmtPct(responded, cur?.total) },
    {
      label: "Pending Response",
      value: fmtInt((cur?.total || 0) - responded),
      pct: fmtPct((cur?.total || 0) - responded, cur?.total),
    },
    { label: "Reported Reviews", value: fmtInt(cur?.reported), pct: fmtPct(cur?.reported, cur?.all_reviews) },
    { label: "Deleted Reviews", value: fmtInt(cur?.hidden), pct: fmtPct(cur?.hidden, cur?.all_reviews) },
    { label: "This Month Growth", growth },
  ];

  const salonOptions = useMemo(
    () => [
      { value: "all", label: "All Salons" },
      ...(summary?.salons || []).map((s) => ({ value: String(s.id), label: s.name || `#${s.id}` })),
    ],
    [summary]
  );

  const tabCounts = {
    awaiting: summary?.queues?.awaiting_response || 0,
    reported: summary?.queues?.reported_pending || 0,
  };

  // ---- table --------------------------------------------------------------

  const size = Number(pageSize);
  const total = list?.total || 0;
  const lastPage = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, lastPage);
  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const resetAndRefresh = () => {
    setTab("all");
    setSearchInput("");
    setSearch("");
    setSalon("all");
    setRating("all");
    setStatus("all");
    setResponse("all");
    setCustomerTag("all");
    setPage(1);
    reload();
  };

  // ---- actions ------------------------------------------------------------

  const runAction = async (thunk, args, { pending, success }) => {
    const toastId = "reviews-v2-action-toast";
    toast.loading(pending, { id: toastId });
    try {
      const result = await dispatch(thunk(args)).unwrap();
      toast.success(typeof success === "function" ? success(result) : success, { id: toastId });
      reload();
      return result;
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Something went wrong", { id: toastId });
      return null;
    }
  };

  // Single or bulk hide / restore. Reports anything the API skipped.
  const setStatusFor = async (ids, nextStatus) => {
    const result = await runAction(
      updateReviewStatusV2,
      { review_ids: ids, status: nextStatus },
      {
        pending: nextStatus === "inactive" ? "Hiding reviews..." : "Restoring reviews...",
        success: (res) => {
          const done = res?.updated?.length || 0;
          const skipped = res?.skipped?.length || 0;
          const verb = nextStatus === "inactive" ? "hidden" : "restored";
          return skipped
            ? `${done} ${verb}, ${skipped} skipped - the customer already has an active review for that salon`
            : `${done} review${done === 1 ? "" : "s"} ${verb}`;
        },
      }
    );
    if (result) setViewing(null);
  };

  const onBulkAction = (action) => {
    if (!action) return;
    const ids = [...selected];
    if (!ids.length) {
      toast.error("Select reviews first", { id: "reviews-v2-action-toast" });
      return;
    }
    const verb = action === "hide" ? "Hide" : "Restore";
    if (!window.confirm(`${verb} ${ids.length} selected review${ids.length === 1 ? "" : "s"}?`)) return;
    setStatusFor(ids, action === "hide" ? "inactive" : "active");
  };

  const decide = async (row, decision) => {
    const result = await runAction(
      updateReviewRequest,
      { id: row.request.id, review_id: row.id, status: decision },
      {
        pending: "Updating review request...",
        success: decision === "approved" ? "Review removed successfully" : "Review delete request rejected",
      }
    );
    if (result) setViewing(null);
  };

  const saveReply = async (row, text) => {
    const result = await runAction(
      replyReviewV2,
      { review_id: row.id, reply: text },
      { pending: "Saving reply...", success: row.reply ? "Reply updated" : "Reply sent" }
    );
    if (result) setViewing(null);
  };

  const deleteReply = async (row) => {
    if (!window.confirm("Delete the reply to this review?")) return;
    const result = await runAction(
      deleteReviewReplyV2,
      { review_id: row.id },
      { pending: "Deleting reply...", success: "Reply deleted" }
    );
    if (result) setViewing(null);
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const data = await dispatch(exportReviewsV2(filters)).unwrap();
      if (!data.length) {
        toast.error("No reviews to export", { id: "reviews-export-toast" });
        return;
      }
      downloadCsv(
        `reviews_${moment().format(DAY)}.csv`,
        [
          "Review ID",
          "Salon",
          "Salon Contact",
          "Customer",
          "Customer Contact",
          "Customer Type",
          "Completed Visits",
          "Rating",
          "Review",
          "Status",
          "Removal Reason",
          "Reply",
          "Replied At",
          "Date",
        ],
        data.map(toRow).map((row) => [
          row.id,
          row.salon,
          row.salonContact,
          row.customer,
          row.customerContact,
          TAG_LABELS[row.tag] || "",
          row.completedBookings ?? "",
          row.rating || "",
          row.review,
          row.status,
          row.request?.reason || "",
          row.reply?.text || "",
          row.reply?.at ? row.reply.at.format("YYYY-MM-DD HH:mm") : "",
          row.created ? row.created.format("YYYY-MM-DD HH:mm") : "",
        ])
      );
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to export reviews", {
        id: "reviews-export-toast",
      });
    } finally {
      setExporting(false);
    }
  };

  const pageButton = (number) => (
    <button
      key={number}
      type="button"
      onClick={() => setPage(number)}
      className={`h-8 min-w-8 rounded-lg px-2 font-semibold transition-colors ${T.xxs} ${
        currentPage === number
          ? "border border-rose-100 bg-rose-50"
          : "border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
      }`}
      style={currentPage === number ? { color: ROSE } : undefined}
    >
      {number}
    </button>
  );

  const error = listError || summaryError;
  const busy = actionLoading || requestLoading;
  const moreFiltersActive = response !== "all" || customerTag !== "all";

  return (
    <>
      <PageHeader
        title={title}
        range={headerRange}
        setRange={onFilter(setHeaderRange)}
        search={searchInput}
        setSearch={setSearchInput}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {error && (
          <div
            className={`flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 ${T.xs}`}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">Failed to load reviews: {error}</span>
            <button type="button" onClick={reload} className="shrink-0 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* KPI row - the sixth column stacks the page actions above the     */}
        {/* shorter "Salons Reviewed" card, exactly as the mockup does.       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${KPI_COLS} items-end ${GAP}`}>
          {[kpis.avg, ...kpis.list].map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} className="h-[196px]" />
          ))}

          <div className="flex min-w-0 flex-col gap-2.5">
            {/* min-w-0 on the row and both buttons lets them shrink (labels
                truncate) instead of spilling left over the neighbouring card
                if the column ever ends up narrower than the pair. */}
            <div className="flex min-w-0 justify-end gap-2">
              <button
                type="button"
                disabled
                title="Not built yet: needs a decision on whose name a manual review is posted under"
                className={`flex min-w-0 cursor-not-allowed items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold text-white opacity-50 shadow-sm ${T.xxs}`}
                style={{ background: ROSE }}
              >
                <Plus size={14} className="shrink-0" />
                <span className="truncate">Add Manual Review</span>
              </button>

              <button
                type="button"
                onClick={exportReport}
                disabled={exporting}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-lg border border-[#E6E8F0] bg-white px-2 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.xxs}`}
              >
                <Download size={14} className="shrink-0 text-slate-600" />
                <span className="truncate">{exporting ? "Exporting…" : "Export Report"}</span>
              </button>
            </div>

            <KpiCard kpi={kpis.salons} className="h-[162px]" />
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tabs + toolbar                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex items-center gap-1">
            {TABS.map((item) => {
              const active = tab === item.key;
              const count = tabCounts[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onFilter(setTab)(item.key)}
                  className={`relative flex items-center gap-1.5 px-5 py-3 font-medium transition-colors ${T.sm} ${
                    active ? "" : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={active ? { color: ROSE } : undefined}
                >
                  {item.label}
                  {count > 0 && (
                    <span
                      className="grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ background: ROSE }}
                    >
                      {count}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute inset-x-1 -bottom-px h-[2px] rounded-full"
                      style={{ background: ROSE }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMoreFilters((open) => !open)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium transition-colors ${T.sm} ${
                showMoreFilters || moreFiltersActive
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-[#E6E8F0] bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={15} className="shrink-0" />
              Filters
            </button>

            <span title={selected.size ? `${selected.size} selected` : "Select rows with the checkboxes"}>
              <Select
                value=""
                onChange={onBulkAction}
                options={BULK_ACTIONS.map((option) =>
                  option.value || !selected.size
                    ? option
                    : { ...option, label: `${option.label} (${selected.size})` }
                )}
                className="w-[176px] [&_select]:py-2.5"
                size={T.sm}
              />
            </span>

            <button
              type="button"
              onClick={resetAndRefresh}
              disabled={listLoading || summaryLoading}
              className="grid h-[42px] w-[42px] place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              aria-label="Reset filters and refresh"
              title="Reset filters and refresh"
            >
              <RefreshCw size={16} className={listLoading || summaryLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Distribution / trend / top salons / summary                      */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${PANEL_COLS} ${GAP}`}>
          {/* Rating distribution ---------------------------------------- */}
          <Card>
            <div className="px-4 pb-1 pt-4">
              <SectionTitle>Rating Distribution</SectionTitle>
            </div>

            <div className="flex flex-1 items-center gap-5 px-4 py-2">
              <div className="relative shrink-0" style={{ width: 170, height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        distributionTotal
                          ? distribution
                          : [{ name: "No reviews", value: 1, color: "#E2E8F0" }]
                      }
                      dataKey="value"
                      nameKey="name"
                      innerRadius="64%"
                      outerRadius="100%"
                      paddingAngle={distributionTotal ? 1 : 0}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {(distributionTotal ? distribution : [{ name: "none", color: "#E2E8F0" }]).map(
                        (slice) => (
                          <Cell key={slice.name} fill={slice.color} />
                        )
                      )}
                    </Pie>
                    {distributionTotal > 0 && (
                      <Tooltip {...TOOLTIP} formatter={(value) => value.toLocaleString("en-IN")} />
                    )}
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center">
                  <span className={`font-extrabold leading-none tracking-tight text-slate-900 ${T.donut}`}>
                    {fmtInt(distributionTotal)}
                  </span>
                  <span className={`mt-1.5 leading-none text-slate-500 ${T.tiny}`}>
                    Total Reviews
                  </span>
                </div>
              </div>

              <ul className="flex min-w-0 flex-1 flex-col gap-4">
                {distribution.map((slice) => (
                  <li key={slice.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: slice.color }}
                    />
                    <span className={`min-w-0 flex-1 truncate text-slate-700 ${T.xxs}`}>
                      {slice.name}
                    </span>
                    <span className={`shrink-0 whitespace-nowrap font-semibold text-slate-800 ${T.xxs}`}>
                      {fmtInt(slice.value)}
                    </span>
                    <span className={`w-[46px] shrink-0 whitespace-nowrap text-right text-slate-500 ${T.tiny}`}>
                      ({slice.pct})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-4 pb-4 pt-2">
              <span className={`font-bold text-slate-900 ${T.sm}`}>{distribution[0].pct}</span>
              <span className={`ml-1.5 text-slate-600 ${T.xs}`}>5 Star Reviews</span>
            </div>
          </Card>

          {/* Reviews trend ---------------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3.5">
              <SectionTitle>Reviews Trend</SectionTitle>
              <Select
                value={trendRange}
                onChange={setTrendRange}
                options={TREND_RANGES}
                className="w-[118px]"
              />
            </div>

            <div className="h-[252px] w-full px-1.5 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reviewsTrend} margin={{ top: 26, right: 20, bottom: 0, left: -14 }}>
                  <defs>
                    <linearGradient id="reviewsTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    dy={6}
                    interval={0}
                    padding={{ left: 24, right: 12 }}
                  />
                  <YAxis
                    domain={[0, trendMax > 0 ? "auto" : 4]}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={48}
                    tickFormatter={(value) => (value >= 1000 ? `${value / 1000}K` : value)}
                  />
                  <Tooltip {...TOOLTIP} formatter={(value) => value.toLocaleString("en-IN")} />
                  <Area
                    type="linear"
                    dataKey="reviews"
                    name="Reviews"
                    stroke={GREEN}
                    strokeWidth={2.5}
                    fill="url(#reviewsTrendFill)"
                    dot={{ r: 4.5, fill: GREEN, stroke: "#fff", strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  >
                    {reviewsTrend.length <= 6 && (
                      <LabelList
                        dataKey="reviews"
                        position="top"
                        offset={10}
                        formatter={(value) => value.toLocaleString("en-IN")}
                        style={{ fontSize: 11, fontWeight: 600, fill: "#0F172A" }}
                      />
                    )}
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top reviewed salons ---------------------------------------- */}
          <Card>
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
              <SectionTitle>Top Reviewed Salons</SectionTitle>
              <button
                type="button"
                onClick={() => onFilter(setTab)("salons")}
                className={`shrink-0 font-semibold text-blue-600 hover:underline ${T.xxs}`}
              >
                View All
              </button>
            </div>

            <ul className="flex flex-1 flex-col justify-center gap-3.5 px-4 py-3">
              {!summary?.top_salons?.length && (
                <li className={`text-center text-slate-400 ${T.xs}`}>
                  {summaryLoading ? "Loading…" : "No reviews in this period."}
                </li>
              )}
              {(summary?.top_salons || []).map((item) => (
                <li key={item.store_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSalon(String(item.store_id));
                      setTab("all");
                      setPage(1);
                    }}
                    title="Show this salon's reviews"
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <SalonLogo name={item.store_name || "?"} logo={item.store_logo} size={36} />

                    <span className="min-w-0 flex-1 leading-tight">
                      <span className={`block truncate font-semibold text-slate-800 ${T.xs}`}>
                        {item.store_name || DASH}
                      </span>
                      <span className={`mt-1 flex items-center gap-1 text-slate-500 ${T.tiny}`}>
                        <Star size={12} className="shrink-0 text-amber-400" fill="currentColor" />
                        <span className="font-semibold text-slate-700">
                          {item.average_rating == null ? DASH : item.average_rating.toFixed(1)}
                        </span>
                        <span className="truncate">
                          ({fmtInt(item.review_count)} review{item.review_count === 1 ? "" : "s"})
                        </span>
                      </span>
                    </span>

                    <Chip
                      className={
                        item.store_status === "active" ? STATUS_TONES.Active : STATUS_TONES.Hidden
                      }
                    >
                      {titleStatus(item.store_status)}
                    </Chip>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Review summary --------------------------------------------- */}
          <Card>
            <div className="px-4 pb-1 pt-4">
              <SectionTitle>Review Summary</SectionTitle>
            </div>

            <ul className="flex flex-1 flex-col justify-around px-4 pb-3 pt-2">
              {summaryRows.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-2">
                  <span className={`truncate text-slate-500 ${T.xxs}`}>{row.label}</span>
                  {"growth" in row ? (
                    row.growth === null ? (
                      <span className={`shrink-0 font-bold text-slate-400 ${T.xs}`}>{DASH}</span>
                    ) : (
                      <span
                        className={`flex shrink-0 items-center gap-1 font-bold ${T.xs} ${
                          row.growth >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {row.growth >= 0 ? (
                          <ArrowUp size={13} strokeWidth={2.4} />
                        ) : (
                          <ArrowDown size={13} strokeWidth={2.4} />
                        )}
                        {Math.abs(row.growth).toFixed(1)}%
                      </span>
                    )
                  ) : (
                    <span className={`shrink-0 whitespace-nowrap ${T.xs}`}>
                      <span className="font-bold text-slate-900">{row.value}</span>
                      {row.pct && <span className="ml-1 text-slate-500">{row.pct}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-4">
          <span className="relative block min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by salon, customer, review content..."
              className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2.5 pl-10 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.xs}`}
            />
          </span>

          <Select
            value={salon}
            onChange={onFilter(setSalon)}
            options={salonOptions}
            className="w-[186px] [&_select]:py-2.5"
            size={T.xs}
            truncate
          />
          <Select
            value={rating}
            onChange={onFilter(setRating)}
            options={RATING_FILTERS}
            className="w-[176px] [&_select]:py-2.5"
            size={T.xs}
          />
          <span
            className={tab === "reported" ? "pointer-events-none opacity-50" : ""}
            title={tab === "reported" ? "The Reported tab only shows reported reviews" : undefined}
          >
            <Select
              value={tab === "reported" ? "reported" : status}
              onChange={onFilter(setStatus)}
              options={STATUS_FILTERS}
              className="w-[176px] [&_select]:py-2.5"
              size={T.xs}
            />
          </span>

          <button
            type="button"
            onClick={() => setShowMoreFilters((open) => !open)}
            className={`flex w-[208px] shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2.5 font-medium transition-colors ${T.xs} ${
              showMoreFilters || moreFiltersActive
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-[#E6E8F0] bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ListFilter size={15} className="shrink-0" />
            More Filters
            {moreFiltersActive && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: ROSE }} />}
          </button>
        </div>

        {showMoreFilters && (
          <div className="flex items-center justify-end gap-4">
            <span className={`text-slate-500 ${T.xs}`}>Response</span>
            <span
              className={tab === "awaiting" ? "pointer-events-none opacity-50" : ""}
              title={tab === "awaiting" ? "The Awaiting Response tab only shows unanswered reviews" : undefined}
            >
              <Select
                value={tab === "awaiting" ? "pending" : response}
                onChange={onFilter(setResponse)}
                options={RESPONSE_FILTERS}
                className="w-[186px] [&_select]:py-2.5"
                size={T.xs}
              />
            </span>
            <span className={`text-slate-500 ${T.xs}`}>Customer</span>
            <Select
              value={customerTag}
              onChange={onFilter(setCustomerTag)}
              options={TAG_FILTERS}
              className="w-[208px] [&_select]:py-2.5"
              size={T.xs}
            />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Reviews table                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <table
            className={`w-full table-fixed border-collapse text-left transition-opacity ${
              listLoading && rows.length ? "opacity-60" : ""
            }`}
          >
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 48 }} />
              <col style={{ width: 252 }} />
              <col style={{ width: 210 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 256 }} />
              <col style={{ width: 118 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 132 }} />
              <col style={{ width: 136 }} />
              <col style={{ width: 20 }} />
            </colgroup>

            <thead>
              <tr className="border-b border-[#EDEFF5] bg-[#F9FAFC]">
                <th className="rounded-tl-2xl pl-4">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={() =>
                      setSelected(allOnPageSelected ? new Set() : new Set(rows.map((row) => row.id)))
                    }
                    aria-label="Select all reviews on this page"
                    className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
                  />
                </th>
                {["#", "Salon", "Customer", "Rating", "Review", "Status", "Response", "Date"].map(
                  (column) => (
                    <th
                      key={column}
                      className={`whitespace-nowrap py-3.5 pr-3 font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                    >
                      {column}
                    </th>
                  )
                )}
                <th
                  className={`whitespace-nowrap py-3.5 pr-3 text-center font-semibold uppercase tracking-wide text-slate-500 ${T.th}`}
                >
                  Actions
                </th>
                <th className="rounded-tr-2xl" />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className={`py-10 text-center text-slate-400 ${T.xs}`}>
                    {listLoading
                      ? "Loading reviews…"
                      : tab === "reported"
                        ? "No pending removal requests."
                        : tab === "awaiting"
                          ? "Every review has a reply."
                          : "No reviews match these filters."}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60 ${
                      selected.has(row.id) ? "bg-rose-50/40" : ""
                    }`}
                  >
                    <td className="pl-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select review ${row.id}`}
                        className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
                      />
                    </td>

                    <td className={`py-3.5 pr-3 align-middle text-slate-700 ${T.xs}`}>
                      {(currentPage - 1) * size + index + 1}
                    </td>

                    <td className="py-3.5 pr-3 align-middle leading-tight">
                      <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>
                        {row.salon}
                      </span>
                      <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>
                        {row.salonContact}
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 align-middle">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="min-w-0 flex-1 leading-tight">
                          {row.userId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/user-details-v2/${row.userId}`)}
                              className={`block max-w-full truncate text-left font-semibold text-slate-900 hover:underline ${T.xs}`}
                            >
                              {row.customer}
                            </button>
                          ) : (
                            <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>
                              {row.customer}
                            </span>
                          )}
                          <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>
                            {row.customerContact}
                          </span>
                        </span>
                        {row.tag && (
                          <span
                            title={`${row.completedBookings} completed visit${row.completedBookings === 1 ? "" : "s"}`}
                          >
                            <Chip className={TAG_TONES[row.tag]}>{TAG_LABELS[row.tag]}</Chip>
                          </span>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 align-middle">
                      <span className="flex items-center gap-2.5">
                        <Stars value={row.rating} size={15} gap="gap-1.5" />
                        <span className={`font-medium text-slate-700 ${T.xs}`}>
                          {row.rating || DASH}
                        </span>
                      </span>
                    </td>

                    <td className={`py-3.5 pr-3 align-middle leading-snug text-slate-700 ${T.xs}`}>
                      <span className={`line-clamp-2 ${row.review ? "" : "text-slate-400"}`}>
                        {row.review || "Rating only"}
                      </span>
                      {row.request && row.status === "Reported" && (
                        <span className={`mt-1 block truncate text-rose-600 ${T.tiny}`}>
                          Removal requested: {row.request.reason || "no reason given"}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 pr-3 align-middle">
                      <Chip className={STATUS_TONES[row.status]}>{row.status}</Chip>
                    </td>

                    <td className="py-3.5 pr-3 align-middle">
                      {row.reply ? (
                        <span title={row.reply.text}>
                          <Chip className={RESPONSE_TONES.Responded}>Responded</Chip>
                        </span>
                      ) : row.status === "Hidden" ? (
                        <span className={`text-slate-400 ${T.xs}`}>{DASH}</span>
                      ) : (
                        <Chip className={RESPONSE_TONES.Pending}>Pending</Chip>
                      )}
                    </td>

                    <td className="py-3.5 pr-3 align-middle leading-tight">
                      <span className={`block whitespace-nowrap text-slate-700 ${T.xs}`}>
                        {row.created ? row.created.format("D MMM YYYY") : DASH}
                      </span>
                      <span className={`mt-0.5 block whitespace-nowrap text-slate-700 ${T.xs}`}>
                        {row.created ? row.created.format("hh:mm A") : ""}
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 align-middle">
                      <span className="relative flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing({ row, startEditing: false })}
                          className={`grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-slate-100 ${
                            row.status === "Reported" ? "text-rose-600" : "text-slate-700"
                          }`}
                          aria-label={row.status === "Reported" ? "Review removal request" : "View review"}
                          title={row.status === "Reported" ? "Review removal request" : "View review"}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewing({ row, startEditing: true })}
                          className={`grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-slate-100 ${
                            row.reply ? "text-violet-500" : "text-slate-700"
                          }`}
                          aria-label={row.reply ? "Edit reply" : "Reply to review"}
                          title={row.reply ? "Edit reply" : "Reply to review"}
                        >
                          <Reply size={16} />
                        </button>
                        <span data-review-menu className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuFor(menuFor === row.id ? null : row.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
                            aria-label="More actions"
                            aria-expanded={menuFor === row.id}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuFor === row.id && (
                            <span
                              role="menu"
                              className={`absolute right-0 top-9 z-20 flex w-[168px] flex-col rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg ${T.xs}`}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                disabled={busy}
                                onClick={() => {
                                  setMenuFor(null);
                                  setStatusFor([row.id], row.status === "Hidden" ? "active" : "inactive");
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                              >
                                {row.status === "Hidden" ? <Eye size={14} /> : <EyeOff size={14} />}
                                {row.status === "Hidden" ? "Restore review" : "Hide review"}
                              </button>
                              {row.reply && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={busy}
                                  onClick={() => {
                                    setMenuFor(null);
                                    deleteReply(row);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 size={14} />
                                  Delete reply
                                </button>
                              )}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>

                    <td />
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer ----------------------------------------------------- */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-[#EDEFF5] px-4 py-3.5">
            <span className={`whitespace-nowrap text-slate-600 ${T.xxs}`}>
              {total === 0
                ? "Showing 0 reviews"
                : `Showing ${fmtInt((currentPage - 1) * size + 1)} to ${fmtInt(
                    Math.min(currentPage * size, total)
                  )} of ${fmtInt(total)} reviews`}
              {selected.size > 0 && ` · ${selected.size} selected`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:text-slate-300"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>

              {pageList(currentPage, lastPage).map((item) =>
                typeof item === "number" ? (
                  pageButton(item)
                ) : (
                  <span key={item} className={`px-1.5 text-slate-500 ${T.xxs}`}>
                    ...
                  </span>
                )
              )}

              <button
                type="button"
                onClick={() => setPage(Math.min(lastPage, currentPage + 1))}
                disabled={currentPage === lastPage}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6E8F0] bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:text-slate-300"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <span className={`whitespace-nowrap text-slate-600 ${T.xxs}`}>Rows per page</span>
              <Select
                value={pageSize}
                onChange={onFilter(setPageSize)}
                options={PAGE_SIZES}
                className="w-[64px]"
              />
            </div>
          </div>
        </Card>
      </ScaledCanvas>

      {viewing && (
        <ReviewModal
          key={viewing.row.id}
          row={viewing.row}
          startEditing={viewing.startEditing}
          busy={busy}
          onDecide={decide}
          onSetStatus={(row, next) => setStatusFor([row.id], next)}
          onSaveReply={saveReply}
          onDeleteReply={deleteReply}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
};

export default ReviewsRatingsV2;
