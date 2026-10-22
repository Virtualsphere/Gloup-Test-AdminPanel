import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ChartPie,
  CircleCheck,
  CircleX,
  Clock,
  CreditCard,
  Download,
  IndianRupee,
  Info,
  MapPin,
  Mars,
  Percent,
  Repeat,
  Star,
  Store,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
  Venus,
  Armchair,
  ClockAlert,
  Wallet,
} from "lucide-react";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, CARD } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  InsightTile,
  LegendDot,
  Meter,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Salon Category Intelligence" mockup, on a
// fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the available width
// (see there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup, and
// it is drawn as the mockup has it: the shares in the donuts and the Booking
// Share row are the mockup's own figures, not recomputed from the counts. The
// store record carries the salon's category (men's / women's / unisex) and its
// active state (partnersSlice), so the salon counts are the first cards that
// could be wired; the booking, GMV and rating rows need the booking list
// grouped by that category, and distance, no-show and empty-slot rates have no
// source yet. The date, city and area pickers hold local state only; "Export
// Report" exports the detailed performance table.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#6D4AE0";
const INDIGO = "#4F46E5";
const MEN = "#3B82F6";
const UNISEX = "#22C55E";
const WOMEN = "#F0527E";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW1_COLS = "grid-cols-[432fr_410fr_449fr]";
const ROW2_COLS = "grid-cols-[377fr_287fr_308fr_312fr]";
const ROW3_COLS = "grid-cols-[865fr_436fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1314px of content, so measured sizes carry over at ~1.16x.
const T = {
  nano: "text-[11px]", // stat captions, insight text
  xs: "text-[12px]", // table cells, legend rows
  sm: "text-[13px]", // table headers, insight titles, list rows
  title: "text-[15px]", // card titles
  strip: "text-[16px]", // stat strip values
  stat: "text-[21px]", // category headline numbers
  donut: "text-[20px]", // donut centre total
};

const GAP = "gap-3";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

// `strip` is the tinted stat strip under each category's headline numbers.
const categories = [
  {
    key: "men",
    name: "Men's Salon",
    color: MEN,
    icon: Mars,
    badge: { bg: "#DDEBFF", fg: MEN },
    strip: { bg: "#F0F5FF", border: "#DCE8FD" },
    total: 120,
    active: 103,
    inactive: 17,
    stats: [
      ["Active %", "85.8%"],
      ["Total Bookings", "8,200"],
      ["Booking Share", "31.7%"],
      ["GMV", "₹12,48,200"],
    ],
  },
  {
    key: "unisex",
    name: "Unisex Salon",
    color: "#16A34A",
    icon: UsersRound,
    badge: { bg: "#22A55A", fg: "#fff" },
    strip: { bg: "#EEF9F2", border: "#D3EEDD" },
    total: 105,
    active: 94,
    inactive: 11,
    stats: [
      ["Active %", "89.5%"],
      ["Total Bookings", "11,400"],
      ["Booking Share", "44.1%"],
      ["GMV", "₹18,76,300"],
    ],
  },
  {
    key: "women",
    name: "Women's Salon",
    color: "#E5365F",
    icon: Venus,
    badge: { bg: "#FDE1EA", fg: "#E5365F" },
    strip: { bg: "#FEF1F4", border: "#FADCE4" },
    total: 75,
    active: 66,
    inactive: 9,
    stats: [
      ["Active %", "88.0%"],
      ["Total Bookings", "5,400"],
      ["Booking Share", "20.9%"],
      ["GMV", "₹8,12,600"],
    ],
  },
];

const salonCounts = [
  { name: "Men's Salon", total: 120, active: 103, inactive: 17 },
  { name: "Unisex Salon", total: 105, active: 94, inactive: 11 },
  { name: "Women's Salon", total: 75, active: 66, inactive: 9 },
];
const COUNT_SERIES = [
  { key: "total", name: "Total Salons", color: BRAND },
  { key: "active", name: "Active Salons", color: UNISEX },
  { key: "inactive", name: "Inactive Salons", color: WOMEN },
];

const bookingShare = [
  { name: "Unisex Salon", value: 11400, label: "11,400", pct: "44.1%", color: UNISEX },
  { name: "Men's Salon", value: 8200, label: "8,200", pct: "31.7%", color: MEN },
  { name: "Women's Salon", value: 5400, label: "5,400", pct: "20.9%", color: WOMEN },
];
const gmvShare = [
  { name: "Unisex Salon", value: 1876300, label: "₹18,76,300", pct: "47.7%", color: UNISEX },
  { name: "Men's Salon", value: 1248200, label: "₹12,48,200", pct: "31.7%", color: MEN },
  { name: "Women's Salon", value: 812600, label: "₹8,12,600", pct: "20.6%", color: WOMEN },
];

const averages = [
  { name: "Unisex Salon", value: 121.3, color: UNISEX, icon: UsersRound, tint: "#E2F5E9", fg: "#16A34A" },
  { name: "Women's Salon", value: 81.8, color: WOMEN, icon: Venus, tint: "#FDE7EE", fg: "#E5365F" },
  { name: "Men's Salon", value: 79.6, color: MEN, icon: Mars, tint: "#E1EDFF", fg: MEN },
];
const maxAverage = Math.max(...averages.map((row) => row.value));

// Rows of the detailed table: [Men's, Unisex, Women's, Overall]. `star` rows
// carry a rating.
const COLUMNS = ["Men's Salon", "Unisex Salon", "Women's Salon", "Overall"];
const detail = [
  { icon: Store, label: "Total Salons", values: ["120", "105", "75", "300"] },
  { icon: UserRound, label: "Active Salons", values: ["103", "94", "66", "263"] },
  { icon: CircleX, label: "Inactive Salons", values: ["17", "11", "9", "37"] },
  { icon: Percent, label: "Active %", values: ["85.8%", "89.5%", "88.0%", "87.7%"] },
  { icon: CalendarCheck, label: "Total Bookings", values: ["8,200", "11,400", "5,400", "25,000"] },
  { icon: ChartPie, label: "Booking Share %", values: ["31.7%", "44.1%", "20.9%", "100%"] },
  { icon: ChartColumn, label: "Average Bookings / Salon", values: ["68.3", "108.6", "72.0", "83.3"] },
  { icon: ChartColumn, label: "Average Bookings / Active Salon", values: ["79.6", "121.3", "81.8", "95.1"] },
  { icon: IndianRupee, label: "GMV (₹)", values: ["12,48,200", "18,76,300", "8,12,600", "39,37,100"] },
  { icon: Percent, label: "Average Order Value (₹)", values: ["152", "165", "150", "157"] },
  { icon: Wallet, label: "GloUp 4% Revenue (₹)", values: ["49,928", "75,052", "32,504", "1,57,484"] },
  { icon: CreditCard, label: "Subscription Revenue (₹)", values: ["1,02,597", "93,786", "65,934", "2,62,317"] },
  { icon: CircleX, label: "Cancellation Rate", values: ["4.2%", "3.6%", "4.8%", "4.2%"] },
  { icon: ClockAlert, label: "No-show Rate", values: ["2.1%", "1.8%", "2.6%", "2.1%"] },
  { icon: Repeat, label: "Repeat Customer Rate", values: ["37.6%", "42.8%", "39.2%", "40.2%"] },
  { icon: MapPin, label: "Average Customer Distance", values: ["6.2 km", "7.8 km", "5.4 km", "6.6 km"] },
  { icon: Star, label: "Average Rating", values: ["4.3", "4.5", "4.4", "4.4"], star: true },
  { icon: Armchair, label: "Empty Slot Rate", values: ["18.6%", "15.4%", "16.7%", "16.7%"] },
  { icon: Clock, label: "Peak Booking Hour", values: ["7 PM – 9 PM", "6 PM – 9 PM", "4 PM – 8 PM", "6 PM – 9 PM"] },
  { icon: CalendarDays, label: "Peak Booking Day", values: ["Saturday", "Sunday", "Saturday", "Saturday"] },
];
// Column widths (%): the metric name, then the four value columns.
const DETAIL_COLS = [25.8, 18.55, 18.55, 18.55, 18.55];
// Header cell colours, as drawn: Men's and Overall stay neutral.
const HEADER_STYLE = [
  { background: "#F3F4F8", color: "#0F172A" },
  { background: "#EAF7EE", color: "#16A34A" },
  { background: "#FDECF1", color: "#E5365F" },
  { background: "#F3F4F8", color: "#0F172A" },
];

const insights = [
  {
    icon: TrendingUp,
    color: "#16A34A",
    tint: "#EEF9F2",
    title: "Unisex salons lead in performance",
    text: "Highest booking share (44.1%) and revenue contribution (47.7%).",
  },
  {
    icon: Users,
    color: "#2F6FE4",
    tint: "#EEF3FD",
    title: "Best productivity",
    text: "Unisex salons have the highest bookings per active salon (121.3).",
  },
  {
    icon: MapPin,
    color: "#E5365F",
    tint: "#FDEEF1",
    title: "Women's salons have shorter radius",
    text: "Average customer distance is lowest for women's salons (5.4 km).",
  },
  {
    icon: Clock,
    color: "#E08700",
    tint: "#FFF6E8",
    title: "Peak demand hours",
    text: "Evening hours (6 PM – 9 PM) are peak across all categories.",
  },
];

const nextSteps = [
  "Onboard more unisex salons in high demand areas.",
  "Reactivate inactive men's salons (17 salons inactive).",
  "Run offers for women's salons on weekdays.",
  "Focus marketing before 6 PM for better conversions.",
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const CITIES = ["Chennai", "All Cities"];
const AREAS = ["All Areas", "T. Nagar", "Anna Nagar", "Velachery", "Tambaram", "Porur", "OMR"];

const num = (v) => v.toLocaleString("en-IN");

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.nano} {...props} />;

const Donut = (props) => (
  <BaseDonut
    size={158}
    inner="72%"
    centerSize={T.donut}
    captionSize={T.nano}
    paddingAngle={1.5}
    {...props}
  />
);

// Legend line of the two donut cards: dot + name, then the figure and share.
const ShareLegend = ({ rows }) => (
  <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
    {rows.map((row) => (
      <li key={row.name} className="min-w-0">
        <p className={`flex items-center gap-2 text-slate-800 ${T.xs}`}>
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
          <span className="truncate">{row.name}</span>
        </p>
        <p className={`mt-0.5 whitespace-nowrap pl-4 text-slate-500 ${T.nano}`}>
          {row.label} ({row.pct})
        </p>
      </li>
    ))}
  </ul>
);

const CategoryCard = ({ cat }) => {
  const Icon = cat.icon;
  return (
    <div className={`flex min-w-0 flex-col px-5 pb-4 pt-4 ${CARD}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
        <span
          className="row-span-2 grid h-[54px] w-[54px] place-items-center rounded-full"
          style={{ background: cat.badge.bg, color: cat.badge.fg }}
        >
          <Icon size={28} />
        </span>
        <p className={`font-semibold ${T.title}`} style={{ color: cat.color }}>
          {cat.name}
        </p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {[
            { value: cat.total, caption: "Total Salons", color: "#0F172A" },
            { value: cat.active, caption: "Active Salons", color: "#16A34A" },
            { value: cat.inactive, caption: "Inactive Salons", color: "#E5365F" },
          ].map((stat) => (
            <div key={stat.caption} className="min-w-0">
              <p className={`font-extrabold leading-tight tracking-tight ${T.stat}`} style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className={`mt-0.5 truncate text-slate-500 ${T.nano}`}>{stat.caption}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-4 divide-x divide-black/[0.06] rounded-xl border py-2.5"
        style={{ background: cat.strip.bg, borderColor: cat.strip.border }}
      >
        {cat.stats.map(([label, value]) => (
          <div key={label} className="min-w-0 px-3">
            <p className={`truncate text-slate-500 ${T.nano}`}>{label}</p>
            <p className={`mt-1 truncate font-bold text-slate-900 ${T.strip}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const exportDetail = () =>
  downloadCsv(
    "salon-category-performance.csv",
    ["Metric", ...COLUMNS],
    detail.map((row) => [row.label, ...row.values])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, city, setCity, area, setArea }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="flex items-center gap-1.5 text-[18px] font-extrabold tracking-tight text-slate-900">
          <span className="truncate">{title}</span>
          <Info size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
        </h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Performance overview of salons by category</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* Static stamp, like the bell counts: the demo data never refreshes. */}
        <span className="hidden items-center gap-2 whitespace-nowrap text-[11px] text-slate-500 2xl:flex">
          Data updated: Today, 10:30 AM
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
        <HeaderSelect label="Area" value={area} onChange={setArea} options={AREAS} className="hidden xl:flex" />
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={exportDetail}>
          <span className="hidden md:inline">Export Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const SalonCategoryIntelligenceV2 = ({ title = "Salon Category Intelligence" }) => {
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [area, setArea] = useState(AREAS[0]);

  return (
    <>
      <PageHeader
        title={title}
        range={range}
        setRange={setRange}
        city={city}
        setCity={setCity}
        area={area}
        setArea={setArea}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - Category summaries                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW1_COLS} ${GAP}`}>
          {categories.map((cat) => (
            <CategoryCard key={cat.key} cat={cat} />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Salon counts / booking share / GMV share / productivity  */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Salon Category - Total vs Active vs Inactive" />
            <div className="mt-3 flex items-center justify-center gap-6">
              {COUNT_SERIES.map((series) => (
                <LegendDot key={series.key} dash color={series.color} label={series.name} size={T.nano} />
              ))}
            </div>
            <div className="mt-1 min-h-[170px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salonCounts} margin={{ top: 18, right: 8, bottom: 0, left: -8 }} barGap={4} barCategoryGap="30%">
                  <CartesianGrid stroke="#F1F3F8" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 11 }}
                    dy={6}
                  />
                  <YAxis
                    domain={[0, 160]}
                    ticks={[0, 40, 80, 120, 160]}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...AXIS, fontSize: 11 }}
                    width={38}
                  />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(109,74,224,0.05)" }} />
                  {COUNT_SERIES.map((series) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.name}
                      fill={series.color}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={20}
                      isAnimationActive={false}
                    >
                      <LabelList dataKey={series.key} position="top" style={{ fontSize: 11, fill: "#334155" }} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Booking Share by Salon Category" />
            <div className="flex flex-1 items-center gap-4 pt-2">
              <Donut data={bookingShare} center="25,000" caption="Total Bookings" formatter={num} />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <ShareLegend rows={bookingShare} />
                <div className="border-t border-slate-100 pt-2">
                  <p className={`font-semibold text-slate-800 ${T.xs}`}>Total</p>
                  <p className={`mt-0.5 text-slate-600 ${T.nano}`}>25,000 (100%)</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="GMV Contribution by Category" />
            <div className="flex flex-1 items-center gap-4 pt-2">
              <Donut
                data={gmvShare}
                center="₹39,37,100"
                caption="Total GMV"
                centerSize="text-[17px]"
                formatter={(value) => `₹${num(value)}`}
              />
              <ShareLegend rows={gmvShare} />
            </div>
          </Card>

          <Card className="px-5 py-4">
            <CardHeader title="Average Bookings per Active Salon" />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-3">
              {averages.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.name} className="flex items-center gap-3">
                    <span
                      className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl"
                      style={{ background: row.tint, color: row.fg }}
                    >
                      <Icon size={22} />
                    </span>
                    <span className={`w-[96px] shrink-0 whitespace-nowrap text-slate-800 ${T.xs}`}>{row.name}</span>
                    <span className="min-w-0 flex-1">
                      <Meter pct={(row.value / maxAverage) * 100} color={row.color} height={5} track="transparent" />
                    </span>
                    <span className={`w-[38px] shrink-0 text-right font-bold text-slate-900 ${T.xs}`}>
                      {row.value.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Detailed table / insights                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="px-4 pb-5 pt-4">
            <CardHeader title="Detailed Performance by Salon Category" />
            <div className="mt-3 overflow-hidden rounded-lg border border-[#E6E8F0]">
              <table className="w-full table-fixed border-collapse text-center">
                <colgroup>
                  {DETAIL_COLS.map((width, i) => (
                    <col key={i} style={{ width: `${width}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th
                      className={`border-b border-[#E6E8F0] px-3 py-2 text-left font-semibold text-slate-900 ${T.xs}`}
                      style={{ background: "#F3F4F8" }}
                    >
                      Metrics
                    </th>
                    {COLUMNS.map((name, i) => (
                      <th
                        key={name}
                        className={`border-b border-l border-[#E6E8F0] px-2 py-2 font-semibold ${T.xs}`}
                        style={HEADER_STYLE[i]}
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.map((row) => {
                    const Icon = row.icon;
                    return (
                      <tr key={row.label} className="h-[26px] border-b border-slate-100 last:border-0">
                        <td className={`px-3 text-left text-slate-800 ${T.xs}`}>
                          <span className="flex items-center gap-2.5">
                            <Icon size={13} className="shrink-0" style={{ color: BRAND }} />
                            <span className="truncate">{row.label}</span>
                          </span>
                        </td>
                        {row.values.map((value, i) => (
                          <td key={i} className={`border-l border-slate-100 px-2 text-slate-800 ${T.xs}`}>
                            {value}
                            {row.star && (
                              <Star size={11} className="ml-1 inline text-amber-400" fill="currentColor" strokeWidth={0} />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="px-5 py-4">
            <CardHeader title="Key Insights" />
            <div className="mt-3 flex flex-col gap-2.5">
              {insights.map((item) => (
                <InsightTile
                  key={item.title}
                  plain
                  icon={item.icon}
                  color={item.color}
                  tint={item.tint}
                  title={item.title}
                  titleSize={T.xs}
                  textSize={T.nano}
                  iconClass="h-10 w-10"
                  iconSize={34}
                  padding="px-4 py-3.5"
                  gap="gap-4"
                >
                  {item.text}
                </InsightTile>
              ))}
            </div>

            <h3 className={`mt-5 font-bold text-slate-900 ${T.sm}`}>What to do next?</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {nextSteps.map((step) => (
                <li key={step} className={`flex items-center gap-3 text-slate-700 ${T.xs}`}>
                  <CircleCheck size={16} className="shrink-0" style={{ color: "#5B5FE6" }} />
                  {step}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`mt-auto flex w-full items-center justify-between rounded-lg border border-[#DCDFF7] bg-[#F5F6FF] px-4 py-3 font-semibold transition-colors hover:bg-[#ECEEFE] ${T.xs}`}
              style={{ color: INDIGO }}
            >
              View Detailed Salon List
              <ArrowRight size={16} />
            </button>
          </Card>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default SalonCategoryIntelligenceV2;
