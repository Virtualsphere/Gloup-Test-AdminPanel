// Non-component values shared by the V2 pages (kept apart from ui.jsx so Vite
// fast refresh keeps working on the components).

export const CARD = "rounded-2xl border border-[#E6E8F0] bg-white";

export const CHART_AXIS = { fontSize: 11, fill: "#94A3B8" };

export const CHART_TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #E3E7EF",
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  },
  labelStyle: { fontWeight: 700, color: "#0F172A", marginBottom: 2 },
};

// First letters of the first two words, upper-cased.
export const initials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

// [3, 5, 4] -> the [{ i, v }] rows <Sparkline> expects.
export const toSpark = (values) => values.map((v, i) => ({ i, v }));

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Colour at `t` (0..1) along evenly spaced hex `stops`, e.g.
// rampColor(["#EEF2FF", "#4F46E5"], 0.5). Used for heat-grid cells and
// value-tinted table cells.
export const rampColor = (stops, t) => {
  if (stops.length === 1) return stops[0];
  const pos = Math.min(1, Math.max(0, Number(t) || 0)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const from = hexToRgb(stops[i]);
  const to = hexToRgb(stops[i + 1]);
  const mix = from.map((c, k) => Math.round(c + (to[k] - c) * (pos - i)));
  return `rgb(${mix.join(", ")})`;
};
