import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  History,
  ListFilter,
  Mars,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Upload,
  Users,
  Venus,
} from "lucide-react";
import { useListUiState } from "../../hooks/useListUiState";
import { getAllUsersList, updateUserStatus } from "../../redux/slices/allUsersSlice";
import { getDashboard } from "../../redux/slices/dashboardSlice";
import { setListUiState } from "../../redux/slices/listUiStateSlice";
import { downloadCsv, titleCase } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { LOYALTY_TIERS, loyaltyLabel } from "../../utils/loyalty";
import { ONLINE_WINDOW_MINUTES, normalizeUser } from "../../utils/userModel";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import {
  CHART_AXIS as AXIS,
  CHART_TOOLTIP as TOOLTIP,
  initials,
  toSpark as spark,
} from "../v2/tokens";
import {
  Card,
  Chip,
  HeaderBell,
  HeaderSearch,
  SectionTitle as BaseSectionTitle,
  Select as BaseSelect,
  Sparkline as BaseSparkline,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// "Users" page, built 1:1 from the approved mockup on a fixed DESIGN_WIDTH
// canvas that ScaledCanvas scales to the available width.
//
// Data: the user list comes from allUsersSlice (getAllUsersList), mapped by
// normalizeUser() in utils/userModel.js, and every KPI, the growth chart, top
// cities and the activity overview are derived from it client-side. "Total
// Booked Users" prefers the dashboard's customer_funnel stage
// (min_bookings = 1) from getDashboard. The UI shows "—" for anything the API
// doesn't return (e.g. city, source, last app open).
//
// Filters, search and the page live in the listUiState slice (UI_KEY), so they
// survive opening a user's profile and coming back.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
const UI_KEY = "usersV2";

const VIOLET = "#7C3AED";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const PINK = "#EC4899";
const ORANGE = "#F59E0B";

// Main column vs the right-hand rail (User Growth / Top Cities / Quick Actions).
const MAIN_COLS = "grid-cols-[1fr_296px]";

// Type scale in design px on the 1520px canvas.
const T = {
  tiny: "text-[11px]", // email line, chips, captions
  th: "text-[11px]", // uppercase table column headers
  xxs: "text-[12px]", // dropdowns, pagination, legend rows
  xs: "text-[13px]", // KPI label, table body cells
  sm: "text-[14px]", // card titles in the rail, names
  title: "text-[15px]", // card titles
  big: "text-[26px]", // rail headline number
  kpi: "text-[30px]", // KPI values
};

const GAP = "gap-3";
const DISABLED = "cursor-not-allowed opacity-50";
const NOT_AVAILABLE = "Not available yet";

const STATUS_TONES = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-rose-50 text-rose-500",
  terminated: "bg-rose-50 text-rose-600",
  suspended: "bg-rose-50 text-rose-600",
};

// Status changes offered from the row menu - same set UsersTable offers.
const STATUS_ACTIONS = [
  { value: "active", label: "Mark Active" },
  { value: "terminated", label: "Terminate" },
];

// Join-date presets in the top bar.
const RANGES = [
  { label: "All time", start: () => null },
  { label: "Last 30 days", start: () => moment().subtract(30, "days") },
  { label: "This month", start: () => moment().startOf("month") },
  { label: "Last 90 days", start: () => moment().subtract(90, "days") },
  { label: "This year", start: () => moment().startOf("year") },
];

const GENDER_FILTERS = ["All Gender", "Male", "Female"];
const LOYALTY_FILTER_ALL = "All Tiers";
const PAGE_SIZES = ["10", "25", "50", "100"];
const TOP_CITY_COUNT = 5;

// List state persisted in the listUiState slice under UI_KEY.
const UI_DEFAULTS = {
  range: RANGES[0].label,
  headerSearch: "",
  search: "",
  status: "",
  gender: GENDER_FILTERS[0],
  city: "",
  source: "",
  loyalty: "",
  joinedFrom: "",
  showMore: false,
  pageSize: PAGE_SIZES[0],
  page: 1,
};

// Everything except the "More Filters" toggle and the page size.
const FILTER_RESET = {
  range: UI_DEFAULTS.range,
  headerSearch: "",
  search: "",
  status: "",
  gender: UI_DEFAULTS.gender,
  city: "",
  source: "",
  loyalty: "",
  joinedFrom: "",
  page: 1,
};

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

// Percentage change; growth from zero counts as 100%.
const pctChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Signups per day for `days` days starting at `from`.
const dailySignups = (users, from, days) => {
  const counts = Array(days).fill(0);
  users.forEach((u) => {
    const index = u.joined.clone().startOf("day").diff(from, "days");
    if (index >= 0 && index < days) counts[index] += 1;
  });
  return counts;
};

const latestBy = (users, field) =>
  users.reduce((best, u) => (u[field] && (!best || u[field].isAfter(best[field])) ? u : best), null);

// 1 … 4 5 6 … 20 style page list.
const pageItems = (page, last) => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const items = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(last - 1, page + 1);
  if (start > 2) items.push("…");
  for (let n = start; n <= end; n += 1) items.push(n);
  if (end < last - 1) items.push("…");
  items.push(last);
  return items;
};

const fmtDate = (d) => d.format("DD MMM YYYY");
const fmtTime = (d) => d.format("hh:mm A");

// Downloads the given rows as a CSV file.
const exportCsv = (rows) => {
  const stamp = (d) => (d ? d.format("YYYY-MM-DD HH:mm") : "");
  downloadCsv(
    `users_${moment().format("YYYY-MM-DD")}.csv`,
    [
      "Name",
      "Email",
      "User ID",
      "Phone",
      "Gender",
      "City",
      "Status",
      "Source",
      "Loyalty",
      "Join Date",
      "Last App Open",
      "Last Booking",
      "Total Bookings",
    ],
    rows.map((row) => [
      row.name,
      row.email,
      row.id,
      row.phone,
      row.gender ? titleCase(row.gender) : "",
      row.city,
      row.status ? titleCase(row.status) : "",
      row.source,
      row.loyalty ? loyaltyLabel(row.loyalty) : "",
      stamp(row.joined),
      stamp(row.lastOpen),
      stamp(row.lastBooking),
      row.bookings ?? "",
    ])
  );
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const SectionTitle = (props) => <BaseSectionTitle size={T.title} {...props} />;

const LinkButton = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex shrink-0 items-center gap-1 font-semibold hover:underline ${T.tiny}`}
    style={{ color: VIOLET }}
  >
    {children}
  </button>
);

const Empty = ({ children }) => (
  <p className={`py-6 text-center text-slate-400 ${T.xxs}`}>{children}</p>
);

// Profile photo when the API has one, otherwise initials on a gender-tinted disc.
const Avatar = ({ name, gender, src, size = 34 }) => {
  const [failed, setFailed] = useState(false);
  const female = gender === "female";

  if (src && !failed) {
    return (
      <img
        src={getImageUrl(src)}
        alt=""
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${T.tiny}`}
      style={{
        width: size,
        height: size,
        background: female ? "#FCE7F3" : "#DBEAFE",
        color: female ? "#BE185D" : "#1D4ED8",
      }}
    >
      {initials(name)}
    </span>
  );
};

const GenderIcon = ({ gender }) => {
  if (gender === "female")
    return <Venus size={15} strokeWidth={2.2} style={{ color: PINK }} aria-label="Female" />;
  if (gender === "male")
    return <Mars size={15} strokeWidth={2.2} style={{ color: BLUE }} aria-label="Male" />;
  return <span className={`text-slate-400 ${T.tiny}`}>—</span>;
};

// The small bordered dropdowns in the filter bar and the table footer.
const Select = (props) => <BaseSelect size={T.xxs} truncate {...props} />;

const Delta = ({ value, caption }) => {
  const up = value >= 0;
  const Arrow = up ? ArrowUp : ArrowDown;
  const tone = up ? "text-emerald-500" : "text-rose-500";
  return (
    <span className={`flex items-center gap-1 truncate ${T.xxs}`}>
      <Arrow size={13} strokeWidth={2.4} className={`shrink-0 ${tone}`} />
      <span className={`font-semibold ${tone}`}>{Math.abs(value).toFixed(1)}%</span>
      <span className="truncate text-slate-500">{caption}</span>
    </span>
  );
};

const Sparkline = (props) => (
  <BaseSparkline height={50} fillOpacity={0.22} domain={["dataMin", "dataMax + 1"]} {...props} />
);

// A KPI shows either a `delta` + sparkline, or a `share` progress bar.
const KpiCard = ({ kpi }) => {
  const Icon = kpi.icon;
  const hasShare = kpi.share != null;
  return (
    <Card className="h-[172px] px-4 pb-3 pt-4">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ background: kpi.tint }}
        >
          <Icon size={17} style={{ color: kpi.color }} />
        </span>
        <p className={`min-w-0 flex-1 truncate font-semibold text-slate-800 ${T.xs}`}>
          {kpi.label}
        </p>
      </div>

      <p className={`mt-3 font-extrabold tracking-tight text-slate-900 ${T.kpi}`}>{kpi.value}</p>

      <div className="mt-1.5">
        {kpi.delta != null ? (
          <Delta value={kpi.delta} caption={kpi.caption} />
        ) : (
          <span className={`block truncate text-slate-500 ${T.xxs}`}>{kpi.caption}</span>
        )}
      </div>

      {hasShare && (
        <div className="mb-3 mt-auto h-[5px] w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, kpi.share)}%`, background: kpi.color }}
          />
        </div>
      )}
      {!hasShare && kpi.trend && (
        <Sparkline id={`kpi-${kpi.label.replace(/\W/g, "")}`} data={kpi.trend} color={kpi.color} />
      )}
    </Card>
  );
};

// One half of the "User Activity Overview" card.
const ActivityItem = ({ icon, tint, color, label, user, field, children }) => {
  const Icon = icon;
  const when = user?.[field];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
        style={{ background: tint }}
      >
        <Icon size={20} style={{ color }} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={`text-slate-500 ${T.tiny}`}>{label}</p>
        {user ? (
          <>
            <p className={`mt-1.5 truncate font-bold text-slate-900 ${T.sm}`}>{user.name}</p>
            <div className="mt-1.5 flex items-center gap-4">
              <span className={`whitespace-nowrap text-slate-500 ${T.xxs}`}>
                {fmtTime(when)}, {fmtDate(when)}
              </span>
              {children}
            </div>
          </>
        ) : (
          <p className={`mt-1.5 text-slate-400 ${T.xs}`}>Not tracked yet</p>
        )}
      </div>
    </div>
  );
};

// Date + time pair used by the three date columns; `live` adds the dot the
// mockup puts on today's activity.
const Stamp = ({ date, live, dot }) => {
  if (!date) return <span className={`pl-3 text-slate-400 ${T.tiny}`}>—</span>;
  return (
    <span className="flex items-start gap-1.5 leading-tight">
      <span
        className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: live ? dot : "transparent" }}
      />
      <span>
        <span className={`block whitespace-nowrap text-slate-700 ${T.tiny}`}>{fmtDate(date)}</span>
        <span className={`mt-0.5 block whitespace-nowrap text-slate-500 ${T.tiny}`}>
          {fmtTime(date)}
        </span>
      </span>
    </span>
  );
};

// Title, breadcrumb and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, search, setSearch }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
          Home
          <ChevronRight size={11} className="shrink-0 text-slate-400" />
          <span className="text-slate-700">{title}</span>
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span
          className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 xl:flex"
          title="Filter users by join date"
        >
          <CalendarDays size={14} className="shrink-0" style={{ color: VIOLET }} />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium focus:outline-none"
            style={{ color: VIOLET }}
          >
            {RANGES.map((option) => (
              <option key={option.label}>{option.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="shrink-0 text-slate-500" />
        </span>

        <HeaderSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, phone or user ID..."
          width={210}
        />

        <HeaderBell />
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UsersV2 = ({ title = "Users" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const rawUsers = useSelector((state) => state.allUsers.allUsersList);
  const loading = useSelector((state) => state.allUsers.loading);
  const error = useSelector((state) => state.allUsers.error);
  const dashboard = useSelector((state) => state.dashboard.dashboardList);

  const [ui] = useListUiState(UI_KEY, UI_DEFAULTS);
  const { range, headerSearch, search, status, gender, city, source, loyalty, joinedFrom, showMore, pageSize, page } =
    ui;
  const patchUi = (patch) => dispatch(setListUiState({ key: UI_KEY, patch }));
  const setPage = (value) => patchUi({ page: value });
  // Changing any filter jumps back to page 1.
  const setFilter = (field) => (value) => patchUi({ [field]: value, page: 1 });

  const [showAllCities, setShowAllCities] = useState(false);
  const [menuFor, setMenuFor] = useState(null);

  useEffect(() => {
    dispatch(getAllUsersList({}));
    dispatch(getDashboard());
  }, [dispatch]);

  // Close the row menu on any click outside it.
  useEffect(() => {
    if (menuFor == null) return undefined;
    const close = (event) => {
      if (!event.target.closest("[data-user-menu]")) setMenuFor(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuFor]);

  const users = useMemo(
    () => (Array.isArray(rawUsers) ? rawUsers.map(normalizeUser) : []),
    [rawUsers]
  );

  // Filter options are built from what's actually in the data.
  const statusOptions = useMemo(
    () => [
      { value: "", label: "All Status" },
      ...[...new Set(users.map((u) => u.status).filter(Boolean))]
        .sort()
        .map((value) => ({ value, label: titleCase(value) })),
    ],
    [users]
  );
  const cityOptions = useMemo(
    () => [
      { value: "", label: "All Cities" },
      ...[...new Set(users.map((u) => u.city).filter(Boolean))].sort().map((value) => ({ value, label: value })),
    ],
    [users]
  );
  const sourceOptions = useMemo(
    () => [
      { value: "", label: "All Sources" },
      ...[...new Set(users.map((u) => u.source).filter(Boolean))].sort().map((value) => ({ value, label: value })),
    ],
    [users]
  );
  const loyaltyOptions = [
    { value: "", label: LOYALTY_FILTER_ALL },
    ...LOYALTY_TIERS.map((tier) => ({ value: tier.value, label: tier.label })),
  ];

  // ---- KPIs, growth, cities, activity ----------------------------------
  const stats = useMemo(() => {
    const now = moment();
    const total = users.length;
    const male = users.filter((u) => u.gender === "male").length;
    const female = users.filter((u) => u.gender === "female").length;
    const dated = users.filter((u) => u.joined);
    const hasDates = dated.length > 0;
    const undated = total - dated.length;

    const monthStart = (offset) => now.clone().subtract(offset, "months").startOf("month");
    const joinedInMonth = (offset) => {
      const start = monthStart(offset);
      const end = start.clone().endOf("month");
      return dated.filter((u) => u.joined.isBetween(start, end, null, "[]")).length;
    };
    const thisMonth = joinedInMonth(0);
    const lastMonth = joinedInMonth(1);
    const monthBefore = joinedInMonth(2);

    // Installed: running total over the last 30 days.
    const windowStart = now.clone().startOf("day").subtract(29, "days");
    const daily30 = dailySignups(dated, windowStart, 30);
    const new30 = daily30.reduce((sum, n) => sum + n, 0);
    let running = total - new30;
    const installedTrend = daily30.map((n) => (running += n));

    const thisMonthDays = now.date();
    const lastMonthDays = monthStart(1).daysInMonth();

    // Booked users: dashboard funnel first, then per-user fields.
    const funnelStage = dashboard?.customer_funnel?.stages?.find(
      (stage) => Number(stage.min_bookings) === 1
    );
    let booked = null;
    if (funnelStage?.count != null) booked = Number(funnelStage.count);
    else if (users.some((u) => u.bookings != null))
      booked = users.filter((u) => u.bookings > 0).length;
    else if (users.some((u) => u.loyalty))
      booked = users.filter((u) => u.loyalty && u.loyalty !== "new_user").length;

    // Growth: cumulative users at the end of each month of this year.
    const yearStart = now.clone().startOf("year");
    const beforeYear = dated.filter((u) => u.joined.isBefore(yearStart)).length + undated;
    const growth = Array.from({ length: now.month() + 1 }, (_, m) => {
      const end = yearStart.clone().month(m).endOf("month");
      return {
        month: end.format("MMM"),
        users: dated.filter((u) => u.joined.isSameOrBefore(end)).length + undated,
      };
    });

    // Cities.
    const cityCounts = users.reduce((acc, u) => {
      if (u.city) acc[u.city] = (acc[u.city] || 0) + 1;
      return acc;
    }, {});
    const cities = Object.entries(cityCounts)
      .map(([name, count]) => ({ name, count, pct: total ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    const share = (n) => (total ? (n / total) * 100 : 0);

    return {
      total,
      hasDates,
      kpis: [
        {
          label: "Total Installed Users",
          value: fmt(total),
          delta: hasDates && total > new30 ? (new30 / (total - new30)) * 100 : null,
          caption: hasDates ? "vs last 30 days" : "All registered users",
          icon: Users,
          color: VIOLET,
          tint: "#EDE9FE",
          trend: hasDates ? spark(installedTrend) : null,
        },
        {
          label: "Total Booked Users",
          value: fmt(booked),
          share: booked == null ? 0 : share(booked),
          caption:
            booked == null
              ? "Booking data unavailable"
              : `${share(booked).toFixed(1)}% of total users`,
          icon: CalendarCheck2,
          color: GREEN,
          tint: "#DCFCE7",
        },
        {
          label: "Total Male Users",
          value: fmt(male),
          share: share(male),
          caption: `${share(male).toFixed(1)}% of total users`,
          icon: Mars,
          color: BLUE,
          tint: "#DBEAFE",
        },
        {
          label: "Total Female Users",
          value: fmt(female),
          share: share(female),
          caption: `${share(female).toFixed(1)}% of total users`,
          icon: Venus,
          color: PINK,
          tint: "#FCE7F3",
        },
        {
          label: "New Users This Month",
          value: hasDates ? fmt(thisMonth) : "—",
          delta: hasDates ? pctChange(thisMonth, lastMonth) : null,
          caption: hasDates ? "vs last month" : "Join date not available",
          icon: CalendarPlus,
          color: ORANGE,
          tint: "#FEF3C7",
          trend: hasDates ? spark(dailySignups(dated, monthStart(0), thisMonthDays)) : null,
        },
        {
          label: "New Users Last Month",
          value: hasDates ? fmt(lastMonth) : "—",
          delta: hasDates ? pctChange(lastMonth, monthBefore) : null,
          caption: hasDates ? "vs month before" : "Join date not available",
          icon: CalendarDays,
          color: "#A855F7",
          tint: "#F3E8FF",
          trend: hasDates ? spark(dailySignups(dated, monthStart(1), lastMonthDays)) : null,
        },
      ],
      growth,
      growthPct: pctChange(total, beforeYear),
      cities,
      latestOpen: latestBy(users, "lastOpen"),
      latestBooking: latestBy(users, "lastBooking"),
    };
  }, [users, dashboard]);

  // ---- Table rows --------------------------------------------------------
  const rows = useMemo(() => {
    const terms = [search, headerSearch]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const rangeStart = RANGES.find((r) => r.label === range)?.start();
    const from = joinedFrom ? moment(joinedFrom).startOf("day") : null;
    const wantGender = gender === GENDER_FILTERS[0] ? "" : gender.toLowerCase();

    return users
      .filter(
        (row) =>
          terms.every((term) =>
            [row.name, row.email, row.phone, String(row.id)].some((field) =>
              field.toLowerCase().includes(term)
            )
          ) &&
          (!status || row.status === status) &&
          (!wantGender || row.gender === wantGender) &&
          (!city || row.city === city) &&
          (!source || row.source === source) &&
          (!loyalty || row.loyalty === loyalty) &&
          (!rangeStart || (row.joined && row.joined.isSameOrAfter(rangeStart))) &&
          (!from || (row.joined && row.joined.isSameOrAfter(from)))
      )
      .sort((a, b) => {
        // Newest first; users without a join date sink to the bottom.
        if (a.joined && b.joined) return b.joined.valueOf() - a.joined.valueOf();
        if (a.joined) return -1;
        if (b.joined) return 1;
        return Number(b.id) - Number(a.id);
      });
  }, [users, search, headerSearch, status, gender, city, source, loyalty, range, joinedFrom]);

  const size = Number(pageSize);
  const lastPage = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(page, lastPage);
  const pageRows = rows.slice((currentPage - 1) * size, currentPage * size);

  const resetFilters = () => patchUi(FILTER_RESET);

  const handleStatusChange = async (id, nextStatus) => {
    setMenuFor(null);
    const toastId = "userstatus-toast";
    const result = await dispatch(updateUserStatus({ id, status: nextStatus }));
    if (updateUserStatus.fulfilled.match(result)) {
      toast.success(`User marked ${titleCase(nextStatus)}`, { id: toastId });
      dispatch(getAllUsersList({}));
    } else {
      toast.error(result.payload || "Failed to update user status", { id: toastId });
    }
  };

  const now = moment();
  const isOnline = (d) => d && now.diff(d, "minutes") <= ONLINE_WINDOW_MINUTES;
  const isToday = (d) => d && d.isSame(now, "day");

  const quickActions = [
    { key: "add", label: "Add New User", icon: Plus },
    { key: "import", label: "Import Users", icon: Upload },
    { key: "roles", label: "Manage Roles & Permissions", icon: ShieldCheck },
    { key: "export", label: "Export Users", icon: Download, onClick: () => exportCsv(rows) },
    { key: "logs", label: "View User Activity Logs", icon: History },
  ];

  const visibleCities = showAllCities ? stats.cities : stats.cities.slice(0, TOP_CITY_COUNT);
  const topCityCount = stats.cities[0]?.count || 1;

  const pageButton = (item, index) =>
    item === "…" ? (
      <span key={`gap-${index}`} className={`px-1.5 text-slate-500 ${T.xxs}`}>
        …
      </span>
    ) : (
      <button
        key={item}
        type="button"
        onClick={() => setPage(item)}
        className={`h-8 min-w-8 rounded-lg px-2 font-semibold transition-colors ${T.xxs} ${
          currentPage === item
            ? "text-white shadow-sm"
            : "border border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
        }`}
        style={currentPage === item ? { background: VIOLET } : undefined}
      >
        {item}
      </button>
    );

  const tableMessage =
    loading && users.length === 0
      ? "Loading users…"
      : error && users.length === 0
        ? error
        : rows.length === 0
          ? users.length === 0
            ? "No users yet."
            : "No users match these filters."
          : null;

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        setRange={setFilter("range")}
        search={headerSearch}
        setSearch={setFilter("headerSearch")}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Page actions - no backend endpoints for these yet                */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled
            title={NOT_AVAILABLE}
            className={`flex items-center gap-2 rounded-lg border border-[#E6E8F0] bg-white px-4 py-2.5 font-semibold text-slate-700 ${T.xs} ${DISABLED}`}
          >
            <Download size={15} className="shrink-0 text-slate-600" />
            Import Users
          </button>
          <button
            type="button"
            disabled
            title={NOT_AVAILABLE}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white shadow-sm ${T.xs} ${DISABLED}`}
            style={{ background: VIOLET }}
          >
            <Plus size={15} className="shrink-0" />
            Add New User
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {stats.kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>

        <div className={`grid ${MAIN_COLS} items-start ${GAP}`}>
          {/* ============================================================== */}
          {/* Main column                                                    */}
          {/* ============================================================== */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            {/* User activity overview ------------------------------------ */}
            <Card className="px-5 pb-5 pt-4">
              <SectionTitle>User Activity Overview</SectionTitle>

              <div className="mt-4 flex items-center gap-8">
                <ActivityItem
                  icon={Smartphone}
                  tint="#DBEAFE"
                  color={BLUE}
                  label="Latest App Open"
                  user={stats.latestOpen}
                  field="lastOpen"
                >
                  {isOnline(stats.latestOpen?.lastOpen) && (
                    <Chip className="bg-emerald-50 text-emerald-600">Online</Chip>
                  )}
                </ActivityItem>

                <ActivityItem
                  icon={CalendarCheck2}
                  tint="#EDE9FE"
                  color={VIOLET}
                  label="Latest Booking"
                  user={stats.latestBooking}
                  field="lastBooking"
                >
                  <LinkButton onClick={() => navigate("/bookings")}>
                    View Booking <ArrowRight size={12} />
                  </LinkButton>
                </ActivityItem>
              </div>
            </Card>

            {/* Filter bar ------------------------------------------------ */}
            <div className="flex items-center gap-3">
              <span className="relative block min-w-0 flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setFilter("search")(e.target.value)}
                  placeholder="Search by name, email, phone or user ID..."
                  className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2.5 pl-10 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.xs}`}
                />
              </span>

              <Select
                value={status}
                onChange={setFilter("status")}
                options={statusOptions}
                className="w-[118px] [&_select]:py-2.5"
              />
              <Select
                value={gender}
                onChange={setFilter("gender")}
                options={GENDER_FILTERS}
                className="w-[118px] [&_select]:py-2.5"
              />
              <Select
                value={city}
                onChange={setFilter("city")}
                options={cityOptions}
                className="w-[118px] [&_select]:py-2.5"
              />
              <Select
                value={source}
                onChange={setFilter("source")}
                options={sourceOptions}
                className="w-[118px] [&_select]:py-2.5"
              />

              <input
                type="date"
                value={joinedFrom}
                onChange={(e) => setFilter("joinedFrom")(e.target.value)}
                title="Joined on or after"
                aria-label="Joined on or after"
                className={`w-[136px] shrink-0 rounded-lg border border-[#E6E8F0] bg-white px-3 py-2 text-slate-600 focus:outline-none ${T.xxs}`}
              />

              <button
                type="button"
                onClick={() => patchUi({ showMore: !showMore })}
                className={`flex shrink-0 items-center gap-2 rounded-lg border bg-white px-3.5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 ${T.xxs} ${
                  showMore || loyalty ? "border-violet-300" : "border-[#E6E8F0]"
                }`}
              >
                <ListFilter size={14} className="shrink-0 text-slate-600" />
                More Filters
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-slate-400 transition-transform ${showMore ? "rotate-180" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className={`flex shrink-0 items-center gap-2 rounded-lg border border-[#E6E8F0] bg-white px-3.5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 ${T.xxs}`}
              >
                <RotateCcw size={14} className="shrink-0 text-slate-600" />
                Reset
              </button>
            </div>

            {showMore && (
              <div className="flex items-center gap-3">
                <span className={`font-medium text-slate-600 ${T.xxs}`}>Loyalty tier</span>
                <Select
                  value={loyalty}
                  onChange={setFilter("loyalty")}
                  options={loyaltyOptions}
                  className="w-[160px] [&_select]:py-2.5"
                />
              </div>
            )}

            {/* Users table ----------------------------------------------- */}
            <Card>
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: 16 }} />
                  <col style={{ width: 208 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 124 }} />
                  <col style={{ width: 66 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 94 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 106 }} />
                  <col style={{ width: 106 }} />
                  <col style={{ width: 88 }} />
                  <col style={{ width: 84 }} />
                  <col style={{ width: 12 }} />
                </colgroup>

                <thead>
                  <tr className="border-b border-[#EDEFF5] bg-[#F9FAFC]">
                    <th className="rounded-tl-2xl" />
                    {[
                      ["User"],
                      ["User ID"],
                      ["Phone"],
                      ["Gender", "text-center"],
                      ["City"],
                      ["Status", "text-center"],
                      ["Join Date"],
                      ["Last App Open"],
                      ["Last Booking"],
                      ["Total Bookings", "text-center"],
                      ["Actions", "text-center"],
                    ].map(([column, align = ""]) => (
                      <th
                        key={column}
                        className={`whitespace-nowrap py-3.5 pr-3 font-semibold uppercase tracking-wide text-slate-500 ${T.th} ${align}`}
                      >
                        {column}
                      </th>
                    ))}
                    <th className="rounded-tr-2xl" />
                  </tr>
                </thead>

                <tbody>
                  {tableMessage && (
                    <tr>
                      <td colSpan={13} className={`py-10 text-center text-slate-400 ${T.xs}`}>
                        {tableMessage}
                      </td>
                    </tr>
                  )}

                  {!tableMessage &&
                    pageRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                      >
                        <td />

                        <td className="py-3 pr-3 align-middle">
                          <span className="flex min-w-0 items-center gap-3">
                            <Avatar name={row.name} gender={row.gender} src={row.avatar} />
                            <span className="min-w-0 flex-1 leading-tight">
                              <span
                                className={`block truncate font-semibold capitalize text-slate-900 ${T.xs}`}
                              >
                                {row.name}
                              </span>
                              <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>
                                {row.email || "—"}
                              </span>
                            </span>
                          </span>
                        </td>

                        <td className={`truncate py-3 pr-3 align-middle text-slate-700 ${T.tiny}`}>
                          {row.id}
                        </td>

                        <td
                          className={`truncate whitespace-nowrap py-3 pr-3 align-middle text-slate-700 ${T.tiny}`}
                        >
                          {row.phone || "—"}
                        </td>

                        <td className="py-3 pr-3 align-middle">
                          <span className="grid place-items-center">
                            <GenderIcon gender={row.gender} />
                          </span>
                        </td>

                        <td className={`truncate py-3 pr-3 align-middle text-slate-700 ${T.tiny}`}>
                          {row.city || "—"}
                        </td>

                        <td className="py-3 pr-3 text-center align-middle">
                          {row.status ? (
                            <Chip className={STATUS_TONES[row.status] || "bg-slate-100 text-slate-500"}>
                              {titleCase(row.status)}
                            </Chip>
                          ) : (
                            <span className={`text-slate-400 ${T.tiny}`}>—</span>
                          )}
                        </td>

                        <td className="py-3 pr-3 align-middle">
                          <Stamp date={row.joined} />
                        </td>

                        <td className="py-3 pr-3 align-middle">
                          <Stamp date={row.lastOpen} live={isToday(row.lastOpen)} dot={GREEN} />
                        </td>

                        <td className="py-3 pr-3 align-middle">
                          <Stamp date={row.lastBooking} live={isToday(row.lastBooking)} dot={VIOLET} />
                        </td>

                        <td
                          className={`py-3 pr-3 text-center align-middle font-medium text-slate-800 ${T.xs}`}
                        >
                          {row.bookings ?? "—"}
                        </td>

                        <td className="py-3 pr-3 align-middle">
                          <span className="relative flex items-center justify-center gap-1.5" data-user-menu>
                            <button
                              type="button"
                              onClick={() => navigate(`/user-details-v2/${row.id}`)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6E8F0] text-slate-700 transition-colors hover:bg-slate-100"
                              aria-label="View user"
                              title="View user"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMenuFor((open) => (open === row.id ? null : row.id))}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6E8F0] text-slate-700 transition-colors hover:bg-slate-100"
                              aria-label="More actions"
                              aria-expanded={menuFor === row.id}
                            >
                              <MoreVertical size={15} />
                            </button>

                            {menuFor === row.id && (
                              <span className="absolute right-0 top-full z-20 mt-1 flex w-[150px] flex-col rounded-lg border border-[#E6E8F0] bg-white p-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/user-details-v2/${row.id}`)}
                                  className={`rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50 ${T.xxs}`}
                                >
                                  View details
                                </button>
                                {STATUS_ACTIONS.filter((action) => action.value !== row.status).map(
                                  (action) => (
                                    <button
                                      key={action.value}
                                      type="button"
                                      onClick={() => handleStatusChange(row.id, action.value)}
                                      className={`rounded-md px-3 py-2 text-left hover:bg-slate-50 ${T.xxs} ${
                                        action.value === "terminated" ? "text-rose-600" : "text-slate-700"
                                      }`}
                                    >
                                      {action.label}
                                    </button>
                                  )
                                )}
                              </span>
                            )}
                          </span>
                        </td>

                        <td />
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Footer ------------------------------------------------- */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-[#EDEFF5] px-4 py-3.5">
                <span className={`whitespace-nowrap text-slate-600 ${T.xxs}`}>
                  {rows.length === 0
                    ? "Showing 0 users"
                    : `Showing ${fmt((currentPage - 1) * size + 1)} to ${fmt(
                        Math.min(currentPage * size, rows.length)
                      )} of ${fmt(rows.length)} users`}
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

                  {pageItems(currentPage, lastPage).map(pageButton)}

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
                    onChange={setFilter("pageSize")}
                    options={PAGE_SIZES}
                    className="w-[64px]"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* ============================================================== */}
          {/* Right rail                                                     */}
          {/* ============================================================== */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            {/* User growth ----------------------------------------------- */}
            <Card className="pt-4">
              <div className="px-4">
                <SectionTitle className={T.sm}>
                  User Growth <span className="font-medium text-slate-500">(This Year)</span>
                </SectionTitle>
              </div>

              <div className="px-4 pt-4">
                <p className={`font-extrabold leading-none tracking-tight text-slate-900 ${T.big}`}>
                  {fmt(stats.total)}
                </p>
                <p className={`mt-1.5 text-slate-500 ${T.tiny}`}>Total Users</p>
                {stats.hasDates && (
                  <p className={`mt-2 flex items-center gap-1 ${T.tiny}`}>
                    {stats.growthPct >= 0 ? (
                      <ArrowUp size={12} strokeWidth={2.4} className="text-emerald-500" />
                    ) : (
                      <ArrowDown size={12} strokeWidth={2.4} className="text-rose-500" />
                    )}
                    <span
                      className={`font-semibold ${stats.growthPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {Math.abs(stats.growthPct).toFixed(1)}%
                    </span>
                    <span className="text-slate-500">vs last year</span>
                  </p>
                )}
              </div>

              {stats.hasDates ? (
                <div className="h-[190px] w-full pb-2 pr-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.growth} margin={{ top: 14, right: 4, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={VIOLET} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={VIOLET} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="#EEF1F6" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={AXIS}
                        interval={stats.growth.length > 6 ? 1 : 0}
                        dy={6}
                      />
                      <YAxis
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={AXIS}
                        width={40}
                        tickFormatter={(value) => (value >= 1000 ? `${value / 1000}K` : value)}
                      />
                      <Tooltip {...TOOLTIP} formatter={(value) => value.toLocaleString("en-US")} />
                      <Area
                        type="linear"
                        dataKey="users"
                        name="Users"
                        stroke={VIOLET}
                        strokeWidth={2}
                        fill="url(#userGrowthFill)"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty>Join dates aren't available for users.</Empty>
              )}
            </Card>

            {/* Top cities ------------------------------------------------ */}
            <Card className="px-4 pb-4 pt-4">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle className={T.sm}>Top Cities</SectionTitle>
                {stats.cities.length > TOP_CITY_COUNT && (
                  <LinkButton onClick={() => setShowAllCities((all) => !all)}>
                    {showAllCities ? "Show Less" : "View All"}
                  </LinkButton>
                )}
              </div>

              {visibleCities.length === 0 ? (
                <Empty>City isn't recorded for users yet.</Empty>
              ) : (
                <ul className="mt-4 flex flex-col gap-4">
                  {visibleCities.map((item) => (
                    <li key={item.name} className="flex items-start gap-2.5">
                      <Building2 size={15} className="mt-0.5 shrink-0 text-slate-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate font-medium text-slate-800 ${T.xxs}`}>
                            {item.name}
                          </span>
                          <span className={`shrink-0 whitespace-nowrap text-slate-700 ${T.tiny}`}>
                            {fmt(item.count)} ({item.pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-[3px] w-full rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(item.count / topCityCount) * 100}%`,
                              background: VIOLET,
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Quick actions --------------------------------------------- */}
            <Card className="px-4 pb-4 pt-4">
              <SectionTitle className={T.sm}>Quick Actions</SectionTitle>

              <div className="mt-3 flex flex-col gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const disabled = !action.onClick;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={action.onClick}
                      disabled={disabled}
                      title={disabled ? NOT_AVAILABLE : undefined}
                      className={`flex items-center gap-3 rounded-lg border border-[#E6E8F0] bg-white px-3 py-2.5 text-left font-medium text-slate-700 transition-colors ${T.xxs} ${
                        disabled ? DISABLED : "hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={14} className="shrink-0 text-slate-500" />
                      <span className="truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default UsersV2;
