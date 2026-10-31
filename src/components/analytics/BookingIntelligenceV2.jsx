import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { toast } from "react-hot-toast";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  CalendarCheck,
  CalendarRange,
  ChartLine,
  CircleDollarSign,
  CircleX,
  Clock,
  Download,
  MapPin,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { fetchBookingIntelligenceV2 } from "../../redux/slices/analyticsSlice";
import { downloadCsv } from "../../utils/format";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CHART_AXIS as AXIS, rampColor, WRAP } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  KpiTile as BaseKpiTile,
  LegendDot,
  RampLegend,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Booking Intelligence" mockup, on a fixed DESIGN_WIDTH canvas
// that ScaledCanvas scales to the available width (see there for why bigger
// px sizes in T read smaller on screen).
//
// Data: getBookingIntelligenceV2 (analyticsSlice `bookingIntel`). Served
// bookings (paid, not cancelled / refunded, from go-live) by service date;
// the booking time is the booked slot's start (booking_date is date-only), so
// bookings without a slot are left out of the time grids. Cancellation rate =
// paid bookings later cancelled or refunded / paid bookings. The "time of
// day" grid's columns are the window cut into up to 12 equal periods.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const BRAND = "#6D4AE0";
const INDIGO = "#4F46E5";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const PINK = "#F0527E";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = `grid-cols-[520fr_443fr_320fr] ${WRAP[3]}`;
const ROW3_COLS = `grid-cols-[405fr_446fr_432fr] ${WRAP[3]}`;

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1307px of content, so measured sizes carry over at ~1.16x.
const T = {
  nano: "text-[10.5px]", // heat map column labels
  micro: "text-[11px]", // axis text, legend
  xs: "text-[12px]", // grid cells, list sub-lines
  sm: "text-[13px]", // list rows, KPI captions
  base: "text-[14px]", // KPI labels
  title: "text-[16px]", // card titles
  kpi: "text-[26px]", // KPI values
  donut: "text-[22px]", // donut centre total
};

const GAP = "gap-3";
const DASH = "–";

// Solid gradient badges with a white glyph, as drawn in the mockup.
const badge = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

const TOD_RAMP = ["#F6F2FF", "#E3D8FC", "#BEA6F7", "#9468EE", "#7141DC"];
const DOW_RAMP = ["#F0F5FF", "#DCE8FD", "#B3CCFA", "#7FA6F5", "#4A7DE8", "#3B63D9"];
const RANK_COLORS = ["#3730A3", "#8B7CF6", ORANGE, "#F5A524", "#FACC15"];
const DAY_RANK_COLORS = [BRAND, "#5B84E8", ORANGE, "#F5A524", "#FACC15"];
const BAND_COLORS = { night: "#8B5CF6", morning: "#38BDF8", midday: GREEN, afternoon: "#FACC15", evening: "#FB923C", late: PINK };
const THIS_COLOR = "#7C5CF0";
const LAST_COLOR = "#A9B1C2";

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
const BASIS = [
  { value: "bookings", label: "By Bookings" },
  { value: "gmv", label: "By Revenue" },
];
const GRANULARITY = [
  { value: "day", label: "By Day" },
  { value: "week", label: "By Week" },
];

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const num = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : DASH);
const rupee = (v) => (isNum(v) ? `₹${num(v)}` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const compact = (v) => (v >= 100000 ? `${Number((v / 100000).toFixed(1))}L` : v >= 1000 ? `${Number((v / 1000).toFixed(1))}K` : `${v}`);
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : DASH);
// "2026-10-01|2026-10-03" -> "Oct 1-3"; a single day -> "Oct 1".
const periodLabel = (p) => {
  const [a, b] = String(p).split("|");
  if (!b) return fmtDay(a);
  return moment(a).month() === moment(b).month() ? `${moment(a).format("MMM D")}-${moment(b).format("D")}` : `${fmtDay(a)}-${fmtDay(b)}`;
};
const change = (cur, prev, points = false) => {
  if (!isNum(cur) || !isNum(prev)) return null;
  const diff = points ? cur - prev : prev ? ((cur - prev) / prev) * 100 : null;
  if (diff === null) return null;
  return { value: `${Math.abs(diff).toFixed(1)}${points ? " pts" : "%"}`, up: diff >= 0 };
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.micro} {...props} />;

const Select = ({ size = T.micro, ...props }) => <BaseSelect size={size} className="w-[104px] [&_select]:py-1" {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.base, value: T.kpi, delta: T.sm, caption: T.sm }}
    iconClass="h-[58px] w-[58px] rounded-xl"
    iconSize={26}
    iconColor="#fff"
    className="px-5 py-5"
    {...props}
  />
);

const Donut = (props) => <BaseDonut size={196} inner="70%" centerSize={T.donut} captionSize={T.sm} formatter={(value) => num(value)} {...props} />;

const EmptyNote = ({ children }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs}`}>
    <p className="max-w-[300px]">{children}</p>
  </div>
);

// Heat map with the value written in every cell. Text turns white once the
// tint is dark enough to need it.
const NumberGrid = ({ rows, cols, values, ramp, labelWidth, cellHeight, labelSize, cellSize, colSize, unit, fmt = num }) => {
  const max = Math.max(1, ...values.flat());
  return (
    <div className="grid min-w-0 items-center" style={{ gridTemplateColumns: `${labelWidth}px repeat(${cols.length}, minmax(0, 1fr))`, gap: 3 }}>
      <span />
      {cols.map((col, c) => (
        <span key={c} className={`truncate pb-1 text-center leading-none text-slate-500 ${colSize}`} title={col}>
          {col}
        </span>
      ))}

      {values.map((row, r) => (
        <Fragment key={rows[r]}>
          <span className={`whitespace-nowrap leading-none text-slate-600 ${labelSize}`}>{rows[r]}</span>
          {row.map((value, c) => (
            <span
              key={c}
              title={`${rows[r]} · ${cols[c]} · ${fmt(value)} ${unit}`}
              className={`grid place-items-center overflow-hidden rounded-[3px] font-medium ${cellSize}`}
              style={{ height: cellHeight, background: rampColor(ramp, value / max), color: value / max >= 0.55 ? "#fff" : "#475569" }}
            >
              {value ? compact(Math.round(value)) : ""}
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
};

// Ranked list with a coloured position badge and a bar beside the count.
const RankList = ({ rows, colors, barFrom, barTo }) => {
  const max = Math.max(1, ...rows.map((row) => row.bookings));
  return (
    <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
      {rows.map((row, i) => (
        <li key={row.label} className={`flex items-center gap-3 ${T.sm}`} title={`${rupee(row.gmv)} GMV`}>
          <span className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-bold text-white ${T.micro}`} style={{ background: colors[i] }}>
            {i + 1}
          </span>
          <span className="w-[92px] shrink-0 whitespace-nowrap font-medium text-slate-800">{row.label}</span>
          <span className="min-w-0 flex-1">
            <span className="block h-[3px] rounded-full" style={{ width: `${(row.bookings / max) * 100}%`, background: `linear-gradient(90deg, ${barFrom}, ${barTo})` }} />
          </span>
          <span className="shrink-0 whitespace-nowrap text-right text-slate-500">
            {num(row.bookings)} {row.bookings === 1 ? "booking" : "bookings"}
          </span>
        </li>
      ))}
    </ul>
  );
};

const TrendTooltip = ({ active, payload, fmt }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E3E7EF] bg-white px-3 py-2 shadow-lg">
      {payload.map((entry) => (
        <p key={entry.dataKey} className={`mt-1 flex items-center gap-1.5 text-slate-600 ${T.xs}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
          {entry.dataKey === "current" ? row.curLabel : row.prevLabel}: <span className="font-semibold text-slate-900">{fmt(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, city, setCity, cityOptions, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">Understand booking patterns to grow your business</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="bi-range" className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
        <HeaderButton icon={Download} label="Download report" color={INDIGO} onClick={onExport}>
          <span className="hidden md:inline">Download Report</span>
        </HeaderButton>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BookingIntelligenceV2 = ({ title = "Booking Intelligence" }) => {
  const dispatch = useDispatch();
  const { bookingIntel } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState("last_30");
  const [custom, setCustom] = useState(null);
  const [city, setCity] = useState("all");
  const [gridBasis, setGridBasis] = useState("bookings");
  const [slotBasis, setSlotBasis] = useState("bookings");
  const [trendBasis, setTrendBasis] = useState("day");

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[1]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  useEffect(() => {
    const body = { from: range.from, to: range.to };
    if (city !== "all") body.city = city;
    dispatch(fetchBookingIntelligenceV2(body))
      .unwrap()
      .catch((message) => toast.error(message || "Failed to load booking intelligence", { id: "bi-v2" }));
  }, [dispatch, range.from, range.to, city]);

  const data = bookingIntel.data;
  const loading = bookingIntel.loading && !data;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const shown = (v, fmt) => (loading ? "…" : fmt(v));
  const cityOptions = useMemo(() => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))], [data]);
  const gridFmt = gridBasis === "gmv" ? rupee : num;
  const gridUnit = gridBasis === "gmv" ? "GMV" : "bookings";

  const kpi = (label, key, fmt, icon, tint, { points = false, inverse = false } = {}) => {
    const delta = change(k[key], pk[key], points);
    return {
      label,
      value: shown(k[key], fmt),
      delta: delta?.value,
      up: delta?.up,
      // A falling cancellation rate is good news, so it's drawn green.
      good: delta ? (inverse ? !delta.up : delta.up) : undefined,
      caption: compare,
      icon,
      tint,
    };
  };
  const kpis = [
    kpi("Total Bookings", "bookings", num, CalendarCheck, badge("#8B6CF6", "#6D4AE0")),
    kpi("Total GMV", "gmv", rupee, CircleDollarSign, badge("#4CCB7E", "#22A95A")),
    kpi("Total Customers", "customers", num, UsersRound, badge("#FFB347", "#F58A1F")),
    kpi("Avg. Booking Value", "aov", rupee, ChartLine, badge("#4F8DF7", "#2B62E8")),
    kpi("Cancellation Rate", "cancellation_rate", fmtPct, CircleX, badge("#FF7A93", "#F0447A"), { points: true, inverse: true }),
  ];

  const slots = data?.slots || [];
  const timedTotal = (data?.by_weekday?.bookings || []).flat().reduce((t, v) => t + v, 0);
  const periodCols = (data?.by_period?.periods || []).map(periodLabel);
  const periodGrid = data?.by_period?.[gridBasis] || [];
  const weekdayGrid = data?.by_weekday?.[gridBasis] || [];
  const peakHours = data?.peak_hours || [];
  const busiestDays = data?.busiest_days || [];
  const bands = data?.day_bands || [];
  const bandTotal = bands.reduce((t, b) => t + b[slotBasis], 0);
  const timeSlots = bands.map((b) => ({ name: b.label, value: b[slotBasis], pct: bandTotal ? (b[slotBasis] / bandTotal) * 100 : null, color: BAND_COLORS[b.key] }));

  // Day by day, or summed per 7-day block; current and previous aligned by position.
  const trend = useMemo(() => {
    if (!data) return [];
    const cur = data.trend.current;
    const prev = data.trend.previous;
    const rows = cur.map((d, i) => ({
      label: fmtDay(d.day),
      curLabel: fmtDay(d.day),
      prevLabel: fmtDay(prev[i]?.day),
      current: d.bookings,
      previous: prev[i]?.bookings ?? 0,
    }));
    if (trendBasis === "day") return rows;
    const weeks = [];
    for (let i = 0; i < rows.length; i += 7) {
      const part = rows.slice(i, i + 7);
      const last = part[part.length - 1];
      weeks.push({
        label: `${part[0].label}`,
        curLabel: `${part[0].curLabel} – ${last.curLabel}`,
        prevLabel: `${part[0].prevLabel} – ${last.prevLabel}`,
        current: part.reduce((t, r) => t + r.current, 0),
        previous: part.reduce((t, r) => t + r.previous, 0),
      });
    }
    return weeks;
  }, [data, trendBasis]);

  // Insights from the numbers above.
  const insights = [];
  const topBand = [...bands].sort((a, b) => b.bookings - a.bookings)[0];
  if (topBand?.bookings) {
    insights.push({
      icon: Clock,
      color: "#3B6FE0",
      tint: "#E8EEFC",
      title: "Peak Time Alert",
      text: `Most bookings are for ${topBand.label} (${fmtPct((topBand.bookings / Math.max(1, timedTotal)) * 100)}). Make sure salons have staff and open slots then.`,
    });
  }
  const totals = data?.weekday_totals || [];
  if (totals.some((d) => d.bookings)) {
    const avg = (list) => list.reduce((t, d) => t + d.bookings, 0) / list.length;
    const weekend = avg(totals.slice(5));
    const weekday = avg(totals.slice(0, 5));
    const diff = weekday ? ((weekend - weekday) / weekday) * 100 : null;
    if (isNum(diff)) {
      insights.push({
        icon: CalendarRange,
        color: "#16A34A",
        tint: "#E3F5E9",
        title: diff >= 0 ? "Weekend Rush" : "Weekday Demand",
        text: `An average weekend day gets ${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? "more" : "fewer"} bookings than a weekday.`,
      });
    }
  }
  const quiet = bands.filter((b) => b.key !== "night" && b.key !== "late").sort((a, b) => a.bookings - b.bookings)[0];
  if (quiet && topBand?.bookings) {
    insights.push({
      icon: TrendingUp,
      color: "#E5365F",
      tint: "#FDE8EC",
      title: "Growth Opportunity",
      text: `${quiet.label} is the quietest daytime band (${num(quiet.bookings)} bookings). Run time-bound offers to fill it.`,
    });
  }

  const exportReport = () => {
    if (!data) return;
    downloadCsv(
      `booking-intelligence-${data.from}_${data.to}.csv`,
      ["Time slot", ...data.by_weekday.weekdays.flatMap((w) => [`${w} bookings`, `${w} GMV`])],
      slots.map((slot, r) => [slot, ...data.by_weekday.weekdays.flatMap((_, c) => [data.by_weekday.bookings[r][c], data.by_weekday.gmv[r][c]])])
    );
  };

  const untimedNote = data?.untimed_bookings ? `${num(data.untimed_bookings)} bookings without a slot time aren't shown` : undefined;

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
        onExport={exportReport}
      />

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - KPI tiles */}
        <div className={`grid grid-cols-5 ${WRAP[5]} ${GAP}`}>
          {kpis.map(({ icon, tint, ...tile }) => (
            <KpiTile key={tile.label} {...tile} icon={icon} iconTint={tint} />
          ))}
        </div>

        {/* Row 2 - Heat maps / peak lists */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <Card className="px-5 pb-5 pt-5">
            <CardHeader
              title="Heat Map - Time of Day"
              subtitle={untimedNote || "Booked slot time across the selected dates"}
              right={<Select value={gridBasis} onChange={setGridBasis} options={BASIS} />}
            />
            {timedTotal ? (
              <>
                <div className="mt-5">
                  <NumberGrid rows={slots} cols={periodCols} values={periodGrid} ramp={TOD_RAMP} labelWidth={96} cellHeight={26} labelSize={T.nano} cellSize={T.nano} colSize={T.nano} unit={gridUnit} fmt={gridFmt} />
                </div>
                <div className="mt-auto pt-4">
                  <RampLegend ramp={TOD_RAMP} from="Low" to="High" size={T.micro} steps={10} width={290} height={9} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No timed bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="px-5 pb-5 pt-5">
            <CardHeader title="Heat Map - Day of Week" subtitle={gridBasis === "gmv" ? "GMV (₹)" : "Bookings"} />
            {timedTotal ? (
              <>
                <div className="mt-5">
                  <NumberGrid rows={slots} cols={data.by_weekday.weekdays} values={weekdayGrid} ramp={DOW_RAMP} labelWidth={92} cellHeight={26} labelSize={T.nano} cellSize={T.xs} colSize={T.xs} unit={gridUnit} fmt={gridFmt} />
                </div>
                <div className="mt-auto pt-4">
                  <RampLegend ramp={DOW_RAMP} from="Low" to="High" size={T.micro} steps={10} width={250} height={9} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No timed bookings in this period"}</EmptyNote>
            )}
          </Card>

          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <Card className="flex-[250] px-5 pb-4 pt-5">
              <CardHeader title="Peak Hours" right={<span className={`text-slate-500 ${T.micro}`}>By Total Bookings</span>} />
              {peakHours.length ? <RankList rows={peakHours} colors={RANK_COLORS} barFrom="#CFC3F8" barTo={BRAND} /> : <EmptyNote>{loading ? "Loading…" : "No timed bookings"}</EmptyNote>}
            </Card>

            <Card className="flex-[176] px-5 pb-4 pt-5">
              <CardHeader title="Busiest Days" right={<span className={`text-slate-500 ${T.micro}`}>By Total Bookings</span>} />
              {busiestDays.length ? <RankList rows={busiestDays} colors={DAY_RANK_COLORS} barFrom="#C9D5F7" barTo="#5B84E8" /> : <EmptyNote>{loading ? "Loading…" : "No bookings"}</EmptyNote>}
            </Card>
          </div>
        </div>

        {/* Row 3 - Time slots / trend / insights */}
        <div className={`grid ${ROW3_COLS} ${GAP}`}>
          <Card className="p-5">
            <CardHeader title="Bookings by Time Slot" right={<Select value={slotBasis} onChange={setSlotBasis} options={BASIS} />} />
            {bandTotal ? (
              <div className="flex flex-1 items-center gap-6 pt-3">
                <Donut data={timeSlots} center={slotBasis === "gmv" ? `₹${compact(Math.round(bandTotal))}` : num(bandTotal)} caption={slotBasis === "gmv" ? "GMV" : "Total"} />
                <ul className="flex min-w-0 flex-1 flex-col gap-[13px]">
                  {timeSlots.map((slot) => (
                    <li key={slot.name} className={`flex items-center gap-2 ${T.sm}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slot.color }} />
                      <span className="min-w-0 flex-1 whitespace-nowrap text-slate-700">{slot.name}</span>
                      <span className="w-[42px] shrink-0 text-right text-slate-500">{fmtPct(slot.pct)}</span>
                      <span className="w-[52px] shrink-0 text-right font-medium text-slate-700">{slotBasis === "gmv" ? compact(Math.round(slot.value)) : num(slot.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No timed bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-5">
            <CardHeader title="Booking Trend" right={<Select value={trendBasis} onChange={setTrendBasis} options={GRANULARITY} />} />
            <div className="mt-3 flex items-center justify-center gap-6">
              <LegendDot line color={THIS_COLOR} label={data ? fmtRange(data.from, data.to) : "This Period"} size={T.micro} />
              <LegendDot line color={LAST_COLOR} label={data ? fmtRange(data.previous.from, data.previous.to) : "Previous Period"} size={T.micro} />
            </div>
            {trend.length ? (
              <div className="mt-1 min-h-[190px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 14, bottom: 0, left: -6 }}>
                    <defs>
                      <linearGradient id="bi-trend-current" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={THIS_COLOR} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={THIS_COLOR} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bi-trend-previous" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={LAST_COLOR} stopOpacity={0.14} />
                        <stop offset="100%" stopColor={LAST_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#EEF0F6" vertical={false} />
                    <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 11 }} dy={6} padding={{ left: 8, right: 8 }} />
                    <YAxis domain={[0, "auto"]} allowDecimals={false} tickFormatter={(v) => compact(v)} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 11 }} width={38} />
                    <Tooltip content={<TrendTooltip fmt={num} />} cursor={{ stroke: "#CBD2E0", strokeDasharray: "3 3" }} />
                    <Area type="monotone" dataKey="previous" stroke={LAST_COLOR} strokeWidth={1.8} fill="url(#bi-trend-previous)" dot={trend.length <= 31 ? { r: 2.4, fill: LAST_COLOR, strokeWidth: 0 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
                    <Area type="monotone" dataKey="current" stroke={THIS_COLOR} strokeWidth={2} fill="url(#bi-trend-current)" dot={trend.length <= 31 ? { r: 2.6, fill: THIS_COLOR, strokeWidth: 0 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </Card>

          <Card className="p-5">
            <CardHeader title="Insights & Recommendations" />
            <ul className="mt-4 flex flex-1 flex-col justify-around gap-4">
              {insights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-4">
                    <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full" style={{ background: item.tint, color: item.color }}>
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={`font-semibold text-slate-900 ${T.base}`}>{item.title}</p>
                      <p className={`mt-1 text-slate-500 ${T.sm}`}>{item.text}</p>
                    </div>
                  </li>
                );
              })}
              {!insights.length && <li className={`text-center text-slate-400 ${T.sm}`}>{loading ? "Loading…" : "Not enough bookings for insights yet."}</li>}
            </ul>
          </Card>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default BookingIntelligenceV2;
