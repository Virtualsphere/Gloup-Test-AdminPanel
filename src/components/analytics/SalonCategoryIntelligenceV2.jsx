import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
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
import { fetchSalonCategoryV2 } from "../../redux/slices/analyticsSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, CARD, WRAP } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  InsightTile,
  LegendDot,
  Meter,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Salon Category Intelligence" mockup, on a fixed DESIGN_WIDTH
// canvas that ScaledCanvas scales to the available width (see there for why
// bigger px sizes in T read smaller on screen).
//
// Data: getSalonCategoryV2 (analyticsSlice `salonCategory`). A salon's
// category comes from its store_type, or from its services' gender when that
// is blank; listed salons only, "active" = live now. Bookings are served ones
// (paid, not cancelled / refunded, from go-live) by service date. Platform fee
// revenue is the fixed fee stored per booking; subscription revenue is what
// payouts in the window deducted. The no-show row is a proxy - past bookings
// the salon never marked completed - since nothing records no-shows.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const BRAND = "#6D4AE0";
const INDIGO = "#4F46E5";
const MEN = "#3B82F6";
const UNISEX = "#22C55E";
const WOMEN = "#F0527E";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW1_COLS = `grid-cols-[432fr_410fr_449fr] ${WRAP[3]}`;
const ROW2_COLS = `grid-cols-[377fr_287fr_308fr_312fr] ${WRAP[4]}`;
const ROW3_COLS = `grid-cols-[865fr_436fr] ${WRAP[2]}`;

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
const DASH = "–";

// Display order of the category cards, with their look.
const CATEGORY_STYLE = {
  men: { color: MEN, chart: MEN, icon: Mars, badge: { bg: "#DDEBFF", fg: MEN }, strip: { bg: "#F0F5FF", border: "#DCE8FD" }, tint: "#E1EDFF" },
  unisex: { color: "#16A34A", chart: UNISEX, icon: UsersRound, badge: { bg: "#22A55A", fg: "#fff" }, strip: { bg: "#EEF9F2", border: "#D3EEDD" }, tint: "#E2F5E9" },
  women: { color: "#E5365F", chart: WOMEN, icon: Venus, badge: { bg: "#FDE1EA", fg: "#E5365F" }, strip: { bg: "#FEF1F4", border: "#FADCE4" }, tint: "#FDE7EE" },
};
const COUNT_SERIES = [
  { key: "total", name: "Total Salons", color: BRAND },
  { key: "active", name: "Active Salons", color: UNISEX },
  { key: "inactive", name: "Inactive Salons", color: WOMEN },
];
// Header cell colours, as drawn: Men's and Overall stay neutral.
const HEADER_STYLE = [
  { background: "#F3F4F8", color: "#0F172A" },
  { background: "#EAF7EE", color: "#16A34A" },
  { background: "#FDECF1", color: "#E5365F" },
  { background: "#F3F4F8", color: "#0F172A" },
];
// Stand-ins until the first response arrives.
const PLACEHOLDER_COLUMNS = [
  { key: "men", label: "Men's Salon" },
  { key: "unisex", label: "Unisex Salon" },
  { key: "women", label: "Women's Salon" },
  { key: "overall", label: "Overall" },
];
// Column widths (%): the metric name, then the four value columns.
const DETAIL_COLS = [25.8, 18.55, 18.55, 18.55, 18.55];

const PERIODS = [
  { key: "last_7", label: "Last 7 Days", range: () => [moment().subtract(6, "days"), moment()] },
  { key: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    key: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
  { key: "last_90", label: "Last 90 Days", range: () => [moment().subtract(89, "days"), moment()] },
];

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : DASH);
const dec = (v) => (isNum(v) ? Number(v).toFixed(1) : DASH);
const rupee = (v) => (isNum(v) ? `₹${num(v)}` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const km = (v) => (isNum(v) ? `${Number(v).toFixed(1)} km` : DASH);
const share = (part, whole) => (whole ? (part / whole) * 100 : null);
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? "" : "s"}`;

// Rows of the detailed table, read from each category's summary.
const DETAIL_ROWS = [
  { icon: Store, label: "Total Salons", get: (t) => num(t.total_salons) },
  { icon: UserRound, label: "Active Salons", get: (t) => num(t.active_salons) },
  { icon: CircleX, label: "Inactive Salons", get: (t) => num(t.inactive_salons) },
  { icon: Percent, label: "Active %", get: (t) => fmtPct(t.active_pct) },
  { icon: CalendarCheck, label: "Total Bookings", get: (t) => num(t.bookings) },
  { icon: ChartPie, label: "Booking Share %", get: (t) => fmtPct(t.booking_share) },
  { icon: ChartColumn, label: "Average Bookings / Salon", get: (t) => dec(t.bookings_per_salon) },
  { icon: ChartColumn, label: "Average Bookings / Active Salon", get: (t) => dec(t.bookings_per_active_salon) },
  { icon: IndianRupee, label: "GMV (₹)", get: (t) => num(t.gmv) },
  { icon: Percent, label: "Average Order Value (₹)", get: (t) => num(t.aov) },
  { icon: Wallet, label: "Platform Fee Revenue (₹)", get: (t) => num(t.platform_fee_revenue) },
  { icon: CreditCard, label: "Subscription Revenue (₹)", get: (t) => num(t.subscription_revenue) },
  { icon: CircleX, label: "Cancellation Rate", get: (t) => fmtPct(t.cancellation_rate) },
  { icon: ClockAlert, label: "Not Marked Completed", get: (t) => fmtPct(t.not_completed_rate), hint: "Past bookings the salon never marked completed (no-show proxy)" },
  { icon: Repeat, label: "Repeat Customer Rate", get: (t) => fmtPct(t.repeat_customer_rate), hint: "Customer-salon pairs with 2+ bookings at that salon" },
  { icon: MapPin, label: "Average Customer Distance", get: (t) => km(t.avg_distance_km), hint: "Bookings with a customer location only" },
  { icon: Star, label: "Average Rating", get: (t) => dec(t.avg_rating), star: true },
  { icon: Armchair, label: "Empty Slot Rate", get: (t) => fmtPct(t.empty_slot_rate), hint: "Unbooked slot capacity up to today" },
  { icon: Clock, label: "Peak Booking Hour", get: (t) => t.peak_slot || DASH },
  { icon: CalendarDays, label: "Peak Booking Day", get: (t) => t.peak_day || DASH },
];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.nano} {...props} />;

const Donut = (props) => <BaseDonut size={158} inner="72%" centerSize={T.donut} captionSize={T.nano} paddingAngle={1.5} {...props} />;

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[260px]">{children}</p>
  </div>
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
          {row.label} ({fmtPct(row.pct)})
        </p>
      </li>
    ))}
  </ul>
);

const CategoryCard = ({ cat, loading }) => {
  const style = CATEGORY_STYLE[cat.key];
  const Icon = style.icon;
  const show = (v) => (loading ? "…" : v);
  const stats = [
    ["Active %", fmtPct(cat.active_pct)],
    ["Total Bookings", num(cat.bookings)],
    ["Booking Share", fmtPct(cat.booking_share)],
    ["GMV", rupee(cat.gmv)],
  ];
  return (
    <div className={`flex min-w-0 flex-col px-5 pb-4 pt-4 ${CARD}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
        <span className="row-span-2 grid h-[54px] w-[54px] place-items-center rounded-full" style={{ background: style.badge.bg, color: style.badge.fg }}>
          <Icon size={28} />
        </span>
        <p className={`font-semibold ${T.title}`} style={{ color: style.color }}>
          {cat.label}
        </p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {[
            { value: cat.total_salons, caption: "Total Salons", color: "#0F172A" },
            { value: cat.active_salons, caption: "Active Salons", color: "#16A34A" },
            { value: cat.inactive_salons, caption: "Inactive Salons", color: "#E5365F" },
          ].map((stat) => (
            <div key={stat.caption} className="min-w-0">
              <p className={`font-extrabold leading-tight tracking-tight ${T.stat}`} style={{ color: stat.color }}>
                {show(num(stat.value))}
              </p>
              <p className={`mt-0.5 truncate text-slate-500 ${T.nano}`}>{stat.caption}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 divide-x divide-black/[0.06] rounded-xl border py-2.5" style={{ background: style.strip.bg, borderColor: style.strip.border }}>
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0 px-3">
            <p className={`truncate text-slate-500 ${T.nano}`}>{label}</p>
            <p className={`mt-1 truncate font-bold text-slate-900 ${T.strip}`} title={value}>
              {show(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, city, setCity, cityOptions, area, setArea, areaOptions, onExport }) => (
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
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="salon-cat-range" className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
        <HeaderSelect label="Area" value={area} onChange={setArea} options={areaOptions} className="hidden xl:flex" />
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

const SalonCategoryIntelligenceV2 = ({ title = "Salon Category Intelligence" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { salonCategory } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState("last_30");
  const [custom, setCustom] = useState(null);
  const [city, setCity] = useState("all");
  const [area, setArea] = useState("all");

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[1]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  useEffect(() => {
    const body = { from: range.from, to: range.to };
    if (city !== "all") body.city = city;
    if (area !== "all") body.area = area;
    dispatch(fetchSalonCategoryV2(body))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load salon categories", { id: "salon-cat-v2" }));
  }, [dispatch, range.from, range.to, city, area]);

  const data = salonCategory.data;
  const loading = salonCategory.loading && !data;
  const cityOptions = useMemo(() => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))], [data]);
  // Keep the area list from the unfiltered-by-area response so it doesn't shrink to one entry.
  const [areaList, setAreaList] = useState([]);
  useEffect(() => {
    if (data && area === "all") setAreaList(data.areas || []);
  }, [data, area]);
  const areaOptions = useMemo(() => [{ value: "all", label: "All Areas" }, ...areaList.map((a) => ({ value: a, label: a }))], [areaList]);
  const changeCity = (value) => {
    setCity(value);
    setArea("all");
  };

  const types = data?.types || [];
  const byKey = Object.fromEntries(types.map((t) => [t.key, t]));
  const ordered = ["men", "unisex", "women"].map((key) => byKey[key]).filter(Boolean);
  const overall = data?.overall;
  const totalBookings = overall?.bookings || 0;
  const totalGmv = overall?.gmv || 0;

  const salonCounts = ordered.map((t) => ({ name: t.label, total: t.total_salons, active: t.active_salons, inactive: t.inactive_salons }));
  const bookingShare = [...ordered].sort((a, b) => b.bookings - a.bookings).map((t) => ({ name: t.label, value: t.bookings, label: num(t.bookings), pct: share(t.bookings, totalBookings), color: CATEGORY_STYLE[t.key].chart }));
  const gmvShare = [...ordered].sort((a, b) => b.gmv - a.gmv).map((t) => ({ name: t.label, value: t.gmv, label: rupee(t.gmv), pct: share(t.gmv, totalGmv), color: CATEGORY_STYLE[t.key].chart }));
  const averages = [...ordered].sort((a, b) => (b.bookings_per_active_salon || 0) - (a.bookings_per_active_salon || 0));
  const maxAverage = Math.max(0, ...averages.map((t) => t.bookings_per_active_salon || 0));
  const columns = overall ? [...ordered, { key: "overall", label: "Overall", ...overall }] : PLACEHOLDER_COLUMNS;

  // Insights and next steps from the numbers above.
  const insights = [];
  const nextSteps = [];
  const withBookings = ordered.filter((t) => t.bookings);
  if (withBookings.length) {
    const lead = [...withBookings].sort((a, b) => b.bookings - a.bookings)[0];
    insights.push({ icon: TrendingUp, color: "#16A34A", tint: "#EEF9F2", title: `${lead.label}s lead in bookings`, text: `${fmtPct(lead.booking_share)} of bookings and ${fmtPct(share(lead.gmv, totalGmv))} of GMV.` });
    const productive = [...withBookings].filter((t) => isNum(t.bookings_per_active_salon)).sort((a, b) => b.bookings_per_active_salon - a.bookings_per_active_salon)[0];
    if (productive) {
      insights.push({ icon: Users, color: "#2F6FE4", tint: "#EEF3FD", title: "Best productivity", text: `${productive.label}s average ${dec(productive.bookings_per_active_salon)} bookings per active salon.` });
      nextSteps.push(`Onboard more ${productive.label.toLowerCase()}s where demand is high.`);
    }
    const closest = [...withBookings].filter((t) => isNum(t.avg_distance_km)).sort((a, b) => a.avg_distance_km - b.avg_distance_km)[0];
    if (closest) {
      insights.push({ icon: MapPin, color: "#E5365F", tint: "#FDEEF1", title: `${closest.label}s have the shortest radius`, text: `Customers travel ${km(closest.avg_distance_km)} on average.` });
    }
    if (overall?.peak_slot) {
      insights.push({ icon: Clock, color: "#E08700", tint: "#FFF6E8", title: "Peak demand", text: `${overall.peak_slot} on ${overall.peak_day || "most days"} is the busiest slot overall.` });
      nextSteps.push(`Push offers ahead of ${overall.peak_slot.split(" - ")[0]} for better conversions.`);
    }
  }
  const mostInactive = [...ordered].sort((a, b) => b.inactive_salons - a.inactive_salons)[0];
  if (mostInactive?.inactive_salons) nextSteps.push(`Reactivate inactive ${mostInactive.label.toLowerCase()}s (${plural(mostInactive.inactive_salons, "salon")} inactive).`);
  const weakest = [...withBookings].filter((t) => isNum(t.empty_slot_rate)).sort((a, b) => b.empty_slot_rate - a.empty_slot_rate)[0];
  if (weakest) nextSteps.push(`Fill empty slots at ${weakest.label.toLowerCase()}s (${fmtPct(weakest.empty_slot_rate)} unbooked).`);

  const exportDetail = () => {
    if (!data) return;
    downloadCsv(
      `salon-category-performance_${data.from}_${data.to}.csv`,
      ["Metric", ...columns.map((c) => c.label)],
      DETAIL_ROWS.map((row) => [row.label, ...columns.map((c) => row.get(c))])
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
        city={city}
        setCity={changeCity}
        cityOptions={cityOptions}
        area={area}
        setArea={setArea}
        areaOptions={areaOptions}
        onExport={exportDetail}
      />

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - Category summaries */}
        <div className={`grid ${ROW1_COLS} ${GAP}`}>
          {(ordered.length ? ordered : PLACEHOLDER_COLUMNS.slice(0, 3)).map((cat) => (
            <CategoryCard key={cat.key} cat={cat} loading={loading} />
          ))}
        </div>

        {/* Row 2 - Salon counts / booking share / GMV share / productivity */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title="Salon Category - Total vs Active vs Inactive"
              subtitle={data?.unclassified_salons ? `${plural(data.unclassified_salons, "salon")} with no category not shown` : undefined}
            />
            <div className="mt-3 flex items-center justify-center gap-6">
              {COUNT_SERIES.map((series) => (
                <LegendDot key={series.key} dash color={series.color} label={series.name} size={T.nano} />
              ))}
            </div>
            <div className="mt-1 min-h-[170px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salonCounts} margin={{ top: 18, right: 8, bottom: 0, left: -8 }} barGap={4} barCategoryGap="30%">
                  <CartesianGrid stroke="#F1F3F8" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 11 }} dy={6} />
                  <YAxis domain={[0, "auto"]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 11 }} width={38} />
                  <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(109,74,224,0.05)" }} />
                  {COUNT_SERIES.map((series) => (
                    <Bar key={series.key} dataKey={series.key} name={series.name} fill={series.color} radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false}>
                      <LabelList dataKey={series.key} position="top" style={{ fontSize: 11, fill: "#334155" }} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Booking Share by Salon Category" />
            {totalBookings ? (
              <div className="flex flex-1 items-center gap-4 pt-2">
                <Donut data={bookingShare} center={num(totalBookings)} caption="Total Bookings" formatter={num} />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <ShareLegend rows={bookingShare} />
                  <div className="border-t border-slate-100 pt-2" title="Overall also counts salons with no category">
                    <p className={`font-semibold text-slate-800 ${T.xs}`}>Total</p>
                    <p className={`mt-0.5 text-slate-600 ${T.nano}`}>{num(totalBookings)} (100%)</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="GMV Contribution by Category" />
            {totalGmv ? (
              <div className="flex flex-1 items-center gap-4 pt-2">
                <Donut data={gmvShare} center={rupee(totalGmv)} caption="Total GMV" centerSize="text-[17px]" formatter={rupee} />
                <ShareLegend rows={gmvShare} />
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="px-5 py-4">
            <CardHeader title="Average Bookings per Active Salon" />
            {maxAverage ? (
              <ul className="mt-3 flex flex-1 flex-col justify-around gap-3">
                {averages.map((row) => {
                  const style = CATEGORY_STYLE[row.key];
                  const Icon = style.icon;
                  return (
                    <li key={row.key} className="flex items-center gap-3">
                      <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl" style={{ background: style.tint, color: style.color }}>
                        <Icon size={22} />
                      </span>
                      <span className={`w-[96px] shrink-0 whitespace-nowrap text-slate-800 ${T.xs}`}>{row.label}</span>
                      <span className="min-w-0 flex-1">
                        <Meter pct={((row.bookings_per_active_salon || 0) / maxAverage) * 100} color={style.chart} height={5} track="transparent" />
                      </span>
                      <span className={`w-[38px] shrink-0 text-right font-bold text-slate-900 ${T.xs}`}>{dec(row.bookings_per_active_salon)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings at active salons in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 3 - Detailed table / insights */}
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
                    <th className={`border-b border-[#E6E8F0] px-3 py-2 text-left font-semibold text-slate-900 ${T.xs}`} style={{ background: "#F3F4F8" }}>
                      Metrics
                    </th>
                    {columns.map((c, i) => (
                      <th key={c.label} className={`border-b border-l border-[#E6E8F0] px-2 py-2 font-semibold ${T.xs}`} style={HEADER_STYLE[i]}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DETAIL_ROWS.map((row) => {
                    const Icon = row.icon;
                    return (
                      <tr key={row.label} className="h-[26px] border-b border-slate-100 last:border-0">
                        <td className={`px-3 text-left text-slate-800 ${T.xs}`} title={row.hint}>
                          <span className="flex items-center gap-2.5">
                            <Icon size={13} className="shrink-0" style={{ color: BRAND }} />
                            <span className="truncate">{row.label}</span>
                          </span>
                        </td>
                        {columns.map((c) => {
                          const value = row.get(c);
                          return (
                            <td key={c.key} className={`truncate border-l border-slate-100 px-2 text-slate-800 ${T.xs}`} title={value}>
                              {loading ? "…" : value}
                              {row.star && value !== DASH && <Star size={11} className="ml-1 inline text-amber-400" fill="currentColor" strokeWidth={0} />}
                            </td>
                          );
                        })}
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
              {!insights.length && <p className={`py-3 text-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : "Not enough bookings for insights yet."}</p>}
            </div>

            {nextSteps.length > 0 && (
              <>
                <h3 className={`mt-5 font-bold text-slate-900 ${T.sm}`}>What to do next?</h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {nextSteps.map((step) => (
                    <li key={step} className={`flex items-center gap-3 text-slate-700 ${T.xs}`}>
                      <CircleCheck size={16} className="shrink-0" style={{ color: "#5B5FE6" }} />
                      {step}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate("/partner")}
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
