import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { toast } from "react-hot-toast";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Boxes,
  Brush,
  CalendarCheck,
  ChartNoAxesCombined,
  Crown,
  Download,
  Droplets,
  Ellipsis,
  Footprints,
  Gift,
  Hand,
  Heart,
  MapPin,
  Palette,
  ReceiptIndianRupee,
  Scissors,
  Sparkles,
  Sun,
  Tag,
  Ticket,
  TrendingUp,
  TriangleAlert,
  Users,
  Wind,
} from "lucide-react";
import { fetchServiceIntelligenceV2 } from "../../redux/slices/analyticsSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
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
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Service Intelligence Dashboard" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// Data: getServiceIntelligenceV2 (analyticsSlice `serviceIntel`). Served
// bookings (paid, not cancelled / refunded, from go-live) by service date.
// Service names are free text per salon, so the API groups them ignoring
// case and spacing ("Hair cut" = "Haircut"). Men's / Women's rankings split by
// the customer's gender (the guest's for guest bookings); "Salon category"
// narrows to men's / women's / unisex salons.
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
const DASH = "–";

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
const SALON_CATEGORIES = [
  { value: "all", label: "All Salon Categories" },
  { value: "men", label: "Men's Salons" },
  { value: "women", label: "Women's Salons" },
  { value: "unisex", label: "Unisex Salons" },
];
const SEGMENTS = [
  { value: "men", label: "Men's" },
  { value: "women", label: "Women's" },
  { value: "all", label: "All" },
];

// Glyph and colour by keyword in the service name; anything else gets dots.
const SERVICE_STYLES = [
  { re: /beard|shave|trim/i, icon: Brush, color: "#2563EB" },
  { re: /hair ?cut|cut/i, icon: Scissors, color: "#5B3FF0" },
  { re: /spa|wash|massage/i, icon: Droplets, color: "#2563EB" },
  { re: /facial|clean|glow/i, icon: Sparkles, color: "#16A34A" },
  { re: /colou?r|highlight/i, icon: Palette, color: "#E11D48" },
  { re: /tan|bleach/i, icon: Sun, color: "#EA580C" },
  { re: /manicure|nail/i, icon: Hand, color: "#D97706" },
  { re: /pedicure|foot/i, icon: Footprints, color: "#E11D6A" },
  { re: /smooth|keratin|straight|rebond/i, icon: Wind, color: "#DB2777" },
  { re: /wax|thread/i, icon: Sparkles, color: "#D97706" },
];
const FALLBACK_STYLE = { icon: Ellipsis, color: "#64748B" };
const styleOf = (name) => SERVICE_STYLES.find((s) => s.re.test(name || "")) || FALLBACK_STYLE;

const CATEGORY_COLORS = ["#6D4AE0", GREEN, "#FBBF24", "#F97316", RED, "#9CA3AF"];
const TREND_COLORS = ["#6D4AE0", GREEN, ORANGE];
const PEAK_RAMP = ["#F3F0FF", "#D5C9FB", "#A58CF2", "#7A55EB", "#5B3FF0"];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN") : DASH);
const rupee = (v) => (isNum(v) ? `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const compact = (v) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}K` : `${v}`);
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : DASH);
const change = (cur, prev, { points = false } = {}) => {
  if (!isNum(cur) || !isNum(prev)) return null;
  const diff = points ? cur - prev : prev ? ((cur - prev) / prev) * 100 : null;
  if (diff === null) return null;
  return { value: `${Math.abs(diff).toFixed(1)}${points ? " pts" : "%"}`, up: diff >= 0 };
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;
const Segmented = (props) => <BaseSegmented size={T.micro} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.micro }}
    iconClass="h-11 w-11 rounded-full"
    iconSize={20}
    className="px-4 py-4"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut size={176} inner="64%" centerSize={T.donut} captionSize={T.sm} formatter={(value) => num(value)} {...props} />
);

// Centred grey note for a card with nothing to show yet.
const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[300px]">{children}</p>
  </div>
);

// Small outlined circle holding a service glyph.
const ServiceGlyph = ({ name, color }) => {
  const style = styleOf(name);
  const Icon = style.icon;
  const tone = color || style.color;
  return (
    <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border" style={{ borderColor: tone, color: tone }}>
      <Icon size={10} />
    </span>
  );
};

// Column widths (%) measured per card: the left card is wider and its bar
// column longer, so the two can't share one set.
const COLS_LEFT = [22, 24, 12, 18, 24];
const COLS_RIGHT = [37.7, 11.3, 17.8, 15.2, 18];

// Ranking table with the Men's / Women's / All toggle; two cards share it.
const ServicesCard = ({ rows, segment, setSegment, cols, loading, coverage }) => {
  const max = Math.max(0, ...rows.filter((r) => r.key !== "others").map((r) => r.bookings));
  return (
    <Card className="p-4">
      <CardHeader
        title="Top Services by Bookings"
        subtitle={segment !== "all" && isNum(coverage) ? `By customer gender · known for ${fmtPct(coverage)} of bookings` : undefined}
        right={<Segmented value={segment} onChange={setSegment} options={SEGMENTS} />}
      />
      {rows.length ? (
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
              <tr key={row.key} className="h-[24px]">
                <td className={`whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <ServiceGlyph name={row.name} />
                    <span className="truncate" title={row.name}>
                      {row.name}
                    </span>
                  </span>
                </td>
                <td className="pr-3">
                  <Meter
                    pct={max ? (row.bookings / max) * 100 : 0}
                    height={3}
                    track="transparent"
                    color={`rgba(91,63,240,${Math.max(0.45, 1 - i * 0.08).toFixed(2)})`}
                  />
                </td>
                <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{num(row.bookings)}</td>
                <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtPct(row.share)}</td>
                <td className={`whitespace-nowrap text-right text-slate-700 ${T.xs}`}>{num(Math.round(row.gmv))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
      )}
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

// Tiny bookings line for the repeat-rate table, scaled to its own peak.
const MiniLine = ({ points, color }) => {
  if (!points?.length) return null;
  const max = Math.max(1, ...points);
  const step = 100 / Math.max(1, points.length - 1);
  const path = points.map((p, i) => `${(i * step).toFixed(1)},${(92 - (p / max) * 84).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[18px] w-full" aria-hidden="true">
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
};

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, city, setCity, cityOptions, category, setCategory, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Deep insights on service performance, preferences &amp; trends</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="svc-range" className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
        <HeaderSelect label="Salon category" value={category} onChange={setCategory} options={SALON_CATEGORIES} className="hidden xl:flex" />
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
  const dispatch = useDispatch();
  const { serviceIntel } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [custom, setCustom] = useState(null);
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [leftSegment, setLeftSegment] = useState("men");
  const [rightSegment, setRightSegment] = useState("women");

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  useEffect(() => {
    const body = { from: range.from, to: range.to };
    if (city !== "all") body.city = city;
    if (category !== "all") body.salon_type = category;
    dispatch(fetchServiceIntelligenceV2(body))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load service intelligence", { id: "svc-v2" }));
  }, [dispatch, range.from, range.to, city, category]);

  const data = serviceIntel.data;
  const loading = serviceIntel.loading && !data;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const shown = (v, fmt = num) => (loading ? "…" : fmt(v));
  const cityOptions = useMemo(
    () => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))],
    [data]
  );

  const kpi = (label, key, fmt, icon, color, tint, opts = {}) => {
    const delta = change(k[key], pk[key], opts);
    return { label, value: shown(k[key], fmt), delta: delta?.value, up: delta?.up, caption: compare, icon, color, tint, filled: opts.filled };
  };
  const kpis = [
    kpi("Total Bookings", "bookings", num, CalendarCheck, BRAND, "#EEEAFD"),
    kpi("Total GMV", "gmv", rupee, ReceiptIndianRupee, "#16A34A", "#DCFCE7"),
    kpi("Unique Services Booked", "unique_services", num, Boxes, BLUE, "#DBEAFE"),
    kpi("Avg. Service Price", "avg_service_price", rupee, Ticket, "#F97316", "#FFEDD5"),
    kpi("Service Add-on Rate", "addon_rate", fmtPct, Gift, "#E11D6A", "#FDE7F0", { points: true }),
    kpi("Repeat Service Rate", "repeat_service_rate", fmtPct, Heart, "#E11D48", "#FFE4E6", { points: true, filled: true }),
  ];

  const services = data?.services || { all: [], men: [], women: [] };
  const categories = (data?.categories || []).map((c, i) => ({ name: c.name, value: c.bookings, pct: c.share, color: CATEGORY_COLORS[i] }));
  const trendServices = data?.trend?.services || [];
  const trend = (data?.trend?.days || []).map((d) => ({ ...d, label: fmtDay(d.day) }));
  const addons = data?.addons || [];
  const priceBands = data?.price_bands || [];
  const maxPrice = Math.max(0, ...priceBands.map((b) => b.share || 0));
  const peak = data?.peak;
  const peakMax = peak ? Math.max(0, ...peak.values.flat()) : 0;
  const peakValues = peak ? peak.values.map((row) => row.map((v) => (peakMax ? v / peakMax : 0))) : [];
  const repeat = data?.repeat || [];
  const preferences = data?.preferences || [];
  const PREF_STYLE = {
    new: { icon: Users, color: "#5B3FF0", tint: "#F4F2FE" },
    returning: { icon: ChartNoAxesCombined, color: "#16A34A", tint: "#EEF9F3" },
    high_spenders: { icon: Crown, color: "#5B3FF0", tint: "#F0EFFE" },
    offer: { icon: Tag, color: "#D4A017", tint: "#FEF9E7" },
  };

  // Insights from the numbers above.
  const insights = [];
  const topMen = services.men.find((s) => s.key !== "others");
  const topAll = services.all.find((s) => s.key !== "others");
  if (topMen || topAll) {
    const s = topMen || topAll;
    insights.push({
      icon: TrendingUp,
      color: "#0E9F6E",
      tint: "#EEF9F3",
      title: "Highest Demand Service",
      text: `${s.name} is the most booked service${topMen ? " for men" : ""} (${fmtPct(s.share)}).`,
    });
  }
  const topRevenue = [...services.women, ...services.men].filter((s) => s.key !== "others").sort((a, b) => b.gmv - a.gmv)[0];
  if (topRevenue) {
    insights.push({ icon: Crown, color: "#E11D48", tint: "#FDF0F3", title: "Highest Revenue Service", text: `${topRevenue.name} earns the most (${rupee(topRevenue.gmv)}).` });
  }
  const bestRepeat = [...repeat].filter((r) => isNum(r.rate)).sort((a, b) => b.rate - a.rate)[0];
  if (bestRepeat) {
    insights.push({ icon: ChartNoAxesCombined, color: "#2563EB", tint: "#EFF4FE", title: "Most Rebooked Service", text: `${fmtPct(bestRepeat.rate)} of ${bestRepeat.name} bookings come from customers who booked it before.` });
  }
  const weakAddon = [...addons].filter((a) => a.key !== "others").sort((a, b) => a.attach_rate - b.attach_rate)[0];
  if (weakAddon) {
    insights.push({ icon: TriangleAlert, color: "#D97706", tint: "#FEF5EA", title: "Low Attach Rate", text: `${weakAddon.name} is added to only ${fmtPct(weakAddon.attach_rate)} of bookings. Promote it with combos.` });
  }

  const exportReport = () => {
    if (!data) return;
    downloadCsv(
      `service-intelligence-${data.from}_${data.to}.csv`,
      ["Segment", "Service", "Bookings", "Share", "GMV (INR)", "Repeat Rate"],
      ["all", "men", "women"].flatMap((seg) => (services[seg] || []).map((s) => [seg, s.name, s.bookings, fmtPct(s.share), s.gmv, fmtPct(s.repeat_rate)]))
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
        setCity={setCity}
        cityOptions={cityOptions}
        category={category}
        setCategory={setCategory}
        onExport={exportReport}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - KPI tiles */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, filled, ...tile }) => (
            <KpiTile key={tile.label} {...tile} icon={icon} iconColor={color} iconTint={tint} iconFill={filled} />
          ))}
        </div>

        {/* Row 2 - Top services x2 / category share */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <ServicesCard rows={services[leftSegment] || []} segment={leftSegment} setSegment={setLeftSegment} cols={COLS_LEFT} loading={loading} coverage={data?.gender_coverage} />
          <ServicesCard rows={services[rightSegment] || []} segment={rightSegment} setSegment={setRightSegment} cols={COLS_RIGHT} loading={loading} coverage={data?.gender_coverage} />

          <Card className="p-4">
            <CardHeader title="Bookings Share by Service Category" />
            {categories.length ? (
              <div className="flex flex-1 items-center gap-6">
                <Donut data={categories} center={num(k.bookings)} caption="Total Bookings" />
                <ul className="flex min-w-0 flex-1 flex-col gap-[14px]">
                  {categories.map((row) => (
                    <li key={row.name} className={`flex items-center gap-2 ${T.sm}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
                      <span className="w-[40px] shrink-0 text-right text-slate-600">{fmtPct(row.pct)}</span>
                      <span className="w-[48px] shrink-0 text-right text-slate-500">({num(row.value)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 3 - Trend / add-ons / price distribution */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Service Trend Over Time" subtitle="Daily bookings of the three most booked services" />
            <div className="mt-3 flex items-center justify-center gap-7">
              {trendServices.map((s, i) => (
                <LegendDot key={s.key} dash color={TREND_COLORS[i]} label={s.name} size={T.micro} />
              ))}
            </div>
            {trend.length && trendServices.length ? (
              <div className="mt-1 min-h-[148px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 14, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke="#F1F3F8" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} dy={6} interval="preserveStartEnd" minTickGap={14} padding={{ left: 10, right: 6 }} />
                    <YAxis domain={[0, "auto"]} allowDecimals={false} tickFormatter={(v) => (v === 0 ? "0" : compact(v))} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10 }} width={34} />
                    <Tooltip content={<TrendTooltip />} cursor={false} />
                    {trendServices.map((s, i) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.name}
                        stroke={TREND_COLORS[i]}
                        strokeWidth={1.8}
                        dot={trend.length <= 31 ? { r: 2.6, fill: TREND_COLORS[i], strokeWidth: 0 } : false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Service Add-on Performance" subtitle="Extra services in multi-service bookings" />
            {addons.length ? (
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
                  {addons.map((row) => (
                    <tr key={row.key} className="h-[22px]">
                      <td className={`max-w-[150px] whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                        <span className="flex min-w-0 items-center gap-2">
                          <ServiceGlyph name={row.name} color={BRAND} />
                          <span className="truncate">{row.name}</span>
                        </span>
                      </td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{num(row.bookings)}</td>
                      <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtPct(row.attach_rate)}</td>
                      <td className={`whitespace-nowrap text-right text-slate-700 ${T.xs}`}>{num(Math.round(row.gmv))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No multi-service bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Service Price Distribution" subtitle="Share of booked services by charged price" />
            {priceBands.some((b) => b.items) ? (
              <ul className="mt-4 flex flex-1 flex-col justify-around gap-2.5">
                {priceBands.map((row) => (
                  <li key={row.key} className={`flex items-center gap-3 ${T.xs}`} title={`${num(row.items)} services`}>
                    <span className="w-[78px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="block h-[4px] shrink-0 rounded-full"
                        style={{ width: `${maxPrice ? ((row.share || 0) / maxPrice) * 84 : 0}%`, background: "linear-gradient(90deg,#8B74F5,#5B3FF0)" }}
                      />
                      <span className="shrink-0 text-slate-600">{fmtPct(row.share)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>
        </div>

        {/* Row 4 - Peak days / repeat rate / insights */}
        <div className={`grid ${ROW_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Peak Booking Days by Service Category" />
            {peakMax ? (
              <>
                <div className="mt-3">
                  <BaseHeatGrid
                    values={peakValues}
                    ramp={PEAK_RAMP}
                    rowLabels={peak.categories}
                    colLabels={peak.weekdays}
                    labelSize={T.micro}
                    labelWidth={78}
                    cellHeight={21}
                    gap={2}
                    radius={2}
                    title={(r, c) => `${peak.categories[r]} · ${peak.weekdays[c]} · ${num(peak.values[r][c])} bookings`}
                  />
                </div>
                <div className="mt-auto pt-2">
                  <RampLegend ramp={PEAK_RAMP} from="Low" to="High" size={T.micro} width={220} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Repeat Rate by Service" subtitle="Bookings by customers who booked the service before" />
            {repeat.length ? (
              <table className="mt-3 w-full table-auto border-collapse text-left">
                <thead>
                  <tr>
                    <th className={`pb-2 pr-2 font-medium text-slate-500 ${T.nano}`}>Service</th>
                    <th className={`pb-2 pr-2 text-right font-medium text-slate-500 ${T.nano}`}>Repeat Rate</th>
                    <th className={`pb-2 pl-6 font-medium text-slate-500 ${T.nano}`}>Bookings Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {repeat.map((row) => {
                    const good = isNum(row.rate) && row.rate >= 40;
                    return (
                      <tr key={row.key} className="h-[26px]">
                        <td className={`max-w-[150px] whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                          <span className="flex min-w-0 items-center gap-2">
                            <ServiceGlyph name={row.name} color={good ? "#16A34A" : "#D97706"} />
                            <span className="truncate">{row.name}</span>
                          </span>
                        </td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtPct(row.rate)}</td>
                        <td className="w-[30%] pl-6">
                          <MiniLine points={row.series} color={good ? GREEN : ORANGE} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
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
              {!insights.length && <p className={`col-span-2 py-3 text-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : "Not enough data for insights yet."}</p>}
            </div>
          </Card>
        </div>

        {/* Row 5 - Preferences by customer group */}
        <Card className="px-4 pb-3.5 pt-3.5">
          <CardHeader title="Service Preferences by Customer Group" />
          <div className={`mt-2.5 grid grid-cols-4 ${GAP}`}>
            {preferences.map((item) => {
              const style = PREF_STYLE[item.key] || PREF_STYLE.new;
              return (
                <InsightTile
                  key={item.key}
                  plain
                  icon={style.icon}
                  color={style.color}
                  tint={style.tint}
                  title={item.label}
                  titleSize={T.xs}
                  textSize={T.xs}
                  iconClass="h-9 w-9"
                  iconSize={30}
                  padding="px-4 py-2.5"
                >
                  {item.top.length ? (
                    <>
                      <span className="block">
                        Most booked: {item.top[0].name} ({fmtPct(item.top[0].share)})
                      </span>
                      {item.top[1] && (
                        <span className="block">
                          Followed by: {item.top[1].name} ({fmtPct(item.top[1].share)})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="block text-slate-400">No bookings in this group</span>
                  )}
                </InsightTile>
              );
            })}
          </div>
        </Card>
      </ScaledCanvas>
    </>
  );
};

export default ServiceIntelligenceV2;
