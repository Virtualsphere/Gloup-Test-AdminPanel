import { Fragment, useEffect, useRef, useState } from "react";
import moment from "moment";
import { toast } from "react-hot-toast";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarDays,
  ChevronDown,
  Download,
  Info,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { CARD, CHART_TOOLTIP, initials, rampColor } from "./tokens";

// Building blocks shared by the V2 pages. Each page still owns its type scale
// (the `T` map) because the canvases differ in width - pass the size class in
// rather than baking one in here. Shared constants live in tokens.js.
//
// Line height: index.css gives <body> a fixed `line-height: 24px` and Tailwind's
// arbitrary `text-[11px]` sizes don't override it, so small text gets a 24px
// line box. Pages put `leading-snug` on their ScaledCanvas to get proportional
// lines; components below set their own `leading-*` where alignment depends on it.

// `options` entries are strings or { value, label }.
const renderOptions = (options) =>
  options.map((option) => {
    const { value, label } = typeof option === "string" ? { value: option, label: option } : option;
    return (
      <option key={value} value={value}>
        {label}
      </option>
    );
  });

// min-w-0 is what lets these shrink inside the grid instead of forcing overflow.
export const Card = ({ children, className = "" }) => (
  <div className={`flex min-w-0 flex-col ${CARD} ${className}`}>{children}</div>
);

export const SectionTitle = ({ size, className = "", children }) => (
  <h2 className={`min-w-0 truncate font-bold tracking-tight text-slate-900 ${size} ${className}`}>
    {children}
  </h2>
);

export const Chip = ({ children, size = "px-2 py-[3px] text-[11px]", className = "" }) => (
  <span
    className={`inline-block shrink-0 whitespace-nowrap rounded-md font-semibold ${size} ${className}`}
  >
    {children}
  </span>
);

// Small bordered dropdown. `options` are strings or { value, label }.
export const Select = ({ value, onChange, options, size, className = "", truncate = false }) => (
  <span className={`relative block shrink-0 ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full cursor-pointer appearance-none ${
        truncate ? "truncate " : ""
      }rounded-lg border border-[#E6E8F0] bg-white py-2 pl-3 pr-7 font-medium text-slate-600 focus:outline-none ${size}`}
    >
      {renderOptions(options)}
    </select>
    <ChevronDown
      size={13}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </span>
);

// The mockups show each salon's own logo; initials on a dark plate stand in
// for them until the API returns partner logos. `className` carries the
// corner radius and the text size.
export const SalonLogo = ({ name, size = 34, className = "rounded-lg" }) => (
  <span
    className={`grid shrink-0 place-items-center font-bold ${className}`}
    style={{
      width: size,
      height: size,
      background: "linear-gradient(135deg,#2B2118,#4C3C28)",
      color: "#E3B85C",
    }}
  >
    {initials(name.replace(/[^A-Za-z ]/g, ""))}
  </span>
);

// Area sparkline for KPI cards. `data` is [{ i, v }] - see toSpark() in tokens.js.
export const Sparkline = ({ id, data, color, height, fillOpacity, domain }) => (
  <div className="mt-auto w-full" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={domain} />
        <Area
          type="linear"
          dataKey="v"
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// Card title row: the title (+ an optional ⓘ), an optional subtitle under it
// and an optional control on the right (period select, toggle, View All).
export const CardHeader = ({
  title,
  info = false,
  subtitle,
  right,
  titleSize,
  subtitleSize,
  titleClassName = "",
  className = "",
}) => (
  <div className={`flex min-w-0 items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <SectionTitle size={titleSize} className={titleClassName}>
          {title}
        </SectionTitle>
        {info && <Info size={13} className="shrink-0 text-slate-400" aria-hidden="true" />}
      </div>
      {subtitle && <p className={`mt-1 truncate text-slate-500 ${subtitleSize}`}>{subtitle}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

// Arrow + value. The arrow follows the direction; the colour follows whether
// that direction is good news (`good`, defaulting to `up`) - the mockups draw a
// falling rage-click count in red and a rising uninstall rate in red.
export const Delta = ({ value, up, good = up, size = "text-[12px]", iconSize = 12, className = "" }) => {
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap font-semibold ${
        good ? "text-emerald-500" : "text-rose-500"
      } ${size} ${className}`}
    >
      <Arrow size={iconSize} strokeWidth={2.6} className="shrink-0" />
      {value}
    </span>
  );
};

// KPI card of the analytics pages: label, value + Delta and a comparison
// caption, with an optional tinted icon badge on the left and an optional
// sparkline underneath (or any `footer` node instead, e.g. a bar sparkline).
// `sizes` = { label, value, delta, caption } classes.
export const KpiTile = ({
  label,
  value,
  delta,
  up,
  good,
  caption,
  icon: Icon,
  iconColor,
  iconTint,
  iconClass = "h-9 w-9 rounded-lg",
  iconSize = 18,
  iconFill = false,
  spark,
  sparkId,
  sparkColor,
  sparkHeight = 40,
  footer,
  sizes,
  className = "",
}) => (
  <Card className={`p-4 ${className}`}>
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span
          className={`grid shrink-0 place-items-center ${iconClass}`}
          style={{ background: iconTint }}
        >
          <Icon
            size={iconSize}
            style={{ color: iconColor }}
            fill={iconFill ? "currentColor" : "none"}
          />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-slate-600 ${sizes.label}`}>{label}</p>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <span
            className={`whitespace-nowrap font-extrabold tracking-tight text-slate-900 ${sizes.value}`}
          >
            {value}
          </span>
          {delta && <Delta value={delta} up={up} good={good} size={sizes.delta} />}
        </div>
        {caption && <p className={`mt-0.5 truncate text-slate-400 ${sizes.caption}`}>{caption}</p>}
      </div>
    </div>

    {spark && (
      <Sparkline
        id={sparkId}
        data={spark}
        color={sparkColor}
        height={sparkHeight}
        fillOpacity={0}
        domain={["dataMin", "dataMax"]}
      />
    )}
    {!spark && footer}
  </Card>
);

// Horizontal bar with `pct` (0-100) of its track filled. `color` is any CSS
// background, so gradients work; pass track="transparent" for a bare bar.
export const Meter = ({ pct, color, height = 6, track = "#EEF0F6", className = "" }) => (
  <span
    className={`block w-full overflow-hidden rounded-full ${className}`}
    style={{ height, background: track }}
  >
    <span
      className="block h-full rounded-full"
      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
    />
  </span>
);

// Ring chart with a centred value and caption. `data` is
// [{ name, value, color }]. Legends stay with each page - every mockup lays
// them out differently.
export const Donut = ({
  data,
  size,
  inner = "66%",
  center,
  caption,
  centerSize = "",
  captionSize = "",
  paddingAngle = 0,
  formatter,
}) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={inner}
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          paddingAngle={paddingAngle}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        {/* Above the centre label, which comes later in the DOM. */}
        <Tooltip {...CHART_TOOLTIP} wrapperStyle={{ zIndex: 10 }} formatter={formatter} />
      </PieChart>
    </ResponsiveContainer>

    <div className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center text-center">
      <span className={`font-extrabold leading-none tracking-tight text-slate-900 ${centerSize}`}>
        {center}
      </span>
      {caption && (
        <span className={`mt-1.5 leading-tight text-slate-500 ${captionSize}`}>{caption}</span>
      )}
    </div>
  </div>
);

// Matrix of tinted cells: values[r][c] (0..1) picks a colour along `ramp`
// (rampColor in tokens.js). Column labels sit on top (or below, with
// labelsAt="bottom"), row labels on the left. An empty string skips a label, so
// a 24-column grid can label every fourth column; labels are centred on their
// column and may overhang it. `title(r, c)` feeds the native tooltip.
export const HeatGrid = ({
  values,
  ramp,
  rowLabels,
  colLabels,
  labelSize,
  labelWidth = 44,
  cellHeight = 14,
  gap = 3,
  radius = 3,
  labelsAt = "top",
  title,
}) => {
  const columnLabels = colLabels.map((label, c) => (
    <span
      key={`col-${c}`}
      className={`relative block h-[1em] leading-none text-slate-500 ${labelSize} ${
        labelsAt === "bottom" ? "mt-1" : ""
      }`}
    >
      <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap">{label}</span>
    </span>
  ));

  return (
    <div
      className="grid min-w-0 items-center"
      style={{
        gridTemplateColumns: `${labelWidth}px repeat(${colLabels.length}, minmax(0, 1fr))`,
        gap,
      }}
    >
      {labelsAt === "top" && (
        <>
          <span />
          {columnLabels}
        </>
      )}

      {/* leading-none: the app's body line-height is a fixed 24px, which would
          otherwise make every grid row taller than its cells. */}
      {values.map((row, r) => (
        <Fragment key={`row-${r}`}>
          <span className={`truncate whitespace-nowrap leading-none text-slate-500 ${labelSize}`}>
            {rowLabels[r]}
          </span>
          {row.map((value, c) => (
            <span
              key={c}
              title={title?.(r, c)}
              className="block"
              style={{ height: cellHeight, borderRadius: radius, background: rampColor(ramp, value) }}
            />
          ))}
        </Fragment>
      ))}

      {labelsAt === "bottom" && (
        <>
          <span />
          {columnLabels}
        </>
      )}
    </div>
  );
};

// "Less ▭ More" key under a HeatGrid: a continuous gradient, or `steps`
// discrete swatches.
export const RampLegend = ({ ramp, from, to, size, steps = 0, width = 132, height = 8 }) => (
  <div className={`flex items-center justify-center gap-2 text-slate-500 ${size}`}>
    <span className="whitespace-nowrap">{from}</span>
    {steps > 1 ? (
      <span className="flex gap-0.5" style={{ width }}>
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{ height, background: rampColor(ramp, i / (steps - 1)) }}
          />
        ))}
      </span>
    ) : (
      <span
        className="rounded-full"
        style={{ width, height, background: `linear-gradient(90deg, ${ramp.join(", ")})` }}
      />
    )}
    <span className="whitespace-nowrap">{to}</span>
  </div>
);

// Small segmented toggle (Map View / List View, % / Count, Men's / Women's /
// All): the active option is filled with `color`. `options` are strings or
// { value, label }; `padding` is each button's padding classes.
export const Segmented = ({
  value,
  onChange,
  options,
  color,
  size,
  padding = "px-3 py-1.5",
  className = "",
}) => (
  <div className={`flex items-center gap-1 ${className}`}>
    {options.map((option) => {
      const { value: v, label } = typeof option === "string" ? { value: option, label: option } : option;
      const active = v === value;
      return (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={active}
          className={`rounded-md border ${padding} font-semibold transition-colors ${size} ${
            active
              ? "border-transparent text-white"
              : "border-[#E6E8F0] bg-white text-slate-600 hover:bg-slate-50"
          }`}
          style={active ? { background: color } : undefined}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// Tinted tile with a round icon, a coloured title and a line of text - the
// "Key Insights" tiles. `tint` is the tile background, `color` the icon and
// title colour; `plain` drops the round icon backdrop. `padding`, `gap` and
// `align` are the tile's own spacing classes.
export const InsightTile = ({
  icon,
  color,
  tint,
  title,
  children,
  titleSize,
  textSize,
  iconClass = "h-12 w-12",
  iconSize = 22,
  plain = false,
  padding = "px-4 py-3",
  gap = "gap-4",
  align = "items-center",
  className = "",
}) => {
  const Icon = icon;
  return (
    <div
      className={`flex min-w-0 ${align} ${gap} rounded-xl border border-black/[0.04] ${padding} ${className}`}
      style={{ background: tint }}
    >
      <span
        className={`grid shrink-0 place-items-center ${plain ? "" : "rounded-full"} ${iconClass}`}
        style={plain ? { color } : { background: `${color}1F`, color }}
      >
        <Icon size={iconSize} />
      </span>
      <div className="min-w-0">
        <p className={`font-semibold ${titleSize}`} style={{ color }}>
          {title}
        </p>
        <p className={`mt-1 text-slate-600 ${textSize}`}>{children}</p>
      </div>
    </div>
  );
};

// Colour key for a chart series. `line` draws the ─●─ marker the line charts
// use instead of a plain dot; `dash` a short plain bar; `square` a small rounded
// square for bar charts.
export const LegendDot = ({
  color,
  label,
  size,
  line = false,
  dash = false,
  square = false,
  className = "",
}) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600 ${size} ${className}`}
  >
    {line ? (
      <span className="relative h-0.5 w-4 shrink-0 rounded-full" style={{ background: color }}>
        <span
          className="absolute left-1/2 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: color }}
        />
      </span>
    ) : dash ? (
      <span className="h-[3px] w-3.5 shrink-0 rounded-full" style={{ background: color }} />
    ) : (
      <span
        className={`h-2 w-2 shrink-0 ${square ? "rounded-[2px]" : "rounded-full"}`}
        style={{ background: color }}
      />
    )}
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// App-bar pieces (rendered through PageHeaderPortal)
// ---------------------------------------------------------------------------

// Notification bell. `count` is still a static placeholder on every V2 page -
// there is no notifications endpoint yet.
export const HeaderBell = ({ count, color, className = "text-slate-600" }) => (
  <button type="button" className={`relative shrink-0 ${className}`} aria-label="Notifications">
    <Bell size={18} />
    {count != null && (
      <span
        className="absolute -right-1.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full px-1 text-[9px] font-bold text-white"
        style={{ background: color }}
      >
        {count}
      </span>
    )}
  </button>
);

// `shortcut` draws the ⌘K hint from the mockups; no shortcut is bound to it.
export const HeaderSearch = ({ value, onChange, placeholder, width, shortcut = false }) => (
  <span className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 lg:flex">
    <Search size={14} className="shrink-0 text-slate-400" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-transparent text-[12px] text-slate-600 placeholder:text-slate-400 focus:outline-none"
      style={{ width }}
    />
    {shortcut && (
      <span className="shrink-0 rounded border border-gray-200 px-1 text-[10px] font-semibold text-slate-400">
        ⌘K
      </span>
    )}
  </span>
);

// Icon + borderless select in a bordered pill - the app bar's date range,
// platform and city pickers. `className` carries the display / breakpoint
// classes ("hidden xl:flex").
export const HeaderSelect = ({ icon: Icon, value, onChange, options, label, className = "flex" }) => (
  <span
    className={`relative shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-2 ${className}`}
  >
    {Icon && <Icon size={14} className="shrink-0 text-slate-500" />}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="cursor-pointer appearance-none bg-transparent pr-5 text-[12px] font-medium text-slate-700 focus:outline-none"
    >
      {renderOptions(options)}
    </select>
    <ChevronDown
      size={13}
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </span>
);

// Outlined app-bar action such as "Export Report". `label` is the full name
// for assistive tech; pass the visible text as children, wrapped in
// <span className="hidden md:inline"> to leave just the icon on narrow screens.
export const HeaderButton = ({ icon: Icon, children, label, onClick, color, className = "flex" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-white px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-slate-50 ${className}`}
    style={{ color, borderColor: color }}
  >
    {Icon && <Icon size={14} className="shrink-0" />}
    {children}
  </button>
);

// "● Live Data  Updated: 10:30 AM" - a static placeholder like the bell
// counts: the demo data behind it never refreshes.
export const LiveStamp = ({ updated, className = "flex" }) => (
  <span
    className={`shrink-0 items-center gap-2 whitespace-nowrap text-[11px] text-slate-500 ${className}`}
  >
    <span className="flex items-center gap-1.5 font-medium text-slate-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Live Data
    </span>
    <span>Updated: {updated}</span>
    <RefreshCw size={12} className="shrink-0 text-slate-400" />
  </span>
);

const DIALOG_DASH = "—";
const fmtDialogRange = (from, to) => {
  const a = moment(from);
  const b = moment(to);
  return `${a.format(a.year() === b.year() ? "D MMM" : "D MMM YYYY")} – ${b.format("D MMM YYYY")}`;
};

// Header date button with a "Custom range" popover (from / to, at most
// `maxDays` days, nothing after today). onApply(from, to) gets YYYY-MM-DD.
export const DateRangeButton = ({
  from,
  to,
  onApply,
  color,
  toastId = "v2-date-range",
  maxDays = 366,
  className = "relative hidden md:block",
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const toggle = () => {
    setDraft({ from, to });
    setOpen((value) => !value);
  };
  const apply = () => {
    if (!draft.from || !draft.to || draft.from > draft.to) {
      toast.error("Pick a start date on or before the end date", { id: toastId });
      return;
    }
    if (moment(draft.to).diff(moment(draft.from), "days") > maxDays - 1) {
      toast.error(`The range can be at most ${maxDays} days`, { id: toastId });
      return;
    }
    onApply(draft.from, draft.to);
    setOpen(false);
  };

  return (
    <div className={className} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-2 text-[12px] font-medium text-slate-700 hover:border-slate-300"
      >
        {fmtDialogRange(from, to)}
        <CalendarDays size={14} className="shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-[13px] font-bold text-slate-800">Custom range</p>
          {[
            ["from", "From"],
            ["to", "To"],
          ].map(([key, label]) => (
            <label key={key} className="mt-2 block text-[12px] text-slate-500">
              {label}
              <input
                type="date"
                value={draft[key]}
                max={moment().format("YYYY-MM-DD")}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-800 focus:outline-none"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={apply}
            className="mt-3 w-full rounded-lg py-2 text-[13px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

const dialogCell = (column, row) => {
  if (column.render) return column.render(row);
  const value = column.get(row);
  if (value === null || value === undefined || value === "") return DIALOG_DASH;
  switch (column.kind) {
    case "int":
      return Number(value).toLocaleString("en-IN");
    case "decimal":
      return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });
    case "money": {
      const abs = `₹${Math.abs(Number(value)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      return Number(value) < 0 ? `-${abs}` : abs;
    }
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "date":
      return moment(value).format("DD MMM YYYY");
    default:
      return value;
  }
};
const isNumericColumn = (column) => column.kind && column.kind !== "text" && column.kind !== "date";

// Full-list dialog behind "View All" links. Render it outside ScaledCanvas -
// a transformed ancestor would trap position: fixed. Columns are
// { header, kind: text|int|decimal|money|percent|date, width, get, render? };
// the same list can feed downloadXlsx. Rows with `onRowClick` are clickable.
export const ListDialog = ({ title, subtitle, columns, rows, loading, note, onExport, onClose, onRowClick }) => {
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runExport = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
          </div>
          {onExport && (
            <button
              type="button"
              onClick={runExport}
              disabled={exporting || loading || !rows.length}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export Excel
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 pb-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : rows.length ? (
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200">
                  {columns.map((c) => (
                    <th
                      key={c.header}
                      className={`whitespace-nowrap py-3 pr-3 text-[11px] font-bold uppercase text-slate-400 ${
                        isNumericColumn(c) ? "text-right" : ""
                      }`}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.store_id ?? row.user_id ?? i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-slate-50 ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.header}
                        className={`whitespace-nowrap py-2.5 pr-3 text-slate-700 ${
                          isNumericColumn(c) ? "text-right tabular-nums" : ""
                        }`}
                      >
                        {dialogCell(c, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-[13px] text-slate-400">Nothing in this period</p>
          )}
          {note && <p className="mt-3 text-[12px] leading-snug text-slate-400">{note}</p>}
        </div>
      </div>
    </div>
  );
};

// Title + message composer for a bulk push (sendBulkUserPushV2). Render it
// outside ScaledCanvas. `audience` reads "To 1,234 <audience>".
export const PushDialog = ({ count, audience = "users", sending, onSend, onClose, color = "#5B3FF0" }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const n = Number(count || 0).toLocaleString("en-IN");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-slate-900">Send Push Notification</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              To {n} {audience} · also saved as an in-app notification
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <label className="mt-4 block text-[12px] font-semibold text-slate-600">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Your slot is still available!"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800 focus:outline-none"
          />
        </label>
        <label className="mt-3 block text-[12px] font-semibold text-slate-600">
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Complete your booking now before the slot is taken."
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-normal text-slate-800 focus:outline-none"
          />
        </label>
        <button
          type="button"
          disabled={sending || !title.trim() || !message.trim() || !count}
          onClick={() => onSend(title.trim(), message.trim())}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: color }}
        >
          {sending && <Loader2 size={14} className="animate-spin" />}
          Send to {n} users
        </button>
      </div>
    </div>
  );
};
