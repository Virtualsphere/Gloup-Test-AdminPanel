// Non-component values shared by the V2 pages (kept apart from ui.jsx so Vite
// fast refresh keeps working on the components).

export const CARD = "rounded-2xl border border-[#E6E8F0] bg-white";

// Classes for a grid row of n cards, keyed by n, in a page's wrapped layout
// (ScaledCanvas `minWidth`): fewer columns at full type size, and the page
// grows taller instead of shrinking. 3 -> 2 + 1 full width, 5 -> 3 + 2,
// 7 -> 4 + 3; 2 stacks.
export const WRAP = {
  2: "wrapped:grid-cols-1",
  3: "wrapped:grid-cols-2 wrapped:[&>:last-child]:col-span-2",
  4: "wrapped:grid-cols-2",
  5: "wrapped:grid-cols-6 wrapped:[&>*]:col-span-2 wrapped:[&>:nth-child(n+4)]:col-span-3",
  6: "wrapped:grid-cols-3",
  7: "wrapped:grid-cols-12 wrapped:[&>*]:col-span-3 wrapped:[&>:nth-child(n+5)]:col-span-4",
  8: "wrapped:grid-cols-4",
  // A row of three whose widest card needs a full row once wrapped: that
  // card takes WRAP_WIDE and the other two share a row (dense, so they move
  // up beside each other).
  wide: "wrapped:grid-cols-2 wrapped:grid-flow-row-dense",
  // Rows whose cards pair up with the rows around them instead: the row
  // dissolves into a canvas that has WRAP_FLOW, so three rows of three and a
  // closing card come out as five pairs rather than three stretched cards.
  flow: "wrapped:contents",
};

// A card or row that takes a full row once wrapped (also inside WRAP_FLOW).
export const WRAP_WIDE = "wrapped:col-span-2";

// For the ScaledCanvas className of a page whose rows use WRAP.flow.
export const WRAP_FLOW = "wrapped:grid wrapped:grid-cols-2";

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
