import { useState } from "react";
import {
  CalendarDays,
  ChartColumn,
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
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { toSpark as spark } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  HeaderButton,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  LiveStamp,
  Meter,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "User Click & Interaction Analytics"
// mockup, on a fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the
// available width (see there for why bigger px sizes in T read smaller on
// screen).
//
// UI only for now - every number is static demo data matching the mockup. No
// backend source exists yet: the apps would have to report tap / gesture /
// screen events first. The phone screens are simplified CSS wireframes with
// heat blobs drawn over them, standing in for real per-screen click maps. The
// header pickers and the heatmap tabs hold local state only.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const ORANGE = "#F59E0B";
const PINK = "#EC4899";
const RED = "#EF4444";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[598fr_449fr_281fr]";
const ROW3_COLS = "grid-cols-[395fr_372fr_254fr_295fr]";
const ROW4_COLS = "grid-cols-[327fr_328fr_323fr_341fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1344px of content, so measured sizes carry over at ~1.13x.
const T = {
  nano: "text-[8.5px]", // column headers
  micro: "text-[9.5px]", // captions, glossary
  xs: "text-[10.5px]", // table cells
  sm: "text-[11.5px]", // body, tabs
  title: "text-[13px]", // card titles
  kpi: "text-[22px]", // KPI values
};

const GAP = "gap-3";
const COMPARE = "vs May 14 – May 20";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

// Fixed wavy upward series (seeded by `seed`, no randomness) for the KPI sparklines.
const trend = (seed, slope = 0.45, amp = 1.1) =>
  spark(
    Array.from({ length: 18 }, (_, i) =>
      +(10 + slope * i + amp * Math.sin(i * 1.9 + seed) + 0.6 * Math.sin(i * 0.8 + seed * 2)).toFixed(2)
    )
  );

// `good` colours the delta independently of its direction, as drawn: a faster
// time-to-click and fewer rage clicks are both drawn in red.
const kpis = [
  { label: "Total Clicks", value: "12,48,230", delta: "16.8%", up: true, color: INDIGO, trend: trend(1) },
  { label: "Unique Clicks", value: "8,72,310", delta: "15.2%", up: true, color: GREEN, trend: trend(2.3) },
  { label: "Avg. Clicks per User", value: "46.3", delta: "12.7%", up: true, color: BLUE, trend: trend(3.1) },
  { label: "Total Taps", value: "15,92,810", delta: "17.6%", up: true, color: ORANGE, trend: trend(4.4) },
  { label: "Avg. Time to Click", value: "2.34s", delta: "6.4%", up: false, good: false, color: PINK, trend: trend(5.2, 0.35, 1.4) },
  { label: "Rage Clicks", value: "24,560", delta: "8.1%", up: false, good: false, color: PINK, trend: trend(6.7, 0.3, 1.5) },
];

const HEATMAP_TABS = ["Home Screen", "Search Screen", "Salon Details", "Booking Flow", "Payment"];
// Booking Flow and Payment both point at the booking-summary phone: the mockup
// only draws four screens.
const PHONE_FOR_TAB = [0, 1, 2, 3, 3];

const screens = [
  { screen: "Home Screen", clicks: "2,95,420", pct: "23.7%", unique: "1,98,540", time: "1m 28s", bar: 100 },
  { screen: "Search Screen", clicks: "2,31,780", pct: "18.6%", unique: "1,55,230", time: "1m 12s", bar: 83 },
  { screen: "Salon Details", clicks: "2,18,640", pct: "17.5%", unique: "1,42,890", time: "1m 45s", bar: 67 },
  { screen: "Service Selection", clicks: "1,56,320", pct: "12.5%", unique: "1,05,670", time: "1m 10s", bar: 54 },
  { screen: "Cart Screen", clicks: "1,12,340", pct: "9.0%", unique: "76,890", time: "1m 05s", bar: 46 },
  { screen: "Payment Screen", clicks: "74,230", pct: "6.0%", unique: "49,090", time: "1m 20s", bar: 38 },
  { screen: "Booking Confirmation", clicks: "59,500", pct: "4.8%", unique: "39,720", time: "45s", bar: 27 },
  { screen: "Offers & Discounts", clicks: "35,000", pct: "2.8%", unique: "24,280", time: "50s", bar: 21 },
  { screen: "Profile Screen", clicks: "22,380", pct: "1.8%", unique: "15,700", time: "40s", bar: 12.5 },
  { screen: "Others", clicks: "8,620", pct: "0.7%", unique: "6,410", time: "30s", bar: 6 },
];

const elements = [
  { element: "Search Bar", clicks: "2,10,340", pct: "16.9%" },
  { element: "Salon Card", clicks: "1,78,560", pct: "14.3%" },
  { element: "Add to Cart Button", clicks: "1,12,340", pct: "9.0%" },
  { element: "Filter Button", clicks: "98,670", pct: "7.9%" },
  { element: "Book Now Button", clicks: "76,230", pct: "6.1%" },
  { element: "Back Button", clicks: "68,540", pct: "5.5%" },
  { element: "Service Item", clicks: "64,320", pct: "5.2%" },
  { element: "Offers Banner", clicks: "58,760", pct: "4.7%" },
  { element: "Time Slot", clicks: "48,350", pct: "3.9%" },
  { element: "Apply Coupon", clicks: "36,890", pct: "3.0%" },
];

const areas = [
  { n: 1, area: "Top Section", clicks: "2,45,670", pct: "19.7%", color: "#F97316" },
  { n: 2, area: "Search & Filters", clicks: "2,18,430", pct: "17.5%", color: "#7C5CF0" },
  { n: 3, area: "Salon / Content Area", clicks: "4,12,560", pct: "33.1%", color: BLUE },
  { n: 4, area: "Bottom Actions (CTAs)", clicks: "3,05,430", pct: "24.5%", color: "#CA9A04" },
  { n: 5, area: "Navigation Bar", clicks: "66,140", pct: "5.3%", color: "#16A34A" },
];

const rageClicks = [
  { element: "Apply Coupon", rage: "8,540", affected: "5,630" },
  { element: "Proceed to Pay", rage: "6,240", affected: "4,120" },
  { element: "Book Now Button", rage: "5,310", affected: "3,350" },
  { element: "Add to Cart", rage: "3,890", affected: "2,980" },
  { element: "Time Slot Selection", rage: "2,580", affected: "1,940" },
];

const gestures = [
  { gesture: "Long Press (Salon Card)", users: "12,450", pct: "9.3%" },
  { gesture: "Swipe (Left/Right)", users: "24,730", pct: "18.5%" },
  { gesture: "Pull to Refresh", users: "36,890", pct: "27.6%" },
  { gesture: "Pinch to Zoom", users: "8,120", pct: "6.1%" },
  { gesture: "Back Swipe", users: "22,310", pct: "16.7%" },
  { gesture: "Other Gestures", users: "29,460", pct: "22.1%" },
];

const dropOffs = [
  { step: "Salon Details → Add to Cart", users: "1,05,670", rate: 43.9 },
  { step: "Add to Cart → Checkout", users: "46,456", rate: 22.1 },
  { step: "Checkout → Payment", users: "26,175", rate: 16.7 },
  { step: "Payment → Success", users: "8,265", rate: 7.1 },
  { step: "Others", users: "9,120", rate: 10.2 },
];
const maxDropOff = Math.max(...dropOffs.map((row) => row.rate));

const userTypes = [
  { key: "new", label: "New Users", color: "#6D4AE0" },
  { key: "active", label: "Active Users", color: GREEN },
  { key: "loyal", label: "Loyal Users", color: ORANGE },
];
const behavior = [
  { metric: "Avg. Clicks per Session", new: "28.4", active: "45.7", loyal: "63.2" },
  { metric: "Avg. Time to Click (s)", new: "2.8", active: "2.3", loyal: "1.9" },
  { metric: "Clicks per Screen", new: "17.2", active: "28.9", loyal: "36.6" },
  { metric: "Rage Click %", new: "3.6%", active: "2.4%", loyal: "1.5%" },
  { metric: "Conversion Rate", new: "6.2%", active: "9.8%", loyal: "14.3%" },
];

const devices = [
  { device: "Android", clicks: "47.2", accuracy: "94.6%", tone: "good", mistap: "5.4%" },
  { device: "iOS", clicks: "45.1", accuracy: "95.2%", tone: "good", mistap: "4.8%" },
  { device: "Web", clicks: "32.6", accuracy: "91.3%", tone: "fair", mistap: "8.7%" },
];
const ACCURACY_TONES = {
  good: "bg-emerald-50 text-emerald-600",
  fair: "bg-amber-50 text-amber-600",
};

const insights = [
  { icon: MousePointerClick, color: "#E11D48", tint: "#FFE4E6", text: "Users click most on Search Bar, Salon Cards & Add to Cart." },
  { icon: ChartColumn, color: BLUE, tint: "#DBEAFE", text: "High drop-off observed between Add to Cart → Checkout (22.1%)." },
  { icon: ShieldAlert, color: "#16A34A", tint: "#DCFCE7", text: "Payment screen has highest rage clicks, improve reliability." },
  { icon: Star, color: "#D97706", tint: "#FEF3C7", text: "Loyal users click 40% more but rage click 60% less than new users." },
  { icon: Timer, color: "#7C5CF0", tint: "#EDE9FE", text: "Average time to click improved by 6.4% this week." },
];

const glossary = [
  { icon: MousePointerClick, color: "#7C5CF0", tint: "#EDE9FE", term: "Clicks", text: "Total number of times any element was clicked." },
  { icon: Zap, color: "#E11D48", tint: "#FFE4E6", term: "Rage Clicks", text: "Repeated taps on same element without response." },
  { icon: Target, color: "#D97706", tint: "#FEF3C7", term: "Click Accuracy", text: "Successful clicks vs total clicks." },
  { icon: Timer, color: BLUE, tint: "#DBEAFE", term: "Avg. Time to Click", text: "Time taken from screen load to first click." },
  { icon: TrendingDown, color: "#16A34A", tint: "#DCFCE7", term: "Drop-off Rate", text: "Users who left the flow after a specific step." },
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const PLATFORMS = [{ value: "all", label: "Platforms" }, "Android", "iOS", "Web"];
const VERSIONS = [{ value: "all", label: "All Versions" }, "4.2.0", "4.1.0", "4.0.0"];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.micro, value: T.kpi, delta: T.sm, caption: T.xs }}
    sparkHeight={40}
    caption={COMPARE}
    className="px-4 pb-2 pt-3.5"
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

const PHONES = [
  { Screen: HomeScreen, blobs: [{ x: 68, y: 12, size: 44 }, { x: 88, y: 27, size: 30 }, { x: 19, y: 92, size: 16 }] },
  { Screen: SearchScreen, blobs: [{ x: 15, y: 21, size: 32 }, { x: 73, y: 50, size: 24 }, { x: 85, y: 93, size: 28 }] },
  { Screen: SalonScreen, blobs: [{ x: 14, y: 16, size: 28 }, { x: 60, y: 96, size: 44 }] },
  { Screen: BookingScreen, blobs: [{ x: 10, y: 5, size: 24 }, { x: 31, y: 93, size: 32 }] },
];

// --- Click flow (journey) ---------------------------------------------------

// Boxes and bands share one coordinate space (design px), so the SVG bands
// meet the HTML boxes exactly: the container is laid out at this size.
const FLOW_W = 413;
const FLOW_H = 164;
// Coordinates below were measured at the mockup's height; this squeezes them.
const sy = (v) => Math.round(v * 0.9);

const ribbon = (x1, a1, b1, x2, a2, b2) => {
  const m = (x1 + x2) / 2;
  const [p1, q1, p2, q2] = [a1, b1, a2, b2].map(sy);
  return `M${x1},${p1} C${m},${p1} ${m},${p2} ${x2},${p2} L${x2},${q2} C${m},${q2} ${m},${q1} ${x1},${q1} Z`;
};

const flowBoxes = [
  { id: "open", x: 0, y: 31, w: 60, h: 90, label: "App Open", pct: "100%", sub: "(2,98,540)", tone: "lavender" },
  { id: "search", x: 107, y: 9, w: 74, h: 44, label: "Search", pct: "62.7%", tone: "lavender" },
  { id: "explore", x: 107, y: 71, w: 74, h: 45, label: "Explore Home", pct: "29.3%", tone: "lavender" },
  { id: "offers", x: 107, y: 133, w: 74, h: 44, label: "Offers Page", pct: "8.0%", tone: "lavender" },
  { id: "salon", x: 220, y: 23, w: 62, h: 40, label: "Salon Details", pct: "55.2%", tone: "lavender" },
  { id: "none", x: 220, y: 102, w: 62, h: 37, label: "No Further Action", pct: "44.8%", tone: "lavender" },
  { id: "cart", x: 333, y: 20, w: 79, h: 44, label: "Add to Cart", pct: "56.1%", tone: "green" },
  { id: "book", x: 333, y: 96, w: 79, h: 45, label: "Book Now", pct: "43.9%", tone: "green" },
];
const FLOW_BOX_TONES = {
  lavender: "bg-[#E9E5FC] text-[#2D2570]",
  green: "bg-[#DDF3E7] text-[#0F5132]",
};

const flowBands = [
  { d: ribbon(60, 34, 78, 107, 12, 50), tone: "#DCD5FA" },
  { d: ribbon(60, 78, 104, 107, 74, 108), tone: "#DCD5FA" },
  { d: ribbon(60, 104, 118, 107, 138, 170), tone: "#DCD5FA" },
  { d: ribbon(181, 12, 36, 220, 25, 46), tone: "#DCD5FA" },
  { d: ribbon(181, 36, 50, 220, 104, 114), tone: "#DCD5FA" },
  { d: ribbon(181, 76, 92, 220, 46, 58), tone: "#DCD5FA" },
  { d: ribbon(181, 92, 108, 220, 114, 126), tone: "#DCD5FA" },
  { d: ribbon(181, 140, 166, 220, 126, 138), tone: "#DCD5FA" },
  { d: ribbon(282, 26, 46, 333, 24, 48), tone: "#BFE8D1" },
  { d: ribbon(282, 46, 60, 333, 100, 124), tone: "#BFE8D1" },
];

const ClickFlow = () => (
  <div className="relative mt-2" style={{ width: FLOW_W, height: FLOW_H }}>
    <svg
      viewBox={`0 0 ${FLOW_W} ${FLOW_H}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {flowBands.map((band, i) => (
        <path key={i} d={band.d} fill={band.tone} opacity={0.9} />
      ))}
    </svg>

    {flowBoxes.map((box) => (
      <div
        key={box.id}
        className={`absolute grid place-content-center justify-items-center rounded-md text-center leading-tight shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${FLOW_BOX_TONES[box.tone]}`}
        style={{ left: box.x, top: sy(box.y), width: box.w, height: sy(box.h) }}
      >
        <span className="text-[9px] font-medium">{box.label}</span>
        <span className="mt-[2px] text-[12px] font-bold">{box.pct}</span>
        {box.sub && <span className="mt-[1px] text-[8.5px] opacity-70">{box.sub}</span>}
      </div>
    ))}
  </div>
);

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

const exportScreens = () =>
  downloadCsv(
    "click-distribution-by-screen.csv",
    ["Screen", "Clicks", "Clicks (%)", "Unique Clicks", "Avg. Time on Screen"],
    screens.map((row) => [row.screen, row.clicks, row.pct, row.unique, row.time])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, platform, setPlatform, version, setVersion }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Understand every tap, swipe &amp; click to improve user experience
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <LiveStamp updated="10:30 AM" className="hidden 2xl:flex" />
        <HeaderSelect
          icon={CalendarDays}
          label="Date range"
          value={range}
          onChange={setRange}
          options={DATE_RANGES}
          className="hidden lg:flex"
        />
        <HeaderSelect
          icon={MonitorSmartphone}
          label="Platform"
          value={platform}
          onChange={setPlatform}
          options={PLATFORMS}
          className="hidden xl:flex"
        />
        <HeaderSelect
          icon={Layers}
          label="App version"
          value={version}
          onChange={setVersion}
          options={VERSIONS}
          className="hidden xl:flex"
        />
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={exportScreens}>
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
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [platform, setPlatform] = useState("all");
  const [version, setVersion] = useState("all");
  const [tab, setTab] = useState(0);

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        setRange={setRange}
        platform={platform}
        setPlatform={setPlatform}
        version={version}
        setVersion={setVersion}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ color, trend: series, ...kpi }) => (
            <KpiTile
              key={kpi.label}
              {...kpi}
              spark={series}
              sparkColor={color}
              sparkId={`ci-kpi-${kpi.label.replace(/\W/g, "")}`}
            />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Heatmap / distribution by screen / top elements          */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="1. Screen Click Heatmap" info />

            <div className="mt-2.5 flex items-center gap-2">
              {HEATMAP_TABS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(i)}
                  className={`rounded-md border px-3.5 py-1.5 font-medium transition-colors ${T.sm} ${
                    tab === i
                      ? "border-transparent text-white"
                      : "border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={tab === i ? { background: BRAND } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-1 items-center justify-between px-1.5">
              {PHONES.map((phone, i) => {
                const Screen = phone.Screen;
                return (
                  <Phone key={i} active={PHONE_FOR_TAB[tab] === i} blobs={phone.blobs}>
                    <Screen />
                  </Phone>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="2. Click Distribution by Screen" />
            <div className="mt-3">
              <DataTable
                rowHeight={27}
                columns={[
                  { key: "screen", label: "Screen", className: "font-medium text-slate-800" },
                  {
                    key: "clicks",
                    label: "Clicks",
                    // The bars fade as the screens get quieter, as in the mockup.
                    render: (row, i) => (
                      <span className="flex items-center gap-2">
                        <span className="w-[52px] shrink-0">
                          <Meter
                            pct={row.bar}
                            height={3}
                            color={`rgba(91,63,240,${Math.max(0.35, 1 - i * 0.07).toFixed(2)})`}
                            track="transparent"
                          />
                        </span>
                        {row.clicks}
                      </span>
                    ),
                  },
                  { key: "pct", label: "Clicks (%)", align: "right" },
                  { key: "unique", label: "Unique Clicks", align: "right" },
                  { key: "time", label: "Avg. Time on Screen", align: "right" },
                ]}
                rows={screens}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="3. Top Clicked Elements" />
            <div className="mt-3">
              <DataTable
                rowHeight={27}
                columns={[
                  { key: "element", label: "Element", className: "font-medium text-slate-800" },
                  { key: "clicks", label: "Clicks", align: "right" },
                  { key: "pct", label: "Clicks (%)", align: "right" },
                ]}
                rows={elements}
              />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Journey / intensity / rage clicks / gestures             */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="4. User Click Flow (Journey)" subtitle="Most common click paths taken by users" />
            <ClickFlow />
          </Card>

          <Card className="p-4">
            <CardHeader title="5. Click Intensity by Area (All Screens)" />
            <div className="mt-3 flex items-center gap-4">
              <IntensityPhone />
              <div className="min-w-0 flex-1">
                <DataTable
                  rowHeight={30}
                  columns={[
                    {
                      key: "area",
                      label: "Area",
                      className: "text-slate-700",
                      render: (row) => (
                        <span className="flex items-center gap-2">
                          <span
                            className="grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full text-[8px] font-bold"
                            style={{ background: `${row.color}22`, color: row.color }}
                          >
                            {row.n}
                          </span>
                          {row.area}
                        </span>
                      ),
                    },
                    { key: "clicks", label: "Clicks", align: "right" },
                    { key: "pct", label: "Clicks (%)", align: "right" },
                  ]}
                  rows={areas}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="6. Rage Click Analysis" subtitle="Users who repeatedly clicked on same element" />
            <div className="mt-3">
              <DataTable
                rowHeight={26}
                columns={[
                  { key: "element", label: "Element", className: "font-medium text-slate-800" },
                  { key: "rage", label: "Rage Clicks", align: "right" },
                  { key: "affected", label: "Users Affected", align: "right" },
                ]}
                rows={rageClicks}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="7. Long Press & Gestures" />
            <div className="mt-3">
              <DataTable
                rowHeight={25}
                columns={[
                  { key: "gesture", label: "Gesture", className: "font-medium text-slate-800" },
                  { key: "users", label: "Users", align: "right" },
                  { key: "pct", label: "% of Users", align: "right" },
                ]}
                rows={gestures}
              />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Drop-off / behaviour / devices / insights                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="8. Click Drop-off Analysis" subtitle="Where users drop-off from after clicking" />
            <div className="mt-3">
              <DataTable
                rowHeight={27}
                columns={[
                  { key: "step", label: "Step", className: "font-medium text-slate-800" },
                  { key: "users", label: "Drop-off Users", align: "right" },
                  {
                    key: "rate",
                    label: "Drop-off Rate",
                    render: (row) => (
                      <span className="flex items-center gap-2">
                        <span className="w-[58px] shrink-0">
                          <Meter pct={(row.rate / maxDropOff) * 100} height={4} color={BRAND} track="transparent" />
                        </span>
                        <span>{row.rate}%</span>
                      </span>
                    ),
                  },
                ]}
                rows={dropOffs}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="9. Click Behavior by User Type"
              subtitle="Compare click behavior of different user segments"
            />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  <th />
                  {userTypes.map((type) => (
                    <th
                      key={type.key}
                      className={`pb-2.5 text-center font-medium text-slate-500 ${T.nano}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="h-[5px] w-[5px] rounded-full" style={{ background: type.color }} />
                        {type.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {behavior.map((row) => (
                  <tr key={row.metric} className="h-[27px]">
                    <td className={`whitespace-nowrap pr-2 text-slate-600 ${T.xs}`}>{row.metric}</td>
                    {userTypes.map((type) => (
                      <td key={type.key} className={`text-center font-medium text-slate-800 ${T.xs}`}>
                        {row[type.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader title="10. Device Click Comparison" />
            <div className="mt-3">
              <DataTable
                rowHeight={36}
                columns={[
                  { key: "device", label: "Device", className: "font-medium text-slate-800" },
                  { key: "clicks", label: "Avg. Clicks per Session", align: "center" },
                  {
                    key: "accuracy",
                    label: "Click Accuracy",
                    align: "center",
                    render: (row) => (
                      <span
                        className={`inline-block rounded-md px-3 py-[5px] font-semibold ${ACCURACY_TONES[row.tone]}`}
                      >
                        {row.accuracy}
                      </span>
                    ),
                  },
                  { key: "mistap", label: "Mis-tap Rate", align: "center" },
                ]}
                rows={devices}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="11. Top Insights" />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
              {insights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-3">
                    <span
                      className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md"
                      style={{ background: item.tint, color: item.color }}
                    >
                      <Icon size={12} />
                    </span>
                    <span className={`min-w-0 text-slate-700 ${T.xs}`}>{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Glossary                                                 */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-4 py-3">
          <CardHeader title="What do these metrics mean?" />
          <div className="mt-2 grid grid-cols-5 gap-3">
            {glossary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.term} className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full"
                    style={{ background: item.tint, color: item.color }}
                  >
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
