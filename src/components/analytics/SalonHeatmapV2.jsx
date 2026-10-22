import { useCallback, useEffect, useState } from "react";
import { CircleF, GoogleMap, OverlayViewF, useLoadScript } from "@react-google-maps/api";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
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
import { rupees } from "../../utils/format";
import { GOOGLE_MAPS_LOADER } from "../../utils/googleMaps";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas, { Unscaled } from "../v2/ScaledCanvas";
import { useCanvasScale } from "../v2/canvasScaleContext";
import { Card, Delta, HeaderSelect, KpiTile as BaseKpiTile, Select as BaseSelect } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Salon Analytics - Heatmap" mockup, on a
// fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the available width
// (see there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. A
// per-area booking count needs bookings grouped by the salon's locality: the
// booking list (bookingSlice) and the store addresses (partnersSlice) both
// exist, but nothing aggregates them yet. The date and city pickers and the
// Refresh button are inert.
//
// The one live element is the map: its base map is real, the hotspots drawn on
// it are the demo areas below. It renders inside <Unscaled> so dragging and
// zooming track the cursor despite the canvas scaling, and it shares
// GOOGLE_MAPS_LOADER with MapPicker. Both "Booking Heatmap" (on the map) and
// "By Bookings" (in the ranking) switch the same metric.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#6D4AE0";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const BLUE = "#3B82F6";
const ROSE = "#F0445F";

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
const COMPARE = "vs Jun 01 – Jun 30, 2026";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  { label: "Total Bookings", value: "12,842", delta: "18.6%", caption: COMPARE, icon: CalendarClock, color: BRAND, tint: "#EEEAFD" },
  { label: "Active Salons", value: "300", caption: <Delta value="12 new salons" up size={T.sm} />, icon: Store, color: GREEN, tint: "#E1F6E7" },
  { label: "Total Customers", value: "8,721", caption: <Delta value="16.2%" up size={T.sm} />, icon: UserRound, color: ORANGE, tint: "#FFEFD6" },
  { label: "Total Revenue", value: "₹18,72,450", caption: <Delta value="22.8%" up size={T.sm} />, icon: CircleDollarSign, color: BLUE, tint: "#E1ECFE" },
  { label: "Avg. Booking Value", value: "₹146", caption: <Delta value="6.1%" up size={T.sm} />, icon: ReceiptIndianRupee, color: ROSE, tint: "#FDE5EC" },
];

// `aov` is the area's average booking value, which turns the booking count
// into revenue. `place` is the side of the hotspot its callout sits on; areas
// without one are only listed in the ranking.
const AREAS = [
  { name: "T. Nagar", lat: 13.0418, lng: 80.2341, bookings: 2350, aov: 158, growth: 24.1, place: "right" },
  { name: "Anna Nagar", lat: 13.085, lng: 80.2101, bookings: 1842, aov: 151, growth: 20.3, place: "above" },
  { name: "Velachery", lat: 12.9815, lng: 80.2209, bookings: 1623, aov: 144, growth: 18.7, place: "right" },
  { name: "Vadapalani", lat: 13.05, lng: 80.2121, bookings: 1256, aov: 149, growth: 15.6, place: "left" },
  { name: "ECR / Uthandi", lat: 12.8599, lng: 80.2478, bookings: 892, aov: 138, growth: 12.4, place: "right" },
  { name: "Porur", lat: 13.0382, lng: 80.1565, bookings: 542, aov: 141, growth: 10.2, place: "below" },
  { name: "Tambaram", lat: 12.9249, lng: 80.1, bookings: 478, aov: 132, growth: 8.7, place: "right" },
  { name: "Adyar", lat: 13.0067, lng: 80.257, bookings: 413, aov: 147, growth: 6.8 },
  { name: "OMR", lat: 12.9611, lng: 80.2431, bookings: 365, aov: 139, growth: 5.6 },
  { name: "Chromepet", lat: 12.9516, lng: 80.1462, bookings: 298, aov: 128, growth: 4.3 },
];

const METRICS = {
  bookings: {
    mapLabel: "Booking Heatmap",
    rankLabel: "By Bookings",
    legendTitle: "Booking Density",
    note: "booking concentration based on total bookings",
    value: (area) => area.bookings,
    format: (value) => value.toLocaleString("en-IN"),
    unit: "bookings",
  },
  revenue: {
    mapLabel: "Revenue Heatmap",
    rankLabel: "By Revenue",
    legendTitle: "Revenue Density",
    note: "revenue concentration based on total revenue",
    value: (area) => area.bookings * area.aov,
    format: (value) => rupees(value),
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

const DATE_RANGES = ["Jul 01 – Jul 31, 2026", "Jun 01 – Jun 30, 2026", "May 01 – May 31, 2026"];
const CITIES = ["Chennai", "All Cities"];

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
const HEAT_RADIUS = 4800; // metres, for the busiest area

// Where the callout sits relative to its hotspot, and the point of the callout
// the canvas-scale shrink anchors to (so it stays put against the hotspot).
const CALLOUT_ANCHOR = {
  right: { origin: "0% 50%", offset: (w, h) => ({ x: 12, y: -h / 2 }) },
  left: { origin: "100% 50%", offset: (w, h) => ({ x: -w - 12, y: -h / 2 }) },
  above: { origin: "50% 100%", offset: (w, h) => ({ x: -w / 2, y: -h - 12 }) },
  below: { origin: "50% 0%", offset: (w) => ({ x: -w / 2, y: 12 }) },
};

const frameMap = (map) => {
  const bounds = new window.google.maps.LatLngBounds();
  AREAS.forEach((area) => bounds.extend({ lat: area.lat, lng: area.lng }));
  map.fitBounds(bounds, { top: 110, right: 70, bottom: 90, left: 70 });
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
  <div
    className="pointer-events-none rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-black/5"
    style={{ transform: `scale(${scale})`, transformOrigin: CALLOUT_ANCHOR[place].origin }}
  >
    <p className="whitespace-nowrap text-[13px] font-semibold leading-tight text-slate-900">{name}</p>
    <span
      className="mt-1 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-bold leading-tight text-white"
      style={{ background: color }}
    >
      {text}
    </span>
  </div>
);

const LiveHeatMap = ({ metric }) => {
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

  const onLoad = useCallback((instance) => {
    setMap(instance);
    frameMap(instance);
  }, []);
  const onUnmount = useCallback(() => setMap(null), []);

  // The map's pixel size follows the canvas scale, so re-frame the hotspots
  // once the new size has settled.
  useEffect(() => {
    if (!map) return undefined;
    const id = setTimeout(() => {
      window.google.maps.event.trigger(map, "resize");
      frameMap(map);
    }, 200);
    return () => clearTimeout(id);
  }, [map, scale]);

  if (loadError || authFailed) {
    return <MapUnavailable>Google Maps could not be loaded with the configured key.</MapUnavailable>;
  }
  if (!isLoaded) return <div className="absolute inset-0 animate-pulse bg-slate-100" />;

  const { value, format, unit, legendTitle } = METRICS[metric];
  const max = Math.max(...AREAS.map(value));
  const zoomBy = (step) => map && map.setZoom((map.getZoom() || 11) + step);
  const control = "grid h-10 w-10 place-items-center text-slate-700 transition-colors hover:bg-slate-50";

  return (
    <>
      <Unscaled>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER}
          center={MAP_CENTER}
          zoom={11}
          options={MAP_OPTIONS}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {AREAS.map((area) => {
            const ratio = value(area) / max;
            const band = densityOf(ratio);
            const radius = HEAT_RADIUS * Math.sqrt(ratio);
            return HEAT_RINGS.slice(0, band.rings).map((ring) => (
              <CircleF
                key={`${area.name}-${ring.scale}`}
                center={{ lat: area.lat, lng: area.lng }}
                radius={radius * ring.scale}
                options={{
                  strokeWeight: 0,
                  fillColor: ring.color,
                  fillOpacity: ring.opacity,
                  clickable: false,
                }}
              />
            ));
          })}

          {AREAS.filter((area) => area.place).map((area) => {
            const anchor = CALLOUT_ANCHOR[area.place];
            return (
              <OverlayViewF
                key={area.name}
                position={{ lat: area.lat, lng: area.lng }}
                mapPaneName="overlayMouseTarget"
                getPixelPositionOffset={anchor.offset}
              >
                <Callout
                  name={area.name}
                  text={`${format(value(area))}${unit ? ` ${unit}` : ""}`}
                  color={densityOf(value(area) / max).color}
                  place={area.place}
                  scale={scale}
                />
              </OverlayViewF>
            );
          })}
        </GoogleMap>
      </Unscaled>

      {/* Legend and zoom controls live in canvas space, over the map. Google's
          logo and attribution are true-size, so they are cleared by a fixed
          number of screen pixels rather than canvas ones. */}
      <div
        className="absolute left-4 rounded-xl bg-white/95 px-4 py-3 shadow-md ring-1 ring-black/5"
        style={{ bottom: Math.ceil(36 / scale) }}
      >
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
        <button
          type="button"
          className={`${control} rounded-xl bg-white shadow-md ring-1 ring-black/5`}
          aria-label="Reset map view"
          onClick={() => map && frameMap(map)}
        >
          <LocateFixed size={18} />
        </button>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.sm }}
    iconClass="h-[52px] w-[52px] rounded-xl"
    iconSize={24}
    up
    className="px-5 py-5"
    {...props}
  />
);

// The "Booking Heatmap" switch floating over the map's top-left corner.
const MapMetricSelect = ({ value, onChange }) => (
  <span className="absolute left-4 top-4 flex items-center gap-2 rounded-xl bg-white py-2.5 pl-3 pr-9 shadow-md ring-1 ring-black/5">
    <ChartColumn size={16} className="shrink-0 text-slate-500" />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Heat map metric"
      className={`cursor-pointer appearance-none bg-transparent font-semibold text-slate-800 focus:outline-none ${T.sm}`}
    >
      {MAP_METRIC_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown
      size={15}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
    />
  </span>
);

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, city, setCity }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          View booking density and performance across {city === "All Cities" ? "all cities" : city}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
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
        <button
          type="button"
          aria-label="Refresh"
          className="hidden shrink-0 flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 md:flex"
        >
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
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [metric, setMetric] = useState("bookings");
  const hasKey = Boolean(GOOGLE_MAPS_LOADER.googleMapsApiKey);
  const { value, format, unit, note } = METRICS[metric];

  return (
    <>
      <PageHeader title={title} range={range} setRange={setRange} city={city} setCity={setCity} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-5 ${GAP}`}>
          {kpis.map(({ icon, color, tint, ...kpi }) => (
            <KpiTile key={kpi.label} {...kpi} icon={icon} iconColor={color} iconTint={tint} />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Map / top performing areas                               */}
        {/* ---------------------------------------------------------------- */}
        <Card className="overflow-hidden">
          <div className={`grid ${MAP_COLS}`}>
            <div className="relative min-h-[790px] overflow-hidden">
              {hasKey ? (
                <LiveHeatMap metric={metric} />
              ) : (
                <MapUnavailable>
                  No Google Maps key is configured (VITE_GOOGLE_MAPS_KEY). The area ranking is on the right.
                </MapUnavailable>
              )}
              <MapMetricSelect value={metric} onChange={setMetric} />
            </div>

            <div className="flex min-w-0 flex-col border-l border-[#E6E8F0] px-6 pb-6 pt-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className={`truncate font-bold tracking-tight text-slate-900 ${T.title}`}>
                  Top Performing Areas
                </h2>
                <BaseSelect
                  value={metric}
                  onChange={setMetric}
                  options={RANK_METRIC_OPTIONS}
                  size={T.tiny}
                  className="w-[118px] [&_select]:py-1.5"
                />
              </div>

              <ul className="mt-5 flex-1">
                {AREAS.map((area, i) => (
                  <li
                    key={area.name}
                    className="flex items-center gap-3.5 border-b border-slate-100 py-[14px] last:border-0"
                  >
                    <span
                      className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full font-bold ${T.xs}`}
                      style={{ background: RANK_STYLE[i].bg, color: RANK_STYLE[i].fg }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold text-slate-900 ${T.sm}`}>
                        {area.name}
                      </span>
                      <span className={`mt-0.5 block truncate text-slate-500 ${T.xs}`}>
                        {format(value(area))}
                        {unit ? ` ${unit}` : ""}
                      </span>
                    </span>
                    <Delta value={`${area.growth}%`} up size={T.sm} />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E6E8F0] bg-white py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 ${T.sm}`}
              >
                View All Areas
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Footnote                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between gap-6">
          <p
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#F1F5FD] px-5 py-3 text-slate-600 ${T.sm}`}
          >
            <Info size={16} className="shrink-0 text-blue-500" />
            Heatmap shows {note} in selected date range.
          </p>
          <p className={`flex shrink-0 items-center gap-3 whitespace-nowrap text-slate-500 ${T.xs}`}>
            Data updated: Aug 05, 2026 10:30 AM
            <RefreshCw size={14} className="text-slate-400" />
          </p>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default SalonHeatmapV2;
