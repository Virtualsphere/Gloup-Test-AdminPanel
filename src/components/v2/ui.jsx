import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Bell, ChevronDown, Search } from "lucide-react";
import { CARD, initials } from "./tokens";

// Building blocks shared by the V2 pages. Each page still owns its type scale
// (the `T` map) because the canvases differ in width - pass the size class in
// rather than baking one in here. Shared constants live in tokens.js.

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
      {options.map((option) => {
        const { value: v, label } = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={v} value={v}>
            {label}
          </option>
        );
      })}
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
