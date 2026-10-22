import { useCallback, useEffect, useState } from "react";
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
  Building2,
  CalendarDays,
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
  Star,
  Tag,
  UserRound,
  Users,
} from "lucide-react";
import { downloadCsv, rupees } from "../../utils/format";
import { GOOGLE_MAPS_LOADER } from "../../utils/googleMaps";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas, { Unscaled } from "../v2/ScaledCanvas";
import { useCanvasScale } from "../v2/canvasScaleContext";
import { CHART_AXIS as AXIS, CHART_TOOLTIP as TOOLTIP, initials, rampColor } from "../v2/tokens";
import {
  Card,
  CardHeader as BaseCardHeader,
  Delta,
  Donut as BaseDonut,
  HeaderButton,
  HeaderSelect,
  HeatGrid as BaseHeatGrid,
  InsightTile,
  KpiTile as BaseKpiTile,
  Meter,
  RampLegend,
  Segmented as BaseSegmented,
  Select as BaseSelect,
} from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Deep User Insights" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number is static demo data matching the mockup. No
// backend source exists yet for how far users travel to a salon; it needs the
// user's home location (or booking-time location) alongside each store's.
// The one live element is the heat map's Google Map: its base map is real,
// the hotspots drawn on it are the demo bookings below. The map renders inside
// <Unscaled> so dragging and zooming track the cursor despite the canvas
// scaling, and it shares GOOGLE_MAPS_LOADER with MapPicker.
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
const SELECT_BASIS = ["By Bookings", "By Users"];

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const COMPARE = "vs May 14 – May 20, 2026";

// `good` colours the delta independently of its direction: users travelling
// further for longer is drawn as bad news.
const kpis = [
  { label: "Total Users", value: "56,782", delta: "18.6%", good: true, icon: Users, color: BRAND, tint: "#EEEAFD" },
  { label: "Avg. Distance Travelled", value: "5.6 km", delta: "8.2%", good: false, icon: MapPin, color: ROSE, tint: "#FDE7EE" },
  { label: "Avg. Travel Time", value: "18.4 min", delta: "6.7%", good: false, icon: Clock, color: ORANGE, tint: "#FFF0DA" },
  { label: "Users Travelling > 10 km", value: "12,846", delta: "14.3%", good: true, icon: Car, color: BLUE, tint: "#E3EEFF" },
  { label: "Bookings from >10km", value: "22.7%", delta: "3.6%", good: true, icon: IndianRupee, color: "#16A34A", tint: "#DDF5E7" },
  { label: "Repeat Users (30D)", value: "42.6%", delta: "3.4%", good: true, icon: Heart, color: ROSE, tint: "#FDE7EE", filled: true },
];

// Bookings per area. The five with a `label` (the side the callout sits on) are
// the callouts in the mockup; the rest just give the heat some spread.
const HOTSPOTS = [
  { area: "T. Nagar", lat: 13.0418, lng: 80.2341, bookings: 4982, label: "right" },
  { area: "Velachery", lat: 12.9815, lng: 80.2209, bookings: 3876, label: "left" },
  { area: "Anna Nagar", lat: 13.085, lng: 80.2101, bookings: 3245, label: "right" },
  { area: "OMR", lat: 12.9611, lng: 80.2431, bookings: 2341, label: "right" },
  { area: "Porur", lat: 13.0358, lng: 80.1565, bookings: 2105, label: "left" },
  { area: "Adyar", lat: 13.0067, lng: 80.257, bookings: 1920 },
  { area: "Guindy", lat: 13.0067, lng: 80.2206, bookings: 1760 },
  { area: "Mylapore", lat: 13.0368, lng: 80.2676, bookings: 1610 },
  { area: "Kodambakkam", lat: 13.0509, lng: 80.225, bookings: 1480 },
  { area: "Egmore", lat: 13.0732, lng: 80.2609, bookings: 1260 },
  { area: "Tambaram", lat: 12.9249, lng: 80.1, bookings: 1120 },
  { area: "Sholinganallur", lat: 12.901, lng: 80.2279, bookings: 1040 },
  { area: "Ambattur", lat: 13.1143, lng: 80.1548, bookings: 930 },
  { area: "Chromepet", lat: 12.9516, lng: 80.1462, bookings: 820 },
];
const HOTSPOT_TOTAL = HOTSPOTS.reduce((sum, spot) => sum + spot.bookings, 0);
const TOP_HOTSPOTS = [...HOTSPOTS].sort((a, b) => b.bookings - a.bookings).slice(0, 8);

const distanceBuckets = [
  { name: "0 – 2 km", value: 10612, pct: "18.7%", color: BRAND },
  { name: "2 – 5 km", value: 18402, pct: "32.4%", color: BLUE },
  { name: "5 – 10 km", value: 14826, pct: "26.1%", color: GREEN },
  { name: "10 – 20 km", value: 8692, pct: "15.3%", color: ORANGE },
  { name: "20+ km", value: 4250, pct: "7.5%", color: RED },
];

const travelTime = [
  { label: "0 – 10 min", pct: 24.6 },
  { label: "10 – 20 min", pct: 38.7 },
  { label: "20 – 30 min", pct: 21.5 },
  { label: "30 – 45 min", pct: 10.2 },
  { label: "45+ min", pct: 5.0 },
];
const maxTravelTime = Math.max(...travelTime.map((row) => row.pct));

// `bar` is the fill as drawn in the mockup (not strictly proportional).
const reasons = [
  { label: "Better Price / Offers", pct: "42.6%", bar: 69, icon: Tag, color: "#F97316", tint: "#FFEDD5" },
  { label: "Better Salon Ratings", pct: "28.3%", bar: 55, icon: Star, color: GREEN, tint: "#DCFCE7" },
  { label: "Preferred Stylist", pct: "15.7%", bar: 32, icon: UserRound, color: "#64748B", tint: "#EEF1F6", barColor: "#A99BF0" },
  { label: "Nearby Workplace", pct: "7.2%", bar: 24, icon: Building2, color: BRAND, tint: "#EEEAFD" },
  { label: "Other Reasons", pct: "6.2%", bar: 22, icon: Ellipsis, color: BRAND, tint: "#EEEAFD" },
];

// Fixed pseudo-random cloud so the scatter is identical on every render: a
// seeded generator, denser at short distances, rising roughly linearly.
const scatterPoints = (() => {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 64 }, () => {
    const x = +(0.6 + rand() ** 1.2 * 27.4).toFixed(1);
    const y = Math.round(70 + x * 33 + (rand() - 0.5) * 170);
    return { x, y: Math.min(990, Math.max(40, y)) };
  });
})();

const farUsers = [
  { name: "Riya S.", distance: 24.7, minutes: 52, bookings: 23, spent: 18760, tint: "#FDE7EE", color: ROSE },
  { name: "Arun K.", distance: 22.1, minutes: 45, bookings: 17, spent: 12450, tint: "#E3EEFF", color: BLUE },
  { name: "Meera V.", distance: 21.3, minutes: 48, bookings: 19, spent: 14230, tint: "#DDF5E7", color: "#16A34A" },
  { name: "Karthik J.", distance: 20.8, minutes: 41, bookings: 21, spent: 16980, tint: "#FFF0DA", color: "#D97706" },
  { name: "Priyanka M.", distance: 20.2, minutes: 43, bookings: 16, spent: 11560, tint: "#EEEAFD", color: BRAND },
];

const FREQUENCY_COLS = ["1 Time", "2 - 3 Times", "4 - 6 Times", "7+ Times"];
const FREQUENCY_RAMP = ["#F0EEFD", "#A998F2"];
const frequency = [
  { range: "0 – 2 km", values: [62, 24, 10, 4] },
  { range: "2 – 5 km", values: [48, 28, 16, 8] },
  { range: "5 – 10 km", values: [37, 27, 21, 15] },
  { range: "10 – 20 km", values: [28, 25, 22, 25] },
  { range: "20+ km", values: [22, 21, 20, 37] },
];
// Only the 7+ column carries a value-driven tint in the mockup; the rest stay
// at one light wash.
const frequencyTint = (value, col) => rampColor(FREQUENCY_RAMP, col === 3 ? value / 45 : 0.1);

const TIME_SLOTS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"];
const DISTANCE_ROWS = distanceBuckets.map((bucket) => bucket.name);
const TIME_RAMP = ["#FDE8F1", "#F8B4D4", "#E56AC0", "#9B4DE0", "#4B46E5", "#3B63E8"];
// Evening-heavy, and more so the further the trip.
const timePreference = [0.72, 0.84, 0.96, 1.04, 1.1].map((boost) =>
  [0.1, 0.18, 0.3, 0.44, 0.62, 0.82, 0.95, 0.5].map((v) => Math.min(1, +(v * boost).toFixed(2)))
);

// `returning` is the share on the right-hand label; the rest are new users.
const newVsReturning = [
  { range: "0 – 2 km", returning: 57, users: 10612 },
  { range: "2 – 5 km", returning: 62, users: 18402 },
  { range: "5 – 10 km", returning: 65, users: 14826 },
  { range: "10 – 20 km", returning: 68, users: 8692 },
  { range: "20+ km", returning: 72, users: 4250 },
];

const insights = [
  {
    icon: MapPin,
    color: BRAND,
    tint: "#F3F0FE",
    title: "Users are willing to travel!",
    text: "22.7% of bookings come from users travelling more than 10 km.",
  },
  {
    icon: Percent,
    color: "#16A34A",
    tint: "#EEF9F2",
    title: "High Value from Far Users",
    text: "Users travelling 20+ km have 37% higher repeat rate and 28% higher AOV.",
  },
  {
    icon: Clock,
    color: "#D97706",
    tint: "#FEF6EA",
    title: "Peak Travel Time",
    text: "Most users travel in the evening (4 PM – 9 PM). Optimize offers & slots.",
  },
  {
    icon: Heart,
    color: ROSE,
    tint: "#FDF0F3",
    title: "Loyal Users Travel More",
    text: "72% of 20km+ users are repeat bookers. Focus on retention.",
  },
];

const DATE_RANGES = ["May 21 – May 27, 2026", "May 14 – May 20, 2026", "Apr 28 – May 27, 2026"];
const CITIES = ["Chennai", "All Cities"];

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

const MAP_CONTAINER = { width: "100%", height: "100%" };
// Midpoint of the five callout areas.
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
const heatRadius = (bookings) => 48 * Math.sqrt(bookings); // metres

// Zoom 11 frames the callout areas end to end; a shorter map (small screens
// shrink it) steps back to 10 so they all stay in view.
const frameMap = (map) => {
  map.setCenter(MAP_CENTER);
  map.setZoom(map.getDiv().clientHeight >= 200 ? 11 : 10);
};

const MapUnavailable = ({ children }) => (
  <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 bg-slate-50 px-8 text-center">
    <MapPinned size={22} className="text-slate-400" />
    <p className={`font-semibold text-slate-700 ${T.sm}`}>Map unavailable</p>
    <p className={`max-w-[280px] text-slate-500 ${T.tiny}`}>{children}</p>
  </div>
);

// White callout above a hotspot. It is drawn at true screen pixels inside
// <Unscaled>, so it is scaled by the canvas factor to match the page's type.
const Callout = ({ area, bookings, side, scale }) => (
  <div
    className="pointer-events-none rounded-md bg-white px-2.5 py-1 text-center leading-tight shadow-md ring-1 ring-black/5"
    style={{ transform: `scale(${scale})`, transformOrigin: side === "left" ? "100% 50%" : "0% 50%" }}
  >
    <div className="whitespace-nowrap text-[11px] text-slate-500">{area}</div>
    <div className="whitespace-nowrap text-[12px] font-bold text-slate-900">
      {bookings.toLocaleString("en-IN")}
    </div>
  </div>
);

const LiveHeatMap = () => {
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
    return (
      <MapUnavailable>
        Google Maps could not be loaded with the configured key. The hotspot breakdown is under List View.
      </MapUnavailable>
    );
  }
  if (!isLoaded) return <div className="absolute inset-0 animate-pulse bg-slate-100" />;

  const zoomBy = (step) => map && map.setZoom((map.getZoom() || 11) + step);
  const control =
    "grid h-8 w-8 place-items-center text-slate-600 transition-colors hover:bg-slate-50";

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
          {HOTSPOTS.map((spot) =>
            HEAT_RINGS.map((ring) => (
              <CircleF
                key={`${spot.area}-${ring.scale}`}
                center={{ lat: spot.lat, lng: spot.lng }}
                radius={heatRadius(spot.bookings) * ring.scale}
                options={{
                  strokeWeight: 0,
                  fillColor: ring.color,
                  fillOpacity: ring.opacity,
                  clickable: false,
                }}
              />
            ))
          )}

          {HOTSPOTS.filter((spot) => spot.label).map((spot) => (
            <OverlayViewF
              key={spot.area}
              position={{ lat: spot.lat, lng: spot.lng }}
              mapPaneName="overlayMouseTarget"
              getPixelPositionOffset={(width, height) => ({
                x: spot.label === "left" ? -width - 10 : 10,
                y: -height / 2,
              })}
            >
              <Callout area={spot.area} bookings={spot.bookings} side={spot.label} scale={scale} />
            </OverlayViewF>
          ))}
        </GoogleMap>
      </Unscaled>

      {/* Legend and zoom controls live in canvas space, over the map. */}
      <div
        className={`absolute bottom-7 left-3 flex items-center gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-slate-600 shadow ring-1 ring-black/5 ${T.tiny}`}
      >
        Low
        <span
          className="h-1.5 w-[84px] rounded-full"
          style={{ background: "linear-gradient(90deg,#4ADE80,#FACC15,#FB923C,#EF4444)" }}
        />
        High
      </div>

      <div className="absolute bottom-7 right-3 flex flex-col divide-y divide-slate-100 overflow-hidden rounded-lg bg-white shadow ring-1 ring-black/5">
        <button type="button" className={control} aria-label="Zoom in" onClick={() => zoomBy(1)}>
          <Plus size={15} />
        </button>
        <button type="button" className={control} aria-label="Zoom out" onClick={() => zoomBy(-1)}>
          <Minus size={15} />
        </button>
        <button
          type="button"
          className={control}
          aria-label="Reset map view"
          onClick={() => map && frameMap(map)}
        >
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

const Select = ({ size = T.tiny, ...props }) => (
  <BaseSelect size={size} className="w-[100px] [&_select]:py-1" {...props} />
);

const Segmented = (props) => <BaseSegmented size={T.tiny} {...props} />;

const KpiTile = (props) => (
  <BaseKpiTile
    sizes={{ label: T.sm, value: T.kpi, delta: T.sm, caption: T.tiny }}
    iconClass="h-14 w-14 rounded-full"
    iconSize={26}
    caption={COMPARE}
    up
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

const HeatGrid = (props) => (
  <BaseHeatGrid labelSize={T.tiny} labelWidth={64} cellHeight={19} gap="2px" radius={2} {...props} />
);

const Avatar = ({ name, tint, color }) => (
  <span
    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
    style={{ background: tint, color }}
  >
    {initials(name)}
  </span>
);

const HeatMapCard = () => {
  const [view, setView] = useState("map");
  const hasKey = Boolean(GOOGLE_MAPS_LOADER.googleMapsApiKey);

  return (
    <Card>
      <div className="px-4 pt-4">
        <CardHeader
          title={
            <>
              User Heat Map{" "}
              <span className={`font-medium text-slate-500 ${T.tiny}`}>(Bookings by Location)</span>
            </>
          }
          info
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
          <LiveHeatMap />
        ) : (
          <MapUnavailable>
            No Google Maps key is configured (VITE_GOOGLE_MAPS_KEY). The hotspot breakdown is under List View.
          </MapUnavailable>
        )}

        {view === "list" && (
          <div className="absolute inset-0 overflow-hidden bg-white px-4 pt-1">
            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Area", "Bookings", "Share"].map((heading, i) => (
                    <th
                      key={heading}
                      className={`pb-2 font-semibold uppercase tracking-wide text-slate-400 ${T.tiny} ${
                        i === 1 ? "pr-4 text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_HOTSPOTS.map((spot, i) => (
                  <tr key={spot.area} className="h-[26px]">
                    <td className={`whitespace-nowrap pr-3 text-slate-700 ${T.xs}`}>
                      <span className="mr-2 inline-block w-3 text-slate-400">{i + 1}</span>
                      {spot.area}
                    </td>
                    <td className={`whitespace-nowrap pr-4 text-right font-semibold text-slate-800 ${T.xs}`}>
                      {spot.bookings.toLocaleString("en-IN")}
                    </td>
                    <td className="w-[44%]">
                      <span className="flex items-center gap-2">
                        <Meter pct={(spot.bookings / TOP_HOTSPOTS[0].bookings) * 100} color={BRAND} height={5} />
                        <span className={`w-[38px] shrink-0 text-right text-slate-500 ${T.tiny}`}>
                          {((spot.bookings / HOTSPOT_TOTAL) * 100).toFixed(1)}%
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`pt-2 text-slate-400 ${T.tiny}`}>
              Top {TOP_HOTSPOTS.length} of {HOTSPOTS.length} areas
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

const exportFarUsers = () =>
  downloadCsv(
    "deep-user-insights-far-travelling-users.csv",
    ["User", "Distance (km)", "Travel Time (min)", "Bookings", "Total Spent (INR)"],
    farUsers.map((u) => [u.name, u.distance, u.minutes, u.bookings, u.spent])
  );

// Title and header controls live in the app bar, not the canvas.
const PageHeader = ({ title, range, setRange, city, setCity }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          Understand your users better. Make smarter decisions.
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* Static stamp, like the bell counts: the demo data never refreshes. */}
        <span className="hidden items-center gap-2 whitespace-nowrap text-[11px] text-slate-500 2xl:flex">
          Last updated: 10:30 AM
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
        <HeaderButton icon={Download} label="Export report" color={INDIGO} onClick={exportFarUsers}>
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
  const [range, setRange] = useState(DATE_RANGES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [distanceBasis, setDistanceBasis] = useState(SELECT_BASIS[0]);
  const [timeBasis, setTimeBasis] = useState(SELECT_BASIS[0]);
  const [scatterBasis, setScatterBasis] = useState(SELECT_BASIS[0]);
  const [frequencyBasis, setFrequencyBasis] = useState(SELECT_BASIS[1]);
  const [preferenceBasis, setPreferenceBasis] = useState(SELECT_BASIS[0]);
  const [mixMode, setMixMode] = useState("pct");

  return (
    <>
      <PageHeader title={title} range={range} setRange={setRange} city={city} setCity={setCity} />

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
        {/* Row 2 - Heat map / distance / travel time                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW2_COLS} ${GAP}`}>
          <HeatMapCard />

          <Card className="p-4">
            <CardHeader
              title="Distance Travelled by Users"
              info
              right={<Select value={distanceBasis} onChange={setDistanceBasis} options={SELECT_BASIS} />}
            />

            <div className="my-4 flex items-center gap-5">
              <Donut data={distanceBuckets} center="56,782" caption="Total Users" />
              <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
                {distanceBuckets.map((bucket) => (
                  <li key={bucket.name} className={`flex items-center gap-2 ${T.xs}`}>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: bucket.color }}
                    />
                    <span className="min-w-0 flex-1 whitespace-nowrap text-slate-700">{bucket.name}</span>
                    <span className="w-[42px] shrink-0 text-right text-slate-600">{bucket.pct}</span>
                    <span className="w-[56px] shrink-0 text-right text-slate-500">
                      ({bucket.value.toLocaleString("en-IN")})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4">
              <div className="min-w-0 pr-4">
                <p className={`text-slate-600 ${T.xs}`}>Avg. Distance Travelled</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>5.6 km</p>
              </div>
              <div className="min-w-0 pl-5">
                <p className={`text-slate-600 ${T.xs}`}>Max Distance</p>
                <p className={`mt-1 font-extrabold tracking-tight text-slate-900 ${T.stat}`}>28.7 km</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Travel Time Distribution"
              info
              right={<Select value={timeBasis} onChange={setTimeBasis} options={SELECT_BASIS} />}
            />

            <ul className="mt-4 flex flex-col gap-[14px]">
              {travelTime.map((row) => (
                <li key={row.label} className={`flex items-center gap-3 ${T.xs}`}>
                  <span className="w-[76px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                  <span className="min-w-0 flex-1">
                    <Meter pct={(row.pct / maxTravelTime) * 100} color={BRAND} height={4} />
                  </span>
                  <span className="w-[40px] shrink-0 text-right text-slate-600">{row.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex items-center gap-3 rounded-xl border border-[#E8EAF3] bg-[#F6F7FB] px-4 py-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px]"
                style={{ borderColor: BRAND, color: BRAND }}
              >
                <Clock size={17} />
              </span>
              <div className="min-w-0">
                <p className={`text-slate-500 ${T.tiny}`}>Avg. Travel Time</p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className={`font-extrabold tracking-tight text-slate-900 ${T.stat}`}>18.4 min</span>
                  <Delta value="6.7%" up size={T.xs} />
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
                  Why Users Travel?{" "}
                  <span className={`font-medium text-slate-500 ${T.tiny}`}>(Motivation Insight)</span>
                </>
              }
              info
            />
            <ul className="mt-3 flex flex-1 flex-col justify-around gap-2">
              {reasons.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.label} className={`flex items-center gap-3 ${T.xs}`}>
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                      style={{ background: row.tint, color: row.color }}
                    >
                      <Icon size={13} />
                    </span>
                    <span className="w-[140px] shrink-0 whitespace-nowrap text-slate-700">{row.label}</span>
                    <span className="min-w-0 flex-1">
                      <Meter pct={row.bar} color={row.barColor || BRAND} height={4} />
                    </span>
                    <span className="w-[40px] shrink-0 text-right text-slate-600">{row.pct}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Distance vs Booking Value"
              info
              right={<Select value={scatterBasis} onChange={setScatterBasis} options={SELECT_BASIS} />}
            />
            <div className="mt-2 min-h-[150px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 14, bottom: 22, left: 6 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Distance"
                    domain={[0, 30]}
                    ticks={[0, 5, 10, 15, 20, 25, 30]}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                  >
                    <Label
                      value="Distance Travelled (km)"
                      position="insideBottom"
                      offset={-18}
                      style={{ fontSize: 11, fill: "#475569" }}
                    />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Avg. booking value"
                    domain={[0, 1000]}
                    ticks={[0, 250, 500, 750, 1000]}
                    interval={0}
                    tickFormatter={(value) => value.toLocaleString("en-IN")}
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={50}
                  >
                    <Label
                      value="Avg. Booking Value (₹)"
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
                  <ReferenceLine
                    segment={[
                      { x: 0, y: 70 },
                      { x: 29, y: 1030 },
                    ]}
                    stroke={BRAND}
                    strokeOpacity={0.55}
                    strokeDasharray="3 4"
                    ifOverflow="hidden"
                  />
                  <Scatter
                    data={scatterPoints}
                    fill={BRAND}
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title={
                <>
                  Top Far Travelling Users{" "}
                  <span className={`font-medium text-slate-500 ${T.tiny}`}>(20km+)</span>
                </>
              }
              info
              right={
                <button
                  type="button"
                  className={`font-semibold text-blue-600 hover:underline ${T.xs}`}
                >
                  View All
                </button>
              }
            />
            <table className="mt-3 w-full table-auto border-collapse text-left">
              <thead>
                <tr>
                  {["User", "Distance", "Travel Time", "Bookings", "Total Spent"].map((heading, i) => (
                    <th
                      key={heading}
                      className={`pb-2 font-medium text-slate-500 ${T.tiny} ${i ? "text-right" : ""}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {farUsers.map((user) => (
                  <tr key={user.name} className="h-[26px]">
                    <td className={`whitespace-nowrap pr-2 text-slate-800 ${T.xs}`}>
                      <span className="flex items-center gap-2">
                        <Avatar {...user} />
                        {user.name}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>
                      {user.distance} km
                    </td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>
                      {user.minutes} min
                    </td>
                    <td className={`whitespace-nowrap pr-2 text-right text-slate-700 ${T.xs}`}>
                      {user.bookings}
                    </td>
                    <td className={`whitespace-nowrap text-right font-semibold text-slate-800 ${T.xs}`}>
                      {rupees(user.spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 4 - Frequency / time preference / new vs returning           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${ROW34_COLS} ${GAP}`}>
          <Card className="p-4">
            <CardHeader
              title="Booking Frequency by Distance"
              info
              right={<Select value={frequencyBasis} onChange={setFrequencyBasis} options={SELECT_BASIS} />}
            />
            <div className="mt-3 grid flex-1 grid-cols-[88px_repeat(4,minmax(0,1fr))] content-between gap-[3px]">
              <span className={`self-center text-slate-600 ${T.tiny}`}>Distance (km)</span>
              {FREQUENCY_COLS.map((col) => (
                <span key={col} className={`self-center text-center text-slate-600 ${T.tiny}`}>
                  {col}
                </span>
              ))}

              {frequency.map((row) => (
                <div key={row.range} className="contents">
                  <span className={`self-center whitespace-nowrap text-slate-700 ${T.xs}`}>
                    {row.range}
                  </span>
                  {row.values.map((value, col) => (
                    <span
                      key={col}
                      className={`grid h-[22px] place-items-center rounded-[3px] text-slate-700 ${T.xs}`}
                      style={{ background: frequencyTint(value, col) }}
                    >
                      {value}%
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Time Preference vs Distance"
              info
              right={<Select value={preferenceBasis} onChange={setPreferenceBasis} options={SELECT_BASIS} />}
            />
            <div className="mt-3">
              <HeatGrid
                values={timePreference}
                ramp={TIME_RAMP}
                rowLabels={DISTANCE_ROWS}
                colLabels={TIME_SLOTS}
                title={(r, c) =>
                  `${DISTANCE_ROWS[r]} · ${TIME_SLOTS[c]} · ${Math.round(timePreference[r][c] * 100)}% of peak`
                }
              />
            </div>
            <div className="mt-auto pt-2.5">
              <RampLegend
                ramp={TIME_RAMP}
                from="Low Preference"
                to="High Preference"
                size={T.tiny}
                width={150}
              />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="New vs Returning Users by Distance"
              info
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

            <ul className="mt-2 flex flex-1 flex-col justify-around gap-2">
              {newVsReturning.map((row) => (
                <li key={row.range} className={`flex items-center gap-3 ${T.xs}`}>
                  <span className="w-[62px] shrink-0 whitespace-nowrap text-slate-700">{row.range}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-[3px]">
                    <span
                      className="h-[6px] rounded-full"
                      style={{ width: `${100 - row.returning}%`, background: BRAND }}
                    />
                    <span
                      className="h-[6px] rounded-full"
                      style={{ width: `${row.returning}%`, background: GREEN }}
                    />
                  </span>
                  <span className="w-[44px] shrink-0 text-right text-slate-600">
                    {mixMode === "pct"
                      ? `${row.returning}%`
                      : Math.round((row.users * row.returning) / 100).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Row 5 - Key insights                                             */}
        {/* ---------------------------------------------------------------- */}
        <Card className="px-4 pb-4 pt-3.5">
          <CardHeader title="Key Insights & Recommendations" />
          <div className={`mt-2.5 grid grid-cols-4 ${GAP}`}>
            {insights.map((item) => (
              <InsightTile
                key={item.title}
                icon={item.icon}
                color={item.color}
                tint={item.tint}
                title={item.title}
                titleSize={T.sm}
                textSize={T.xs}
              >
                {item.text}
              </InsightTile>
            ))}
          </div>
        </Card>
      </ScaledCanvas>
    </>
  );
};

export default DeepUserInsightsV2;
