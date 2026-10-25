import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { toast } from "react-hot-toast";
import { CircleF, GoogleMap, OverlayViewF, useLoadScript } from "@react-google-maps/api";
import {
  ArrowRight,
  CalendarClock,
  ChartColumn,
  ChevronDown,
  CircleDollarSign,
  Info,
  LocateFixed,
  MapPin,
  MapPinned,
  Minus,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  Store,
  UserRound,
} from "lucide-react";
import { fetchSalonHeatmapV2 } from "../../redux/slices/analyticsSlice";
import { downloadXlsx } from "../../utils/excelExport";
import { rupees } from "../../utils/format";
import { GOOGLE_MAPS_LOADER } from "../../utils/googleMaps";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas, { Unscaled } from "../v2/ScaledCanvas";
import { useCanvasScale } from "../v2/canvasScaleContext";
import { Card, DateRangeButton, Delta, HeaderSelect, KpiTile as BaseKpiTile, ListDialog, Select as BaseSelect } from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Salon Analytics - Heatmap" mockup, on a fixed DESIGN_WIDTH
// canvas that ScaledCanvas scales to the available width (see there for why
// bigger px sizes in T read smaller on screen).
//
// Data: getSalonHeatmapV2 (analyticsSlice `salonHeatmap`). Served bookings
// (paid, not cancelled / refunded, from go-live) grouped by the salon's area;
// area names are free text, so the API groups them case / punctuation
// insensitively, and the hotspot sits at the average position of the area's
// salons. Growth compares with the equal-length window before. Active salons =
// listed and live now (not as of the window).
//
// The map renders inside <Unscaled> so dragging and zooming track the cursor
// despite the canvas scaling, and it shares GOOGLE_MAPS_LOADER with MapPicker.
// Both "Booking Heatmap" (on the map) and "By Bookings" (in the ranking)
// switch the same metric.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const GREEN = "#22C55E";
const INDIGO = "#4F46E5";

// Map | ranking panel, as measured from the mockup.
const MAP_COLS = "grid-cols-[961fr_331fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1292px of content, so measured sizes carry over at ~1.18x.
const T = {
  tiny: "text-[12px]", // captions, legend
  xs: "text-[13px]", // list sub-lines
  sm: "text-[14px]", // KPI labels, list names
  title: "text-[16px]", // card titles
  kpi: "text-[27px]", // KPI values
};

const GAP = "gap-4";
const DASH = "–";
const TOP_AREAS = 10;
const CALLOUTS = 7;

// Solid gradient badges with a white glyph, as drawn in the mockup.
const badge = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

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
const money = (v) => (isNum(v) ? rupees(v) : DASH);
const fmtDay = (d) => (d ? moment(d).format("MMM D, YYYY") : DASH);
const fmtRange = (from, to) => (from && to ? `${moment(from).format("MMM D")} – ${fmtDay(to)}` : DASH);
const change = (cur, prev) => (isNum(cur) && isNum(prev) && prev ? ((cur - prev) / prev) * 100 : null);

const METRICS = {
  bookings: {
    mapLabel: "Booking Heatmap",
    rankLabel: "By Bookings",
    legendTitle: "Booking Density",
    note: "booking concentration based on served bookings",
    value: (area) => area.bookings,
    format: (value) => num(value),
    unit: "bookings",
  },
  revenue: {
    mapLabel: "Revenue Heatmap",
    rankLabel: "By Revenue",
    legendTitle: "Revenue Density",
    note: "GMV concentration based on served bookings",
    value: (area) => area.gmv,
    format: (value) => money(value),
    unit: "",
  },
};
const MAP_METRIC_OPTIONS = Object.entries(METRICS).map(([value, m]) => ({ value, label: m.mapLabel }));
const RANK_METRIC_OPTIONS = Object.entries(METRICS).map(([value, m]) => ({ value, label: m.rankLabel }));

// Density bands as a share of the busiest area. `rings` is how many of the
// HEAT_RINGS below an area earns, so a quiet area stays green and only the
// busiest ones burn through to red.
const DENSITY = [
  { label: "Very High", color: "#EF4444", min: 0.75, rings: 5 },
  { label: "High", color: "#F97316", min: 0.5, rings: 4 },
  { label: "Medium", color: "#FACC15", min: 0.3, rings: 3 },
  { label: "Low", color: GREEN, min: 0.15, rings: 2 },
  { label: "Very Low", color: "#A7E8A9", min: 0, rings: 1 },
];
const densityOf = (ratio) => DENSITY.find((band) => ratio >= band.min) || DENSITY[DENSITY.length - 1];

// Rank badges: the first three are solid, the rest fade out with the ranking.
const RANK_STYLE = [
  { bg: "#EF4444", fg: "#fff" },
  { bg: "#3B82F6", fg: "#fff" },
  { bg: "#F59E0B", fg: "#fff" },
  { bg: "#FDE9A8", fg: "#8A5A00" },
  { bg: "#FCEFB4", fg: "#8A6A00" },
  { bg: "#D4F2D8", fg: "#1F7A36" },
  { bg: "#D4F2D8", fg: "#1F7A36" },
  { bg: "#E5E9F2", fg: "#475569" },
  { bg: "#E5E9F2", fg: "#475569" },
  { bg: "#E5E9F2", fg: "#475569" },
];

const AREA_COLUMNS = [
  { header: "Area", kind: "text", width: 24, get: (r) => r.name },
  { header: "City", kind: "text", width: 16, get: (r) => r.city },
  { header: "Salons", kind: "int", width: 9, get: (r) => r.salons },
  { header: "Live Salons", kind: "int", width: 11, get: (r) => r.live_salons },
  { header: "Bookings", kind: "int", width: 11, get: (r) => r.bookings },
  { header: "GMV", kind: "money", width: 14, get: (r) => r.gmv },
  { header: "Avg. Booking", kind: "money", width: 13, get: (r) => r.aov },
  { header: "Customers", kind: "int", width: 11, get: (r) => r.customers },
  { header: "Previous Bookings", kind: "int", width: 15, get: (r) => r.previous_bookings },
  { header: "Growth", kind: "percent", width: 10, get: (r) => r.growth_pct },
];

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

const MAP_CONTAINER = { width: "100%", height: "100%" };
const MAP_CENTER = { lat: 13.0, lng: 80.2 };
// A calm base so the heat colours carry the map.
const MAP_STYLES = [
  { stylers: [{ saturation: -40 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];
// "cooperative" keeps the wheel scrolling the dashboard; Ctrl + wheel zooms.
const MAP_OPTIONS = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: "cooperative",
  keyboardShortcuts: false,
  styles: MAP_STYLES,
};

// Concentric translucent rings stack into a green -> red heat gradient, and
// neighbouring areas add up where bookings cluster.
const HEAT_RINGS = [
  { scale: 1, color: "#4ADE80", opacity: 0.22 },
  { scale: 0.78, color: "#A3E635", opacity: 0.3 },
  { scale: 0.58, color: "#FACC15", opacity: 0.4 },
  { scale: 0.4, color: "#FB923C", opacity: 0.52 },
  { scale: 0.22, color: "#EF4444", opacity: 0.66 },
];
const HEAT_RADIUS = 4500; // metres, for the busiest area
const MIN_RADIUS = 600;

// Where the callout sits relative to its hotspot, and the point of the callout
// the canvas-scale shrink anchors to (so it stays put against the hotspot).
const CALLOUT_ANCHOR = {
  right: { origin: "0% 50%", offset: (w, h) => ({ x: 12, y: -h / 2 }) },
  left: { origin: "100% 50%", offset: (w, h) => ({ x: -w - 12, y: -h / 2 }) },
  above: { origin: "50% 100%", offset: (w, h) => ({ x: -w / 2, y: -h - 12 }) },
  below: { origin: "50% 0%", offset: (w) => ({ x: -w / 2, y: 12 }) },
};
const CALLOUT_SIDES = ["right", "left", "above", "below", "right", "left", "above"];

const frameMap = (map, areas) => {
  if (!areas.length) return;
  const bounds = new window.google.maps.LatLngBounds();
  areas.forEach((area) => bounds.extend({ lat: area.lat, lng: area.lng }));
  map.fitBounds(bounds, { top: 110, right: 70, bottom: 90, left: 70 });
  if (areas.length === 1) map.setZoom(13);
};

const MapUnavailable = ({ children }) => (
  <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 bg-slate-50 px-8 text-center">
    <MapPinned size={24} className="text-slate-400" />
    <p className={`font-semibold text-slate-700 ${T.sm}`}>Map unavailable</p>
    <p className={`max-w-[300px] text-slate-500 ${T.xs}`}>{children}</p>
  </div>
);

// White callout beside a hotspot. It is drawn at true screen pixels inside
// <Unscaled>, so it is scaled by the canvas factor to match the page's type.
const Callout = ({ name, text, color, place, scale }) => (
  <div className="pointer-events-none rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-black/5" style={{ transform: `scale(${scale})`, transformOrigin: CALLOUT_ANCHOR[place].origin }}>
    <p className="whitespace-nowrap text-[13px] font-semibold leading-tight text-slate-900">{name}</p>
    <span className="mt-1 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-bold leading-tight text-white" style={{ background: color }}>
      {text}
    </span>
  </div>
);

const LiveHeatMap = ({ metric, areas }) => {
  const scale = useCanvasScale();
  const { isLoaded, loadError } = useLoadScript(GOOGLE_MAPS_LOADER);
  const [authFailed, setAuthFailed] = useState(false);
  const [map, setMap] = useState(null);

  // Maps reports a rejected key / referrer through this global rather than
  // through the script loader.
  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      setAuthFailed(true);
      if (previous) previous();
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);

  const onLoad = useCallback((instance) => setMap(instance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  // Re-frame when the areas change or the map's pixel size follows a new
  // canvas scale (after the new size has settled).
  useEffect(() => {
    if (!map) return undefined;
    const id = setTimeout(() => {
      window.google.maps.event.trigger(map, "resize");
      frameMap(map, areas);
    }, 200);
    return () => clearTimeout(id);
  }, [map, scale, areas]);

  if (loadError || authFailed) {
    return <MapUnavailable>Google Maps could not be loaded with the configured key.</MapUnavailable>;
  }
  if (!isLoaded) return <div className="absolute inset-0 animate-pulse bg-slate-100" />;

  const { value, format, unit, legendTitle } = METRICS[metric];
  const max = Math.max(0, ...areas.map(value));
  const zoomBy = (step) => map && map.setZoom((map.getZoom() || 11) + step);
  const control = "grid h-10 w-10 place-items-center text-slate-700 transition-colors hover:bg-slate-50";
  const ranked = max ? [...areas].filter((a) => value(a) > 0).sort((a, b) => value(b) - value(a)) : [];

  return (
    <>
      <Unscaled>
        <GoogleMap mapContainerStyle={MAP_CONTAINER} center={MAP_CENTER} zoom={11} options={MAP_OPTIONS} onLoad={onLoad} onUnmount={onUnmount}>
          {ranked.map((area) => {
            const ratio = value(area) / max;
            const band = densityOf(ratio);
            const radius = Math.max(MIN_RADIUS, HEAT_RADIUS * Math.sqrt(ratio));
            return HEAT_RINGS.slice(0, band.rings).map((ring) => (
              <CircleF
                key={`${area.key}-${ring.scale}`}
                center={{ lat: area.lat, lng: area.lng }}
                radius={radius * ring.scale}
                options={{ strokeWeight: 0, fillColor: ring.color, fillOpacity: ring.opacity, clickable: false }}
              />
            ));
          })}

          {ranked.slice(0, CALLOUTS).map((area, i) => {
            const place = CALLOUT_SIDES[i];
            return (
              <OverlayViewF key={area.key} position={{ lat: area.lat, lng: area.lng }} mapPaneName="overlayMouseTarget" getPixelPositionOffset={CALLOUT_ANCHOR[place].offset}>
                <Callout name={area.name} text={`${format(value(area))}${unit ? ` ${unit}` : ""}`} color={densityOf(value(area) / max).color} place={place} scale={scale} />
              </OverlayViewF>
            );
          })}
        </GoogleMap>
      </Unscaled>

      {/* Legend and zoom controls live in canvas space, over the map. Google's
          logo and attribution are true-size, so they are cleared by a fixed
          number of screen pixels rather than canvas ones. */}
      <div className="absolute left-4 rounded-xl bg-white/95 px-4 py-3 shadow-md ring-1 ring-black/5" style={{ bottom: Math.ceil(36 / scale) }}>
        <p className={`font-semibold text-slate-800 ${T.sm}`}>{legendTitle}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {DENSITY.map((band) => (
            <li key={band.label} className={`flex items-center gap-2.5 text-slate-600 ${T.xs}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: band.color }} />
              {band.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute right-4 flex flex-col gap-3" style={{ bottom: Math.ceil(30 / scale) }}>
        <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5">
          <button type="button" className={control} aria-label="Zoom in" onClick={() => zoomBy(1)}>
            <Plus size={18} />
          </button>
          <button type="button" className={control} aria-label="Zoom out" onClick={() => zoomBy(-1)}>
            <Minus size={18} />
          </button>
        </div>
        <button type="button" className={`${control} rounded-xl bg-white shadow-md ring-1 ring-black/5`} aria-label="Reset map view" onClick={() => map && frameMap(map, areas)}>
          <LocateFixed size={18} />
        </button>
      </div>

      {!ranked.length && (
        <p className={`absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-white/95 px-3 py-2 text-slate-500 shadow ring-1 ring-black/5 ${T.xs}`}>No bookings in this period</p>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const KpiTile = (props) => (
  <BaseKpiTile sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.sm }} iconClass="h-[52px] w-[52px] rounded-xl shadow-md shadow-black/10" iconSize={24} iconColor="#fff" className="px-5 py-5" {...props} />
);

// The "Booking Heatmap" switch floating over the map's top-left corner.
const MapMetricSelect = ({ value, onChange }) => (
  <span className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white py-2.5 pl-3 pr-9 shadow-md ring-1 ring-black/5">
    <ChartColumn size={16} className="shrink-0 text-slate-500" />
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Heat map metric" className={`cursor-pointer appearance-none bg-transparent font-semibold text-slate-800 focus:outline-none ${T.sm}`}>
      {MAP_METRIC_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
  </span>
);

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, period, setPeriod, onCustom, city, setCity, cityOptions, onRefresh }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">View booking density and performance across {city === "all" ? "all cities" : city}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="heatmap-range" className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[...PERIODS.map((p) => ({ value: p.key, label: p.label })), ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : [])]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
        <button type="button" aria-label="Refresh" onClick={onRefresh} className="hidden shrink-0 flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 md:flex">
          <RefreshCw size={15} />
          <span className="text-[10px] leading-none">Refresh</span>
        </button>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const SalonHeatmapV2 = ({ title = "Salon Analytics - Heatmap" }) => {
  const dispatch = useDispatch();
  const { salonHeatmap } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState("last_30");
  const [custom, setCustom] = useState(null);
  const [city, setCity] = useState("all");
  const [metric, setMetric] = useState("bookings");
  const [showAll, setShowAll] = useState(false);
  const [loadedAt, setLoadedAt] = useState(null);
  const hasKey = Boolean(GOOGLE_MAPS_LOADER.googleMapsApiKey);
  const { value, format, unit, note } = METRICS[metric];

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[1]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);

  const load = useCallback(() => {
    const body = { from: range.from, to: range.to };
    if (city !== "all") body.city = city;
    dispatch(fetchSalonHeatmapV2(body))
      .unwrap()
      .then(() => setLoadedAt(moment()))
      .catch((message) => toast.error(message || "Failed to load salon heatmap", { id: "heatmap-v2" }));
  }, [dispatch, range.from, range.to, city]);
  useEffect(() => {
    load();
  }, [load]);

  const data = salonHeatmap.data;
  const loading = salonHeatmap.loading && !data;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const shown = (v, fmt) => (loading ? "…" : fmt(v));
  const cityOptions = useMemo(() => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))], [data]);
  const areas = useMemo(() => data?.areas || [], [data]);
  const mappable = useMemo(() => areas.filter((a) => isNum(a.lat) && isNum(a.lng)), [areas]);
  const ranked = useMemo(() => [...areas].sort((a, b) => value(b) - value(a) || b.bookings - a.bookings), [areas, value]);

  const deltaOf = (key) => {
    const d = change(k[key], pk[key]);
    return isNum(d) ? <Delta value={`${Math.abs(d).toFixed(1)}%`} up={d >= 0} size={T.sm} /> : <span className="text-slate-400">{compare}</span>;
  };
  const kpis = [
    { label: "Total Bookings", value: shown(k.bookings, num), caption: deltaOf("bookings"), icon: CalendarClock, tint: badge("#8B7CF8", "#6D4AE0") },
    {
      label: "Active Salons",
      value: shown(k.active_salons, num),
      caption: k.new_salons ? <Delta value={`${num(k.new_salons)} new salon${k.new_salons === 1 ? "" : "s"}`} up size={T.sm} /> : <span className="text-slate-400">No new salons in period</span>,
      icon: Store,
      tint: badge("#8AD95F", "#4FBE4A"),
    },
    { label: "Total Customers", value: shown(k.customers, num), caption: deltaOf("customers"), icon: UserRound, tint: badge("#FFB347", "#F58A1F") },
    { label: "Total GMV", value: shown(k.gmv, money), caption: deltaOf("gmv"), icon: CircleDollarSign, tint: badge("#4F8DF7", "#2B62E8") },
    { label: "Avg. Booking Value", value: shown(k.aov, money), caption: deltaOf("aov"), icon: ReceiptIndianRupee, tint: badge("#FF7A9C", "#F0527E") },
  ];

  const exportAreas = () => downloadXlsx(`salon-areas_${data.from}_${data.to}.xlsx`, [{ name: "Areas", rows: ranked, columns: AREA_COLUMNS }]).catch(() => toast.error("Failed to export", { id: "heatmap-export" }));

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
        onRefresh={load}
      />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* Row 1 - KPI tiles */}
        <div className={`grid grid-cols-5 ${GAP}`}>
          {kpis.map(({ icon, tint, ...kpi }) => (
            <KpiTile key={kpi.label} {...kpi} icon={icon} iconTint={tint} />
          ))}
        </div>

        {/* Row 2 - Map / top performing areas */}
        <Card className="overflow-hidden">
          <div className={`grid ${MAP_COLS}`}>
            <div className="relative min-h-[790px] overflow-hidden">
              {hasKey ? (
                <LiveHeatMap metric={metric} areas={mappable} />
              ) : (
                <MapUnavailable>No Google Maps key is configured (VITE_GOOGLE_MAPS_KEY). The area ranking is on the right.</MapUnavailable>
              )}
              <MapMetricSelect value={metric} onChange={setMetric} />
            </div>

            <div className="flex min-w-0 flex-col border-l border-[#E6E8F0] px-6 pb-6 pt-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className={`truncate font-bold tracking-tight text-slate-900 ${T.title}`}>Top Performing Areas</h2>
                <BaseSelect value={metric} onChange={setMetric} options={RANK_METRIC_OPTIONS} size={T.tiny} className="w-[118px] [&_select]:py-1.5" />
              </div>

              {ranked.length ? (
                <ul className="mt-5 flex-1">
                  {ranked.slice(0, TOP_AREAS).map((area, i) => (
                    <li key={area.key} className="flex items-center gap-3.5 border-b border-slate-100 py-[14px] last:border-0" title={`${area.salons} salons · ${num(area.customers)} customers`}>
                      <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-bold ${T.xs}`} style={{ background: RANK_STYLE[i].bg, color: RANK_STYLE[i].fg }}>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate font-semibold text-slate-900 ${T.sm}`}>{area.name}</span>
                        <span className={`mt-0.5 block truncate text-slate-500 ${T.xs}`}>
                          {format(value(area))}
                          {unit ? ` ${unit}` : ""}
                          {city === "all" && area.city ? ` · ${area.city}` : ""}
                        </span>
                      </span>
                      {isNum(area.growth_pct) ? (
                        <Delta value={`${Math.abs(area.growth_pct)}%`} up={area.growth_pct >= 0} size={T.sm} />
                      ) : (
                        <span className={`shrink-0 text-slate-400 ${T.tiny}`}>{area.bookings ? "New" : DASH}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`grid flex-1 place-items-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : "No areas with salons or bookings"}</p>
              )}

              <button
                type="button"
                disabled={!ranked.length}
                onClick={() => setShowAll(true)}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E6E8F0] bg-white py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${T.sm}`}
              >
                View All Areas ({num(ranked.length)})
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </Card>

        {/* Row 3 - Footnote */}
        <div className="flex items-center justify-between gap-6">
          <p className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#F1F5FD] px-5 py-3 text-slate-600 ${T.sm}`}>
            <Info size={16} className="shrink-0 text-blue-500" />
            Heatmap shows {note} in the selected date range{areas.length > mappable.length ? `; ${areas.length - mappable.length} area(s) without salon coordinates are listed only` : ""}.
          </p>
          <p className={`flex shrink-0 items-center gap-3 whitespace-nowrap text-slate-500 ${T.xs}`}>
            Data updated: {loadedAt ? loadedAt.format("MMM DD, YYYY hh:mm A") : DASH}
            <RefreshCw size={14} className="text-slate-400" />
          </p>
        </div>
      </ScaledCanvas>

      {showAll && data && (
        <ListDialog
          title="All Areas"
          subtitle={`${fmtRange(data.from, data.to)} · served bookings, growth vs ${fmtRange(data.previous.from, data.previous.to)}`}
          columns={AREA_COLUMNS}
          rows={ranked}
          onExport={exportAreas}
          onClose={() => setShowAll(false)}
        />
      )}
    </>
  );
};

export default SalonHeatmapV2;
