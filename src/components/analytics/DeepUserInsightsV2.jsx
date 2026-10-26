import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CircleF, GoogleMap, OverlayViewF, useLoadScript } from "@react-google-maps/api";
import {
  Car,
  Clock,
  Download,
  Ellipsis,
  Heart,
  IndianRupee,
  LocateFixed,
  MapPin,
  MapPinned,
  Minus,
  Percent,
  Plus,
  Repeat2,
  Star,
  Tag,
  UserRound,
  Users,
} from "lucide-react";
import { fetchDeepUserInsightsV2, fetchFarTravellingUsersV2 } from "../../redux/slices/analyticsSlice";
import { downloadCsv, rupees } from "../../utils/format";
import { downloadXlsx } from "../../utils/excelExport";
import { GOOGLE_MAPS_LOADER } from "../../utils/googleMaps";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas, { Unscaled } from "../v2/ScaledCanvas";
import { useCanvasScale } from "../v2/canvasScaleContext";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, initials, rampColor } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  DateRangeButton,
  Delta,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  HeatGrid as BaseHeatGrid,
  InsightTile,
  KpiTile as BaseKpiTile,
  ListDialog,
  Meter,
  RampLegend,
  Segmented as BaseSegmented,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// The approved "Deep User Insights" mockup, on a fixed DESIGN_WIDTH canvas
// that ScaledCanvas scales to the available width (see there for why bigger
// px sizes in T read smaller on screen).
//
// Data: getDeepUserInsightsV2 (analyticsSlice `deepInsights`). Distance is
// the straight line from where the customer was when booking (the app's
// POST /v2/location, snapshotted onto each booking) to the salon; bookings
// from before location capture have none and are left out of distance
// numbers. Travel time is an estimate (3 min per km). "Why users travel" is
// inferred from each far booking. The heat map shows where customers booked
// from, or - until bookings carry a location - where the booked salons are.
// The map renders inside <Unscaled> so dragging and zooming track the cursor
// despite the canvas scaling, and shares GOOGLE_MAPS_LOADER with MapPicker.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#6D4AE0";
const INDIGO = "#4F5BE8";
const BLUE = "#3B82F6";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";
const RED = "#EF4444";
const ROSE = "#F0445F";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW2_COLS = "grid-cols-[484fr_403fr_399fr]";
const ROW34_COLS = "grid-cols-[400fr_443fr_443fr]";

// Type scale in design px on the 1520px canvas. The mockup is a 1536px
// screenshot with ~1313px of content, so measured sizes carry over at ~1.16x.
const T = {
  tiny: "text-[11px]", // captions, axis titles, chips
  xs: "text-[12px]", // table cells, legend rows
  sm: "text-[13px]", // KPI labels, body
  title: "text-[15px]", // card titles
  stat: "text-[21px]", // in-card headline numbers
  kpi: "text-[23px]", // KPI values
  donut: "text-[19px]", // donut centre total
};

const GAP = "gap-3";
const DASH = "–";
const BASIS = [
  { value: "bookings", label: "By Bookings" },
  { value: "users", label: "By Users" },
];

// Header period presets -> { from, to } as YYYY-MM-DD.
const PERIODS = [
  { key: "last_7", label: "Last 7 Days", range: () => [moment().subtract(6, "days"), moment()] },
  { key: "this_week", label: "This Week", range: () => [moment().startOf("isoWeek"), moment()] },
  { key: "last_30", label: "Last 30 Days", range: () => [moment().subtract(29, "days"), moment()] },
  { key: "this_month", label: "This Month", range: () => [moment().startOf("month"), moment()] },
  {
    key: "last_month",
    label: "Last Month",
    range: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
  },
  { key: "last_90", label: "Last 90 Days", range: () => [moment().subtract(89, "days"), moment()] },
];

const BUCKET_COLORS = [BRAND, BLUE, GREEN, ORANGE, RED];
const AVATAR_TINTS = [
  { tint: "#FDE7EE", color: ROSE },
  { tint: "#E3EEFF", color: BLUE },
  { tint: "#DDF5E7", color: "#16A34A" },
  { tint: "#FFF0DA", color: "#D97706" },
  { tint: "#EEEAFD", color: BRAND },
];
const REASON_STYLE = {
  regular: { icon: Repeat2, color: ROSE, tint: "#FDE7EE" },
  stylist: { icon: UserRound, color: "#64748B", tint: "#EEF1F6", barColor: "#A99BF0" },
  price: { icon: Tag, color: "#F97316", tint: "#FFEDD5" },
  rating: { icon: Star, color: GREEN, tint: "#DCFCE7" },
  other: { icon: Ellipsis, color: BRAND, tint: "#EEEAFD" },
};

const FREQUENCY_RAMP = ["#F0EEFD", "#A998F2"];
const TIME_RAMP = ["#FDE8F1", "#F8B4D4", "#E56AC0", "#9B4DE0", "#4B46E5", "#3B63E8"];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const fmtInt = (v) => (isNum(v) ? Number(v).toLocaleString("en-IN") : DASH);
const fmtKm = (v) => (isNum(v) ? `${Number(v).toFixed(1)} km` : DASH);
const fmtMin = (v) => (isNum(v) ? `${Number(v).toFixed(1)} min` : DASH);
const fmtPct = (v) => (isNum(v) ? `${Number(v).toFixed(1)}%` : DASH);
const pctOf = (part, whole) => (isNum(part) && isNum(whole) && Number(whole) ? (part / whole) * 100 : null);
const fmtDay = (d) => (d ? moment(d).format("MMM D") : DASH);
const fmtRange = (from, to) => (from && to ? `${fmtDay(from)} – ${moment(to).format("MMM D, YYYY")}` : DASH);
const hourLabel = (hour) => {
  const h = hour % 24;
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
};

// Change vs the previous window: relative %, or percentage points for rates.
// `inverse`: a rise is bad news (travelling further / longer).
const change = (cur, prev, { points = false, inverse = false } = {}) => {
  if (!isNum(cur) || !isNum(prev)) return null;
  const diff = points ? cur - prev : prev ? ((cur - prev) / prev) * 100 : null;
  if (diff === null) return null;
  const up = diff >= 0;
  return { value: `${Math.abs(diff).toFixed(1)}${points ? " pts" : "%"}`, up, good: inverse ? !up : up };
};

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

const MAP_CONTAINER = { width: "100%", height: "100%" };
// Chennai, used until there are hotspots to frame.
const MAP_CENTER = { lat: 13.023, lng: 80.2 };
// A muted base so the heat colours carry the map.
const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f1f3f6" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f6e7b6" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e9f0e3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe2f3" }] },
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
// overlapping hotspots add up where bookings cluster.
const HEAT_RINGS = [
  { scale: 1, color: "#4ADE80", opacity: 0.2 },
  { scale: 0.78, color: "#A3E635", opacity: 0.26 },
  { scale: 0.58, color: "#FACC15", opacity: 0.34 },
  { scale: 0.4, color: "#FB923C", opacity: 0.42 },
  { scale: 0.22, color: "#EF4444", opacity: 0.52 },
];
// Radius in metres, relative to the busiest hotspot.
const MAX_HEAT_RADIUS = 2600;
const MIN_HEAT_RADIUS = 450;
const heatRadius = (bookings, max) =>
  max ? Math.max(MIN_HEAT_RADIUS, MAX_HEAT_RADIUS * Math.sqrt(bookings / max)) : MIN_HEAT_RADIUS;
const CALLOUTS = 5;

// Fit every hotspot, or fall back to Chennai when there are none.
const frameMap = (map, spots) => {
  if (!spots.length) {
    map.setCenter(MAP_CENTER);
    map.setZoom(map.getDiv().clientHeight >= 200 ? 11 : 10);
    return;
  }
  if (spots.length === 1) {
    map.setCenter({ lat: spots[0].lat, lng: spots[0].lng });
    map.setZoom(13);
    return;
  }
  const bounds = new window.google.maps.LatLngBounds();
  spots.forEach((spot) => bounds.extend({ lat: spot.lat, lng: spot.lng }));
  map.fitBounds(bounds, 40);
};

const MapUnavailable = ({ children }) => (
  <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 bg-slate-50 px-8 text-center">
    <MapPinned size={22} className="text-slate-400" />
    <p className={`font-semibold text-slate-700 ${T.sm}`}>Map unavailable</p>
    <p className={`max-w-[280px] text-slate-500 ${T.tiny}`}>{children}</p>
  </div>
);

// White callout beside a hotspot. It is drawn at true screen pixels inside
// <Unscaled>, so it is scaled by the canvas factor to match the page's type.
const Callout = ({ area, bookings, side, scale }) => (
  <div
    className="pointer-events-none rounded-md bg-white px-2.5 py-1 text-center leading-tight shadow-md ring-1 ring-black/5"
    style={{ transform: `scale(${scale})`, transformOrigin: side === "left" ? "100% 50%" : "0% 50%" }}
  >
    <div className="whitespace-nowrap text-[11px] text-slate-500">{area}</div>
    <div className="whitespace-nowrap text-[12px] font-bold text-slate-900">{bookings.toLocaleString("en-IN")}</div>
  </div>
);

const LiveHeatMap = ({ spots }) => {
  const scale = useCanvasScale();
  const { isLoaded, loadError } = useLoadScript(GOOGLE_MAPS_LOADER);
  const [authFailed, setAuthFailed] = useState(false);
  const [map, setMap] = useState(null);
  const maxBookings = spots.length ? spots[0].bookings : 0;
  const spotsKey = spots.map((s) => `${s.lat},${s.lng},${s.bookings}`).join("|");

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

  // Re-frame when the hotspots change, and once the map's pixel size has
  // settled after a canvas re-scale.
  useEffect(() => {
    if (!map) return undefined;
    const id = setTimeout(() => {
      window.google.maps.event.trigger(map, "resize");
      frameMap(map, spots);
    }, 200);
    return () => clearTimeout(id);
    // spotsKey stands in for `spots`, which is a new array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, scale, spotsKey]);

  if (loadError || authFailed) {
    return (
      <MapUnavailable>
        Google Maps could not be loaded with the configured key. The hotspot breakdown is under List View.
      </MapUnavailable>
    );
  }
  if (!isLoaded) return <div className="absolute inset-0 animate-pulse bg-slate-100" />;

  const zoomBy = (step) => map && map.setZoom((map.getZoom() || 11) + step);
  const control = "grid h-8 w-8 place-items-center text-slate-600 transition-colors hover:bg-slate-50";

  return (
    <>
      <Unscaled>
        <GoogleMap mapContainerStyle={MAP_CONTAINER} center={MAP_CENTER} zoom={11} options={MAP_OPTIONS} onLoad={onLoad} onUnmount={onUnmount}>
          {spots.map((spot) =>
            HEAT_RINGS.map((ring) => (
              <CircleF
                key={`${spot.lat},${spot.lng}-${ring.scale}`}
                center={{ lat: spot.lat, lng: spot.lng }}
                radius={heatRadius(spot.bookings, maxBookings) * ring.scale}
                options={{ strokeWeight: 0, fillColor: ring.color, fillOpacity: ring.opacity, clickable: false }}
              />
            ))
          )}

          {spots.slice(0, CALLOUTS).map((spot, i) => (
            <OverlayViewF
              key={`${spot.lat},${spot.lng}`}
              position={{ lat: spot.lat, lng: spot.lng }}
              mapPaneName="overlayMouseTarget"
              getPixelPositionOffset={(width, height) => ({ x: i % 2 ? -width - 10 : 10, y: -height / 2 })}
            >
              <Callout area={spot.area || "Unknown area"} bookings={spot.bookings} side={i % 2 ? "left" : "right"} scale={scale} />
            </OverlayViewF>
          ))}
        </GoogleMap>
      </Unscaled>

      {/* Legend and zoom controls live in canvas space, over the map. */}
      <div className={`absolute bottom-7 left-3 flex items-center gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-slate-600 shadow ring-1 ring-black/5 ${T.tiny}`}>
        Low
        <span className="h-1.5 w-[84px] rounded-full" style={{ background: "linear-gradient(90deg,#4ADE80,#FACC15,#FB923C,#EF4444)" }} />
        High
      </div>

      <div className="absolute bottom-7 right-3 flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg bg-white shadow ring-1 ring-black/5">
        <button type="button" className={control} aria-label="Zoom in" onClick={() => zoomBy(1)}>
          <Plus size={15} />
        </button>
        <button type="button" className={control} aria-label="Zoom out" onClick={() => zoomBy(-1)}>
          <Minus size={15} />
        </button>
        <button type="button" className={control} aria-label="Reset map view" onClick={() => map && frameMap(map, spots)}>
          <LocateFixed size={15} />
        </button>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const CardHeader = (props) => <BaseCardHeader titleSize={T.title} subtitleSize={T.tiny} {...props} />;

const Select = ({ size = T.tiny, ...props }) => <BaseSelect size={size} className="w-[100px] [&_select]:py-1" {...props} />;

const Segmented = (props) => <BaseSegmented size={T.tiny} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.tiny }}
    iconClass="h-14 w-14 rounded-full"
    iconSize={26}
    className="px-4 py-5"
    {...props}
  />
);

const Donut = (props) => (
  <BaseDonut
    size={172}
    inner="62%"
    centerSize={T.donut}
    captionSize={T.tiny}
    formatter={(value) => Number(value).toLocaleString("en-IN")}
    {...props}
  />
);

const HeatGrid = (props) => <BaseHeatGrid labelSize={T.tiny} labelWidth={64} cellHeight={19} gap="2px" radius={2} {...props} />;

const Avatar = ({ name, tint, color }) => (
  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ background: tint, color }}>
    {initials(name)}
  </span>
);

// Centred grey note for a card with nothing to show yet.
const EmptyNote = ({ children, className = "" }) => (
  <div className={`grid flex-1 place-items-center px-3 py-6 text-center text-slate-400 ${T.xs} ${className}`}>
    <p className="max-w-[300px]">{children}</p>
  </div>
);

const HeatMapCard = ({ heatmap, loading }) => {
  const [view, setView] = useState("map");
  const hasKey = Boolean(GOOGLE_MAPS_LOADER.googleMapsApiKey);
  const spots = heatmap?.cells || [];
  const top = spots.slice(0, 8);
  const bySalon = heatmap?.basis === "salon";

  return (
    <Card>
      <div className="px-4 pt-4">
        <CardHeader
          title={
            <>
              User Heat Map{" "}
              <span className={`font-medium text-slate-500 ${T.tiny}`}>
                ({bySalon ? "Bookings by Salon Location" : "Bookings by Location"})
              </span>
            </>
          }
          subtitle={bySalon ? "Customer locations appear once bookings carry them" : "Where customers booked from"}
          right={
            <Segmented
              value={view}
              onChange={setView}
              color={INDIGO}
              options={[
                { value: "map", label: "Map View" },
                { value: "list", label: "List View" },
              ]}
            />
          }
        />
      </div>

      {/* The map area bleeds to the card edges. List View is laid over the map
          rather than replacing it, so toggling doesn't create a new map (each
          one is a billable load). */}
      <div className="relative mt-3 min-h-[250px] flex-1 overflow-hidden rounded-b-2xl">
        {hasKey ? (
          <LiveHeatMap spots={spots} />
        ) : (
          <MapUnavailable>
            No Google Maps key is configured (VITE_GOOGLE_MAPS_KEY). The hotspot breakdown is under List View.
          </MapUnavailable>
        )}

        {view === "list" && (
          <div className="absolute inset-0 overflow-hidden bg-white px-4 pt-1">
            {top.length ? (
              <>
                <table className="w-full table-auto border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Area", "Bookings", "Share"].map((heading, i) => (
                        <th
                          key={heading}
                          className={`pb-2 font-semibold uppercase tracking-wide text-slate-400 ${T.tiny} ${i === 1 ? "pr-4 text-right" : ""}`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((spot, i) => (
                      <tr key={`${spot.lat},${spot.lng}`} className="h-[26px]">
                        <td className={`whitespace-nowrap pr-3 text-slate-700 ${T.xs}`}>
                          <span className="mr-2 inline-block w-3 text-slate-400">{i + 1}</span>
                          {spot.area || "Unknown area"}
                        </td>
                        <td className={`whitespace-nowrap pr-4 text-right font-semibold text-slate-800 ${T.xs}`}>
                          {fmtInt(spot.bookings)}
                        </td>
                        <td className="w-[44%]">
                          <span className="flex items-center gap-2">
                            <Meter pct={(spot.bookings / top[0].bookings) * 100} color={BRAND} height={5} />
                            <span className={`w-[38px] shrink-0 text-right text-slate-500 ${T.tiny}`}>
                              {fmtPct(pctOf(spot.bookings, heatmap.total_bookings))}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={`pt-2 text-slate-400 ${T.tiny}`}>
                  Top {top.length} of {spots.length} areas
                </p>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : "No bookings in this period"}</EmptyNote>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

const FAR_USER_COLUMNS = [
  { header: "User", kind: "text", width: 26, get: (r) => r.name || `User #${r.user_id}` },
  { header: "Phone", kind: "text", width: 16, get: (r) => r.phone },
  { header: "Avg. Distance (km)", kind: "decimal", width: 18, get: (r) => r.avg_distance_km },
  { header: "Est. Travel Time (min)", kind: "decimal", width: 20, get: (r) => r.avg_travel_min },
  { header: "Bookings", kind: "int", width: 11, get: (r) => r.bookings },
  { header: "Total Spent", kind: "money", width: 14, get: (r) => r.spent },
];

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, subtitle, updated, range, period, setPeriod, onCustom, city, setCity, cityOptions, onExport }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {updated && (
          <span className="hidden items-center gap-2 whitespace-nowrap text-[11px] text-slate-500 2xl:flex">
            Last updated: {updated}
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </span>
        )}
        <DateRangeButton from={range.from} to={range.to} onApply={onCustom} color={INDIGO} toastId="deep-insights-range" className="relative hidden lg:block" />
        <HeaderSelect
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[
            ...PERIODS.map((p) => ({ value: p.key, label: p.label })),
            ...(period === "custom" ? [{ value: "custom", label: "Custom" }] : []),
          ]}
          className="hidden lg:flex"
        />
        <HeaderSelect icon={MapPin} label="City" value={city} onChange={setCity} options={cityOptions} className="hidden xl:flex" />
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

const DeepUserInsightsV2 = ({ title = "Deep User Insights" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { deepInsights } = useSelector((state) => state.analytics);
  const [period, setPeriod] = useState(PERIODS[0].key);
  const [custom, setCustom] = useState(null);
  const [city, setCity] = useState("all");
  const [distanceBasis, setDistanceBasis] = useState("bookings");
  const [timeBasis, setTimeBasis] = useState("bookings");
  const [scatterBasis, setScatterBasis] = useState("bookings");
  const [frequencyBasis, setFrequencyBasis] = useState("users");
  const [preferenceBasis, setPreferenceBasis] = useState("bookings");
  const [mixMode, setMixMode] = useState("pct");
  const [updated, setUpdated] = useState(null);
  const [farList, setFarList] = useState(null); // { loading, rows } while "View All" is open

  const range = useMemo(() => {
    if (period === "custom" && custom) return custom;
    const [from, to] = (PERIODS.find((p) => p.key === period) || PERIODS[0]).range();
    return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") };
  }, [period, custom]);
  const body = useMemo(() => {
    const next = { from: range.from, to: range.to };
    if (city !== "all") next.city = city;
    return next;
  }, [range.from, range.to, city]);

  useEffect(() => {
    dispatch(fetchDeepUserInsightsV2(body))
      .unwrap()
      .then(() => setUpdated(moment().format("h:mm A")))
      .catch((message) => toast.error(message || "Failed to load deep user insights", { id: "deep-insights-v2" }));
  }, [dispatch, body]);

  const data = deepInsights.data;
  const loading = deepInsights.loading && !data;
  const k = data?.kpis || {};
  const pk = data?.previous_kpis || {};
  const located = k.bookings_with_distance || 0;
  const compare = data ? `vs ${fmtRange(data.previous.from, data.previous.to)}` : "";
  const shown = (v, fmt) => (loading ? "…" : fmt(v));
  const noLocation = data && !located;
  const waitingNote = data?.location_since
    ? "No located bookings in this period"
    : "Waiting for location data from the app";

  const cityOptions = useMemo(
    () => [{ value: "all", label: "All Cities" }, ...(data?.cities || []).map((c) => ({ value: c, label: c }))],
    [data]
  );
  const subtitle = !data
    ? "Understand your users better. Make smarter decisions."
    : located
      ? `Distance from ${fmtInt(located)} of ${fmtInt(k.bookings_total)} bookings · travel time estimated at ${data.travel_minutes_per_km} min/km`
      : data.location_since
        ? `Location tracking since ${fmtDay(data.location_since)} - no located bookings in this period`
        : "Distance cards fill in once the app sends user locations";

  // ---- KPIs -----------------------------------------------------------------
  const kpi = (label, key, fmt, icon, color, tint, opts = {}) => {
    const delta = change(k[key], pk[key], opts);
    return {
      label,
      value: shown(k[key], fmt),
      delta: delta?.value,
      up: delta?.up,
      good: delta?.good,
      caption: opts.distance && noLocation ? waitingNote : compare,
      icon,
      color,
      tint,
      filled: opts.filled,
    };
  };
  const kpis = [
    kpi("Total Users", "total_users", fmtInt, Users, BRAND, "#EEEAFD"),
    kpi("Avg. Distance Travelled", "avg_distance_km", fmtKm, MapPin, ROSE, "#FDE7EE", { distance: true, inverse: true }),
    kpi("Avg. Travel Time (est.)", "avg_travel_min", fmtMin, Clock, ORANGE, "#FFF0DA", { distance: true, inverse: true }),
    kpi("Users Travelling > 10 km", "users_over_10km", fmtInt, Car, BLUE, "#E3EEFF", { distance: true }),
    kpi("Bookings from > 10 km", "bookings_over_10km_pct", fmtPct, IndianRupee, "#16A34A", "#DDF5E7", { distance: true, points: true }),
    kpi("Repeat Users (30D)", "repeat_users_30d_pct", fmtPct, Heart, ROSE, "#FDE7EE", { points: true, filled: true }),
  ];

  // ---- Distance / travel time -------------------------------------------------
  const distanceRows = (data?.distance_buckets || []).map((b, i) => ({
    name: b.label,
    value: b[distanceBasis],
    color: BUCKET_COLORS[i],
  }));
  const distanceTotal = distanceRows.reduce((t, r) => t + r.value, 0);
  const travelRows = (data?.travel_time_buckets || []).map((b) => ({ label: b.label, value: b[timeBasis] }));
  const travelTotal = travelRows.reduce((t, r) => t + r.value, 0);
  const travelMax = Math.max(0, ...travelRows.map((r) => pctOf(r.value, travelTotal) || 0));
  const travelChange = change(k.avg_travel_min, pk.avg_travel_min, { inverse: true });

  // ---- Reasons ------------------------------------------------------------------
  const reasons = data?.reasons;
  const reasonRows = (reasons?.rows || []).map((r) => ({ ...r, pct: pctOf(r.bookings, reasons.far_bookings) }));
  const reasonMax = Math.max(0, ...reasonRows.map((r) => r.pct || 0));

  // ---- Scatter ------------------------------------------------------------------
  const scatter = data?.scatter?.[scatterBasis];
  const points = scatter?.points || [];
  const maxX = points.length ? Math.max(5, Math.ceil(Math.max(...points.map((p) => p.x)) / 5) * 5) : 30;
  const trend = scatter?.trend;

  // ---- Far users ----------------------------------------------------------------
  const farUsers = data?.far_users || [];
  const openFarList = async () => {
    setFarList({ loading: true, rows: [] });
    try {
      const result = await dispatch(fetchFarTravellingUsersV2(body)).unwrap();
      setFarList({ loading: false, rows: result.far_users || [] });
    } catch (message) {
      toast.error(message || "Failed to load far travelling users", { id: "deep-insights-far" });
      setFarList(null);
    }
  };

  // ---- Frequency / time preference / new vs returning ---------------------------
  const distanceLabels = (data?.distance_rows || []).map((r) => r.label);
  const frequencyMatrix = data?.frequency?.[frequencyBasis] || [];
  const frequencyPct = frequencyMatrix.map((row) => {
    const total = row.reduce((t, v) => t + v, 0);
    return row.map((v) => pctOf(v, total));
  });
  const topColumnMax = Math.max(1, ...frequencyPct.map((row) => row[row.length - 1] || 0));
  const frequencyTint = (value, col, cols) =>
    rampColor(FREQUENCY_RAMP, col === cols - 1 ? (value || 0) / topColumnMax : 0.1);

  const timeMatrix = data?.time_preference?.[preferenceBasis] || [];
  const timeMax = Math.max(0, ...timeMatrix.flat());
  const timeSlots = (data?.time_preference?.start_hours || []).map(hourLabel);
  const timeValues = timeMatrix.map((row) => row.map((v) => (timeMax ? v / timeMax : 0)));

  const mixRows = data?.new_vs_returning || [];

  // ---- Insights -----------------------------------------------------------------
  const insights = [];
  if (located) {
    insights.push({
      icon: MapPin,
      color: BRAND,
      tint: "#F3F0FE",
      title: k.bookings_over_10km_pct >= 15 ? "Users are willing to travel!" : "Most users book nearby",
      text: `${fmtPct(k.bookings_over_10km_pct)} of located bookings come from users travelling more than 10 km.`,
    });
    const topReason = [...reasonRows].filter((r) => r.key !== "other" && r.bookings).sort((a, b) => b.bookings - a.bookings)[0];
    if (topReason) {
      insights.push({
        icon: Percent,
        color: "#16A34A",
        tint: "#EEF9F2",
        title: "Why Far Users Travel",
        text: `${fmtPct(topReason.pct)} of far bookings (${reasons.far_booking_km}+ km, closer salon available): ${topReason.label.toLowerCase()}.`,
      });
    }
    const slotTotals = timeSlots.map((_, c) => (data?.time_preference?.bookings || []).reduce((t, row) => t + (row[c] || 0), 0));
    const peak = slotTotals.indexOf(Math.max(...slotTotals));
    if (peak >= 0 && slotTotals[peak] > 0) {
      const start = data.time_preference.start_hours[peak];
      insights.push({
        icon: Clock,
        color: "#D97706",
        tint: "#FEF6EA",
        title: "Peak Booking Time",
        text: `Most located bookings are for ${hourLabel(start)} – ${hourLabel(start + 2)} slots. Optimize offers & slots.`,
      });
    }
    const far = mixRows[mixRows.length - 1];
    const farTotal = far ? far.new + far.returning : 0;
    if (farTotal) {
      insights.push({
        icon: Heart,
        color: ROSE,
        tint: "#FDF0F3",
        title: "Loyalty of Far Users",
        text: `${fmtPct(pctOf(far.returning, farTotal))} of ${far.label} users are returning customers.`,
      });
    }
  }
  if (!insights.length && data) {
    insights.push({
      icon: MapPinned,
      color: BRAND,
      tint: "#F3F0FE",
      title: "Location data is on its way",
      text: data.location_since
        ? `Location tracking started ${fmtDay(data.location_since)}. Insights appear as located bookings come in.`
        : "Distance insights appear once the app starts sending user locations.",
    });
    if (isNum(k.repeat_users_30d_pct)) {
      insights.push({
        icon: Heart,
        color: ROSE,
        tint: "#FDF0F3",
        title: "Repeat Users",
        text: `${fmtPct(k.repeat_users_30d_pct)} of the last 30 days' customers have booked more than once.`,
      });
    }
  }

  const exportReport = () => {
    if (!data) return;
    const rows = [
      ...kpis.map((t) => ["KPI", t.label, t.value]),
      ...(data.distance_buckets || []).map((b) => ["Distance", b.label, `${b.bookings} bookings / ${b.users} users`]),
      ...(data.travel_time_buckets || []).map((b) => ["Travel time (est.)", b.label, `${b.bookings} bookings / ${b.users} users`]),
      ...reasonRows.map((r) => ["Why users travel", r.label, `${r.bookings} (${fmtPct(r.pct)})`]),
    ];
    downloadCsv(`deep-user-insights-${data.from}_${data.to}.csv`, ["Section", "Metric", "Value"], rows);
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        updated={updated}
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

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Row 1 - KPI tiles                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-6 ${GAP}`}>
          {kpis.map(({ icon, color, tint, filled, ...tile }) => (
            <KpiTile key={tile.label} {...tile} icon={icon} iconColor={color} iconTint={tint} iconFill={filled} />
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 2 - Heat map / distance / travel time                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <HeatMapCard heatmap={data?.heatmap} loading={loading} />

          <Card className="p-4">
            <CardHeader
              title="Distance Travelled by Users"
              right={<Select value={distanceBasis} onChange={setDistanceBasis} options={BASIS} />}
            />

            {distanceTotal ? (
              <div className="my-4 flex items-center gap-5">
                <Donut data={distanceRows} center={fmtInt(distanceTotal)} caption={distanceBasis === "users" ? "Total Users" : "Bookings"} />
                <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
                  {distanceRows.map((bucket) => (
                    <li key={bucket.name} className={`flex items-center gap-2 ${T.xs}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: bucket.color }} />
                      <span className="min-w-0 flex-1 whitespace-nowrap text-slate-700">{bucket.name}</span>
                      <span className="w-[42px] shrink-0 text-right text-slate-600">{fmtPct(pctOf(bucket.value, distanceTotal))}</span>
                      <span className="w-[56px] shrink-0 text-right text-slate-500">({fmtInt(bucket.value)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : waitingNote}</EmptyNote>
            )}

            <div className="mt-auto grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4">
              <div className="min-w-0 pr-4">
                <p className={`text-slate-600 ${T.xs}`}>Avg. Distance Travelled</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{shown(k.avg_distance_km, fmtKm)}</p>
              </div>
              <div className="min-w-0 pl-5">
                <p className={`text-slate-600 ${T.xs}`}>Max Distance</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{shown(k.max_distance_km, fmtKm)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Travel Time Distribution"
              subtitle={data ? `Estimated at ${data.travel_minutes_per_km} min per km` : undefined}
              right={<Select value={timeBasis} onChange={setTimeBasis} options={BASIS} />}
            />

            {travelTotal ? (
              <ul className="mt-4 flex flex-col gap-[14px]">
                {travelRows.map((row) => {
                  const pct = pctOf(row.value, travelTotal);
                  return (
                    <li key={row.label} className={`flex items-center gap-3 ${T.xs}`} title={`${fmtInt(row.value)} ${timeBasis}`}>
                      <span className="w-[76px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                      <span className="min-w-0 flex-1">
                        <Meter pct={travelMax ? (pct / travelMax) * 100 : 0} color={BRAND} height={4} />
                      </span>
                      <span className="w-[40px] shrink-0 text-right text-slate-600">{fmtPct(pct)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : waitingNote}</EmptyNote>
            )}

            <div className="mt-auto flex items-center gap-3 rounded-xl border border-[#E8EAF3] bg-[#F6F7FB] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px]" style={{ borderColor: BRAND, color: BRAND }}>
                <Clock size={17} />
              </span>
              <div className="min-w-0">
                <p className={`text-slate-500 ${T.tiny}`}>Avg. Travel Time (est.)</p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>{shown(k.avg_travel_min, fmtMin)}</span>
                  {travelChange && <Delta value={travelChange.value} up={travelChange.up} good={travelChange.good} size={T.xs} />}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 3 - Motivation / scatter / far travellers                    */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW34_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title={
                <>
                  Why Users Travel? <span className={`font-medium text-slate-500 ${T.tiny}`}>(Inferred from bookings)</span>
                </>
              }
              subtitle={
                reasons
                  ? `${fmtInt(reasons.far_bookings)} bookings ${reasons.far_booking_km}+ km away with a closer salon available`
                  : undefined
              }
            />
            {reasons?.far_bookings ? (
              <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
                {reasonRows.map((row) => {
                  const style = REASON_STYLE[row.key] || REASON_STYLE.other;
                  const Icon = style.icon;
                  return (
                    <li key={row.key} className={`flex items-center gap-3 ${T.xs}`} title={`${fmtInt(row.bookings)} bookings`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: style.tint, color: style.color }}>
                        <Icon size={13} />
                      </span>
                      <span className="w-[140px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                      <span className="min-w-0 flex-1">
                        <Meter pct={reasonMax ? (row.pct / reasonMax) * 100 : 0} color={style.barColor || BRAND} height={4} />
                      </span>
                      <span className="w-[40px] shrink-0 text-right text-slate-600">{fmtPct(row.pct)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : located ? "No far bookings with a closer salon in this period" : waitingNote}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader title="Distance vs Booking Value" right={<Select value={scatterBasis} onChange={setScatterBasis} options={BASIS} />} />
            {points.length ? (
              <div className="mt-2 min-h-[150px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 14, bottom: 22, left: 6 }}>
                    <XAxis type="number" dataKey="x" name="Distance" domain={[0, maxX]} tickLine={false} axisLine={false} tick={AXIS}>
                      <Label value="Distance Travelled (km)" position="insideBottom" offset={-18} style={{ fontSize: 11, fill: "#475569" }} />
                    </XAxis>
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={scatterBasis === "users" ? "Avg. booking value" : "Booking value"}
                      domain={[0, "auto"]}
                      tickFormatter={(value) => value.toLocaleString("en-IN")}
                      tickLine={false}
                      axisLine={false}
                      tick={AXIS}
                      width={50}
                    >
                      <Label
                        value={scatterBasis === "users" ? "Avg. Booking Value (₹)" : "Booking Value (₹)"}
                        angle={-90}
                        position="insideLeft"
                        offset={2}
                        style={{ fontSize: 11, fill: "#475569", textAnchor: "middle" }}
                      />
                    </YAxis>
                    <ZAxis type="number" range={[34, 34]} />
                    <Tooltip
                      {...TOOLTIP}
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) => (name === "Distance" ? `${value} km` : rupees(value))}
                    />
                    {trend && (
                      <ReferenceLine
                        segment={[
                          { x: 0, y: Math.max(0, trend.intercept) },
                          { x: maxX, y: Math.max(0, trend.intercept + trend.slope * maxX) },
                        ]}
                        stroke={BRAND}
                        strokeOpacity={0.55}
                        strokeDasharray="3 4"
                        ifOverflow="hidden"
                      />
                    )}
                    <Scatter data={points} fill={BRAND} fillOpacity={0.85} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : waitingNote}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title={
                <>
                  Top Far Travelling Users{" "}
                  <span className={`font-medium text-slate-500 ${T.tiny}`}>({data?.far_user_km ?? 20}km+)</span>
                </>
              }
              right={
                <button
                  type="button"
                  onClick={openFarList}
                  disabled={!data?.far_users_total}
                  className={`font-semibold text-blue-600 hover:underline disabled:cursor-default disabled:text-slate-300 disabled:no-underline ${T.xs}`}
                >
                  View All{data?.far_users_total ? ` (${fmtInt(data.far_users_total)})` : ""}
                </button>
              }
            />
            {farUsers.length ? (
              <table className="mt-3 w-full table-auto border-collapse text-left">
                <thead>
                  <tr>
                    {["User", "Distance", "Travel Time", "Bookings", "Total Spent"].map((heading, i) => (
                      <th key={heading} className={`pb-2 font-medium text-slate-500 ${T.tiny} ${i ? "text-right" : ""}`}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {farUsers.map((user, i) => {
                    const name = user.name || `User #${user.user_id}`;
                    return (
                      <tr
                        key={user.user_id}
                        className="h-[26px] cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/user-details-v2/${user.user_id}`)}
                      >
                        <td className={`whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                          <span className="flex items-center gap-2">
                            <Avatar name={name} {...AVATAR_TINTS[i % AVATAR_TINTS.length]} />
                            <span className="max-w-[110px] truncate">{name}</span>
                          </span>
                        </td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtKm(user.avg_distance_km)}</td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>
                          {isNum(user.avg_travel_min) ? `${Math.round(user.avg_travel_min)} min` : DASH}
                        </td>
                        <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>{fmtInt(user.bookings)}</td>
                        <td className={`whitespace-nowrap text-right font-semibold text-slate-800 ${T.xs}`}>{rupees(user.spent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyNote>{loading ? "Loading…" : located ? `No users travelled ${data?.far_user_km ?? 20}+ km in this period` : waitingNote}</EmptyNote>
            )}
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Frequency / time preference / new vs returning           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW34_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader title="Booking Frequency by Distance" right={<Select value={frequencyBasis} onChange={setFrequencyBasis} options={BASIS} />} />
            {located ? (
              <div className="mt-3 grid flex-1 grid-cols-[88px_repeat(4,minmax(0,1fr))] content-between gap-[3px]">
                <span className={`self-center text-slate-600 ${T.tiny}`}>Distance (km)</span>
                {(data.frequency.cols || []).map((col) => (
                  <span key={col.key} className={`self-center text-center text-slate-600 ${T.tiny}`}>
                    {col.label}
                  </span>
                ))}

                {frequencyPct.map((row, r) => (
                  <div key={distanceLabels[r]} className="contents">
                    <span className={`self-center whitespace-nowrap text-slate-700 ${T.xs}`}>{distanceLabels[r]}</span>
                    {row.map((value, col) => (
                      <span
                        key={col}
                        className={`grid h-[22px] place-items-center rounded-[3px] text-slate-700 ${T.xs}`}
                        style={{ background: frequencyTint(value, col, row.length) }}
                        title={`${fmtInt(frequencyMatrix[r][col])} ${frequencyBasis}`}
                      >
                        {isNum(value) ? `${Math.round(value)}%` : DASH}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote>{loading ? "Loading…" : waitingNote}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Time Preference vs Distance"
              subtitle="Booked slot time"
              right={<Select value={preferenceBasis} onChange={setPreferenceBasis} options={BASIS} />}
            />
            {timeMax ? (
              <>
                <div className="mt-3">
                  <HeatGrid
                    values={timeValues}
                    ramp={TIME_RAMP}
                    rowLabels={distanceLabels}
                    colLabels={timeSlots}
                    title={(r, c) => `${distanceLabels[r]} · ${timeSlots[c]} · ${fmtInt(timeMatrix[r][c])} ${preferenceBasis}`}
                  />
                </div>
                <div className="mt-auto pt-2.5">
                  <RampLegend ramp={TIME_RAMP} from="Low Preference" to="High Preference" size={T.tiny} width={150} />
                </div>
              </>
            ) : (
              <EmptyNote>{loading ? "Loading…" : waitingNote}</EmptyNote>
            )}
          </Card>

          <Card className="p-4">
            <CardHeader
              title="New vs Returning Users by Distance"
              right={
                <Segmented
                  value={mixMode}
                  onChange={setMixMode}
                  color={BRAND}
                  options={[
                    { value: "pct", label: "%" },
                    { value: "count", label: "Count" },
                  ]}
                />
              }
            />
            <div className={`mt-2 flex items-center justify-center gap-5 text-slate-600 ${T.tiny}`}>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full" style={{ background: BRAND }} />
                New Users
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full" style={{ background: GREEN }} />
                Returning Users
              </span>
            </div>

            {located ? (
              <ul className="mt-2 flex flex-1 flex-col justify-around gap-2">
                {mixRows.map((row) => {
                  const total = row.new + row.returning;
                  const returningPct = pctOf(row.returning, total);
                  return (
                    <li
                      key={row.key}
                      className={`flex items-center gap-3 ${T.xs}`}
                      title={`${fmtInt(row.new)} new · ${fmtInt(row.returning)} returning`}
                    >
                      <span className="w-[62px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                      <span className="flex min-w-0 flex-1 items-center gap-[3px]">
                        {total ? (
                          <>
                            <span className="h-[6px] rounded-full" style={{ width: `${100 - returningPct}%`, background: BRAND }} />
                            <span className="h-[6px] rounded-full" style={{ width: `${returningPct}%`, background: GREEN }} />
                          </>
                        ) : (
                          <span className="h-[6px] w-full rounded-full bg-slate-100" />
                        )}
                      </span>
                      <span className="w-[44px] shrink-0 text-right text-slate-600">
                        {!total ? DASH : mixMode === "pct" ? `${Math.round(returningPct)}%` : fmtInt(row.returning)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyNote>{loading ? "Loading…" : waitingNote}</EmptyNote>
            )}
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Key insights                                             */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-4 pb-4 pt-3.5">
          <CardHeader title="Key Insights & Recommendations" />
          <div className={`mt-2.5 grid grid-cols-4 ${GAP}`}>
            {insights.map((item) => (
              <InsightTile key={item.title} icon={item.icon} color={item.color} tint={item.tint} title={item.title} titleSize={T.sm} textSize={T.xs}>
                {item.text}
              </InsightTile>
            ))}
            {!insights.length && <p className={`col-span-4 py-3 text-center text-slate-400 ${T.xs}`}>{loading ? "Loading…" : DASH}</p>}
          </div>
        </Card>
      </ScaledCanvas>

      {farList && (
        <ListDialog
          title={`Far Travelling Users (${data?.far_user_km ?? 20} km+)`}
          subtitle={`${fmtRange(range.from, range.to)} · ${fmtInt(farList.rows.length)} users · average distance per user`}
          columns={FAR_USER_COLUMNS}
          rows={farList.rows}
          loading={farList.loading}
          note="Distance is a straight line from where the customer booked to the salon; travel time is estimated."
          onRowClick={(row) => navigate(`/user-details-v2/${row.user_id}`)}
          onExport={() =>
            downloadXlsx(`far_travelling_users_${range.from}_${range.to}.xlsx`, [
              { name: "Far users", rows: farList.rows, columns: FAR_USER_COLUMNS },
            ])
          }
          onClose={() => setFarList(null)}
        />
      )}
    </>
  );
};

export default DeepUserInsightsV2;
