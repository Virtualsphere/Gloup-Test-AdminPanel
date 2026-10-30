import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Download,
  Ellipsis,
  Flower2,
  House,
  Layers,
  MonitorSmartphone,
  MousePointerClick,
  Scissors,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingDown,
  UserRound,
  Zap,
} from "lucide-react";
import { fetchClickInteractionV2 } from "../../redux/slices/analyticsSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { WRAP, WRAP_WIDE } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
  HeaderButton,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  Meter,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "User Click & Interaction Analytics" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// Data: getClickInteractionV2 (analyticsSlice `clickInteraction`). Screen
// views, salon opens, coupon attempts and checkouts are logged by the API
// already; taps (with position), rage taps, gestures, time on screen and
// time-to-tap come from the app's event batch (/v2/events), so those cards
// say so until the Flutter app sends them. Until then "Top Clicked Elements"
// counts the actions the backend sees. "Repeated attempts" = rage taps +
// invalid coupon codes + unpaid / retried checkouts. Customer types are by
// served bookings to date (new 0-1, active 2-4, loyal 5+). The phone screens
// are CSS wireframes; the heat blobs on them are the busiest tap cells of
// that screen (8 x 16 grid).
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = `grid-cols-[598fr_449fr_281fr] ${WRAP.wide}`;
const ROW3_COLS = `grid-cols-[395fr_372fr_254fr_295fr] ${WRAP[4]}`;
const ROW4_COLS = `grid-cols-[327fr_328fr_323fr_341fr] ${WRAP[4]}`;

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1344px of content, so measured sizes carry over at ~1.13x.
// This mockup's type is smaller than the other V2 pages'; in the wrapped
// layout, where the cards are wider than drawn, it steps up to match them.
const T = {
  nano: "text-[8.5px] wrapped:text-[10px]", // column headers
  micro: "text-[9.5px] wrapped:text-[10.5px]", // captions, glossary
  xs: "text-[10.5px] wrapped:text-[12px]", // table cells
  sm: "text-[11.5px] wrapped:text-[13px]", // body, tabs
  title: "text-[13px] wrapped:text-[14.5px]", // card titles
  kpi: "text-[22px] wrapped:text-[24px]", // KPI values
};

const GAP = "gap-3";
const DASH = "–";

const PERIODS = [
  { key: "last_7", label: "Last 7 Days", range: () => [moment().subtract(6, "days"), moment()] },
  { key: "last_14", label: "Last 14 Days", range: () => [moment().subtract(13, "days"), moment()] },
  { key: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
];
const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
];
const PLATFORM_LABEL = { android: "Android", ios: "iOS", web: "Web", app: "App (platform not sent)" };

// Heatmap tabs -> the API's screen key and the wireframe that draws it
// (Checkout and Payment share the booking-summary phone).
const HEATMAP_TABS = [
  { label: "Home Screen", screen: "home", phone: 0 },
  { label: "Search Screen", screen: "search", phone: 1 },
  { label: "Salon Details", screen: "salon_details", phone: 2 },
  { label: "Checkout", screen: "checkout", phone: 3 },
  { label: "Payment", screen: "payment", phone: 3 },
];
const PHONE_SCREENS = ["home", "search", "salon_details", "checkout"];

const AREA_COLORS = { top: "#F97316", search: "#7C5CF0", content: "#3B82F6", cta: "#CA9A04", nav: "#16A34A" };
const USER_TYPES = [
  { key: "new", label: "New (0-1 bookings)", color: "#6D4AE0" },
  { key: "active", label: "Active (2-4)", color: GREEN },
  { key: "loyal", label: "Loyal (5+)", color: ORANGE },
];
const glossary = [
  { icon: MousePointerClick, color: "#7C5CF0", tint: "#EDE9FE", term: "Interactions", text: "Screen views, taps, searches, filters, salon opens, coupon and checkout steps." },
  { icon: Zap, color: "#E11D48", tint: "#FFE4E6", term: "Repeated Attempts", text: "Rage taps, invalid coupon codes and unpaid or retried checkouts." },
  { icon: Target, color: "#D97706", tint: "#FEF3C7", term: "Rage-tap Rate", text: "Rage taps as a share of all taps on that platform." },
  { icon: Timer, color: "#3B82F6", tint: "#DBEAFE", term: "Avg. Time to Tap", text: "Time from screen open to the first tap (reported by the app)." },
  { icon: TrendingDown, color: "#16A34A", tint: "#DCFCE7", term: "Drop-off Rate", text: "Users who reached a step but not the next one." },
];

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const secs = (v) => (isNum(v) ? (v >= 60 ? `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, "0")}s` : `${Number(v).toFixed(v < 10 ? 2 : 0)}s`) : DASH);
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : DASH);

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.micro, value: T.kpi, delta: T.sm, caption: T.xs }}
    className="px-4 pb-3 pt-3.5"
    {...props}
  />
);

// Table used by all the list cards. Columns: { key, label, align, className,
// render(row, i) }; headers stay in sentence case like the mockup.
const DataTable = ({ columns, rows, rowHeight = 26 }) => (
  <table className="w-full table-auto border-collapse text-left">
    <thead>
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            className={`pb-2.5 pr-2 font-medium text-slate-500 last:pr-0 ${T.nano} ${
              col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
            }`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i} style={{ height: rowHeight }}>
          {columns.map((col) => (
            <td
              key={col.key}
              className={`whitespace-nowrap pr-2 last:pr-0 ${T.xs} ${
                col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
              } ${col.className || "text-slate-700"}`}
            >
              {col.render ? col.render(row, i) : row[col.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

// --- Phone wireframes -------------------------------------------------------

const PHONE_W = 136;
const PHONE_H = 270;

// Heat blob: `x`/`y` are % of the screen, `size` in px.
const Blob = ({ x, y, size }) => (
  <span
    className="pointer-events-none absolute rounded-full"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      transform: "translate(-50%, -50%)",
      background:
        "radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(249,115,22,0.85) 24%, rgba(250,204,21,0.7) 46%, rgba(132,204,22,0.35) 70%, rgba(132,204,22,0) 100%)",
    }}
  />
);

const Phone = ({ active, blobs, children }) => (
  <div
    className={`relative shrink-0 rounded-[20px] bg-[#15151c] p-[3.5px] shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition-shadow ${
      active ? "ring-2 ring-[#5B3FF0]/70 ring-offset-2" : ""
    }`}
    style={{ width: PHONE_W, height: PHONE_H }}
  >
    <div className="relative h-full w-full overflow-hidden rounded-[17px] bg-white">
      <span className="absolute left-1/2 top-[3px] z-10 h-[5px] w-[34px] -translate-x-1/2 rounded-full bg-[#15151c]" />
      {children}
      {blobs.map((blob, i) => (
        <Blob key={i} {...blob} />
      ))}
    </div>
  </div>
);

const PhoneBody = ({ children }) => (
  <div className="flex h-full flex-col px-2 pb-[5px] pt-[17px] leading-none">{children}</div>
);

const Photo = ({ className = "", from = "#7a6a5c", to = "#2b2118" }) => (
  <span
    className={`block shrink-0 ${className}`}
    style={{ background: `linear-gradient(150deg, ${from}, ${to})` }}
  />
);

const PhoneTitle = ({ children, className = "" }) => (
  <p className={`text-[6.5px] font-bold text-slate-900 ${className}`}>{children}</p>
);

const HOME_SERVICES = [
  { label: "Haircut", icon: Scissors },
  { label: "Facial", icon: Sparkles },
  { label: "Spa", icon: Flower2 },
  { label: "More", icon: Ellipsis },
];

const HomeScreen = () => (
  <PhoneBody>
    <p className="text-[8px] font-bold text-slate-900">Hello, Priya 👋</p>
    <p className="mt-[3px] text-[5px] text-slate-400">Find your perfect salon</p>
    <div className="mt-[6px] flex items-center gap-[3px] rounded-[5px] bg-slate-100 px-[5px] py-[5px] text-[5px] text-slate-400">
      <Search size={6} /> Search for salon, service...
    </div>
    <PhoneTitle className="mt-[9px]">Popular Services</PhoneTitle>
    <div className="mt-[5px] grid grid-cols-4 gap-1">
      {HOME_SERVICES.map((service) => {
        const Icon = service.icon;
        return (
          <span key={service.label} className="text-center">
            <span className="mx-auto grid h-5 w-5 place-items-center rounded-md bg-violet-50 text-violet-600">
              <Icon size={9} />
            </span>
            <span className="mt-[2px] block text-[4.5px] text-slate-500">{service.label}</span>
          </span>
        );
      })}
    </div>
    <PhoneTitle className="mt-[9px]">Top Salons Near You</PhoneTitle>
    <div className="mt-[5px] grid grid-cols-2 gap-1">
      <Photo className="h-[58px] rounded-[5px]" />
      <Photo className="h-[58px] rounded-[5px]" from="#9a8576" to="#3a2d24" />
    </div>
    <div className="mt-auto flex items-center justify-around border-t border-slate-100 pt-[5px] text-slate-400">
      <House size={8} className="text-rose-500" />
      <CalendarDays size={8} />
      <Star size={8} />
      <UserRound size={8} />
    </div>
  </PhoneBody>
);

const SearchScreen = () => (
  <PhoneBody>
    <div className="flex items-center gap-[3px] rounded-[5px] bg-slate-100 px-[5px] py-[5px] text-[5px] text-slate-400">
      <Search size={6} /> Search salon or service
    </div>
    <div className="mt-[6px] flex gap-[3px] text-[5px]">
      <span className="rounded-full bg-[#5B3FF0] px-[5px] py-[3px] text-white">Haircut</span>
      {["Facial", "Spa", "Filter"].map((chip) => (
        <span key={chip} className="rounded-full border border-slate-200 px-[5px] py-[3px] text-slate-500">
          {chip}
        </span>
      ))}
    </div>
    <PhoneTitle className="mt-[9px]">Nearby Salons</PhoneTitle>
    <div className="mt-[6px] flex flex-col gap-[7px]">
      {["Looks & Style Salon", "Glam Studio", "Head Turners", "Style Hub"].map((name, i) => (
        <div key={name} className="flex items-center gap-[4px]">
          <Photo className="h-[27px] w-[27px] rounded-[5px]" from={i % 2 ? "#8a7667" : "#6f6155"} to="#2f251d" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[5.5px] font-semibold text-slate-800">{name}</span>
            <span className="mt-[2px] block text-[4.5px] text-slate-400">★ 4.8 (1.2k reviews)</span>
            <span className="mt-[2px] block text-[4.5px] text-slate-400">20 min away · ₹₹</span>
          </span>
        </div>
      ))}
    </div>
  </PhoneBody>
);

const SalonScreen = () => (
  <PhoneBody>
    <PhoneTitle className="mt-[2px] text-[7.5px]">Looks & Style Salon</PhoneTitle>
    <p className="mt-[3px] text-[4.5px] text-slate-400">★ 4.8 (1.2k reviews) · 20 min away</p>
    <div className="mt-[6px] flex gap-[3px] text-[4.5px]">
      {["Haircut", "Beard Trim", "Facial"].map((chip) => (
        <span key={chip} className="rounded-full border border-slate-200 px-[5px] py-[3px] text-slate-500">
          {chip}
        </span>
      ))}
    </div>
    <p className="mt-[6px] text-[4.5px] text-slate-400">3rd Cross, Anna Nagar, Chennai</p>
    <PhoneTitle className="mt-[8px]">Offers</PhoneTitle>
    <div className="mt-[4px] rounded-[5px] bg-[#EDE9FC] px-[6px] py-[6px]">
      <p className="text-[5.5px] font-bold text-[#4A32C9]">20% OFF on Haircut</p>
      <p className="mt-[2px] text-[4.5px] text-slate-500">Valid till 31 May</p>
    </div>
    <PhoneTitle className="mt-[9px]">Services</PhoneTitle>
    <div className="mt-[5px] flex flex-col gap-[8px]">
      {[
        ["Haircut", "₹199"],
        ["Hair Spa", "₹499"],
        ["Beard Trim", "₹149"],
      ].map(([name, price]) => (
        <div key={name} className="flex items-center justify-between text-[5.5px] text-slate-700">
          <span>{name}</span>
          <span className="font-semibold">{price}</span>
        </div>
      ))}
    </div>
  </PhoneBody>
);

const BookingScreen = () => (
  <PhoneBody>
    <PhoneTitle className="mt-[2px] text-[7px]">Booking Summary</PhoneTitle>
    <div className="mt-[6px] flex items-center justify-between rounded-[5px] border border-slate-100 px-[5px] py-[5px]">
      <span>
        <span className="block text-[5.5px] font-semibold text-slate-800">Haircut</span>
        <span className="mt-[2px] block text-[4.5px] text-slate-400">Looks & Style Salon</span>
      </span>
      <span className="text-[5.5px] font-semibold text-slate-800">₹199</span>
    </div>
    <p className="mt-[8px] text-[4.5px] text-slate-400">Date & Time</p>
    <div className="mt-[3px] flex justify-between text-[5.5px] font-medium text-slate-700">
      <span>Wed, 27 May</span>
      <span>6:00 PM</span>
    </div>
    <p className="mt-[8px] text-[4.5px] text-slate-400">Add-ons</p>
    <div className="mt-[4px] flex flex-col gap-[5px] text-[5px] text-slate-600">
      <span className="flex justify-between">
        Hair Wash <span>₹49</span>
      </span>
      <span className="flex justify-between">
        Scalp Massage <span>₹99</span>
      </span>
    </div>
    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-[5px] text-[6px] font-bold text-slate-900">
      Total <span>₹248</span>
    </div>
    <span className="mt-[5px] block rounded-[5px] bg-[#5B3FF0] py-[6px] text-center text-[5.5px] font-bold text-white">
      Add to Cart
    </span>
  </PhoneBody>
);

// The four wireframes, in PHONE_SCREENS order.
const PHONES = [HomeScreen, SearchScreen, SalonScreen, BookingScreen];

// --- Click intensity (phone zones) -----------------------------------------

const zones = [
  { n: 1, top: 13, height: 19, background: "linear-gradient(90deg,#F97316,#F59E0B)", badge: "#EA580C" },
  { n: 2, top: 40, height: 16, background: "#8B74F5", badge: "#6D4AE0" },
  { n: 3, top: 64, height: 52, background: "linear-gradient(180deg,#7C9BFF,#8F7DFF)", badge: "#4F46E5" },
  { n: 4, top: 124, height: 15, background: "#CFD84A", badge: "#A8B21B" },
  { n: 5, top: 146, height: 16, background: "#34C38F", badge: "#16A34A" },
];

const IntensityPhone = () => (
  <div className="relative h-[176px] w-[132px] shrink-0 rounded-[18px] border-[3px] border-slate-300 bg-white">
    <span className="absolute left-1/2 top-[3px] h-[4px] w-[30px] -translate-x-1/2 rounded-full bg-slate-300" />
    {zones.map((zone) => (
      <span
        key={zone.n}
        className="absolute left-2 right-2 flex items-center rounded-md pl-1"
        style={{ top: zone.top, height: zone.height, background: zone.background }}
      >
        <span
          className="grid h-[13px] w-[13px] place-items-center rounded-full text-[8px] font-bold text-white"
          style={{ background: zone.badge }}
        >
          {zone.n}
        </span>
      </span>
    ))}
  </div>
);

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[280px]">{children}</p>
  </div>
);

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, platform, setPlatform, version, setVersion, versionOptions, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Understand every tap, swipe &amp; click to improve user experience</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="click-range" maxDays={92} className="relative hidden lg:block" />
        <HeaderSelect
          icon={CalendarDays}
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MonitorSmartphone} label="Platform" value={platform} onChange={setPlatform} options={PLATFORMS} className="hidden xl:flex" />
        <HeaderSelect icon={Layers} label="App version" value={version} onChange={setVersion} options={versionOptions} className="hidden xl:flex" />
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={onExport}>
          <span className="hidden md:inline">Export Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ClickInteractionV2 = ({ title = "User Click & Interaction Analytics" }) => {
  const dispatch = useDispatch();
  const { clickInteraction } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [custom, setCustom] = useState(null);
  const [platform, setPlatform] = useState("all");
  const [version, setVersion] = useState("all");
  const [tab, setTab] = useState(0);

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  useEffect(() => {
    const body = { from: range.from, to: range.to };
    if (platform !== "all") body.platform = platform;
    if (version !== "all") body.app_version = version;
    dispatch(fetchClickInteractionV2(body))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load click analytics", { id: "click-v2" }));
  }, [dispatch, range.from, range.to, platform, version]);

  const data = clickInteraction.data;
  const loading = clickInteraction.loading && !data;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const appNote = data?.app_events_since ? `App events since ${fmtDay(data.app_events_since)}` : "Waiting for app events";
  const screensNote = data?.screens_since ? `Tracked since ${fmtDay(data.screens_since)}` : "No screen views tracked yet";
  const versionOptions = useMemo(() => [{ value: "all", label: "All Versions" }, ...(data?.app_versions || []).map((v) => ({ value: v, label: v }))], [data]);

  // `good` colours the delta by meaning: slower taps and more repeats are bad.
  const kpi = (label, key, fmt, color, { inverse = false, missing = compare } = {}) => {
    const cur = k[key];
    const prev = pk[key];
    const d = isNum(cur) && isNum(prev) && prev ? ((cur - prev) / prev) * 100 : null;
    const up = isNum(d) ? d >= 0 : undefined;
    return {
      label,
      value: loading ? "…" : fmt(cur),
      delta: isNum(d) ? `${Math.abs(d).toFixed(1)}%` : undefined,
      up,
      good: up === undefined ? undefined : inverse ? !up : up,
      caption: isNum(cur) ? compare : missing,
      color,
    };
  };
  const kpis = [
    kpi("Total Interactions", "interactions", num, INDIGO, { missing: screensNote }),
    kpi("Unique Users", "unique_users", num, GREEN, { missing: screensNote }),
    kpi("Avg. Interactions per User", "avg_per_user", num, "#3B82F6", { missing: screensNote }),
    kpi("Total Taps", "taps", num, ORANGE, { missing: appNote }),
    kpi("Avg. Time to Tap", "avg_seconds_to_tap", secs, "#EC4899", { inverse: true, missing: appNote }),
    kpi("Repeated Attempts", "repeated_attempts", num, "#EC4899", { inverse: true }),
  ];

  const heatmaps = data?.heatmaps || {};
  const activeTab = HEATMAP_TABS[tab];
  const phoneScreen = (i) => (i === 3 && activeTab.phone === 3 ? activeTab.screen : PHONE_SCREENS[i]);
  const blobsFor = (screen) => (heatmaps[screen] || []).map((c) => ({ x: c.x * 100, y: c.y * 100, size: Math.round(12 + c.weight * 34) }));
  const hasTaps = Object.keys(heatmaps).length > 0;
  const screens = data?.screens || [];
  const maxViews = Math.max(0, ...screens.map((s) => s.views));
  const elements = data?.elements || [];
  const flows = data?.flows || [];
  const areas = data?.areas;
  const repeated = data?.repeated_attempts || [];
  const gestures = data?.gestures || [];
  const dropOffs = data?.drop_offs || [];
  const maxDropOff = Math.max(0, ...dropOffs.map((r) => r.rate || 0));
  const byType = Object.fromEntries((data?.by_customer_type || []).map((r) => [r.type, r]));
  const typeRows = [
    { metric: "Interactions per Session", key: "interactions_per_session", fmt: num },
    { metric: "Interactions per Screen", key: "interactions_per_screen", fmt: num },
    { metric: "Avg. Time to Tap", key: "avg_seconds_to_tap", fmt: secs },
    { metric: "Repeated Attempt %", key: "repeated_attempt_rate", fmt: fmtPct },
    { metric: "Conversion Rate", key: "conversion_rate", fmt: fmtPct },
  ];
  const devices = data?.devices || [];

  // Insights from the numbers above.
  const insights = [];
  if (elements.length) insights.push({ icon: MousePointerClick, color: "#E11D48", tint: "#FFE4E6", text: `Most used: ${elements.slice(0, 3).map((e) => e.element).join(", ")}.` });
  const worstDrop = [...dropOffs].filter((d) => d.of).sort((a, b) => (b.rate || 0) - (a.rate || 0))[0];
  if (worstDrop) insights.push({ icon: ChartColumn, color: "#3B82F6", tint: "#DBEAFE", text: `Biggest drop-off: ${worstDrop.step} (${fmtPct(worstDrop.rate)}).` });
  if (repeated[0]) insights.push({ icon: ShieldAlert, color: "#16A34A", tint: "#DCFCE7", text: `Most repeated attempts on "${repeated[0].element}" (${num(repeated[0].attempts)} by ${num(repeated[0].users)} users).` });
  if (byType.loyal?.conversion_rate !== null && byType.new?.conversion_rate !== null && byType.loyal && byType.new) {
    insights.push({ icon: Star, color: "#D97706", tint: "#FEF3C7", text: `Loyal customers convert at ${fmtPct(byType.loyal.conversion_rate)} vs ${fmtPct(byType.new.conversion_rate)} for new ones.` });
  }
  if (screens[0]) insights.push({ icon: Timer, color: "#7C5CF0", tint: "#EDE9FE", text: `${screens[0].label} is the most viewed screen (${fmtPct(screens[0].share)} of views).` });

  const exportReport = () => {
    if (!data) return;
    downloadCsv(
      `click-interaction_${data.from}_${data.to}.csv`,
      ["Section", "Item", "Count", "Share / Detail"],
      [
        ...kpis.map((x) => ["KPI", x.label, x.value, ""]),
        ...screens.map((s) => ["Screens", s.label, s.views, `${fmtPct(s.share)} · ${s.unique_users} users`]),
        ...elements.map((e) => ["Elements", e.element, e.clicks, fmtPct(e.share)]),
        ...flows.map((f) => ["Paths", f.steps.join(" > "), f.sessions, fmtPct(f.share)]),
        ...repeated.map((r) => ["Repeated attempts", r.element, r.attempts, `${r.users} users`]),
        ...dropOffs.map((d) => ["Drop-off", d.step, d.dropped, fmtPct(d.rate)]),
      ]
    );
  };

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        period={period}
        setPeriod={setPeriod}
        onCustom={(from, to) => {
          setCustom({ from, to });
          setPeriod("custom");
        }}
        platform={platform}
        setPlatform={setPlatform}
        version={version}
        setVersion={setVersion}
        versionOptions={versionOptions}
        onExport={exportReport}
      />

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - KPI tiles */}
        <div className={`grid grid-cols-6 ${WRAP[6]} ${GAP}`}>
          {kpis.map(({ color, ...tile }) => (
            <KpiTile key={tile.label} {...tile} footer={<span className="mt-2 block h-[3px] rounded-full" style={{ background: color, opacity: 0.5 }} />} />
          ))}
        </div>

        {/* Row 2 - Heatmap / distribution by screen / top elements */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className={`p-4 ${WRAP_WIDE}`}>
            <CardHeader title="1. Screen Tap Heatmap" subtitle={hasTaps ? "Busiest tap spots per screen" : `Tap positions come from the app · ${appNote}`} />

            <div className="mt-2.5 flex items-center gap-2">
              {HEATMAP_TABS.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setTab(i)}
                  className={`rounded-md border px-3.5 py-1.5 font-medium transition-colors ${T.sm} ${tab === i ? "border-transparent text-white" : "border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"}`}
                  style={tab === i ? { background: BRAND } : undefined}
                >
                  {item.label}
                  {heatmaps[item.screen] ? "" : <span className="ml-1 opacity-60">·</span>}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-1 items-center justify-between px-1.5">
              {PHONES.map((Screen, i) => (
                <Phone key={i} active={activeTab.phone === i} blobs={blobsFor(phoneScreen(i))}>
                  <Screen />
                </Phone>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="2. Views by Screen" subtitle={data?.screens_since ? undefined : screensNote} />
            {screens.length ? (
              <div className="mt-3">
                <DataTable
                  rowHeight={27}
                  columns={[
                    { key: "label", label: "Screen", className: "font-medium text-slate-800" },
                    {
                      key: "views",
                      label: "Views",
                      // The bars fade as the screens get quieter, as in the mockup.
                      render: (row, i) => (
                        <span className="flex items-center gap-2">
                          <span className="w-[52px] shrink-0">
                            <Meter pct={maxViews ? (row.views / maxViews) * 100 : 0} height={3} color={`rgba(91,63,240,${Math.max(0.35, 1 - i * 0.07).toFixed(2)})`} track="transparent" />
                          </span>
                          {num(row.views)}
                        </span>
                      ),
                    },
                    { key: "share", label: "Views (%)", align: "right", render: (row) => fmtPct(row.share) },
                    { key: "unique_users", label: "Unique Users", align: "right", render: (row) => num(row.unique_users) },
                    { key: "avg_seconds", label: "Avg. Time on Screen", align: "right", render: (row) => secs(row.avg_seconds) },
                  ]}
                  rows={screens.slice(0, 10)}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No screen views in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="3. Top Clicked Elements" subtitle={data?.elements_source === "server_actions" ? "Actions seen by the server until app taps arrive" : undefined} />
            {elements.length ? (
              <div className="mt-3">
                <DataTable
                  rowHeight={27}
                  columns={[
                    { key: "element", label: "Element", className: "max-w-[130px] truncate font-medium text-slate-800" },
                    { key: "clicks", label: "Clicks", align: "right", render: (row) => num(row.clicks) },
                    { key: "share", label: "Clicks (%)", align: "right", render: (row) => fmtPct(row.share) },
                  ]}
                  rows={elements}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No interactions in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 3 - Journey / intensity / repeated attempts / gestures */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="4. Top Screen Paths (Journey)" subtitle="Most common first steps of a user's day" />
            {flows.length ? (
              <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
                {flows.map((flow, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      {flow.steps.map((step, j) => (
                        <Fragment key={j}>
                          {j > 0 && <ChevronRight size={10} className="shrink-0 text-slate-300" />}
                          <span className={`rounded-md px-1.5 py-[3px] font-medium ${T.micro} ${j === flow.steps.length - 1 ? "bg-[#DDF3E7] text-[#0F5132]" : "bg-[#E9E5FC] text-[#2D2570]"}`}>{step}</span>
                        </Fragment>
                      ))}
                    </span>
                    <span className={`shrink-0 text-right text-slate-600 ${T.xs}`}>
                      <b className="text-slate-800">{fmtPct(flow.share)}</b> ({num(flow.sessions)})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No multi-screen journeys in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="5. Tap Intensity by Area (All Screens)" />
            {areas ? (
              <div className="mt-3 flex items-center gap-4">
                <IntensityPhone />
                <div className="min-w-0 flex-1">
                  <DataTable
                    rowHeight={30}
                    columns={[
                      {
                        key: "label",
                        label: "Area",
                        className: "text-slate-700",
                        render: (row, i) => (
                          <span className="flex items-center gap-2">
                            <span className="grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full text-[8px] font-bold" style={{ background: `${AREA_COLORS[row.key]}22`, color: AREA_COLORS[row.key] }}>
                              {i + 1}
                            </span>
                            {row.label}
                          </span>
                        ),
                      },
                      { key: "taps", label: "Taps", align: "right", render: (row) => num(row.taps) },
                      { key: "share", label: "Taps (%)", align: "right", render: (row) => fmtPct(row.share) },
                    ]}
                    rows={areas}
                  />
                </div>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `Needs tap positions from the app · ${appNote}`}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="6. Repeated Attempts" subtitle="Rage taps, invalid coupons, retried / unpaid checkouts" />
            {repeated.length ? (
              <div className="mt-3">
                <DataTable
                  rowHeight={26}
                  columns={[
                    { key: "element", label: "Element", className: "max-w-[120px] truncate font-medium text-slate-800" },
                    { key: "attempts", label: "Attempts", align: "right", render: (row) => num(row.attempts) },
                    { key: "users", label: "Users Affected", align: "right", render: (row) => num(row.users) },
                  ]}
                  rows={repeated}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No repeated attempts in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="7. Long Press & Gestures" />
            {gestures.length ? (
              <div className="mt-3">
                <DataTable
                  rowHeight={25}
                  columns={[
                    { key: "gesture", label: "Gesture", className: "font-medium text-slate-800" },
                    { key: "users", label: "Users", align: "right", render: (row) => num(row.users) },
                    { key: "share", label: "% of Users", align: "right", render: (row) => fmtPct(row.share) },
                  ]}
                  rows={gestures.slice(0, 6)}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : `Gestures come from the app · ${appNote}`}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 4 - Drop-off / behaviour / devices / insights */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="8. Drop-off Analysis" subtitle="Users who reached a step but not the next" />
            {dropOffs.some((d) => d.of) ? (
              <div className="mt-3">
                <DataTable
                  rowHeight={27}
                  columns={[
                    { key: "step", label: "Step", className: "font-medium text-slate-800" },
                    { key: "dropped", label: "Drop-off Users", align: "right", render: (row) => `${num(row.dropped)} / ${num(row.of)}` },
                    {
                      key: "rate",
                      label: "Drop-off Rate",
                      render: (row) => (
                        <span className="flex items-center gap-2">
                          <span className="w-[58px] shrink-0">
                            <Meter pct={maxDropOff ? ((row.rate || 0) / maxDropOff) * 100 : 0} height={4} color={BRAND} track="transparent" />
                          </span>
                          <span>{fmtPct(row.rate)}</span>
                        </span>
                      ),
                    },
                  ]}
                  rows={dropOffs}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No salon detail views in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="9. Interaction by Customer Type" subtitle="By served bookings to date" />
            {Object.values(byType).some((r) => r.users) ? (
              <table className="mt-3 w-full table-auto border-collapse text-left">
                <thead>
                  <tr>
                    <th />
                    {USER_TYPES.map((type) => (
                      <th key={type.key} className={`pb-2.5 text-center font-medium text-slate-500 ${T.nano}`} title={`${num(byType[type.key]?.users)} users`}>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-[5px] w-[5px] rounded-full" style={{ background: type.color }} />
                          {type.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {typeRows.map((row) => (
                    <tr key={row.metric} className="h-[27px]">
                      <td className={`whitespace-nowrap pr-2 text-slate-600 ${T.xs}`}>{row.metric}</td>
                      {USER_TYPES.map((type) => (
                        <td key={type.key} className={`text-center font-medium text-slate-800 ${T.xs}`}>
                          {row.fmt(byType[type.key]?.[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No interactions in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="10. Device Comparison" />
            {devices.length ? (
              <div className="mt-3">
                <DataTable
                  rowHeight={36}
                  columns={[
                    { key: "platform", label: "Device", className: "font-medium text-slate-800", render: (row) => PLATFORM_LABEL[row.platform] || row.platform },
                    { key: "users", label: "Users", align: "center", render: (row) => num(row.users) },
                    { key: "interactions_per_user", label: "Interactions / User", align: "center", render: (row) => num(row.interactions_per_user) },
                    {
                      key: "rage_tap_rate",
                      label: "Rage-tap Rate",
                      align: "center",
                      render: (row) =>
                        isNum(row.rage_tap_rate) ? (
                          <span className={`inline-block rounded-md px-3 py-[5px] font-semibold ${row.rage_tap_rate <= 5 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{fmtPct(row.rage_tap_rate)}</span>
                        ) : (
                          DASH
                        ),
                    },
                  ]}
                  rows={devices}
                />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No interactions with a known platform"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="11. Top Insights" />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
              {insights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-3">
                    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md" style={{ background: item.tint, color: item.color }}>
                      <Icon size={12} />
                    </span>
                    <span className={`min-w-0 text-slate-700 ${T.xs}`}>{item.text}</span>
                  </li>
                );
              })}
              {!insights.length && <li className={`text-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : "Not enough data for insights yet."}</li>}
            </ul>
          </Card>
        </div>

        {/* Row 5 - Glossary */}
        <Card className="px-4 py-3">
          <CardHeader title="What do these metrics mean?" />
          <div className={`mt-2 grid grid-cols-5 ${WRAP[5]} gap-3`}>
            {glossary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.term} className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: item.tint, color: item.color }}>
                    <Icon size={11} />
                  </span>
                  <p className={`min-w-0 text-slate-500 ${T.nano}`}>
                    <b className="font-semibold text-slate-800">{item.term}:</b> {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </ScaledCanvas>
    </>
  );
};

export default ClickInteractionV2;
