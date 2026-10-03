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
