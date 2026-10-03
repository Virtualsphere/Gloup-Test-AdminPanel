import moment from "moment";
import { pick, rupees, titleCase, toDate } from "./format";
import { loyaltyLabel } from "./loyalty";

// Maps the admin user APIs onto the shapes UsersV2 / UserDetailsV2 render.
// Pure functions only - no React, no Redux - so they can be unit-tested.
//
// normalizeUser: one row of /getUsersListV2 (also tolerates the older
// /getallusers rows, which lack the V2-only fields). V2 rows carry
// registered_at, last_active_at, last_booking_at, total_bookings (real count
// of paid bookings), source ("referral" | "organic") and login_method.
// User.paid_booking_count is NOT a booking count any more (it was reset to 0
// for tier pricing), so it is deliberately not read.
//
// buildUserProfile: the /getUserProfileV2 payload { user, summary, bookings }.
// Bookings carry their real appointments.status and the amount paid.

export const ONLINE_WINDOW_MINUTES = 15;

const toGender = (value) => {
  const g = String(value ?? "").trim().toLowerCase();
  if (g.startsWith("f")) return "female";
  if (g.startsWith("m")) return "male";
  return "";
};

const LOGIN_METHODS = { apple: "Apple", google: "Google", phone: "Phone" };

// One row of getUsersListV2.
export const normalizeUser = (u) => {
  const bookingsRaw = pick(u, ["total_bookings"]);
  const bookings =
    bookingsRaw == null || Number.isNaN(Number(bookingsRaw)) ? null : Number(bookingsRaw);
  const avatar = pick(u, ["profilepic", "profilePic", "profile_pic"]);

  return {
    id: u.id,
    name:
      (u.name || `${u.firstname || ""} ${u.lastname || ""}`).trim() || "Unnamed user",
    email: u.email || "",
    phone: u.phone ? String(u.phone) : "",
    gender: toGender(u.gender),
    city: u.city ? titleCase(String(u.city).trim()) : "",
    status: String(u.status || "").toLowerCase(),
    source: u.source ? titleCase(u.source) : "",
    loginMethod: LOGIN_METHODS[u.login_method] || "",
    loyalty: u.loyalty_status || "",
    avatar: typeof avatar === "string" ? avatar : null,
    joined: toDate(u.registered_at),
    lastOpen: toDate(u.last_active_at),
    lastBooking: toDate(u.last_booking_at),
    bookings,
  };
};

// ---------------------------------------------------------------------------
// User profile (getUserProfileV2)
// ---------------------------------------------------------------------------

// Real appointments.status -> the buckets the profile counts. booked /
// confirmed bookings whose day has passed without being marked completed go
// to "not_completed" - the data can't tell a no-show from a salon that never
// closed the booking, so they aren't called no-shows.
const bucketOf = (booking) => {
  if (booking.status === "completed") return "completed";
  if (booking.status === "cancelled" || booking.status === "refunded") return "cancelled";
  return booking.upcoming ? "upcoming" : "not_completed";
};

const TIME_BUCKETS = [
  { label: "Morning (6AM - 12PM)", from: 6, to: 12 },
  { label: "Afternoon (12PM - 5PM)", from: 12, to: 17 },
  { label: "Evening (5PM - 9PM)", from: 17, to: 21 },
  { label: "Night (9PM - 6AM)", from: 21, to: 30 },
];

const toSlot = (value) => {
  if (!value) return null;
  const time = moment(value, ["HH:mm:ss", "HH:mm"], true);
  return time.isValid() ? time : null;
};

// Most frequent values, most common first.
const ranked = (values) => {
  const counts = values.filter(Boolean).reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
};

const normalizeBooking = (b) => ({
  key: b.id,
  id: b.id,
  salon: b.salon_name || "Salon",
  image: b.salon_image || null,
  date: toDate(b.booking_date),
  from: toSlot(b.slot_from),
  to: toSlot(b.slot_to),
  services: Array.isArray(b.services) ? b.services : [],
  categories: Array.isArray(b.service_categories) ? b.service_categories : [],
  // What the customer paid (charged price + GST).
  amount: Number(b.amount_paid) || 0,
  savings: Number(b.savings) || 0,
  coupon: b.coupon_code || null,
  status: bucketOf(b),
  rawStatus: b.status || "",
  place: [b.salon_area, b.salon_city].filter(Boolean).join(", "),
  createdAt: toDate(b.created_at),
});

const ageFrom = (user) => {
  if (user.age) return Number(user.age);
  const dob = toDate(user.date_of_birth);
  return dob ? moment().diff(dob, "years") : null;
};

// Everything the profile page renders, from one getUserProfileV2 payload.
// `preferences[].key` is stable so the page can attach its own icons.
export const buildUserProfile = (data) => {
  const user = data?.user || {};
  const summary = data?.summary || {};
  const bookings = (data?.bookings || []).map(normalizeBooking);

  const byStatus = (status) => bookings.filter((b) => b.status === status);
  const upcomingList = byStatus("upcoming");
  const active = bookings.filter((b) => b.status !== "cancelled");
  const now = moment();

  const nextUpcoming = upcomingList
    .filter((b) => b.date)
    .sort((a, b) => a.date.valueOf() - b.date.valueOf())[0];

  // Top services across non-cancelled bookings.
  const serviceRank = ranked(active.flatMap((b) => b.services));
  const serviceTotal = serviceRank.reduce((sum, s) => sum + s.count, 0);

  // Preferences.
  const timeRank = ranked(
    active
      .filter((b) => b.from)
      .map((b) => {
        const hour = b.from.hour() < 6 ? b.from.hour() + 24 : b.from.hour();
        return TIME_BUCKETS.find((bucket) => hour >= bucket.from && hour < bucket.to)?.label;
      })
  );
  const dayRank = ranked(active.filter((b) => b.date).map((b) => b.date.format("dddd")));
  const topDays = dayRank.filter((d) => d.count === dayRank[0]?.count).slice(0, 2);
  const amounts = active.map((b) => b.amount).filter((n) => n > 0);
  const leads = active
    .filter((b) => b.date && b.createdAt)
    .map((b) => Math.max(0, b.date.clone().startOf("day").diff(b.createdAt.clone().startOf("day"), "days")));
  const avgLead = leads.length ? Math.round(leads.reduce((s, n) => s + n, 0) / leads.length) : null;

  const lastActive = toDate(user.last_active_at);
  const referral = user.referred_by
    ? `Referred by ${user.referred_by.name || `#${user.referred_by.id}`}`
    : user.source === "referral"
      ? "Referral"
      : user.source
        ? titleCase(user.source)
        : null;

  return {
    id: user.id,
    name: (user.name || `${user.firstname || ""} ${user.lastname || ""}`).trim() || "Unnamed user",
    status: String(user.status || "").toLowerCase(),
    phone: user.phone ? String(user.phone) : "",
    email: user.email || "",
    avatar: user.profilepic || null,
    gender: user.gender ? titleCase(user.gender) : null,
    age: ageFrom(user),
    location: user.city ? titleCase(String(user.city).trim()) : null,
    loyalty: user.loyalty_status ? loyaltyLabel(user.loyalty_status) : null,
    memberSince: toDate(user.registered_at),
    lastLogin: toDate(user.last_login_at),
    lastActive,
    online: lastActive ? now.diff(lastActive, "minutes") <= ONLINE_WINDOW_MINUTES : false,
    referral,
    referredBy: user.referred_by || null,
    loginMethod: LOGIN_METHODS[user.login_method] || null,
    wallet: user.wallet == null ? null : Number(user.wallet),

    bookings,
    counts: {
      total: bookings.length,
      upcoming: upcomingList.length,
      completed: byStatus("completed").length,
      cancelled: byStatus("cancelled").length,
      notCompleted: byStatus("not_completed").length,
      thisMonth: bookings.filter((b) => b.date?.isSame(now, "month")).length,
    },
    nextUpcoming,
    // Money figures come straight from the API (completed bookings, paid incl. GST).
    spent: summary.total_spent ?? 0,
    savings: summary.total_savings ?? null,
    aov: summary.avg_order_value ?? null,
    highest: summary.highest_booking ?? null,
    services: serviceRank.map((s) => ({
      name: s.value,
      count: s.count,
      pct: serviceTotal ? Math.round((s.count / serviceTotal) * 100) : 0,
    })),
    preferences: [
      { key: "time", label: "Preferred Time", value: timeRank[0]?.value },
      { key: "day", label: "Preferred Day", value: topDays.map((d) => d.value).join(", ") },
      { key: "salon", label: "Favourite Salon", value: ranked(active.map((b) => b.salon))[0]?.value },
      { key: "location", label: "Preferred Location", value: ranked(active.map((b) => b.place))[0]?.value },
      {
        key: "price",
        label: "Preferred Price Range",
        value: amounts.length ? `${rupees(Math.min(...amounts))} - ${rupees(Math.max(...amounts))}` : null,
      },
      { key: "service", label: "Favourite Service", value: serviceRank[0]?.value },
      {
        key: "advance",
        label: "Booking in Advance",
        value: avgLead == null ? null : avgLead === 0 ? "Same day" : `~${avgLead} day${avgLead === 1 ? "" : "s"}`,
      },
    ],
  };
};

// Completed spend per month for the last `months` months.
export const spendSeries = (bookings, months) => {
  const start = moment().startOf("month").subtract(months - 1, "months");
  return Array.from({ length: months }, (_, i) => {
    const month = start.clone().add(i, "months");
    return {
      month: month.format("MMM"),
      spent: bookings
        .filter((b) => b.status === "completed" && b.date?.isSame(month, "month"))
        .reduce((sum, b) => sum + b.amount, 0),
    };
  });
};
