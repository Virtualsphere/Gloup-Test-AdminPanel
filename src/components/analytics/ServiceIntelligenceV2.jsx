import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Boxes,
  Brush,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  Crown,
  Download,
  Droplets,
  Ellipsis,
  FlaskConical,
  Footprints,
  Gift,
  Hand,
  Heart,
  MapPin,
  Palette,
  ReceiptIndianRupee,
  Scissors,
  Smile,
  Sparkles,
  Sun,
  Tag,
  Ticket,
  TrendingUp,
  TriangleAlert,
  Users,
  Wind,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  HeatGrid as BaseHeatGrid,
  InsightTile,
  KpiTile as BaseKpiTile,
  LegendDot,
  Meter,
  RampLegend,
  Segmented as BaseSegmented,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Service Intelligence Dashboard" mockup, on
// a fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the available width
// (see there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. The
// store-service and booking APIs (see Services.jsx / StoreServices.jsx and
// bookingSlice) carry the service per booking, so the ranking tables, the
// category split and the add-on table are the first cards that could be wired;
// the price / time / repeat-rate cards need aggregation the backend doesn't
// expose. The date, city, category and "By ..." pickers hold local state only.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B3FF0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const RED = "#EF4444";
const BLUE = "#3B82F6";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW_COLS = "grid-cols-[460fr_392fr_450fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1327px of content, so measured sizes carry over at ~1.15x.
const T = {
  nano: "text-[9.5px]", // column headers
  micro: "text-[10px]", // toggles, captions
  xs: "text-[10.5px]", // table cells
  sm: "text-[11.5px]", // legend, tile text
  title: "text-[14px]", // card titles
  kpi: "text-[21px]", // KPI values
  donut: "text-[19px]", // donut centre total
};

const GAP = "gap-3";
const COMPARE = "vs May 14 – May 20";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  { label: "Total Bookings", value: "25,000", delta: "18.6%", icon: CalendarCheck, color: BRAND, tint: "#EEEAFD" },
  { label: "Total GMV", value: "₹39,37,100", delta: "22.1%", icon: ReceiptIndianRupee, color: "#16A34A", tint: "#DCFCE7" },
  { label: "Unique Services Booked", value: "86", delta: "8.7%", icon: Boxes, color: BLUE, tint: "#DBEAFE" },
  { label: "Avg. Service Price", value: "₹157", delta: "6.9%", icon: Ticket, color: "#F97316", tint: "#FFEDD5" },
  { label: "Service Add-on Rate", value: "38.7%", delta: "4.2%", icon: Gift, color: "#E11D6A", tint: "#FDE7F0" },
  { label: "Repeat Service Rate", value: "42.6%", delta: "3.8%", icon: Heart, color: "#E11D48", tint: "#FFE4E6", filled: true },
];

// Glyph and colour per service name; anything unlisted falls back to a grey dots.
const SERVICE_STYLE = {
  Haircut: { icon: Scissors, color: "#5B3FF0" },
  "Beard Trim": { icon: Brush, color: "#2563EB" },
  "Hair Spa": { icon: Droplets, color: "#2563EB" },
  Facial: { icon: Sparkles, color: "#16A34A" },
  "Hair Colour": { icon: Palette, color: "#E11D48" },
  "De-Tan": { icon: Sun, color: "#EA580C" },
  Manicure: { icon: Hand, color: "#D97706" },
  Pedicure: { icon: Footprints, color: "#E11D6A" },
  "Hair Smoothening": { icon: Wind, color: "#DB2777" },
  Waxing: { icon: Sparkles, color: "#D97706" },
  Others: { icon: Ellipsis, color: "#0EA5A4" },
};
const FALLBACK_STYLE = { icon: Ellipsis, color: "#64748B" };

const SEGMENTS = [
  { value: "men", label: "Men's" },
  { value: "women", label: "Women's" },
  { value: "all", label: "All" },
];

const MEN = [
  { name: "Haircut", bookings: 6842, share: "27.4%", gmv: "8,22,800" },
  { name: "Beard Trim", bookings: 3912, share: "15.6%", gmv: "2,93,400" },
  { name: "Hair Spa", bookings: 2851, share: "11.4%", gmv: "3,70,300" },
  { name: "Facial", bookings: 2301, share: "9.2%", gmv: "3,22,100" },
  { name: "Hair Colour", bookings: 1984, share: "7.9%", gmv: "4,96,000" },
  { name: "De-Tan", bookings: 1562, share: "6.2%", gmv: "2,03,100" },
  { name: "Manicure", bookings: 1294, share: "5.2%", gmv: "1,16,460" },
  { name: "Others", bookings: 2254, share: "9.1%", gmv: "2,13,940" },
];

const WOMEN = [
  { name: "Hair Spa", bookings: 4512, share: "22.8%", gmv: "5,86,900" },
  { name: "Hair Smoothening", bookings: 3245, share: "16.4%", gmv: "7,45,600" },
  { name: "Facial", bookings: 3012, share: "15.2%", gmv: "4,21,800" },
  { name: "Manicure", bookings: 2689, share: "13.6%", gmv: "1,59,300" },
  { name: "Pedicure", bookings: 2256, share: "11.4%", gmv: "1,62,800" },
  { name: "Haircut", bookings: 1842, share: "9.3%", gmv: "1,10,520" },
  { name: "Waxing", bookings: 1125, share: "5.7%", gmv: "1,42,200" },
  { name: "Others", bookings: 1319, share: "6.6%", gmv: "1,39,780" },
];

// Combined view: the two rankings merged by service name, best eight shown.
const parseGmv = (text) => Number(text.replace(/,/g, ""));
const formatGmv = (value) => value.toLocaleString("en-IN");
const ALL = (() => {
  const merged = new Map();
  [...MEN, ...WOMEN].forEach((row) => {
    const prev = merged.get(row.name) || { name: row.name, bookings: 0, gmvValue: 0 };
    prev.bookings += row.bookings;
    prev.gmvValue += parseGmv(row.gmv);
    merged.set(row.name, prev);
  });
  const rows = [...merged.values()].sort((a, b) => b.bookings - a.bookings);
  const total = rows.reduce((sum, row) => sum + row.bookings, 0);
  return rows.slice(0, 8).map((row) => ({
    name: row.name,
    bookings: row.bookings,
    share: `${((row.bookings / total) * 100).toFixed(1)}%`,
    gmv: formatGmv(row.gmvValue),
  }));
})();
const SERVICE_ROWS = { men: MEN, women: WOMEN, all: ALL };

const categories = [
  { name: "Hair Care", value: 9050, pct: "36.2%", color: "#6D4AE0" },
  { name: "Skin Care", value: 7025, pct: "28.1%", color: GREEN },
  { name: "Grooming", value: 4350, pct: "17.4%", color: "#FBBF24" },
  { name: "Nail Care", value: 2150, pct: "8.6%", color: "#F97316" },
  { name: "Hair Removal", value: 1375, pct: "5.5%", color: RED },
  { name: "Others", value: 1050, pct: "4.2%", color: "#9CA3AF" },
];

const TREND_DAYS = ["May 21", "May 22", "May 23", "May 24", "May 25", "May 26", "May 27"];
const TREND_LINES = [
  { key: "haircut", name: "Haircut", color: "#6D4AE0", values: [2050, 2080, 2200, 2160, 2780, 2900, 3750] },
  { key: "spa", name: "Hair Spa", color: GREEN, values: [700, 760, 800, 1120, 1250, 1500, 2000] },
  { key: "facial", name: "Facial", color: ORANGE, values: [330, 300, 360, 420, 380, 380, 640] },
];
const trend = TREND_DAYS.map((day, i) => ({
  day,
  ...Object.fromEntries(TREND_LINES.map((line) => [line.key, line.values[i]])),
}));

const addOns = [
  { name: "Hair Wash", icon: Droplets, bookings: "7,854", attach: "42.6%", gmv: "1,96,350" },
  { name: "Hair Spa", icon: Droplets, bookings: "6,102", attach: "33.1%", gmv: "3,10,200" },
  { name: "Beard Styling", icon: Scissors, bookings: "4,258", attach: "23.1%", gmv: "89,600" },
  { name: "Hair Serum", icon: FlaskConical, bookings: "3,925", attach: "21.3%", gmv: "78,450" },
  { name: "D-Tan Pack", icon: Sun, bookings: "2,854", attach: "15.5%", gmv: "66,230" },
  { name: "Face Massage", icon: Smile, bookings: "2,102", attach: "11.4%", gmv: "51,300" },
  { name: "Others", icon: Ellipsis, bookings: "1,950", attach: "10.6%", gmv: "47,850" },
];

// The mockup leaves "Below ₹99" without a percentage; the remainder is shown.
const prices = [
  { label: "Below ₹99", pct: 8.5 },
  { label: "₹100 – ₹199", pct: 28.7 },
  { label: "₹200 – ₹299", pct: 26.2 },
  { label: "₹300 – ₹499", pct: 21.4 },
  { label: "₹500 – ₹999", pct: 11.7 },
  { label: "₹1000+", pct: 3.5 },
];
const maxPrice = Math.max(...prices.map((row) => row.pct));

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PEAK_ROWS = ["Hair Care", "Skin Care", "Grooming", "Nail Care", "Hair Removal"];
const PEAK_RAMP = ["#F3F0FF", "#D5C9FB", "#A58CF2", "#7A55EB", "#5B3FF0"];
const peak = [
  [0.12, 0.18, 0.3, 0.42, 0.78, 0.88, 0.62],
  [0.1, 0.16, 0.26, 0.36, 0.7, 0.8, 0.56],
  [0.14, 0.2, 0.28, 0.38, 0.6, 0.76, 0.5],
  [0.08, 0.14, 0.22, 0.32, 0.5, 0.66, 0.46],
  [0.1, 0.12, 0.2, 0.3, 0.46, 0.6, 0.42],
];
// The mockup labels the same grid with days above and times of day below.
const PEAK_TIMES = [
  { label: "8 AM", at: 8 },
  { label: "12 PM", at: 36 },
  { label: "4 PM", at: 63 },
  { label: "8 PM", at: 90 },
];

const repeat = [
  { name: "Hair Spa", icon: Droplets, rate: "61.2%", color: GREEN, points: [6, 8, 5, 9, 6, 8, 4, 7, 6, 9, 5, 7] },
  { name: "Facial", icon: Sparkles, rate: "50.8%", color: GREEN, points: [7, 6, 8, 5, 8, 6, 9, 5, 7, 6, 8, 5] },
  { name: "Smoothening", icon: Wind, rate: "48.3%", color: GREEN, points: [5, 8, 6, 9, 5, 7, 6, 8, 5, 8, 7, 6] },
  { name: "Haircut", icon: Scissors, rate: "45.6%", color: GREEN, points: [8, 6, 7, 5, 8, 6, 8, 5, 7, 6, 8, 7] },
  { name: "Manicure", icon: Hand, rate: "41.7%", color: ORANGE, points: [6, 8, 5, 8, 6, 9, 5, 8, 6, 7, 5, 8] },
  { name: "Pedicure", icon: Footprints, rate: "38.2%", color: ORANGE, points: [7, 5, 8, 6, 8, 5, 9, 6, 8, 5, 7, 6] },
];

const insights = [
  { icon: TrendingUp, color: "#0E9F6E", tint: "#EEF9F3", title: "Highest Demand Service", text: "Haircut is the most booked service for men (27.4%). Keep offers & slots optimized." },
  { icon: Crown, color: "#E11D48", tint: "#FDF0F3", title: "Highest Revenue Service", text: "Smoothening generates the highest revenue for women (₹7,45,600)." },
  { icon: ChartNoAxesCombined, color: "#2563EB", tint: "#EFF4FE", title: "Growing Service", text: "Hair Spa bookings grew 24% this week across all categories." },
  { icon: TriangleAlert, color: "#D97706", tint: "#FEF5EA", title: "Low Attach Rate", text: "Face Massage add-on has low attach rate (11.4%). Promote with combos." },
];

const preferences = [
  { icon: Users, color: "#5B3FF0", tint: "#F4F2FE", title: "New Users", first: "Haircut (42%)", then: "Facial (21%)" },
  { icon: ChartNoAxesCombined, color: "#16A34A", tint: "#EEF9F3", title: "Returning Users", first: "Hair Spa (31%)", then: "Facial (25%)" },
  { icon: Crown, color: "#5B3FF0", tint: "#F0EFFE", title: "High Spenders (₹1000+)", first: "Smoothening (28%)", then: "Hair Spa (24%)" },
  { icon: Tag, color: "#D4A017", tint: "#FEF9E7", title: "Offer Users", first: "Haircut (38%)", then: "Beard Trim (22%)" },
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const CITIES = ["Chennai", "All Cities"];
const SALON_CATEGORIES = ["All Salon Categories", "Men's Salons", "Women's Salons", "Unisex Salons"];
const BASIS = ["By Bookings", "By GMV"];
const BASIS_USERS = ["By Users", "By Bookings"];

const compact = (v) => (v >= 1000 ? `${v / 1000}K` : `${v}`);
const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

const Select = ({ size = T.micro, ...props }) => (
  <BaseSelect size={size} className="w-[96px] [&_select]:py-1" {...props} />
);

const Segmented = (props) => <BaseSegmented size={T.micro} color={BRAND} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.sm }}
    iconClass="h-[44px] w-[44px] rounded-full"
    iconSize={21}
    caption={COMPARE}
    up
    className="px-4 py-4"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    size={176}
    inner="64%"
    centerSize={T.donut}
    captionSize={T.sm}
    formatter={(value) => num(value)}
    {...props}
  />
);

// Small outlined circle holding a service glyph.
const ServiceGlyph = ({ name, icon, color }) => {
  const style = SERVICE_STYLE[name] || FALLBACK_STYLE;
  const Icon = icon || style.icon;
  const tone = color || style.color;
  return (
    <span
      className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border"
      style={{ borderColor: tone, color: tone }}
    >
      <Icon size={10} />
    </span>
  );
};

// Column widths (%) measured per card: the left card is wider and its bar
// column longer, so the two can't share one set.
const COLS_LEFT = [22, 24, 12, 18, 24];
const COLS_RIGHT = [37.7, 11.3, 17.8, 15.2, 18];

// Ranking table with the Men's / Women's / All toggle; two cards share it.
const ServicesCard = ({ segment, setSegment, cols }) => {
  const rows = SERVICE_ROWS[segment];
  return (
    <Card className="p-4">
      <CardHeader
        title="Top Services by Bookings"
        right={<Segmented value={segment} onChange={setSegment} options={SEGMENTS} />}
      />
      <table className="mt-3 w-full table-fixed border-collapse text-left">
        <colgroup>
          {cols.map((width, i) => (
            <col key={i} style={{ width: `${width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={`pb-2 pr-2 font-medium text-slate-500 ${T.nano}`}>Service</th>
            <th />
            <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.nano}`}>Bookings</th>
            <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.nano}`}>Share</th>
            <th className={`pb-2 text-right font-medium text-slate-500 ${T.nano}`}>GMV (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.name} className="h-[24px]">
              <td className={`whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                <span className="flex items-center gap-2">
                  <ServiceGlyph name={row.name} />
                  {row.name}
                </span>
              </td>
              <td className="pr-3">
                <Meter
                  pct={(row.bookings / rows[0].bookings) * 100}
                  height={3}
                  track="transparent"
                  color={`rgba(91,63,240,${Math.max(0.45, 1 - i * 0.08).toFixed(2)})`}
                />
              </td>
              <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{num(row.bookings)}</td>
              <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.share}</td>
              <td className={`whitespace-nowrap text-right text-slate-700 ${T.xs}`}>{row.gmv}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

// Hover card for the trend chart: date, then one dot + value per service.
const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E3E7EF] bg-white px-3 py-2 shadow-lg">
      <p className={`font-bold text-slate-900 ${T.xs}`}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className={`mt-1 flex items-center gap-1.5 text-slate-600 ${T.micro}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-semibold text-slate-900">{num(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

// Tiny trend line for the repeat-rate table. Fixed points, drawn as one
// polyline stretched to the cell width. The height uses a fixed 0-11 scale
// rather than each line's own min-max, so the wiggle stays as shallow as the
// mockup's instead of filling the whole row.
const MiniLine = ({ points, color }) => {
  const step = 100 / (points.length - 1);
  const path = points
    .map((p, i) => `${(i * step).toFixed(1)},${(100 - (p / 11) * 100).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[18px] w-full" aria-hidden="true">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const exportServices = (rows) =>
  downloadCsv(
    "top-services-by-bookings.csv",
    ["Service", "Bookings", "Share", "GMV (INR)"],
    rows.map((row) => [row.name, row.bookings, row.share, row.gmv.replace(/,/g, "")])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, city, setCity, category, setCategory, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Deep insights on service performance, preferences &amp; trends
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* Static stamp, like the bell counts: the demo data never refreshes. */}
        <span className="hidden items-center gap-2 whitespace-nowrap text-[11px] text-slate-500 2xl:flex">
          Last updated: Today, 10:30 AM
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </span>
        <HeaderSelect
          icon={CalendarDays}
          label="Date range"
          value={range}
          onChange={setRange}
          options={DATE_RANGES}
          className="hidden lg:flex"
        />
        <HeaderSelect
          icon={MapPin}
          label="City"
          value={city}
          onChange={setCity}
          options={CITIES}
          className="hidden xl:flex"
        />
        <HeaderSelect
          label="Salon category"
          value={category}
          onChange={setCategory}
          options={SALON_CATEGORIES}
          className="hidden xl:flex"
        />
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

const ServiceIntelligenceV2 = ({ title = "Service Intelligence Dashboard" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [category, setCategory] = useState(SALON_CATEGORIES[0]);
  const [leftSegment, setLeftSegment] = useState("men");
  const [rightSegment, setRightSegment] = useState("women");
  const [trendBasis, setTrendBasis] = useState(BASIS[0]);
  const [addOnBasis, setAddOnBasis] = useState(BASIS[0]);
  const [priceBasis, setPriceBasis] = useState(BASIS[0]);
  const [repeatBasis, setRepeatBasis] = useState(BASIS_USERS[0]);

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        setRange={setRange}
        city={city}
        setCity={setCity}
        category={category}
        setCategory={setCategory}
        onExport={() => exportServices(SERVICE_ROWS[leftSegment])}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, filled, ...kpi }) => (
            <KpiTile
              key={kpi.label}
              {...kpi}
              icon={icon}
              iconColor={color}
              iconTint={tint}
              iconFill={filled}
            />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Top services x2 / category share                         */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <ServicesCard segment={leftSegment} setSegment={setLeftSegment} cols={COLS_LEFT} />
          <ServicesCard segment={rightSegment} setSegment={setRightSegment} cols={COLS_RIGHT} />

          <Card className="p-4">
            <CardHeader title="Bookings Share by Service Category" />
            <div className="flex flex-1 items-center gap-6">
              <Donut data={categories} center="25,000" caption="Total Bookings" />
              <ul className="flex min-w-0 flex-1 flex-col gap-[14px]">
                {categories.map((row) => (
                  <li key={row.name} className={`flex items-center gap-2 ${T.sm}`}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                    <span className="w-[40px] shrink-0 text-right text-slate-600">{row.pct}</span>
                    <span className="w-[48px] shrink-0 text-right text-slate-500">({num(row.value)})</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Trend / add-ons / price distribution                     */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title="Service Trend Over Time"
              right={<Select value={trendBasis} onChange={setTrendBasis} options={BASIS} />}
            />
            <div className="mt-3 flex items-center justify-center gap-7">
              {TREND_LINES.map((line) => (
                <LegendDot key={line.key} dash color={line.color} label={line.name} size={T.micro} />
              ))}
            </div>
            <div className="mt-1 min-h-[148px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 14, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="#F1F3F8" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 10 }}
                    dy={6}
                    interval={0}
                    padding={{ left: 10, right: 6 }}
                  />
                  <YAxis
                    domain={[0, 4000]}
                    ticks={[0, 1000, 2000, 3000, 4000]}
                    interval={0}
                    tickFormatter={(v) => (v === 0 ? "0" : compact(v))}
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 10 }}
                    width={34}
                  />
                  <Tooltip content={<TrendTooltip />} defaultIndex={4} cursor={false} />
                  {TREND_LINES.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      name={line.name}
                      stroke={line.color}
                      strokeWidth={1.8}
                      dot={{ r: 2.6, fill: line.color, strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Service Add-on Performance"
              right={<Select value={addOnBasis} onChange={setAddOnBasis} options={BASIS} />}
            />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  <th className={`pb-2 pr-2 font-medium text-slate-500 ${T.nano}`}>Add-on Service</th>
                  <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.nano}`}>Bookings</th>
                  <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.nano}`}>Attach Rate</th>
                  <th className={`pb-2 text-right font-medium text-slate-500 ${T.nano}`}>GMV (₹)</th>
                </tr>
              </thead>
              <tbody>
                {addOns.map((row) => (
                  <tr key={row.name} className="h-[22px]">
                    <td className={`whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                      <span className="flex items-center gap-2">
                        <ServiceGlyph name={row.name} icon={row.icon} color={BRAND} />
                        {row.name}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.bookings}</td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.attach}</td>
                    <td className={`whitespace-nowrap text-right text-slate-700 ${T.xs}`}>{row.gmv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Service Price Distribution"
              right={<Select value={priceBasis} onChange={setPriceBasis} options={BASIS} />}
            />
            <ul className="mt-4 flex flex-1 flex-col justify-around gap-2.5">
              {prices.map((row) => (
                <li key={row.label} className={`flex items-center gap-3 ${T.xs}`}>
                  <span className="w-[78px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="block h-[4px] shrink-0 rounded-full"
                      style={{
                        width: `${(row.pct / maxPrice) * 84}%`,
                        background: "linear-gradient(90deg,#8B74F5,#5B3FF0)",
                      }}
                    />
                    <span className="shrink-0 text-slate-600">{row.pct.toFixed(1)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Peak time / repeat rate / insights                       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Peak Booking Time by Service Category" />
            <div className="mt-3">
              <BaseHeatGrid
                values={peak}
                ramp={PEAK_RAMP}
                rowLabels={PEAK_ROWS}
                colLabels={WEEKDAYS}
                labelSize={T.micro}
                labelWidth={78}
                cellHeight={21}
                gap={2}
                radius={2}
                title={(r, c) => `${PEAK_ROWS[r]} · ${WEEKDAYS[c]} · ${Math.round(peak[r][c] * 100)}% of peak`}
              />
              <div className="relative ml-[78px] mt-2 h-[12px]">
                {PEAK_TIMES.map((time) => (
                  <span
                    key={time.label}
                    className={`absolute top-0 -translate-x-1/2 whitespace-nowrap leading-none text-slate-500 ${T.micro}`}
                    style={{ left: `${time.at}%` }}
                  >
                    {time.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-2">
              <RampLegend ramp={PEAK_RAMP} from="Low" to="High" size={T.micro} width={220} />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Repeat Rate by Service"
              right={<Select value={repeatBasis} onChange={setRepeatBasis} options={BASIS_USERS} />}
            />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  <th className={`pb-2 pr-2 font-medium text-slate-500 ${T.nano}`}>Service</th>
                  <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.nano}`}>Repeat Rate (30D)</th>
                  <th className={`pb-2 pl-6 font-medium text-slate-500 ${T.nano}`}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {repeat.map((row) => (
                  <tr key={row.name} className="h-[26px]">
                    <td className={`whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                      <span className="flex items-center gap-2">
                        <ServiceGlyph name={row.name} icon={row.icon} color={row.color === GREEN ? "#16A34A" : "#D97706"} />
                        {row.name}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{row.rate}</td>
                    <td className="w-[30%] pl-6">
                      <MiniLine points={row.points} color={row.color} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <CardHeader title="Services Insights" />
            <div className={`mt-3 grid flex-1 grid-cols-2 ${GAP}`}>
              {insights.map((item) => (
                <InsightTile
                  key={item.title}
                  plain
                  icon={item.icon}
                  color={item.color}
                  tint={item.tint}
                  title={item.title}
                  titleSize={T.sm}
                  textSize={T.micro}
                  iconClass="h-8 w-8"
                  iconSize={26}
                  align="items-start"
                  gap="gap-3"
                  padding="px-3 py-3"
                >
                  {item.text}
                </InsightTile>
              ))}
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Preferences by user segment                              */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-4 pb-3.5 pt-3.5">
          <CardHeader title="Service Preferences by User Segment" />
          <div className={`mt-2.5 grid grid-cols-4 ${GAP}`}>
            {preferences.map((item) => (
              <InsightTile
                key={item.title}
                plain
                icon={item.icon}
                color={item.color}
                tint={item.tint}
                title={item.title}
                titleSize={T.xs}
                textSize={T.xs}
                iconClass="h-9 w-9"
                iconSize={30}
                padding="px-4 py-2.5"
              >
                <span className="block">Most booked: {item.first}</span>
                <span className="block">Followed by: {item.then}</span>
              </InsightTile>
            ))}
          </div>
        </Card>
      </ScaledCanvas>
    </>
  );
};

export default ServiceIntelligenceV2;
