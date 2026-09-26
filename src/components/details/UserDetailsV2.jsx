import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  Activity,
  ArrowLeft,
  BadgePercent,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleDollarSign,
  Clock,
  Copy,
  Heart,
  History,
  IndianRupee,
  Info,
  LayoutGrid,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Scissors,
  Search,
  SlidersHorizontal,
  StickyNote,
  Store,
  Tag,
  Ticket,
  User,
} from "lucide-react";
import { getAllUsersList, getUserDetail, updateUserStatus } from "../../redux/slices/allUsersSlice";
import { rupees, titleCase } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { buildUserProfile, normalizeUser, spendSeries } from "../../utils/userModel";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, CARD, initials } from "../v2/tokens";
import { Card, Chip } from "../v2/ui";

// ---------------------------------------------------------------------------
// "User Details" 360° profile, built 1:1 from the approved mockup on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width.
//
// Data: getUserDetail (allUsersSlice), turned into the view model by
// buildUserProfile() in utils/userModel.js. Every card here - summary counts,
// top services, spending chart, preferences - is derived from that.
//
// The active tab lives in the URL (?tab=bookings) so it survives a reload and
// can be linked to.
//
// User Scores, Recent Activity and Communication History have no backend
// source yet, so they render empty states rather than invented numbers.
//
// Without an :id in the URL (the sidebar link) the page shows a user picker.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const VIOLET = "#6D4AE0";
const GREEN = "#16A34A";

// Measured column ratios from the mockup.
const TOP_COLS = "grid-cols-[1fr_476px]";
const MID_COLS = "grid-cols-[510fr_410fr_380fr]";
const BOTTOM_COLS = "grid-cols-[670fr_620fr]";

const T = {
  tiny: "text-[11px]",
  xxs: "text-[12px]",
  xs: "text-[13px]",
  sm: "text-[14px]",
  title: "text-[15px]",
  stat: "text-[20px]",
  big: "text-[24px]",
  name: "text-[22px]",
};

const GAP = "gap-3";
const DISABLED = "cursor-not-allowed opacity-50";
const NOT_AVAILABLE = "Not available yet";
const HISTORY_PREVIEW = 4;
const TOP_SERVICE_COUNT = 5;

const STATUS_META = {
  upcoming: { label: "Upcoming", chip: "bg-violet-50 text-violet-600" },
  completed: { label: "Completed", chip: "bg-emerald-50 text-emerald-600" },
  cancelled: { label: "Cancelled", chip: "bg-rose-50 text-rose-600" },
  no_show: { label: "No Show", chip: "bg-amber-50 text-amber-600" },
};

const USER_STATUS_TONES = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-rose-50 text-rose-500",
  terminated: "bg-rose-50 text-rose-600",
};

const STATUS_ACTIONS = [
  { value: "active", label: "Mark Active" },
  { value: "terminated", label: "Terminate" },
];

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "bookings", label: "Bookings", icon: CalendarDays },
  { key: "behaviour", label: "Behaviour", icon: Activity },
  { key: "spending", label: "Spending", icon: CircleDollarSign },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { key: "offers", label: "Offers", icon: Ticket },
  { key: "timeline", label: "Timeline", icon: History },
  { key: "notes", label: "Notes", icon: StickyNote },
];

const SPEND_RANGES = [
  { label: "This Year", months: () => moment().month() + 1 },
  { label: "Last 6 Months", months: () => 6 },
  { label: "Last 12 Months", months: () => 12 },
];

// Icons for the preference rows; buildUserProfile() returns them keyed.
const PREFERENCE_ICONS = {
  time: Clock,
  day: CalendarDays,
  salon: Store,
  location: MapPin,
  price: Tag,
  service: Heart,
  advance: CalendarClock,
};

const copy = (text, label) => {
  if (!text) return;
  navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success(`${label} copied`, { id: "userdetail-copy-toast" }))
    .catch(() => toast.error(`Couldn't copy ${label.toLowerCase()}`, { id: "userdetail-copy-toast" }));
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// Renders an icon component passed around as a value.
const Glyph = ({ as, ...props }) => {
  const Component = as;
  return <Component {...props} />;
};

const CardHeader = ({ title, action }) => (
  <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
    <h2 className={`flex min-w-0 items-center gap-1.5 truncate font-bold tracking-tight text-slate-900 ${T.title}`}>
      {title}
      <Info size={13} className="shrink-0 text-slate-400" />
    </h2>
    {action}
  </div>
);

const OutlineLink = ({ children, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={disabled ? NOT_AVAILABLE : undefined}
    className={`shrink-0 rounded-md border border-[#E6E8F0] px-2.5 py-1 font-semibold transition-colors ${T.tiny} ${
      disabled ? DISABLED : "hover:bg-violet-50"
    }`}
    style={{ color: VIOLET }}
  >
    {children}
  </button>
);

const Empty = ({ icon: Icon = Info, children }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
    <Glyph as={Icon} size={20} className="text-slate-300" />
    <p className={`text-slate-400 ${T.xxs}`}>{children}</p>
  </div>
);

const Avatar = ({ name, src, size }) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={getImageUrl(src)}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-violet-100 font-bold text-violet-700"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
};

const SalonThumb = ({ src }) => {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      src={getImageUrl(src)}
      alt=""
      onError={() => setFailed(true)}
      className="h-[46px] w-[46px] shrink-0 rounded-lg object-cover"
    />
  ) : (
    <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
      <Store size={18} />
    </span>
  );
};

const Select = ({ value, onChange, options }) => (
  <span className="relative block shrink-0">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer appearance-none rounded-lg border border-[#E6E8F0] bg-white py-1.5 pl-3 pr-7 font-medium text-slate-600 focus:outline-none ${T.xxs}`}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
    <ChevronDown
      size={13}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </span>
);

// Header dropdown button (Send Message / Send Offer / More Actions).
const Dropdown = ({ label, icon: Icon, className, style, items, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        title={disabled ? NOT_AVAILABLE : undefined}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 font-semibold shadow-sm ${T.xs} ${className} ${
          disabled ? DISABLED : ""
        }`}
        style={style}
      >
        <Glyph as={Icon} size={15} className="shrink-0" />
        {label}
        <ChevronDown size={14} className="shrink-0 opacity-80" />
      </button>
      {open && items && (
        <span className="absolute right-0 top-full z-30 mt-1 flex w-[190px] flex-col rounded-lg border border-[#E6E8F0] bg-white p-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`rounded-md px-3 py-2 text-left hover:bg-slate-50 ${T.xxs} ${item.tone || "text-slate-700"}`}
            >
              {item.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
};

// Title + back button live in the app bar, like the other V2 pages.
const PageHeader = ({ onBack }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-3 pl-1 pr-4">
      <button
        type="button"
        onClick={onBack}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label="Back"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">User Details</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Complete 360° view of the user</p>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const ProfileCard = ({ profile }) => {
  const chips = [
    profile.gender && { icon: User, text: profile.gender },
    profile.age != null && { text: `${profile.age} Years` },
    profile.location && { text: profile.location },
    profile.loyalty && { text: profile.loyalty },
  ].filter(Boolean);

  const facts = [
    ["User ID", `#${profile.id}`],
    ["Member Since", profile.memberSince ? profile.memberSince.format("MMM D, YYYY") : "—"],
    ["Last Login", profile.lastLogin ? profile.lastLogin.format("MMM D, YYYY hh:mm A") : "—"],
    ["Referral Source", profile.referral ? titleCase(profile.referral) : "—"],
  ];

  return (
    <Card className="flex-row items-center gap-6 px-6 py-5">
      <div className="relative shrink-0">
        <Avatar name={profile.name} src={profile.avatar} size={104} />
        {profile.online && (
          <span className="absolute bottom-2 right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h2 className={`truncate font-bold capitalize tracking-tight text-slate-900 ${T.name}`}>{profile.name}</h2>
          {profile.status && (
            <Chip className={USER_STATUS_TONES[profile.status] || "bg-slate-100 text-slate-500"}>
              {titleCase(profile.status)}
            </Chip>
          )}
        </div>

        {[
          [Phone, profile.phone, "Phone number"],
          [Mail, profile.email, "Email"],
        ].map(([Icon, value, label]) => (
          <p key={label} className={`mt-2.5 flex items-center gap-2.5 font-semibold text-slate-800 ${T.sm}`}>
            <Glyph as={Icon} size={15} className="shrink-0 text-slate-500" />
            <span className="truncate">{value || "—"}</span>
            {value && (
              <button
                type="button"
                onClick={() => copy(value, label)}
                className="shrink-0 text-slate-400 hover:text-slate-700"
                aria-label={`Copy ${label.toLowerCase()}`}
              >
                <Copy size={13} />
              </button>
            )}
          </p>
        ))}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map(({ icon: Icon, text }) => (
              <span
                key={text}
                className={`flex items-center gap-1 rounded-md border border-[#E6E8F0] px-2 py-1 font-medium text-slate-700 ${T.tiny}`}
              >
                {Icon && <Glyph as={Icon} size={11} />}
                {text}
              </span>
            ))}
          </div>
        )}
      </div>

      <dl className="grid w-[380px] shrink-0 grid-cols-[130px_1fr] gap-x-4 gap-y-4 self-stretch border-l border-[#EDEFF5] py-2 pl-6">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className={`text-slate-500 ${T.xxs}`}>{label}</dt>
            <dd className={`truncate text-slate-800 ${T.xxs}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

const OverviewCard = ({ profile }) => {
  const tiles = [
    { label: "Total Bookings", value: profile.counts.total, icon: CalendarCheck, color: "#3B82F6", tint: "#EFF6FF" },
    { label: "Completed", value: profile.counts.completed, icon: CircleCheck, color: GREEN, tint: "#F0FDF4" },
    { label: "Total Spent", value: rupees(profile.spent), icon: IndianRupee, color: VIOLET, tint: "#F5F3FF" },
    {
      label: "Total Savings",
      value: rupees(profile.savings),
      icon: BadgePercent,
      color: "#F97316",
      tint: "#FFF7ED",
    },
  ];

  return (
    <Card className="px-4 pb-4 pt-4">
      <h2 className={`mb-3 font-bold tracking-tight text-slate-900 ${T.title}`}>Overview</h2>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ label, value, icon: Icon, color, tint }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border px-4 py-3.5"
            style={{ background: tint, borderColor: `${color}22` }}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/70">
              <Glyph as={Icon} size={22} style={{ color }} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className={`truncate text-slate-600 ${T.tiny}`}>{label}</p>
              <p className={`mt-1 truncate font-bold ${T.stat}`} style={{ color: label === "Total Savings" ? color : "#0F172A" }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const BookingSummaryCard = ({ profile, onViewAll }) => {
  const tiles = [
    {
      label: "Upcoming",
      value: profile.counts.upcoming,
      color: "#2563EB",
      tint: "#EFF6FF",
      foot: profile.nextUpcoming ? `Next: ${profile.nextUpcoming.date.format("MMM DD, YYYY")}` : "None scheduled",
    },
    { label: "Completed", value: profile.counts.completed, color: GREEN, tint: "#F0FDF4" },
    { label: "Cancelled", value: profile.counts.cancelled, color: "#DC2626", tint: "#FEF2F2" },
    { label: "No Shows", value: profile.counts.noShow, color: "#D97706", tint: "#FFFBEB" },
    { label: "This Month", value: profile.counts.thisMonth, color: VIOLET, tint: "#F5F3FF" },
  ];

  return (
    <Card>
      <CardHeader title="Booking Summary" />
      <div className="grid grid-cols-5 gap-2.5 px-4 pb-4 pt-1">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col items-center rounded-xl border px-2 py-3 text-center"
            style={{ background: tile.tint, borderColor: `${tile.color}22` }}
          >
            <span className={`font-semibold ${T.tiny}`} style={{ color: tile.color }}>
              {tile.label}
            </span>
            <span className={`mt-1.5 font-bold ${T.big}`} style={{ color: tile.color }}>
              {tile.value}
            </span>
            {tile.foot ? (
              <span className={`mt-1.5 truncate text-slate-600 ${T.tiny}`}>{tile.foot}</span>
            ) : (
              <button type="button" onClick={onViewAll} className={`mt-1.5 text-slate-600 hover:underline ${T.tiny}`}>
                View all
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

const UserScoresCard = () => (
  <Card>
    <CardHeader title="User Scores" action={<OutlineLink disabled>View Details</OutlineLink>} />
    <Empty icon={Activity}>
      Booking frequency, engagement, offer affinity, spending power, loyalty and churn scores aren't
      calculated by the backend yet.
    </Empty>
  </Card>
);

const TopServicesCard = ({ services }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? services : services.slice(0, TOP_SERVICE_COUNT);
  const top = services[0]?.count || 1;

  return (
    <Card>
      <CardHeader
        title="Top Services"
        action={
          services.length > TOP_SERVICE_COUNT && (
            <OutlineLink onClick={() => setShowAll((s) => !s)}>{showAll ? "Show Less" : "View All"}</OutlineLink>
          )
        }
      />
      {visible.length === 0 ? (
        <Empty icon={Scissors}>No services booked yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-3 px-4 pb-4 pt-1">
          {visible.map((service, i) => (
            <li key={service.name} className="flex items-center gap-3">
              <Scissors size={15} className="shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold text-slate-800 ${T.tiny}`}>{service.name}</p>
                <div className="mt-1 h-[3px] w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(service.count / top) * 100}%`,
                      background: ["#3B82F6", "#22C55E", "#F97316", "#8B5CF6", "#EC4899"][i % 5],
                    }}
                  />
                </div>
              </div>
              <span className={`w-8 shrink-0 text-right font-semibold text-slate-800 ${T.tiny}`}>{service.count}</span>
              <span className={`w-9 shrink-0 text-right text-slate-500 ${T.tiny}`}>{service.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const BookingRow = ({ booking }) => {
  const meta = STATUS_META[booking.status] || STATUS_META.completed;
  const when = [
    booking.date ? booking.date.format("ddd, MMM DD, YYYY") : null,
    booking.from && booking.to ? `${booking.from.format("h:mm A")} - ${booking.to.format("h:mm A")}` : null,
  ]
    .filter(Boolean)
    .join("  •  ");

  return (
    <li className="flex items-start gap-3 border-b border-[#F1F3F8] py-3 last:border-0">
      <SalonThumb src={booking.image} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className={`truncate font-bold text-slate-900 ${T.xs}`}>{booking.salon}</p>
        <p className={`mt-1 truncate text-slate-600 ${T.tiny}`}>{when || "—"}</p>
        <p className={`mt-1 truncate text-slate-500 ${T.tiny}`}>{booking.services.join(" + ") || "—"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={`font-bold text-emerald-600 ${T.xs}`}>{rupees(booking.amount)}</span>
        <Chip className={meta.chip}>{meta.label}</Chip>
      </div>
    </li>
  );
};

const BookingHistoryCard = ({ bookings, limit, onViewAll }) => {
  const visible = limit ? bookings.slice(0, limit) : bookings;
  return (
    <Card>
      <CardHeader
        title="Booking History"
        action={limit && bookings.length > limit && <OutlineLink onClick={onViewAll}>View All Bookings</OutlineLink>}
      />
      {visible.length === 0 ? (
        <Empty icon={CalendarDays}>No bookings yet.</Empty>
      ) : (
        <ul className="px-4 pb-2">
          {visible.map((booking) => (
            <BookingRow key={booking.key} booking={booking} />
          ))}
        </ul>
      )}
    </Card>
  );
};

const SpendingCard = ({ profile }) => {
  const [range, setRange] = useState(SPEND_RANGES[0].label);
  const months = SPEND_RANGES.find((r) => r.label === range).months();
  const series = useMemo(() => spendSeries(profile.bookings, months), [profile.bookings, months]);

  const stats = [
    ["Average Order Value", rupees(profile.aov)],
    ["Highest Booking", rupees(profile.highest)],
    ["Total Savings", rupees(profile.savings)],
  ];

  return (
    <Card>
      <CardHeader title="Spending Overview" />
      <div className="flex items-end justify-between gap-2 px-4">
        <div>
          <p className={`text-slate-500 ${T.tiny}`}>Total Spent</p>
          <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.big}`}>{rupees(profile.spent)}</p>
        </div>
        <Select value={range} onChange={setRange} options={SPEND_RANGES.map((r) => r.label)} />
      </div>

      <div className="h-[170px] w-full pr-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 4, bottom: 0, left: -6 }}>
            <defs>
              <linearGradient id="userSpendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VIOLET} stopOpacity={0.28} />
                <stop offset="100%" stopColor={VIOLET} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#EEF1F6" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={AXIS}
              dy={6}
              interval={series.length > 6 ? 1 : 0}
            />
            <YAxis
              domain={[0, "auto"]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={AXIS}
              width={44}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : v)}
            />
            <Tooltip {...TOOLTIP} formatter={(v) => rupees(v)} />
            <Area
              type="linear"
              dataKey="spent"
              name="Spent"
              stroke={VIOLET}
              strokeWidth={2}
              fill="url(#userSpendFill)"
              dot={{ r: 3.5, fill: VIOLET, stroke: "#fff", strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-4 pb-4 pt-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#E6E8F0] px-3 py-2.5">
            <p className={`truncate text-slate-500 ${T.tiny}`}>{label}</p>
            <p className={`mt-1 font-bold text-slate-900 ${T.sm}`}>{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const PreferencesCard = ({ preferences }) => (
  <Card>
    <CardHeader title="Preferences" />
    <ul className="mx-4 mb-4 rounded-xl border border-[#E6E8F0] px-3 py-1">
      {preferences.map(({ key, label, value }) => (
        <li key={key} className="flex items-center gap-3 border-b border-[#F1F3F8] py-3 last:border-0">
          <Glyph as={PREFERENCE_ICONS[key]} size={15} className="shrink-0 text-slate-500" />
          <span className={`flex-1 truncate text-slate-600 ${T.xxs}`}>{label}</span>
          <span className={`max-w-[55%] truncate text-right text-slate-800 ${T.xxs}`}>{value || "—"}</span>
        </li>
      ))}
    </ul>
  </Card>
);

const RecentActivityCard = () => (
  <Card>
    <CardHeader title="Recent Activity" />
    <Empty icon={Activity}>App activity (opens, searches, salon views, offer checks) isn't tracked yet.</Empty>
  </Card>
);

const CommunicationCard = () => (
  <Card>
    <CardHeader title="Communication History" action={<OutlineLink disabled>View All</OutlineLink>} />
    <Empty icon={MessageSquare}>Push, WhatsApp and SMS history per user isn't available yet.</Empty>
  </Card>
);

// ---------------------------------------------------------------------------
// No :id - pick a user
// ---------------------------------------------------------------------------

const UserPicker = ({ onBack }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const users = useSelector((state) => state.allUsers.allUsersList);
  const loading = useSelector((state) => state.allUsers.loading);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(getAllUsersList({}));
  }, [dispatch]);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = Array.isArray(users) ? users.map(normalizeUser) : [];
    return list
      .filter(
        (u) =>
          !term || [u.name, u.email, u.phone, String(u.id)].some((f) => f.toLowerCase().includes(term))
      )
      .slice(0, 25);
  }, [users, search]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader onBack={onBack} />
      <div className={`${CARD} p-5`}>
        <h2 className="text-[16px] font-bold text-slate-900">Choose a user</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Search for a user to open their 360° profile. You can also open one from Users V2.
        </p>
        <span className="relative mt-4 block">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or user ID..."
            className="w-full rounded-lg border border-[#E6E8F0] bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </span>

        <ul className="mt-3 divide-y divide-[#F1F3F8]">
          {loading && matches.length === 0 && <li className="py-6 text-center text-[13px] text-slate-400">Loading users…</li>}
          {!loading && matches.length === 0 && (
            <li className="py-6 text-center text-[13px] text-slate-400">No users found.</li>
          )}
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => navigate(`/user-details-v2/${u.id}`)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-slate-50"
              >
                <Avatar name={u.name} src={u.avatar} size={34} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-semibold capitalize text-slate-900">{u.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {[u.phone, u.email].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">#{u.id}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UserDetailsV2 = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const detail = useSelector((state) => state.allUsers.userDetail);
  const loading = useSelector((state) => state.allUsers.loading);
  const error = useSelector((state) => state.allUsers.error);

  // Opening another user's URL carries no ?tab, so it lands on Overview.
  const requestedTab = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === requestedTab) ? requestedTab : "overview";
  const setTab = (key) => setSearchParams(key === "overview" ? {} : { tab: key }, { replace: true });

  useEffect(() => {
    if (id) dispatch(getUserDetail({ id: Number(id) }));
  }, [dispatch, id]);

  // The slice keeps the last user fetched - ignore it until it's this one.
  const loaded = id != null && String(detail?.userdetails?.id) === String(id);
  const profile = useMemo(() => (loaded ? buildUserProfile(detail) : null), [loaded, detail]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/users-v2"));

  const changeStatus = async (status) => {
    const toastId = "userdetail-status-toast";
    const result = await dispatch(updateUserStatus({ id: profile.id, status }));
    if (updateUserStatus.fulfilled.match(result)) {
      toast.success(`User marked ${titleCase(status)}`, { id: toastId });
      dispatch(getUserDetail({ id: Number(id) }));
    } else {
      toast.error(result.payload || "Failed to update user status", { id: toastId });
    }
  };

  if (!id) return <UserPicker onBack={goBack} />;

  if (!profile) {
    return (
      <div className="grid min-h-[320px] place-items-center">
        <PageHeader onBack={goBack} />
        <p className="text-[13px] text-slate-500">
          {loading || !error ? "Loading user…" : error}
        </p>
      </div>
    );
  }

  const openBookings = () => setTab("bookings");

  const moreActions = [
    ...STATUS_ACTIONS.filter((a) => a.value !== profile.status).map((a) => ({
      label: a.label,
      tone: a.value === "terminated" ? "text-rose-600" : undefined,
      onClick: () => changeStatus(a.value),
    })),
    { label: "Open classic view", onClick: () => navigate(`/userdetails/${profile.id}`) },
  ];

  const summary = <BookingSummaryCard profile={profile} onViewAll={openBookings} />;
  const spending = <SpendingCard profile={profile} />;
  const preferences = <PreferencesCard preferences={profile.preferences} />;
  const timeline = (
    <div className={`grid ${BOTTOM_COLS} ${GAP}`}>
      <RecentActivityCard />
      <CommunicationCard />
    </div>
  );

  let body;
  if (tab === "overview") {
    body = (
      <>
        <div className={`grid ${MID_COLS} ${GAP}`}>
          {summary}
          <UserScoresCard />
          <TopServicesCard services={profile.services} />
        </div>
        <div className={`grid ${MID_COLS} ${GAP}`}>
          <BookingHistoryCard bookings={profile.bookings} limit={HISTORY_PREVIEW} onViewAll={openBookings} />
          {spending}
          {preferences}
        </div>
        {timeline}
      </>
    );
  } else if (tab === "bookings") {
    body = (
      <>
        {summary}
        <BookingHistoryCard bookings={profile.bookings} />
      </>
    );
  } else if (tab === "spending") {
    body = (
      <div className={`grid grid-cols-[2fr_1fr] ${GAP}`}>
        {spending}
        <TopServicesCard services={profile.services} />
      </div>
    );
  } else if (tab === "preferences") {
    body = <div className="w-[560px]">{preferences}</div>;
  } else if (tab === "timeline") {
    body = timeline;
  } else {
    const label = TABS.find((t) => t.key === tab).label;
    body = (
      <Card>
        <Empty icon={TABS.find((t) => t.key === tab).icon}>
          {label} data isn't available for users yet.
        </Empty>
      </Card>
    );
  }

  return (
    <>
      <PageHeader onBack={goBack} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* Page actions -------------------------------------------------- */}
        <div className="flex justify-end gap-3">
          <Dropdown label="Send Message" icon={MessageSquare} className="text-white" style={{ background: VIOLET }} disabled />
          <Dropdown label="Send Offer" icon={Ticket} className="text-white" style={{ background: "#22A55B" }} disabled />
          <Dropdown
            label="More Actions"
            icon={MoreHorizontal}
            className="border border-[#E6E8F0] bg-white text-slate-700"
            items={moreActions}
          />
        </div>

        {/* Profile + overview --------------------------------------------- */}
        <div className={`grid ${TOP_COLS} ${GAP}`}>
          <ProfileCard profile={profile} />
          <OverviewCard profile={profile} />
        </div>

        {/* Tabs ----------------------------------------------------------- */}
        <div className="flex items-center gap-1 border-b border-[#E6E8F0]">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative flex items-center gap-2 px-5 py-3 font-medium transition-colors ${T.xs} ${
                  active ? "" : "text-slate-600 hover:text-slate-900"
                }`}
                style={active ? { color: VIOLET } : undefined}
              >
                <Glyph as={Icon} size={15} />
                {label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full" style={{ background: VIOLET }} />
                )}
              </button>
            );
          })}
        </div>

        {body}
      </ScaledCanvas>
    </>
  );
};

export default UserDetailsV2;
