import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BadgePercent,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Construction,
  FileDown,
  Gift,
  House,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Scissors,
  ShieldOff,
  Star,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CARD, initials, toSpark } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Chip,
  Delta,
  Donut as BaseDonut,
  HeaderBell,
  HeaderSearch,
  HeatGrid as BaseHeatGrid,
  KpiTile as BaseKpiTile,
  RampLegend,
  Select as BaseSelect,
  SalonLogo,
  Sparkline,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Partner Details" mockup (Flash Unisex
// Salon, Overview tab), on a fixed DESIGN_WIDTH canvas that ScaledCanvas scales
// to the available width (see there for why bigger px sizes in T read smaller
// on screen).
//
// UI only for now - every number is static demo data matching the mockup, so
// the page shows the same salon whatever the URL. The live Partner Details page
// (details/PartnerDetails.jsx, route /partnerdetails/:id) is what this should be
// wired to: the profile card and the subscription / KYC / payout block come from
// the partner record (partnersSlice), the booking cards from bookingSlice, and
// the reviews card from reviewSlice. The sources with no backend yet are the
// per-source split ("Walk-in via GloUp", "WhatsApp / Link"), empty seat hours,
// the activity feed and the retention split. Only the Overview tab is in the
// mockup, so the other tabs show an empty state. The action buttons (Send
// Message, Create Offer, More Actions, the View All links) are inert;
// "Download Report" exports the Top Services table.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const BLUE = "#3B82F6";
const RED = "#EF4444";

// Measured card widths from the mockup, used directly as grid fr units.
const HERO_COLS = "grid-cols-[791fr_493fr]";
const ROW2_COLS = "grid-cols-[399fr_430fr_450fr]";
const ROW3_COLS = "grid-cols-[290fr_290fr_305fr_375fr]";
const ROW4_COLS = "grid-cols-[592fr_418fr_261fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1297px of content, so measured sizes carry over at ~1.17x.
const T = {
  micro: "text-[10px]", // heat map axis, legend
  tiny: "text-[11px]", // captions, KPI labels
  xs: "text-[12px]", // table cells, list sub-lines
  sm: "text-[13px]", // body
  title: "text-[14.5px]", // card titles
  stat: "text-[21px]", // in-card headline numbers
  kpi: "text-[23px]", // KPI values
  name: "text-[25px]", // partner name
};

const GAP = "gap-3";
const PAD = "p-4";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const partner = {
  name: "Flash Unisex Salon",
  address: "Poonamallee, Chennai, Tamil Nadu",
  phone: "8144004000",
  email: "flashsuresh85@gmail.com",
  type: "Unisex Salon",
  established: "Est. 2022",
  rating: 4.6,
  reviews: 128,
  code: "PAR438",
};

const account = [
  { label: "Partner Since", value: "Jan 18, 2023", note: "(1y 4m)" },
  { label: "Subscription Plan", value: "Premium – ₹999", note: "/ month", dot: true },
  { label: "Next Billing Date", value: "Jun 18, 2026" },
  { label: "KYC Status", chip: { text: "Verified", icon: CircleCheck } },
  { label: "Payout Status", chip: { text: "Active" } },
  { label: "Bank Account", value: "•••• 1234 (SBI)" },
];

const TABS = ["Overview", "Analytics", "Bookings", "Services", "Offers", "Performance", "Reviews", "Payouts", "Subscriptions", "Activity Log"];

const kpis = [
  { label: "Total Bookings", value: "482", delta: "18.5%", up: true, icon: CalendarCheck, color: "#2F6FE4", tint: "#E3EEFF" },
  { label: "Completed Bookings", value: "446", note: "92.5% Completion Rate", icon: CircleCheck, color: "#16A34A", tint: "#DDF5E7" },
  { label: "Total Revenue (GMV)", value: "₹1,95,620", delta: "22.7%", up: true, icon: IndianRupee, color: "#EA7A0C", tint: "#FFEBD2" },
  { label: "GloUp Commission", value: "₹19,562", note: "10% Commission", icon: IndianRupee, color: BRAND, tint: "#EEEAFD" },
  { label: "New Customers", value: "218", delta: "12.3%", up: true, icon: Users, color: "#2F6FE4", tint: "#E3EEFF" },
  // The mockup draws this one red although fewer empty hours is the better outcome.
  { label: "Empty Seat Hours", value: "142 hrs", delta: "9.2%", up: false, good: false, icon: Clock, color: RED, tint: "#FDE7E7" },
];

// 1 May – 29 May. `day` is numeric so the axis can tick on the 1st, 8th, ...
const bookingsTrend = [
  { day: 1, bookings: 16 },
  { day: 4, bookings: 38 },
  { day: 7, bookings: 49 },
  { day: 10, bookings: 26 },
  { day: 13, bookings: 58 },
  { day: 16, bookings: 33 },
  { day: 19, bookings: 59 },
  { day: 22, bookings: 30 },
  { day: 26, bookings: 80 },
  { day: 28, bookings: 66 },
  { day: 29, bookings: 61 },
];
const TREND_TICKS = [1, 8, 15, 22, 29];

const periodStats = [
  { label: "Today", value: "18", delta: "12%" },
  { label: "This Week", value: "126", delta: "15%" },
  { label: "This Month", value: "482", delta: "18.5%" },
  { label: "Last Month", value: "407" },
];

const revenueSpark = toSpark([6, 9, 7, 11, 8, 10, 7, 12, 9, 13, 10, 11]);

const revenueSplit = [
  { name: "Haircut", value: 45, color: INDIGO },
  { name: "Trim", value: 18, color: BLUE },
  { name: "Facial", value: 12, color: GREEN },
  { name: "Shave", value: 8, color: ORANGE },
  { name: "Others", value: 17, color: "#B8BFCE" },
];

const orderStats = [
  { label: "Average Order Value", value: "₹405", delta: "8.4%" },
  { label: "Highest Booking", value: "₹1,999", note: "May 21, 2026" },
  { label: "Total Services Sold", value: "912", delta: "16.2%" },
];

const topServices = [
  { name: "Haircut", bookings: 226, revenue: "89,480" },
  { name: "Haircut + Beard Trim", bookings: 98, revenue: "34,720" },
  { name: "Facial", bookings: 57, revenue: "21,280" },
  { name: "Shave", bookings: 36, revenue: "10,800" },
  { name: "De-Tan", bookings: 24, revenue: "8,640" },
];

const bookingSources = [
  { name: "GloUp App", pct: "72%", count: 347, color: INDIGO },
  { name: "Walk-in via GloUp", pct: "18%", count: 87, color: GREEN },
  { name: "WhatsApp / Link", pct: "6%", count: 29, color: "#22D3EE" },
  { name: "Others", pct: "4%", count: 19, color: "#B8BFCE" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Hourly columns from 6 AM to 12 AM, labelled every third hour.
const HOUR_LABELS = Array.from({ length: 19 }, (_, i) =>
  i % 3 === 0 ? ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"][i / 3] : ""
);
// Busy through the afternoon and early evening, busier at the weekend.
const HOUR_CURVE = [0.05, 0.08, 0.16, 0.3, 0.46, 0.62, 0.76, 0.84, 0.9, 0.96, 1, 0.92, 0.74, 0.54, 0.34, 0.2, 0.12, 0.07, 0.04];
const DAY_WEIGHT = [0.5, 0.68, 0.74, 0.8, 0.92, 1, 0.94];
const peakHours = DAY_WEIGHT.map((weight, r) =>
  HOUR_CURVE.map((v, c) => Math.min(1, +(v * weight * (0.9 + ((r * 7 + c * 3) % 5) * 0.05)).toFixed(2)))
);
const PEAK_RAMP = ["#EEF0FD", "#C7CCFA", "#8F95F2", "#5B5FE6", "#4338CA"];

const retention = [
  { name: "Returning Customers", count: 328, pct: 68, color: INDIGO },
  { name: "New Customers", count: 154, pct: 32, color: "#C9CEDB" },
];

const ratingBars = [
  { stars: 5, count: 84, pct: 66, color: GREEN },
  { stars: 4, count: 28, pct: 22, color: GREEN },
  { stars: 3, count: 10, pct: 8, color: ORANGE },
  { stars: 2, count: 4, pct: 3, color: "#F97316" },
  { stars: 1, count: 2, pct: 1, color: RED },
];

const recentBookings = [
  { name: "Arun Kumar", phone: "8526494059", service: "Haircut + Beard Trim", date: "May 30, 2026", time: "6:30 PM", amount: "₹299", status: "Completed", tint: "#E3EEFF", color: "#2F6FE4" },
  { name: "Vikram Raj", phone: "9786543210", service: "Facial", date: "May 30, 2026", time: "5:00 PM", amount: "₹699", status: "Completed", tint: "#FDE7EE", color: "#E5365F" },
  { name: "Manoj Kumar", phone: "9098765432", service: "Haircut", date: "May 30, 2026", time: "4:00 PM", amount: "₹149", status: "Upcoming", tint: "#FFF0DA", color: "#D97706" },
];
const STATUS_CHIP = {
  Completed: "bg-emerald-50 text-emerald-600",
  Upcoming: "bg-blue-50 text-blue-600",
};

const activity = [
  { icon: Tag, color: BRAND, title: "Offer Created", text: "Weekend Special – 20% OFF on Haircut", date: "May 29, 2026", time: "10:30 AM" },
  { icon: Scissors, color: "#16A34A", title: "New Service Added", text: "Hair Spa", date: "May 28, 2026", time: "04:15 PM" },
  { icon: Clock, color: "#2F6FE4", title: "Updated Service Timings", text: "Mon - Sun: 8:00 AM - 10:00 PM", date: "May 27, 2026", time: "11:20 AM" },
  { icon: Wallet, color: "#EA7A0C", title: "Payout Processed", text: "₹12,450 transferred to bank account", date: "May 26, 2026", time: "06:30 PM" },
];

const quickActions = [
  { icon: MessageSquare, label: "Send Message", color: BRAND },
  { icon: Gift, label: "Create Offer", color: BRAND },
  { icon: Star, label: "View Reviews", color: "#475569" },
  { icon: FileDown, label: "Download Report", color: "#475569" },
  { icon: BadgePercent, label: "Adjust Commission", color: "#475569" },
  { icon: ShieldOff, label: "Deactivate Partner", color: "#475569" },
];

const PERIODS = ["This Month", "Last Month", "Last 90 Days"];

const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.tiny} {...props} />;

const Select = ({ size = T.tiny, ...props }) => (
  <BaseSelect size={size} className="w-[104px] [&_select]:py-1" {...props} />
);

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.tiny, value: T.kpi, delta: T.xs, caption: T.tiny }}
    iconClass="h-[46px] w-[46px] rounded-full"
    iconSize={22}
    className="px-4 py-4"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    size={108}
    inner="68%"
    centerSize="text-[17px]"
    captionSize={T.micro}
    formatter={(value) => num(value)}
    {...props}
  />
);

const HeatGrid = (props) => (
  <BaseHeatGrid labelSize={T.micro} labelWidth={30} cellHeight={13} gap={2} radius={2} {...props} />
);

const ViewAll = ({ pill = false }) => (
  <button
    type="button"
    className={`font-semibold text-blue-600 hover:underline ${T.xs} ${
      pill ? "rounded-md border border-[#E6E8F0] bg-white px-3 py-1 hover:bg-slate-50 hover:no-underline" : ""
    }`}
  >
    View All
  </button>
);

// "↑ 18.5% vs Last Month" under a KPI value.
const VsLastMonth = ({ value, up, good }) => (
  <span className="inline-flex items-center gap-1.5">
    <Delta value={value} up={up} good={good} size={T.tiny} iconSize={11} />
    <span className="text-slate-500">vs Last Month</span>
  </span>
);

// Five stars with `rating` of them filled (4.6 fills the last one 60%).
const Stars = ({ rating, size = 16 }) => (
  <span className="relative inline-flex">
    <span className="flex gap-0.5 text-slate-200">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
    <span
      className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-amber-400"
      style={{ width: `${(rating / 5) * 100}%` }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />
      ))}
    </span>
  </span>
);

// Solid / outline action button with a trailing chevron.
const ActionButton = ({ icon, children, className = "", style }) => {
  const Icon = icon;
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition-opacity hover:opacity-90 ${T.xs} ${className}`}
      style={style}
    >
      <Icon size={14} className="shrink-0" />
      {children}
      <ChevronDown size={13} className="ml-1 shrink-0" />
    </button>
  );
};

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E3E7EF] bg-white px-3 py-2 shadow-lg">
      <p className={`font-bold text-slate-900 ${T.xs}`}>{label} May</p>
      <p className={`mt-1 text-slate-600 ${T.tiny}`}>
        Bookings: <span className="font-semibold text-slate-900">{payload[0].value}</span>
      </p>
    </div>
  );
};

const exportServices = () =>
  downloadCsv(
    "partner-top-services.csv",
    ["Service", "Bookings", "Revenue (INR)"],
    topServices.map((row) => [row.name, row.bookings, row.revenue.replace(/,/g, "")])
  );

// Search and bell live in the app bar, not the canvas.
const PageHeader = ({ query, setQuery }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center justify-end gap-5 pl-1 pr-4">
      <HeaderSearch
        value={query}
        onChange={setQuery}
        placeholder="Search by partner name, phone, city..."
        width={190}
        shortcut
      />
      <HeaderBell count={12} color={RED} />
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PartnerDetailsV2 = ({ title = "Partner Details" }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(TABS[0]);
  const [trendPeriod, setTrendPeriod] = useState(PERIODS[0]);
  const [revenuePeriod, setRevenuePeriod] = useState(PERIODS[0]);
  const [servicesPeriod, setServicesPeriod] = useState(PERIODS[0]);
  const [sourcePeriod, setSourcePeriod] = useState(PERIODS[0]);
  const [retentionPeriod, setRetentionPeriod] = useState(PERIODS[0]);

  return (
    <>
      <PageHeader query={query} setQuery={setQuery} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Breadcrumb + actions                                             */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-slate-600 ${T.xs}`}>
            <House size={14} className="text-slate-400" />
            <ChevronRight size={12} className="text-slate-300" />
            <button type="button" onClick={() => navigate("/partner")} className="hover:text-slate-900 hover:underline">
              Partners
            </button>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="font-medium text-slate-800">{title}</span>
          </nav>

          <div className="flex items-center gap-3">
            <ActionButton icon={Mail} className="text-white" style={{ background: BRAND }}>
              Send Message
            </ActionButton>
            <ActionButton icon={Gift} className="text-white" style={{ background: "#16A34A" }}>
              Create Offer
            </ActionButton>
            <ActionButton icon={CalendarDays} className="border border-[#E6E8F0] bg-white text-slate-700">
              More Actions
            </ActionButton>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Profile + account summary                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${HERO_COLS} ${GAP}`}>
          <div className={`flex min-w-0 items-center gap-5 px-5 py-4 ${CARD}`}>
            <SalonLogo name={partner.name} size={116} className="rounded-xl text-[34px]" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className={`font-extrabold tracking-tight text-slate-900 ${T.name}`}>{partner.name}</h1>
                <Chip size="px-2.5 py-[3px] text-[11px]" className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                  <span className="flex items-center gap-1">
                    <Star size={11} />
                    Premium Partner
                  </span>
                </Chip>
                <Chip size="px-2.5 py-[3px] text-[11px]" className="bg-emerald-50 text-emerald-600">
                  Active
                </Chip>
              </div>

              <p className={`mt-2 flex items-center gap-2 text-slate-600 ${T.sm}`}>
                <MapPin size={14} className="shrink-0 text-slate-500" />
                {partner.address}
              </p>

              <p className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 ${T.sm}`}>
                <span className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0 text-slate-500" />
                  {partner.phone}
                </span>
                <MessageCircle size={15} className="shrink-0 text-emerald-500" aria-label="WhatsApp" />
                <span className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-slate-500" />
                  {partner.email}
                </span>
              </p>

              <ul className={`mt-3 flex flex-wrap items-center gap-2 text-slate-600 ${T.tiny}`}>
                {[
                  { icon: Scissors, text: partner.type },
                  { icon: CalendarDays, text: partner.established },
                  { icon: Star, text: `${partner.rating} (${partner.reviews} Reviews)`, amber: true },
                  { text: `ID: ${partner.code}` },
                ].map(({ icon: Icon, text, amber }) => (
                  <li
                    key={text}
                    className="flex items-center gap-1.5 rounded-md border border-[#E6E8F0] bg-[#F8F9FC] px-2.5 py-1"
                  >
                    {Icon && (
                      <Icon
                        size={11}
                        className={amber ? "text-amber-400" : "text-slate-500"}
                        fill={amber ? "currentColor" : "none"}
                      />
                    )}
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`grid min-w-0 grid-cols-[1.1fr_1.15fr_1fr_0.75fr] content-center gap-x-5 gap-y-5 px-6 py-4 ${CARD}`}>
            {account.map((item) => (
              <div key={item.label} className="min-w-0">
                <p className={`flex items-center gap-1.5 whitespace-nowrap text-slate-500 ${T.tiny}`}>
                  {item.label}
                  {item.dot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </p>
                {item.chip ? (
                  <p className="mt-2">
                    <Chip size="px-2.5 py-[3px] text-[11px]" className="bg-emerald-50 text-emerald-600">
                      <span className="flex items-center gap-1">
                        {item.chip.icon && <item.chip.icon size={11} />}
                        {item.chip.text}
                      </span>
                    </Chip>
                  </p>
                ) : (
                  <p className={`mt-2 whitespace-nowrap font-semibold text-slate-900 ${T.sm}`}>
                    {item.value}
                    {item.note && <span className={`ml-1 font-normal text-slate-500 ${T.tiny}`}>{item.note}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tabs                                                             */}
        {/* ---------------------------------------------------------------- */}
        <div role="tablist" className="flex items-center gap-8 border-b border-[#E6E8F0]">
          {TABS.map((name) => {
            const active = name === tab;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(name)}
                className={`-mb-px border-b-2 px-1 pb-3 pt-1 font-medium transition-colors ${T.sm} ${
                  active
                    ? "border-[#5B3FF0] text-[#5B3FF0]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {tab !== TABS[0] ? (
          <Card className="items-center justify-center gap-2 py-24 text-center">
            <Construction size={26} className="text-slate-400" />
            <p className={`font-semibold text-slate-700 ${T.sm}`}>{tab}</p>
            <p className={`max-w-[360px] text-slate-500 ${T.xs}`}>
              This tab isn't part of the approved mockup yet. Only Overview is built.
            </p>
          </Card>
        ) : (
          <>
            {/* -------------------------------------------------------------- */}
            {/* KPI tiles                                                      */}
            {/* -------------------------------------------------------------- */}
            <div className={`grid grid-cols-6 ${GAP}`}>
              {kpis.map(({ icon, color, tint, delta, up, good, note, ...kpi }) => (
                <KpiTile
                  key={kpi.label}
                  {...kpi}
                  icon={icon}
                  iconColor={color}
                  iconTint={tint}
                  caption={delta ? <VsLastMonth value={delta} up={up} good={good} /> : note}
                />
              ))}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Row 2 - Trend / revenue / top services                         */}
            {/* -------------------------------------------------------------- */}
            <div className={`grid ${ROW2_COLS} ${GAP}`}>
              <Card className={PAD}>
                <CardHeader
                  title="Bookings Trend"
                  right={<Select value={trendPeriod} onChange={setTrendPeriod} options={PERIODS} />}
                />
                <div className="mt-2 min-h-[150px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bookingsTrend} margin={{ top: 8, right: 10, bottom: 0, left: -12 }}>
                      <defs>
                        <linearGradient id="pd-trend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={BRAND} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#EEF0F6" vertical={false} />
                      <XAxis
                        type="number"
                        dataKey="day"
                        domain={[1, 29]}
                        ticks={TREND_TICKS}
                        tickFormatter={(day) => `${day} May`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ ...AXIS, fontSize: 10 }}
                        dy={4}
                        padding={{ left: 6, right: 10 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        interval={0}
                        tickLine={false}
                        axisLine={false}
                        tick={{ ...AXIS, fontSize: 10 }}
                        width={36}
                      />
                      <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#CBD2E0", strokeDasharray: "3 3" }} />
                      <Area
                        type="linear"
                        dataKey="bookings"
                        stroke={BRAND}
                        strokeWidth={1.6}
                        fill="url(#pd-trend)"
                        dot={{ r: 2.4, fill: BRAND, strokeWidth: 0 }}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                  {periodStats.map((stat) => (
                    <div key={stat.label} className="min-w-0">
                      <p className={`text-slate-500 ${T.tiny}`}>{stat.label}</p>
                      <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{stat.value}</p>
                      {stat.delta && <Delta value={stat.delta} up size={T.tiny} iconSize={11} />}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className={PAD}>
                <CardHeader
                  title="Revenue Overview"
                  right={<Select value={revenuePeriod} onChange={setRevenuePeriod} options={PERIODS} />}
                />
                <div className="mt-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-slate-500 ${T.tiny}`}>Total Revenue (GMV)</p>
                    <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>₹1,95,620</p>
                    <p className={`mt-0.5 ${T.tiny}`}>
                      <VsLastMonth value="22.7%" up />
                    </p>
                    <div className="mt-2 w-[140px]">
                      <Sparkline
                        id="pd-revenue-spark"
                        data={revenueSpark}
                        color={GREEN}
                        height={28}
                        fillOpacity={0}
                        domain={["dataMin", "dataMax"]}
                      />
                    </div>
                  </div>

                  <Donut data={revenueSplit} />
                  <ul className="flex shrink-0 flex-col gap-2">
                    {revenueSplit.map((slice) => (
                      <li key={slice.name} className={`flex items-center gap-2 text-slate-700 ${T.tiny}`}>
                        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: slice.color }} />
                        <span className="w-[42px]">{slice.name}</span>
                        <span className="w-[26px] text-right text-slate-600">{slice.value}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                  {orderStats.map((stat) => (
                    <div key={stat.label} className="min-w-0">
                      <p className={`truncate text-slate-500 ${T.tiny}`}>{stat.label}</p>
                      <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.sm}`}>{stat.value}</p>
                      {stat.delta && <Delta value={stat.delta} up size={T.tiny} iconSize={11} />}
                      {stat.note && <p className={`text-slate-500 ${T.tiny}`}>{stat.note}</p>}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className={PAD}>
                <CardHeader
                  title="Top Services"
                  right={
                    <span className="flex items-center gap-3">
                      <Select value={servicesPeriod} onChange={setServicesPeriod} options={PERIODS} />
                      <ViewAll pill />
                    </span>
                  }
                />
                <div className="mt-3 flex-1 rounded-lg border border-[#E6E8F0] px-4 py-2">
                  <table className="w-full table-auto border-collapse text-left">
                    <thead>
                      <tr>
                        <th className={`py-2 font-semibold text-slate-800 ${T.tiny}`}>Service</th>
                        <th className={`py-2 text-right font-semibold text-slate-800 ${T.tiny}`}>Bookings</th>
                        <th className={`py-2 text-right font-semibold text-slate-800 ${T.tiny}`}>Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topServices.map((row) => (
                        <tr key={row.name} className="h-[27px]">
                          <td className={`text-slate-700 ${T.xs}`}>{row.name}</td>
                          <td className={`text-right text-slate-700 ${T.xs}`}>{row.bookings}</td>
                          <td className={`text-right text-slate-700 ${T.xs}`}>{row.revenue}</td>
                        </tr>
                      ))}
                      <tr className="h-[34px] border-t border-slate-100">
                        <td className={`font-bold text-slate-900 ${T.xs}`}>Total</td>
                        <td className={`text-right font-bold text-slate-900 ${T.xs}`}>912</td>
                        <td className={`text-right font-bold text-slate-900 ${T.xs}`}>1,95,620</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Row 3 - Source / peak hours / retention / ratings              */}
            {/* -------------------------------------------------------------- */}
            <div className={`grid ${ROW3_COLS} ${GAP}`}>
              <Card className={PAD}>
                <CardHeader
                  title="Booking Source"
                  right={<Select value={sourcePeriod} onChange={setSourcePeriod} options={PERIODS} />}
                />
                <div className="flex flex-1 items-center gap-3 pt-2">
                  <Donut data={bookingSources.map((s) => ({ name: s.name, value: s.count, color: s.color }))} center="482" caption="Total" />
                  <ul className="flex min-w-0 flex-1 flex-col gap-2">
                    {bookingSources.map((source) => (
                      <li key={source.name} className={`flex items-center gap-1.5 text-slate-700 ${T.tiny}`}>
                        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: source.color }} />
                        <span className="min-w-0 flex-1 truncate">{source.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-right text-slate-600">
                          {source.pct} ({source.count})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className={PAD}>
                <CardHeader
                  title={
                    <>
                      Peak Hours <span className="font-medium text-slate-500">(This Month)</span>
                    </>
                  }
                />
                <div className="mt-3 flex-1">
                  <HeatGrid
                    values={peakHours}
                    ramp={PEAK_RAMP}
                    rowLabels={WEEKDAYS}
                    colLabels={HOUR_LABELS}
                    labelsAt="bottom"
                    title={(r, c) => `${WEEKDAYS[r]} · ${Math.round(peakHours[r][c] * 100)}% of peak`}
                  />
                </div>
                <div className="pt-2">
                  <RampLegend ramp={PEAK_RAMP} from="Low" to="High" size={T.micro} width={140} height={6} />
                </div>
              </Card>

              <Card className={PAD}>
                <CardHeader
                  title="Customer Retention"
                  right={<Select value={retentionPeriod} onChange={setRetentionPeriod} options={PERIODS} />}
                />
                <div className="flex flex-1 items-center gap-4 pt-2">
                  <Donut
                    data={retention.map((r) => ({ name: r.name, value: r.count, color: r.color }))}
                    inner="62%"
                    center="68%"
                    caption="Returning"
                  />
                  <ul className="flex min-w-0 flex-1 flex-col gap-3">
                    {retention.map((row) => (
                      <li key={row.name} className={`flex items-center gap-2 text-slate-700 ${T.tiny}`}>
                        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: row.color }} />
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-slate-600">
                          {row.count} ({row.pct}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card className={PAD}>
                <CardHeader title="Ratings & Reviews" right={<ViewAll />} />
                <div className="flex flex-1 items-center gap-6 pt-2">
                  <div className="flex shrink-0 flex-col items-center">
                    <p className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900">{partner.rating}</p>
                    <div className="mt-2">
                      <Stars rating={partner.rating} />
                    </div>
                    <p className={`mt-2 text-slate-500 ${T.tiny}`}>{partner.reviews} Reviews</p>
                  </div>

                  <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
                    {ratingBars.map((row) => (
                      <li key={row.stars} className={`flex items-center gap-2 text-slate-600 ${T.tiny}`}>
                        <span className="flex w-[22px] shrink-0 items-center gap-0.5">
                          {row.stars}
                          <Star size={10} className="text-amber-400" fill="currentColor" strokeWidth={0} />
                        </span>
                        <span className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEF0F6]">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${row.pct}%`, background: row.color }}
                          />
                        </span>
                        <span className="w-[56px] shrink-0 whitespace-nowrap text-right">
                          {row.count} ({row.pct}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Row 4 - Recent bookings / activity / quick actions             */}
            {/* -------------------------------------------------------------- */}
            <div className={`grid ${ROW4_COLS} ${GAP}`}>
              <Card className={PAD}>
                <CardHeader title="Recent Bookings" right={<ViewAll pill />} />
                <ul className="mt-2 flex flex-1 flex-col justify-around">
                  {recentBookings.map((row) => (
                    <li
                      key={row.phone}
                      className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.35fr)_minmax(0,1.1fr)_60px_88px] items-center gap-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${T.xs}`}
                          style={{ background: row.tint, color: row.color }}
                        >
                          {initials(row.name)}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>{row.name}</span>
                          <span className={`block text-slate-500 ${T.tiny}`}>{row.phone}</span>
                        </span>
                      </span>
                      <span className={`truncate text-slate-700 ${T.xs}`}>{row.service}</span>
                      <span className={`text-slate-700 ${T.xs}`}>
                        <span className="block">{row.date}</span>
                        <span className={`block text-slate-500 ${T.tiny}`}>{row.time}</span>
                      </span>
                      <span className={`font-semibold text-slate-900 ${T.xs}`}>{row.amount}</span>
                      <Chip size="px-3 py-1 text-center text-[11px]" className={STATUS_CHIP[row.status]}>
                        {row.status}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className={PAD}>
                <CardHeader
                  title={
                    <>
                      Partner Activity <span className="font-medium text-slate-500">(Last 7 Days)</span>
                    </>
                  }
                  right={<ViewAll pill />}
                />
                <ul className="mt-2 flex flex-1 flex-col justify-around gap-2">
                  {activity.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.title} className="flex items-center gap-3">
                        <span
                          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-[1.5px]"
                          style={{ borderColor: item.color, color: item.color, background: `${item.color}14` }}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>{item.title}</span>
                          <span className={`block truncate text-slate-500 ${T.tiny}`}>{item.text}</span>
                        </span>
                        <span className={`shrink-0 text-right text-slate-500 ${T.micro}`}>
                          <span className="block">{item.date}</span>
                          <span className="block">{item.time}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card className={PAD}>
                <CardHeader title="Quick Actions" />
                <ul className="mt-2 flex flex-1 flex-col justify-around">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <li key={action.label}>
                        <button
                          type="button"
                          onClick={action.label === "Download Report" ? exportServices : undefined}
                          className={`flex w-full items-center gap-3 rounded-md py-1.5 text-slate-800 transition-colors hover:bg-slate-50 ${T.xs}`}
                        >
                          <Icon size={15} className="shrink-0" style={{ color: action.color }} />
                          <span className="flex-1 text-left">{action.label}</span>
                          <ChevronRight size={14} className="shrink-0 text-slate-400" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </>
        )}
      </ScaledCanvas>
    </>
  );
};

export default PartnerDetailsV2;
