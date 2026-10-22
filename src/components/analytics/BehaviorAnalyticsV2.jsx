import { useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleDollarSign,
  CircleDot,
  Clock,
  ClipboardCheck,
  Crown,
  Download,
  Droplets,
  Eye,
  Flower2,
  Gem,
  Gift,
  Hand,
  Heart,
  Hourglass,
  LayoutGrid,
  MonitorSmartphone,
  Moon,
  PersonStanding,
  Repeat,
  Scale,
  Scissors,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Sparkles,
  Store,
  Ticket,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, toSpark as spark } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  LiveStamp,
  Meter,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Advanced Behavior Analytics" mockup, on a
// fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the available width
// (see there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. No
// backend source exists yet: booking frequency could come from the bookings
// API, but intent signals (compared prices, time on service details), journey
// speed, drop-off reasons, lifestyle segments and the live timeline all need
// the apps to report behaviour events first. The "AI Driven" segments are a
// placeholder for a model that doesn't exist yet. The header pickers hold local
// state only.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const BLUE = "#2E7CF6";
const GREEN = "#22B573";
const AMBER = "#F5A524";
const PINK = "#F0507A";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[430fr_464fr_435fr]";
const ROW3_COLS = "grid-cols-[430fr_442fr_452fr]";
const ROW4_COLS = "grid-cols-[430fr_368fr_532fr]";
const ROW5_COLS = "grid-cols-[512fr_380fr_432fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1349px of content, so measured sizes carry over at ~1.13x.
const T = {
  nano: "text-[8.5px]", // column headers, sub-lines
  micro: "text-[9.5px]", // notes, subtitles
  xs: "text-[10px]", // table cells
  sm: "text-[11px]", // legend rows, links
  title: "text-[13px]", // card titles
  kpi: "text-[21px]", // KPI values
  donut: "text-[17px]", // donut centre total
};

const GAP = "gap-3";
const COMPARE = "vs May 14 – May 20";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

// A fixed wavy upward series for the KPI sparklines (no randomness).
const trend = (seed, slope = 0.45, amp = 1.1) =>
  spark(
    Array.from({ length: 18 }, (_, i) =>
      +(10 + slope * i + amp * Math.sin(i * 1.9 + seed) + 0.6 * Math.sin(i * 0.8 + seed * 2)).toFixed(2)
    )
  );

const kpis = [
  { label: "Total Users", value: "1,36,729", delta: "17.2%", icon: Users, color: "#6D4AE0", tint: "#EEEAFD", line: INDIGO, trend: trend(1) },
  { label: "Active Users (DAU)", value: "28,450", delta: "12.7%", icon: UserCheck, color: "#16A34A", tint: "#DCFCE7", line: GREEN, trend: trend(2.2) },
  { label: "Sessions", value: "2,98,540", delta: "15.8%", icon: ShoppingCart, color: "#EA580C", tint: "#FFEDD5", line: "#F59E0B", trend: trend(3.4) },
  { label: "Avg. Session Duration", value: "2m 34s", delta: "10.4%", icon: Clock, color: "#E11D48", tint: "#FFE4E6", line: "#EC4899", trend: trend(4.1) },
  { label: "Services Viewed", value: "3,25,760", delta: "13.6%", icon: Eye, color: "#2563EB", tint: "#DBEAFE", line: BLUE, trend: trend(5.3) },
  { label: "Bookings Completed", value: "22,680", delta: "17.9%", icon: ClipboardCheck, color: "#6D4AE0", tint: "#EEEAFD", line: INDIGO, trend: trend(6.6) },
];

const frequency = [
  { name: "1 time / month", value: 51340, pct: "37.5%", color: BRAND },
  { name: "2 times / month", value: 38620, pct: "28.2%", color: BLUE },
  { name: "3 times / month", value: 22810, pct: "16.7%", color: GREEN },
  { name: "4+ times / month", value: 12450, pct: "9.1%", color: AMBER },
  { name: "Irregular", value: 11509, pct: "8.4%", color: PINK },
];

const segments = [
  { name: "Basic Grooming", sub: "(Haircut, Trim, Shave)", icon: Scissors, color: "#2563EB", tint: "#DBEAFE", users: "72,340", share: "52.9%", aov: "₹249" },
  { name: "Face Care", sub: "(Facial, Clean up, D-Tan)", icon: Smile, color: "#EA580C", tint: "#FFEDD5", users: "28,540", share: "20.8%", aov: "₹799" },
  { name: "Relaxation", sub: "(Massage, Spa, Head Massage)", icon: Flower2, color: "#16A34A", tint: "#DCFCE7", users: "19,230", share: "14.1%", aov: "₹1,249" },
  { name: "Premium Care", sub: "(Advanced Hair, Skin, Spa)", icon: Gem, color: "#E11D48", tint: "#FFE4E6", users: "11,620", share: "8.5%", aov: "₹1,899" },
  // The mockup's Users cell for this row is cut off ("5, -"); this is the remainder.
  { name: "Others", icon: LayoutGrid, color: "#64748B", tint: "#EEF1F6", users: "4,999", share: "3.7%", aov: "₹599" },
];

const intent = [
  { icon: Search, color: "#2563EB", tint: "#DBEAFE", label: "Viewed 3+ salons", count: "41,250", pct: "30.1%" },
  { icon: Scale, color: "#6D4AE0", tint: "#EDE9FE", label: "Compared prices", count: "38,620", pct: "28.2%" },
  { icon: Timer, color: "#E11D48", tint: "#FFE4E6", label: "Spent > 3 min on service details", count: "32,410", pct: "23.7%" },
  { icon: ShoppingCart, color: "#EA580C", tint: "#FFEDD5", label: "Added to cart but not booked", count: "24,890", pct: "18.2%" },
  { icon: Ticket, color: "#16A34A", tint: "#DCFCE7", label: "Checked offers & coupons", count: "29,340", pct: "21.4%" },
];

// Counts add up to the 1,36,729 total; the mockup's last percentage (6.6%) is
// kept as drawn.
const pricing = [
  { name: "Compare prices (2+ salons)", value: 46280, pct: "33.8%", color: BRAND },
  { name: "Filter by price (Low to High)", value: 39450, pct: "28.8%", color: BLUE },
  { name: "Look for offers / discounts", value: 31870, pct: "23.3%", color: GREEN },
  { name: "Sort by rating first", value: 12980, pct: "9.5%", color: AMBER },
  { name: "No comparison behavior", value: 6149, pct: "6.6%", color: PINK },
];

const timeSpent = [
  { label: "0 – 30 sec", pct: 18.7 },
  { label: "30 sec – 1 min", pct: 22.1 },
  { label: "1 – 2 min", pct: 25.4 },
  { label: "2 – 5 min", pct: 20.6 },
  { label: "5 – 10 min", pct: 9.7 },
  { label: "10+ min", pct: 3.5 },
];

const highValue = [
  { name: "Head Massage", icon: Hand, color: "#E11D48", tint: "#FFE4E6", users: "15,620", aov: "₹1,299", repeat: "46.5%" },
  { name: "Spa", icon: Flower2, color: "#2563EB", tint: "#DBEAFE", users: "12,340", aov: "₹2,199", repeat: "42.1%" },
  { name: "Full Body Massage", icon: PersonStanding, color: "#4F46E5", tint: "#E0E7FF", users: "9,850", aov: "₹2,499", repeat: "41.7%" },
  { name: "Keratin Treatment", icon: Sparkles, color: "#16A34A", tint: "#DCFCE7", users: "6,780", aov: "₹3,199", repeat: "38.6%" },
  { name: "Hair Spa", icon: Droplets, color: "#16A34A", tint: "#DCFCE7", users: "18,230", aov: "₹1,149", repeat: "45.9%" },
];

const GAUGE_VALUE = 62.4;
const speed = [
  { name: "Fast Bookers (< 2 min)", pct: "62.4%", color: GREEN },
  { name: "Medium (2 – 5 min)", pct: "27.6%", color: AMBER },
  { name: "Slow (> 5 min)", pct: "10.0%", color: PINK },
];

const reasons = [
  { label: "Price too high", pct: 43.9 },
  { label: "Found better offer", pct: 22.1 },
  { label: "Too many options", pct: 13.8 },
  { label: "Not convinced / trust issue", pct: 10.7 },
  { label: "Will book later", pct: 9.5 },
];

const lifestyle = [
  { name: "Busy Professionals", icon: Briefcase, color: "#16A34A", tint: "#DCFCE7", users: "46,230 (33.8%)", traits: "Books late night, weekend", best: "8 PM – 11 PM" },
  { name: "Regular Maintainers", icon: CalendarClock, color: "#2563EB", tint: "#DBEAFE", users: "38,620 (28.2%)", traits: "Books every 2–3 weeks", best: "6 PM – 9 PM" },
  { name: "Self Care Lovers", icon: Heart, color: "#E11D48", tint: "#FFE4E6", users: "27,410 (20.0%)", traits: "High spend, tries new services", best: "11 AM – 2 PM" },
  { name: "Occasional Users", icon: Hourglass, color: "#EA580C", tint: "#FFEDD5", users: "24,469 (17.9%)", traits: "Books rarely, price sensitive", best: "Offers / Weekends" },
];

const timeline = [
  { time: "10:02 AM", name: "Search Salon", sub: "Anna Nagar", icon: Search, color: "#2563EB", tint: "#E0EBFF" },
  { time: "10:05 AM", name: "Viewed Salon", sub: "Looks & Style", icon: Store, color: "#6D4AE0", tint: "#EDE9FE" },
  { time: "10:07 AM", name: "Viewed Service", sub: "Haircut", icon: ShoppingBag, color: "#6D4AE0", tint: "#EDE9FE" },
  { time: "10:09 AM", name: "Add to Cart", sub: "Haircut – ₹49", icon: ShoppingCart, color: "#E11D48", tint: "#FFE4E6" },
  { time: "10:12 AM", name: "Apply Coupon", sub: "GLOUP20", icon: Ticket, color: "#16A34A", tint: "#DCFCE7" },
  { time: "10:14 AM", name: "Booking", sub: "Confirmed", icon: CalendarCheck, color: "#2563EB", tint: "#DBEAFE" },
];

const opportunities = [
  { icon: Eye, color: "#2563EB", tint: "#E0EBFF", text: "Users who viewed Spa but not booked", count: "12,430", action: "Send Spa Offer" },
  { icon: ShoppingCart, color: "#EA580C", tint: "#FFEDD5", text: "Users who added to cart but not booked", count: "24,890", action: "Send Reminder" },
  { icon: Scale, color: "#E11D48", tint: "#FFE4E6", text: "Users who compare prices frequently", count: "38,620", action: "Send Best Price" },
  { icon: Moon, color: "#16A34A", tint: "#DCFCE7", text: "Users inactive for 7+ days", count: "42,180", action: "Win-back Offer" },
];

const keyInsights = [
  { icon: Repeat, text: "37.5% of users book only once a month – focus on repeat bookings." },
  { icon: CircleDollarSign, text: "Price is a concern for 43.9% users who drop-off." },
  { icon: Crown, text: "Head Massage & Spa lovers have highest repeat rate." },
  { icon: Clock, text: "Best time to engage Busy Professionals is 8 PM – 11 PM." },
  { icon: Gift, text: "Personalized offers can convert 24,890+ potential bookings." },
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const PLATFORMS = [{ value: "all", label: "Platforms" }, "Android", "iOS", "Web"];
const CHANNELS = [{ value: "all", label: "All Channels" }, "Organic", "Paid", "Referral"];

const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

// "1. Booking Frequency (Per Month)": the bracketed part is lighter and smaller.
const Title = ({ index, children, aside }) => (
  <>
    {index}. {children}
    {aside && <span className={`ml-1 font-medium text-slate-500 ${T.micro}`}>{aside}</span>}
  </>
);

const ViewAll = () => (
  <button type="button" className={`font-semibold text-blue-600 hover:underline ${T.sm}`}>
    View All
  </button>
);

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.xs, value: T.kpi, delta: T.sm, caption: T.xs }}
    iconClass="h-[42px] w-[42px] rounded-full"
    iconSize={20}
    sparkHeight={38}
    caption={COMPARE}
    up
    className="px-4 pb-2.5 pt-3.5"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    inner="56%"
    centerSize={T.donut}
    captionSize={T.nano}
    formatter={(value) => num(value)}
    {...props}
  />
);

// Footer strip under a card: grey for plain notes, green for a recommendation.
const Note = ({ tone = "gray", children, className = "" }) => (
  <p
    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${T.micro} ${
      tone === "green"
        ? "border-emerald-100 bg-emerald-50/70 text-emerald-700"
        : "border-[#E9ECF4] bg-[#F7F8FC] text-slate-600"
    } ${className}`}
  >
    {tone === "green" && <CircleCheck size={12} className="shrink-0 text-emerald-500" />}
    {children}
  </p>
);

const IconTile = ({ icon, color, tint, size = 27 }) => {
  const Icon = icon;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg"
      style={{ width: size, height: size, background: tint, color }}
    >
      <Icon size={Math.round(size * 0.56)} />
    </span>
  );
};

// Donut legend row: dot, name, then "count (pct)".
const CountLegend = ({ data, gap = "gap-[15px]" }) => (
  <ul className={`flex min-w-0 flex-1 flex-col ${gap}`}>
    {data.map((row) => (
      <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
        <span className="shrink-0 whitespace-nowrap text-slate-600">
          {num(row.value)} <span className="text-slate-500">({row.pct})</span>
        </span>
      </li>
    ))}
  </ul>
);

// Semicircle gauge: four colour bands and a needle at `value` (0-100).
const GAUGE = { cx: 70, cy: 70, r: 54, stroke: 14 };
const BANDS = [
  { from: 180, to: 134, color: "#F0507A" },
  { from: 135, to: 89, color: "#F5933A" },
  { from: 90, to: 44, color: "#F7C233" },
  { from: 45, to: 0, color: "#22B573" },
];
const polar = (deg, radius) => [
  GAUGE.cx + radius * Math.cos((deg * Math.PI) / 180),
  GAUGE.cy - radius * Math.sin((deg * Math.PI) / 180),
];
const arcPath = (from, to) => {
  const [x1, y1] = polar(from, GAUGE.r);
  const [x2, y2] = polar(to, GAUGE.r);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${GAUGE.r},${GAUGE.r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
};

const Gauge = ({ value }) => {
  const [nx, ny] = polar(180 - (value / 100) * 180, GAUGE.r - 12);
  return (
    <svg viewBox="0 0 140 80" className="h-[84px] w-[147px] shrink-0" role="img" aria-label={`${value}% fast bookers`}>
      {BANDS.map((band) => (
        <path
          key={band.color}
          d={arcPath(band.from, band.to)}
          fill="none"
          stroke={band.color}
          strokeWidth={GAUGE.stroke}
        />
      ))}
      <line x1={GAUGE.cx} y1={GAUGE.cy} x2={nx} y2={ny} stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={GAUGE.cx} cy={GAUGE.cy} r="4" fill="#1F2937" />
    </svg>
  );
};

const exportSegments = () =>
  downloadCsv(
    "service-preference-segments.csv",
    ["Segment", "Users", "% of Users", "Avg. Order Value (INR)"],
    segments.map((row) => [row.name, row.users, row.share, row.aov.replace("₹", "")])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, platform, setPlatform, channel, setChannel }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Deep insights into user intent, preferences and patterns
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
          icon={CircleDot}
          label="Channel"
          value={channel}
          onChange={setChannel}
          options={CHANNELS}
          className="hidden xl:flex"
        />
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={exportSegments}>
          <span className="hidden md:inline">Export Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BehaviorAnalyticsV2 = ({ title = "Advanced Behavior Analytics" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [platform, setPlatform] = useState("all");
  const [channel, setChannel] = useState("all");

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        setRange={setRange}
        platform={platform}
        setPlatform={setPlatform}
        channel={channel}
        setChannel={setChannel}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, line, trend: series, ...kpi }) => (
            <KpiTile
              key={kpi.label}
              {...kpi}
              icon={icon}
              iconColor={color}
              iconTint={tint}
              spark={series}
              sparkColor={line}
              sparkId={`ba-kpi-${kpi.label.replace(/\W/g, "")}`}
            />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Frequency / service segments / high intent               */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={<Title index={1} aside="(Per Month)">Booking Frequency</Title>}
              subtitle="Understand how often users book services"
            />
            <div className="mt-3 flex flex-1 items-center gap-5">
              <Donut data={frequency} size={150} center="1,36,729" caption="Total Users" />
              <CountLegend data={frequency} />
            </div>
            <Note className="mt-3">
              37.5% of users book only once a month. Increase repeat bookings with reminders &amp; offers.
            </Note>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={2}>Service Preference Segments</Title>}
              subtitle="What type of services do users prefer?"
              right={<ViewAll />}
            />
            <table className="mt-3 w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "46%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Segment</th>
                  <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Users</th>
                  <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>% of Users</th>
                  <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Avg. Order Value</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((row) => (
                  <tr key={row.name} className="h-[34px] border-t border-slate-50">
                    <td className="pr-2">
                      <span className="flex items-center gap-2.5">
                        <IconTile icon={row.icon} color={row.color} tint={row.tint} size={28} />
                        <span className="min-w-0 leading-tight">
                          <span className={`block font-semibold text-slate-800 ${T.xs}`}>{row.name}</span>
                          {row.sub && <span className={`block truncate text-slate-500 ${T.nano}`}>{row.sub}</span>}
                        </span>
                      </span>
                    </td>
                    <td className={`text-center text-slate-700 ${T.xs}`}>{row.users}</td>
                    <td className={`text-center text-slate-700 ${T.xs}`}>{row.share}</td>
                    <td className={`text-center font-medium text-slate-800 ${T.xs}`}>{row.aov}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={3} aside="(Likely to Book)">High Intent Behavior</Title>}
              subtitle="Users who showed strong booking intent"
              right={<ViewAll />}
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-1">
              {intent.map((row) => (
                <li key={row.label} className="flex items-center gap-3">
                  <IconTile icon={row.icon} color={row.color} tint={row.tint} size={24} />
                  <span className={`min-w-0 flex-1 truncate text-slate-700 ${T.xs}`}>{row.label}</span>
                  <span className={`shrink-0 whitespace-nowrap ${T.xs}`}>
                    <span className="font-semibold text-slate-800">{row.count}</span>
                    <span className="ml-1 text-slate-500">({row.pct})</span>
                  </span>
                </li>
              ))}
            </ul>
            <Note tone="green" className="mt-3">
              Send personalized offers to high-intent users to convert them.
            </Note>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Price sensitivity / time spent / high-value services     */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={<Title index={4}>Price Sensitivity &amp; Comparison Behavior</Title>}
              subtitle="How users react to pricing"
            />
            <div className="mt-3 flex flex-1 items-center gap-5">
              <Donut data={pricing} size={124} center="1,36,729" caption="Total Users" />
              <CountLegend data={pricing} />
            </div>
            <Note className="mt-3">62.6% of users compare prices or look for discounts before booking.</Note>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={5}>Time Spent Before Booking</Title>}
              subtitle="How long users think before booking"
            />
            <div className="mt-2 min-h-[108px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSpent} margin={{ top: 20, right: 6, bottom: 0, left: 6 }}>
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 9.5 }}
                    interval={0}
                    dy={4}
                  />
                  <YAxis hide domain={[0, 28]} />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(91,63,240,0.05)" }} formatter={(v) => `${v}%`} />
                  <Bar dataKey="pct" name="Users" fill={BRAND} radius={[3, 3, 0, 0]} barSize={38}>
                    <LabelList
                      dataKey="pct"
                      position="top"
                      offset={5}
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: 10, fontWeight: 600, fill: "#0F172A" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Note className="mt-2">25.4% of users take 1–2 minutes before making a booking decision.</Note>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={6}>High Value Service Lovers</Title>}
              subtitle="Users who prefer high ticket services"
              right={<ViewAll />}
            />
            <table className="mt-3 w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "36%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Top Services</th>
                  <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Users</th>
                  <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Avg. Order Value</th>
                  <th className={`pb-2 text-center font-medium text-slate-500 ${T.nano}`}>Repeat Rate</th>
                </tr>
              </thead>
              <tbody>
                {highValue.map((row) => (
                  <tr key={row.name} className="h-[30px]">
                    <td className="pr-2">
                      <span className="flex items-center gap-2.5">
                        <IconTile icon={row.icon} color={row.color} tint={row.tint} size={24} />
                        <span className={`min-w-0 truncate font-medium text-slate-800 ${T.xs}`}>{row.name}</span>
                      </span>
                    </td>
                    <td className={`text-center text-slate-700 ${T.xs}`}>{row.users}</td>
                    <td className={`text-center text-slate-700 ${T.xs}`}>{row.aov}</td>
                    <td className={`text-center text-slate-700 ${T.xs}`}>{row.repeat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Journey speed / drop-off reasons / lifestyle segments     */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW4_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={<Title index={7}>User Journey Speed</Title>}
              subtitle="How fast users move to booking"
            />
            <div className="mt-2 flex flex-1 items-center gap-5">
              <div className="flex shrink-0 flex-col items-center">
                <Gauge value={GAUGE_VALUE} />
                <p className="mt-1 text-[16px] font-extrabold leading-none tracking-tight text-slate-900">
                  62.4%
                </p>
                <p className={`mt-1 text-slate-600 ${T.xs}`}>Fast Bookers</p>
                <p className={`text-slate-400 ${T.nano}`}>(&lt; 2 min to book)</p>
              </div>

              <div className="min-w-0 flex-1">
                <ul className="flex flex-col gap-[14px]">
                  {speed.map((row) => (
                    <li key={row.name} className={`flex items-center gap-2 ${T.xs}`}>
                      <span
                        className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full"
                        style={{ background: `${row.color}33` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.color }} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                      <span className="shrink-0 font-semibold text-slate-800">{row.pct}</span>
                    </li>
                  ))}
                </ul>
                <Note tone="green" className="mt-3">
                  Fast bookers have 2.3x higher repeat rate.
                </Note>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={8} aside="(Behavior Based)">Drop-off Reasons</Title>}
              subtitle="Why users leave without booking"
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-1.5">
              {reasons.map((row) => (
                <li key={row.label} className={`flex items-center gap-3 ${T.xs}`}>
                  <span className="w-[134px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                  <span className="min-w-0 flex-1">
                    <Meter
                      pct={(row.pct / reasons[0].pct) * 100}
                      color="linear-gradient(90deg,#8B74F5,#5B3FF0)"
                      height={4}
                      track="transparent"
                    />
                  </span>
                  <span className="w-[34px] shrink-0 text-right text-slate-600">{row.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={9} aside="(AI Driven)">User Lifestyle Segments</Title>}
              subtitle="AI identified lifestyle segments based on behavior"
              right={<ViewAll />}
            />
            <table className="mt-3 w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "21%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Segment</th>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Users</th>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Top Traits</th>
                  <th className={`pb-2 font-medium text-slate-500 ${T.nano}`}>Best Time to Engage</th>
                </tr>
              </thead>
              <tbody>
                {lifestyle.map((row) => (
                  <tr key={row.name} className="h-[28px]">
                    <td className="pr-2">
                      <span className="flex items-center gap-2">
                        <IconTile icon={row.icon} color={row.color} tint={row.tint} size={22} />
                        <span className={`min-w-0 truncate font-medium text-slate-800 ${T.xs}`}>{row.name}</span>
                      </span>
                    </td>
                    <td className={`whitespace-nowrap pr-2 text-slate-700 ${T.xs}`}>{row.users}</td>
                    <td className={`truncate pr-2 text-slate-600 ${T.xs}`}>{row.traits}</td>
                    <td className={`whitespace-nowrap text-slate-700 ${T.xs}`}>{row.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Timeline / push opportunities / key insights             */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={<Title index={10} aside="(Real-time)">Behavior Timeline</Title>}
              subtitle="Live user actions in last 30 minutes"
            />
            <div className="relative mt-4 flex flex-1 items-start justify-between">
              {/* The connector runs behind the six icons. */}
              <span className="absolute left-[8%] right-[8%] top-[18px] h-px bg-slate-200" />
              {timeline.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.time} className="relative flex w-[16.6%] min-w-0 flex-col items-center text-center">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-full border bg-white"
                      style={{ borderColor: `${step.color}55`, color: step.color, background: step.tint }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className={`mt-3 text-slate-500 ${T.nano}`}>{step.time}</span>
                    <span className={`mt-1.5 font-semibold text-slate-800 ${T.xs}`}>{step.name}</span>
                    <span className={`text-slate-500 ${T.nano}`}>{step.sub}</span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className={`mt-3 flex items-center justify-end gap-1.5 self-end font-semibold hover:underline ${T.sm}`}
              style={{ color: BRAND }}
            >
              View All Activities
              <ArrowRight size={12} />
            </button>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={<Title index={11}>Push &amp; Offer Opportunities</Title>}
              subtitle="Personalized opportunities based on behavior"
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-1">
              {opportunities.map((row) => (
                <li key={row.text} className="flex items-center gap-2.5">
                  <IconTile icon={row.icon} color={row.color} tint={row.tint} size={22} />
                  <span className={`min-w-0 flex-1 truncate text-slate-700 ${T.xs}`}>{row.text}</span>
                  <span className={`w-[38px] shrink-0 text-right font-semibold text-slate-800 ${T.xs}`}>
                    {row.count}
                  </span>
                  <button
                    type="button"
                    className={`w-[78px] shrink-0 text-right font-semibold hover:underline ${T.nano}`}
                    style={{ color: INDIGO }}
                  >
                    {row.action}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex min-w-0 flex-col rounded-2xl border border-[#E6E8F0] bg-gradient-to-br from-[#F5F4FE] to-[#F8F7FF] p-4">
            <h2 className={`font-bold tracking-tight text-slate-900 ${T.title}`}>
              <Title index={12}>Key Insights</Title>
            </h2>
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-1">
              {keyInsights.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.text} className="flex items-center gap-2.5">
                    <span className="grid h-[21px] w-[21px] shrink-0 place-items-center rounded-md bg-[#E9E5FC] text-[#6D4AE0]">
                      <Icon size={11} />
                    </span>
                    <span className={`min-w-0 text-slate-700 ${T.xs}`}>{row.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default BehaviorAnalyticsV2;
