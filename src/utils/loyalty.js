/** User.loyalty_status tiers (from backend paid_booking_count). */
export const LOYALTY_TIERS = [
  {
    value: "new_user",
    label: "New user",
    description: "0 paid bookings",
  },
  {
    value: "first_booking",
    label: "First booking",
    description: "1 paid booking",
  },
  {
    value: "repeat",
    label: "Repeat",
    description: "2–4 paid bookings",
  },
  {
    value: "loyal",
    label: "Loyal",
    description: "5–9 paid bookings",
  },
  {
    value: "vip",
    label: "VIP",
    description: "10+ paid bookings",
  },
];

export const loyaltyLabel = (value) =>
  LOYALTY_TIERS.find((t) => t.value === value)?.label || value || "—";

export const formatLoyaltyList = (raw) => {
  if (!raw) return "—";
  const parts = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return "—";
  return parts.map(loyaltyLabel).join(", ");
};
