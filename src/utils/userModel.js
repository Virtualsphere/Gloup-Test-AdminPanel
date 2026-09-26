import moment from "moment";
import { pick, rupees, titleCase, toDate } from "./format";
import { loyaltyLabel } from "./loyalty";

// Maps the admin user APIs onto the shapes UsersV2 / UserDetailsV2 render.
// Pure functions only - no React, no Redux - so they can be unit-tested.
//
// Confirmed against the production V1 pages (UsersTable.jsx, UserDetails.jsx):
// id, firstname, lastname, email, phone, gender, status, loyalty_status,
// profilepic / profilePic, age, date_of_birth; getUserDetail returns
// { userdetails, upcoming[], past[], totalspent } with each booking shaped
// { common_data, items[] }.
//
// Everything read through pick() is NOT confirmed - city, signup source, join
// date, last app open, last booking, booking count, savings. The key lists are
// best guesses; once the payload is checked, replace each list with the real
// key and delete the rest.

export const ONLINE_WINDOW_MINUTES = 15;

const toGender = (value) => {
  const g = String(value ?? "").trim().toLowerCase();
  if (g.startsWith("f")) return "female";
  if (g.startsWith("m")) return "male";
  return "";
};

// One row of getAllUsersList.
export const normalizeUser = (u) => {
  const bookingsRaw = pick(u, [
    "total_bookings",
    "totalbookings",
    "bookings_count",
    "booking_count",
    "paid_booking_count",
    "bookings",
  ]);
  const bookings = Array.isArray(bookingsRaw)
    ? bookingsRaw.length
    : bookingsRaw == null || Number.isNaN(Number(bookingsRaw))
      ? null
      : Number(bookingsRaw);
  const city = pick(u, ["city", "address.city", "location.city", "user_city"]);
  const source = pick(u, ["source", "signup_source", "device_type", "platform", "os"]);
  const avatar = pick(u, ["profilepic", "profile_pic", "profile", "image"]);

  return {
    id: u.id,
    name:
      `${u.firstname || ""} ${u.lastname || ""}`.trim() ||
      pick(u, ["name", "username"]) ||
      "Unnamed user",
    email: u.email || "",
    phone: u.phone ? String(u.phone) : "",
    gender: toGender(u.gender),
    city: city ? titleCase(String(city).trim()) : "",
    status: String(u.status || "").toLowerCase(),
    source: source ? titleCase(source) : "",
    loyalty: u.loyalty_status || "",
    avatar: typeof avatar === "string" ? avatar : null,
    joined: toDate(
      pick(u, ["createdAt", "created_at", "created_on", "join_date", "registered_at"])
    ),
    lastOpen: toDate(
      pick(u, [
        "last_app_open",
        "last_app_open_at",
        "last_active",
        "last_active_at",
        "last_login",
        "last_login_at",
        "lastLogin",
      ])
    ),
    lastBooking: toDate(
      pick(u, ["last_booking", "last_booking_at", "last_booking_date", "lastBookingDate"])
    ),
    bookings,
  };
};

// ---------------------------------------------------------------------------
// User detail (getUserDetail)
// ---------------------------------------------------------------------------

// Backend booking statuses -> the four buckets the profile shows. Anything
// unknown falls back to which list (upcoming / past) it came from.
const STATUS_MAP = {
  upcomming: "upcoming",
  upcoming: "upcoming",
  pending: "upcoming",
  confirmed: "upcoming",
  booked: "upcoming",
  completed: "completed",
  complete: "completed",
  done: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  not_completed: "cancelled",
  rejected: "cancelled",
  refunded: "cancelled",
  no_show: "no_show",
  noshow: "no_show",
  "no-show": "no_show",
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

const normalizeBooking = (booking, fallbackStatus, index) => {
  const c = booking?.common_data || {};
  const items = Array.isArray(booking?.items) ? booking.items : [];
  const rawStatus = String(c.status || "").toLowerCase();
  const savings = pick(c, ["savings", "discount", "discount_amount", "coupon_discount", "total_discount"]);
  const place = [c.city, c.district].filter(Boolean).join(", ");

  return {
    key: c.id ?? `${fallbackStatus}-${index}`,
    salon: c.name || "Salon",
    image: Array.isArray(c.images) && c.images.length ? c.images[0] : null,
    date: toDate(c.booking_date),
    from: toSlot(c.slot_from),
    to: toSlot(c.slot_to),
    services: items.map((item) => item?.service_name).filter(Boolean),
    amount: Number(c.total_amount) || 0,
    savings: savings == null ? null : Number(savings) || 0,
    status: STATUS_MAP[rawStatus] || fallbackStatus,
    place,
    createdAt: toDate(pick(c, ["createdAt", "created_at", "booked_at"])),
  };
};

const ageFrom = (user) => {
  if (user.age) return Number(user.age);
  const dob = toDate(user.date_of_birth);
  return dob ? moment().diff(dob, "years") : null;
};

// Everything the profile page renders, from one getUserDetail payload.
// `preferences[].key` is stable so the page can attach its own icons.
export const buildUserProfile = (data) => {
  const user = data?.userdetails || {};
  const upcoming = (data?.upcoming || []).map((b, i) => normalizeBooking(b, "upcoming", i));
  const past = (data?.past || []).map((b, i) => normalizeBooking(b, "completed", i));
  const bookings = [...upcoming, ...past].sort(
    (a, b) => (b.date?.valueOf() ?? 0) - (a.date?.valueOf() ?? 0)
  );

  const byStatus = (status) => bookings.filter((b) => b.status === status);
  const completed = byStatus("completed");
  const upcomingList = byStatus("upcoming");
  const active = bookings.filter((b) => b.status !== "cancelled");
  const now = moment();

  const spent =
    data?.totalspent != null && !Number.isNaN(Number(data.totalspent))
      ? Number(data.totalspent)
      : completed.reduce((sum, b) => sum + b.amount, 0);
  const withSavings = bookings.filter((b) => b.savings != null);

  const nextUpcoming = upcomingList
    .filter((b) => b.date && b.date.isSameOrAfter(now, "day"))
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

  const lastLogin = toDate(
    pick(user, ["last_login", "last_login_at", "lastLogin", "last_active", "last_active_at", "last_app_open"])
  );
  const location = pick(user, ["city", "address.city", "location.city"]);
  const state = pick(user, ["state", "address.state"]);

  return {
    id: user.id,
    name: `${user.firstname || ""} ${user.lastname || ""}`.trim() || pick(user, ["name"]) || "Unnamed user",
    status: String(user.status || "").toLowerCase(),
    phone: user.phone ? String(user.phone) : "",
    email: user.email || "",
    avatar: pick(user, ["profilePic", "profilepic", "profile_pic", "profile"]),
    gender: user.gender ? titleCase(user.gender) : null,
    age: ageFrom(user),
    location: location ? [location, state].filter(Boolean).map(titleCase).join(", ") : null,
    loyalty: user.loyalty_status ? loyaltyLabel(user.loyalty_status) : null,
    memberSince: toDate(pick(user, ["createdAt", "created_at", "created_on"])),
    lastLogin,
    online: lastLogin ? now.diff(lastLogin, "minutes") <= ONLINE_WINDOW_MINUTES : false,
    referral: pick(user, ["referral_source", "source", "signup_source", "referred_by"]),

    bookings,
    counts: {
      total: bookings.length,
      upcoming: upcomingList.length,
      completed: completed.length,
      cancelled: byStatus("cancelled").length,
      noShow: byStatus("no_show").length,
      thisMonth: bookings.filter((b) => b.date?.isSame(now, "month")).length,
    },
    nextUpcoming,
    spent,
    savings: withSavings.length ? withSavings.reduce((sum, b) => sum + b.savings, 0) : null,
    aov: completed.length ? spent / completed.length : null,
    highest: completed.length ? Math.max(...completed.map((b) => b.amount)) : null,
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
