import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import { toast } from "react-hot-toast";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  PlusCircle,
  Printer,
  RotateCcw,
  Star,
  StickyNote,
  XCircle,
} from "lucide-react";
import {
  bookingpdfDownload,
  getBookingById,
  refundBooking,
  updateBookingStatus,
} from "../../redux/slices/bookingSlice";
import { fetchUserProfileV2, fetchUsersListV2 } from "../../redux/slices/allUsersSlice";
import { pick } from "../../utils/format";
import { getImageUrl } from "../../utils/image";
import { buildUserProfile } from "../../utils/userModel";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { initials } from "../v2/tokens";
import { Card, Chip as BaseChip } from "../v2/ui";

// ---------------------------------------------------------------------------
// Booking detail V2 page (/booking-details-v2/:id), built 1:1 from the approved "Booking"
// mockup on a fixed DESIGN_WIDTH canvas that ScaledCanvas scales to the
// available width (see there for why bigger px sizes in T read smaller).
//
// Data: /getBookingsDetailsById (bookingSlice `bookingView`) - salon, user,
// staff, slot, items and the billing amounts the booking stored. The customer
// card, and the booking fields that API doesn't return (coupon code, the time
// it was placed, service categories), come from the customer's
// /getUserProfileV2 - found by the booking's user id or, failing that, by
// phone through /getUsersListV2.
//
// Actions are the V1 booking page's (/bookings/:id), on the same APIs: confirm / mark completed /
// cancel (/updateBookingStatus), refund (/refundbookings) and the invoice PDF
// (/downloadBookingPDF). The page refetches after each one and every 5 minutes.
//
// No data source yet, so shown empty or "Not recorded": feedback (a review
// belongs to a salon, not a booking), reminders, notes, booking source, IP
// address, device and the time of each status change. Edit Booking, Send SMS
// and Add Note have no API and stay disabled.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1320;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2563EB";
const RED = "#F04438";
const VIOLET = "#7C3AED";

// Measured column widths from the mockup, used directly as grid fr units.
const TOP_COLS = "grid-cols-[292fr_1016fr]";
const DETAIL_COLS = "grid-cols-[692fr_288fr]";
const BOTTOM_COLS = "grid-cols-[1006fr_302fr]";

// Type scale in design px on the 1320px canvas. See the note above before
// changing these.
const T = {
  xxs: "text-[10px]", // tile labels, captions
  xs: "text-[11px]", // secondary lines, table headers
  sm: "text-[12px]", // body, buttons
  base: "text-[13px]", // values, card titles
  md: "text-[14px]", // section headings
  lg: "text-[16px]", // payable amount
};

const GAP = "gap-3";
const DASH = "—";
const NOT_AVAILABLE = "Not available yet";
const NOT_RECORDED = "Not recorded";
const REFRESH_MS = 5 * 60 * 1000;

// appointments.status values (accepted / declined are older names).
const STATUS_META = {
  booked: { label: "Booked", chip: "bg-amber-50 text-amber-600", icon: Clock, color: "#F5A623" },
  confirmed: { label: "Confirmed", chip: "bg-sky-50 text-sky-600", icon: CheckCircle2, color: "#2E90FA" },
  accepted: { label: "Accepted", chip: "bg-sky-50 text-sky-600", icon: CheckCircle2, color: "#2E90FA" },
  completed: { label: "Completed", chip: "bg-emerald-50 text-emerald-600", icon: CheckCircle2, color: GREEN },
  cancelled: { label: "Cancelled", chip: "bg-rose-50 text-rose-500", icon: XCircle, color: RED },
  declined: { label: "Declined", chip: "bg-slate-100 text-slate-500", icon: XCircle, color: "#94A3B8" },
  refunded: { label: "Refunded", chip: "bg-violet-50 text-violet-600", icon: RotateCcw, color: VIOLET },
};

const PAYMENT_STYLES = {
  Paid: "bg-emerald-50 text-emerald-600",
  Unpaid: "bg-rose-50 text-rose-500",
  Failed: "bg-slate-100 text-slate-500",
  Refunded: "bg-violet-50 text-violet-600",
};

// Both spellings are written by the booking flow.
const PAID_STATUSES = ["success", "sucssess"];

const paymentLabel = (booking) => {
  if (booking.status === "refunded") return "Refunded";
  if (PAID_STATUSES.includes(booking.payment_status)) return "Paid";
  if (booking.payment_status === "failed") return "Failed";
  return "Unpaid";
};

const CONFIRM_COPY = {
  cancel: {
    title: "Cancel this booking?",
    body: (b) => `Booking #${b.id} for ${b.user_name || "this customer"} at ${b.salon_name || "the salon"} will be cancelled. This can't be undone.`,
    action: "Cancel booking",
  },
  refund: {
    title: "Mark this booking as refunded?",
    body: (b) => `Booking #${b.id} will be set to Refunded and the customer gets a WhatsApp refund message. No money is sent - the Razorpay refund isn't built in the backend yet, so refund the payment separately.`,
    action: "Mark refunded",
  },
};

const TABS = ["Services", "Payments", "Reminders", "History"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATE_FORMATS = [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY"];

const parseDate = (value) => {
  if (!value) return null;
  const date = moment(value, DATE_FORMATS);
  return date.isValid() ? date : null;
};

// "01 Sep, 2026"; anything unparseable is shown as the API sent it.
const fmtDate = (value) => {
  const date = parseDate(value);
  return date ? date.format("DD MMM, YYYY") : value ? String(value) : DASH;
};

// "28 Aug, 2026 09:15 PM" when the value carries a time, else just the date.
const fmtDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return value ? String(value) : DASH;
  return /\d{1,2}:\d{2}/.test(String(value)) ? date.format("DD MMM, YYYY hh:mm A") : date.format("DD MMM, YYYY");
};

// slot_timing "14:30:00-15:00:00" -> { from, to, minutes }
const parseSlot = (value) => {
  const [start, end] = String(value || "")
    .split("-")
    .map((part) => moment(part.trim(), ["HH:mm:ss", "HH:mm"], true));
  if (!start?.isValid()) return null;
  const to = end?.isValid() ? end : null;
  return { from: start, to, minutes: to ? to.diff(start, "minutes") : null };
};

const inr = (value) =>
  value == null || value === "" || Number.isNaN(Number(value))
    ? DASH
    : `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const lastTen = (value) => String(value || "").replace(/\D/g, "").slice(-10);

// First item, plus how many more.
const firstPlus = (values) =>
  values.length ? `${values[0]}${values.length > 1 ? ` +${values.length - 1}` : ""}` : DASH;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const Chip = (props) => <BaseChip size={`px-1.5 py-[3px] ${T.xxs}`} {...props} />;

const CardTitle = ({ children, right, className = "" }) => (
  <div className={`flex items-center justify-between gap-2 ${className}`}>
    <h2 className={`font-bold text-slate-900 ${T.md}`}>{children}</h2>
    {right}
  </div>
);

const Avatar = ({ name, src, size = 32 }) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={getImageUrl(src)}
        alt=""
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: size, height: size, background: "#EDE7FF", color: BRAND, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name) || "?"}
    </span>
  );
};

const Stars = ({ value, size = 16 }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        strokeWidth={0}
        fill="currentColor"
        className={n <= Math.round(value) ? "text-amber-400" : "text-slate-200"}
      />
    ))}
  </span>
);

const OverviewSection = ({ label, children, last }) => (
  <div className={`py-3.5 ${last ? "" : "border-b border-[#EEF0F5]"}`}>
    <p className={`mb-2 text-slate-400 ${T.xs}`}>{label}</p>
    {children}
  </div>
);

const Person = ({ name, sub, src }) => (
  <div className="flex items-center gap-2.5">
    <Avatar name={name} src={src} size={32} />
    <div className="min-w-0 leading-tight">
      <p className={`truncate font-bold capitalize text-slate-900 ${T.base}`}>{name || DASH}</p>
      {sub && <p className={`mt-0.5 truncate text-slate-500 ${T.xs}`}>{sub}</p>}
    </div>
  </div>
);

// One Quick Actions row: a button, or a link when `href` is set.
const ActionRow = ({ label, icon: Icon, onClick, href, disabled, title, danger }) => {
  const className = `flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left font-medium transition-colors ${T.sm} ${
    danger ? "border-rose-200 text-rose-500 hover:bg-rose-50" : "border-[#E6E8F0] text-slate-700 hover:bg-slate-50"
  } ${disabled ? "pointer-events-none cursor-not-allowed opacity-50" : ""}`;
  const content = (
    <>
      {label}
      {danger ? <span className="font-semibold">Cancel</span> : <Icon size={15} className="shrink-0 text-slate-500" />}
    </>
  );
  return href && !disabled ? (
    <a href={href} className={className} title={title}>
      {content}
    </a>
  ) : (
    <span title={title} className="block">
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {content}
      </button>
    </span>
  );
};

const Tile = ({ label, children }) => (
  <div className="min-w-0 px-3 py-3">
    <p className={`truncate text-slate-400 ${T.xxs}`}>{label}</p>
    <div className={`mt-1.5 truncate font-bold text-slate-900 ${T.base}`}>{children}</div>
  </div>
);

const BillRow = ({ label, value, negative, extra }) => (
  <div className={`flex items-center justify-between gap-3 py-1.5 ${T.sm}`}>
    <span className="flex min-w-0 items-center gap-2 text-slate-600">
      <span className="truncate">{label}</span>
      {extra}
    </span>
    <span className={`shrink-0 font-semibold ${negative ? "text-rose-500" : "text-slate-800"}`}>
      {negative && value !== DASH ? `- ${value}` : value}
    </span>
  </div>
);

const TIMELINE_DOT = {
  done: { icon: CheckCircle2, color: GREEN },
  failed: { icon: XCircle, color: RED },
  refunded: { icon: RotateCcw, color: VIOLET },
};

const Timeline = ({ steps }) => (
  <ol className="mt-3">
    {steps.map((step, i) => {
      const dot = TIMELINE_DOT[step.state];
      return (
        <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span className="absolute left-[8px] top-[20px] h-[calc(100%-18px)] w-[2px] bg-[#D9F2E5]" aria-hidden="true" />
          )}
          {dot ? (
            <dot.icon size={18} className="relative shrink-0 text-white" fill={dot.color} />
          ) : (
            <span className="relative mt-[1px] h-[16px] w-[16px] shrink-0 rounded-full border-2 border-slate-300 bg-white" />
          )}
          <div className="min-w-0 leading-tight">
            <p className={`font-semibold ${dot ? "text-slate-800" : "text-slate-400"} ${T.sm}`}>{step.label}</p>
            <p className={`mt-1 text-slate-400 ${T.xs}`}>
              {step.state === "pending" ? "Pending" : step.time ? fmtDateTime(step.time) : "Time not recorded"}
            </p>
          </div>
        </li>
      );
    })}
  </ol>
);

// Rendered outside ScaledCanvas - a fixed overlay inside the transformed
// canvas would be positioned (and scaled) relative to it.
const ConfirmDialog = ({ kind, booking, busy, onCancel, onConfirm }) => {
  const copy = CONFIRM_COPY[kind];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={busy ? undefined : onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={copy.title}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-extrabold text-slate-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{copy.body(booking)}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {busy ? "Working…" : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
};

// Title, status and breadcrumb live in the app bar, not the canvas. The
// breadcrumb links take the place of the V1 page's Back button.
const PageHeader = ({ id, status, onNavigate }) => {
  const meta = STATUS_META[status];
  const crumbs = [
    ["Home", "/"],
    ["Bookings", "/bookings"],
    ["Bookings by Order Date", "/bookings-by-order-date-v2"],
  ];
  return (
    <PageHeaderPortal>
      <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
              Booking #{id}
            </h1>
            {meta && (
              <span className={`shrink-0 rounded-md px-2 py-[2px] text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>
            )}
          </div>
          <p className="hidden items-center gap-1 truncate text-[11px] leading-tight text-slate-400 md:flex">
            {crumbs.map(([label, path]) => (
              <span key={path} className="flex items-center gap-1">
                <button type="button" onClick={() => onNavigate(path)} className="hover:text-slate-600">
                  {label}
                </button>
                <ChevronRight size={10} className="shrink-0" />
              </span>
            ))}
            <span className="font-semibold" style={{ color: BRAND }}>
              #{id}
            </span>
          </p>
        </div>
      </div>
    </PageHeaderPortal>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const BookingDetailsV2 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { bookingView, loading, error, pdfLoading } = useSelector((state) => state.allBookings);

  const [tab, setTab] = useState(TABS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(null); // "cancel" | "refund"
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState(null); // { id, data } | { id: null } | { failed }
  const menuRef = useRef(null);

  // The slice keeps the last booking fetched - ignore it until it's this one.
  const booking = bookingView && String(bookingView.id) === String(id) ? bookingView : null;
  const reload = () => dispatch(getBookingById(id));

  useEffect(() => {
    dispatch(getBookingById(id));
    const timer = setInterval(() => dispatch(getBookingById(id)), REFRESH_MS);
    return () => clearInterval(timer);
  }, [id, dispatch]);

  // The customer's profile: by the booking's user id, else by phone.
  const userIdOnBooking = booking ? pick(booking, ["user_id", "userId", "customer_id"]) : null;
  const phone = booking ? lastTen(booking.contact_number) : "";
  useEffect(() => {
    if (!booking) return undefined;
    let alive = true;
    setCustomer(null);
    const findId = userIdOnBooking
      ? Promise.resolve(userIdOnBooking)
      : phone
        ? dispatch(fetchUsersListV2({ search: phone, page: 1, limit: 5 }))
          .unwrap()
          .then((data) => (data?.rows || []).find((row) => lastTen(row.phone) === phone)?.id ?? null)
        : Promise.resolve(null);
    findId
      .then((userId) =>
        userId
          ? dispatch(fetchUserProfileV2(Number(userId)))
            .unwrap()
            .then((data) => alive && setCustomer({ id: userId, data }))
          : alive && setCustomer({ id: null })
      )
      .catch(() => alive && setCustomer({ failed: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, booking?.id, userIdOnBooking, phone]);

  // Close the More Actions menu on any click outside it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!booking) {
    return (
      <>
        <PageHeader id={id} onNavigate={navigate} />
        <div className="grid min-h-[320px] place-items-center">
          {loading ? (
            <p className="text-[13px] text-slate-500">Loading booking…</p>
          ) : (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-600">
              {error ? `Couldn't load booking #${id}: ${error}` : `Booking #${id} wasn't found.`}
            </p>
          )}
        </div>
      </>
    );
  }

  // ---- derived values -----------------------------------------------------

  const status = booking.status;
  const meta = STATUS_META[status];
  const items = Array.isArray(booking.appointment_items) ? booking.appointment_items : [];
  const slot = parseSlot(booking.slot_timing);
  const appointmentDate = String(booking.booking_datetime || "").split(" ")[0];
  const payment = paymentLabel(booking);

  const profile = customer?.data ? buildUserProfile(customer.data) : null;
  // This booking in the customer's profile - fills what the detail API lacks.
  const profileBooking = (customer?.data?.bookings || []).find((b) => String(b.id) === String(booking.id));
  const bookedOn = profileBooking?.created_at || pick(booking, ["created_at", "order_date"]);
  const couponCode = pick(booking, ["coupon_code", "coupon_name"]) || profileBooking?.coupon_code || null;
  const categories = profileBooking?.service_categories?.length ? profileBooking.service_categories : null;
  const serviceNames = items.map((item) => item.service_name).filter(Boolean);

  const salonId = pick(booking, ["store_id", "salon_id", "partner_id"]);
  const customerId = customer?.id || null;
  const rating = Number(pick(booking, ["rating", "review_rating", "feedback_rating"]));
  const comment = pick(booking, ["review", "review_comment", "feedback_comment", "feedback"]);
  const paymentMethod = pick(booking, ["payment_method", "payment_mode"]);
  const transactionId = pick(booking, ["razorpay_payment_id", "transaction_id", "payment_id"]);
  const note = pick(booking, ["notes", "note", "special_request", "customer_note", "remarks"]);

  const canConfirm = status === "booked";
  const canComplete = status === "confirmed";
  const canCancel = ["booked", "confirmed"].includes(status);
  const canRefund = booking.payment_status === "success" && status !== "refunded";
  const refundBlocked =
    status === "refunded" ? "Already refunded" : canRefund ? undefined : "Only paid bookings can be refunded";

  // Timeline: what the status implies. Times only where the API has them.
  const timeline = (() => {
    const at = (keys) => pick(booking, keys);
    const steps = [{ key: "created", label: "Booking Created", time: bookedOn, state: "done" }];
    if (status === "cancelled" || status === "declined") {
      steps.push({ key: "cancelled", label: `Booking ${meta.label}`, time: at(["cancelled_at"]), state: "failed" });
      return steps;
    }
    const confirmed = ["confirmed", "accepted", "completed", "refunded"].includes(status);
    const completed = ["completed", "refunded"].includes(status);
    steps.push({ key: "confirmed", label: "Booking Confirmed", time: at(["confirmed_at"]), state: confirmed ? "done" : "pending" });
    steps.push({ key: "completed", label: "Booking Completed", time: at(["completed_at"]), state: completed ? "done" : "pending" });
    if (status === "refunded") steps.push({ key: "refunded", label: "Booking Refunded", time: at(["refunded_at"]), state: "refunded" });
    return steps;
  })();
  const history = timeline.filter((step) => step.state !== "pending");

  // ---- actions --------------------------------------------------------------

  const changeStatus = async (next) => {
    setMenuOpen(false);
    setBusy(true);
    try {
      await dispatch(updateBookingStatus({ id: booking.id, status: next })).unwrap();
      toast.success(`Booking #${booking.id} ${STATUS_META[next]?.label.toLowerCase() || next}`, { id: "booking-detail-action" });
      reload();
      return true;
    } catch {
      toast.error(`Couldn't update booking #${booking.id}`, { id: "booking-detail-action" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async () => {
    if (confirming === "cancel") {
      if (await changeStatus("cancelled")) setConfirming(null);
      return;
    }
    setBusy(true);
    try {
      await dispatch(refundBooking({ id: booking.id })).unwrap();
      toast.success(`Booking #${booking.id} marked refunded`, { id: "booking-detail-action" });
      setConfirming(null);
      reload();
    } catch {
      toast.error(`Couldn't refund booking #${booking.id}`, { id: "booking-detail-action" });
    } finally {
      setBusy(false);
    }
  };

  const fetchPdf = () => dispatch(bookingpdfDownload(booking.id)).unwrap();

  const downloadInvoice = async () => {
    setMenuOpen(false);
    const toastId = toast.loading("Generating PDF...", { id: "booking-detail-pdf" });
    try {
      const url = window.URL.createObjectURL(await fetchPdf());
      const link = document.createElement("a");
      link.href = url;
      link.download = `Booking_${booking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: toastId });
    } catch {
      toast.error("Failed to download PDF", { id: toastId });
    }
  };

  // Loads the same PDF into a hidden frame and opens the print dialog on it.
  const printInvoice = async () => {
    setMenuOpen(false);
    const toastId = toast.loading("Preparing the invoice...", { id: "booking-detail-pdf" });
    try {
      const blob = await fetchPdf();
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
      frame.onload = () => {
        toast.dismiss(toastId);
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch {
          window.open(url, "_blank");
        }
        setTimeout(() => {
          frame.remove();
          window.URL.revokeObjectURL(url);
        }, 60000);
      };
      frame.src = url;
      document.body.appendChild(frame);
    } catch {
      toast.error("Failed to load the invoice", { id: toastId });
    }
  };

  const copyId = () => {
    setMenuOpen(false);
    navigator.clipboard?.writeText(String(booking.id));
    toast.success(`Copied #${booking.id}`, { id: "copy-booking-id" });
  };

  const menuItems = [
    canConfirm && { label: "Confirm booking", icon: CheckCircle2, onClick: () => changeStatus("confirmed") },
    canComplete && { label: "Mark completed", icon: CheckCircle2, onClick: () => changeStatus("completed") },
    canCancel && { label: "Cancel booking", icon: XCircle, danger: true, onClick: () => setConfirming("cancel") },
    { label: "Download invoice", icon: Download, onClick: downloadInvoice },
    { label: "Print invoice", icon: Printer, onClick: printInvoice },
    { label: "Copy booking ID", icon: Copy, onClick: copyId },
  ].filter(Boolean);

  const tiles = [
    [
      ["Booking Number", `#${booking.id}`],
      ["Booking Date", fmtDate(appointmentDate)],
      ["Booking Time", slot ? slot.from.format("hh:mm A") : DASH],
      ["Appointment Duration", slot?.minutes != null ? `${slot.minutes} mins` : DASH],
    ],
    [
      ["Booking Type", firstPlus(categories || serviceNames)],
      ["Payment Type", paymentMethod ? String(paymentMethod) : <Chip className={PAYMENT_STYLES[payment]}>{payment}</Chip>],
      ["Payment Status", <Chip className={PAYMENT_STYLES[payment]}>{payment}</Chip>],
      ["Booked On", fmtDateTime(bookedOn)],
    ],
    [
      ["Order Date", fmtDate(booking.order_date)],
      ["Booking Source", pick(booking, ["booking_source", "source"]) || NOT_RECORDED],
      ["IP Address", pick(booking, ["ip_address", "ip"]) || NOT_RECORDED],
      ["Device", pick(booking, ["device", "device_type"]) || NOT_RECORDED],
    ],
  ];

  const tabCounts = { Services: items.length, Payments: 1, Reminders: 0, History: history.length };
  const StatusIcon = meta?.icon || CheckCircle2;

  return (
    <>
      <PageHeader id={booking.id} status={status} onNavigate={navigate} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 leading-snug ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* More actions / edit                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.sm}`}
            >
              <MoreHorizontal size={14} className="shrink-0 text-slate-500" />
              More Actions
              <ChevronDown size={13} className="shrink-0 text-slate-400" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-[180px] rounded-xl border border-[#E6E8F0] bg-white py-1 shadow-lg">
                {menuItems.map(({ label, icon: Icon, danger, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    onClick={onClick}
                    disabled={busy}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-medium hover:bg-slate-50 disabled:opacity-50 ${T.sm} ${
                      danger ? "text-rose-500" : "text-slate-700"
                    }`}
                  >
                    <Icon size={13} className="shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled
            title={NOT_AVAILABLE}
            className={`flex cursor-not-allowed items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold text-white opacity-50 shadow-sm ${T.sm}`}
            style={{ background: BRAND }}
          >
            <Pencil size={13} className="shrink-0" />
            Edit Booking
          </button>
        </div>

        <div className={`grid ${TOP_COLS} items-start ${GAP}`}>
          {/* ============================================================== */}
          {/* Left column - overview + quick actions                          */}
          {/* ============================================================== */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <Card className="px-4 pt-4">
              <h2 className={`flex items-center gap-2 font-bold text-slate-900 ${T.md}`}>
                <StatusIcon size={19} className="shrink-0 text-white" fill={meta?.color || GREEN} />
                Booking Overview
              </h2>

              <OverviewSection label="Salon">
                <p className={`flex items-center gap-2 font-bold text-slate-900 ${T.md}`}>
                  <Building2 size={16} className="shrink-0 text-slate-700" />
                  <span className="truncate">{booking.salon_name || DASH}</span>
                  {salonId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/partnerdetails/${salonId}`)}
                      title="Open the salon"
                      aria-label="Open the salon"
                      className="shrink-0 text-slate-400 hover:text-slate-700"
                    >
                      <ExternalLink size={13} />
                    </button>
                  )}
                </p>
                <div className={`mt-2 flex flex-col gap-1.5 text-slate-600 ${T.sm}`}>
                  {booking.salon_mail && <span className="truncate">{booking.salon_mail}</span>}
                  {booking.salon_phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={12} className="shrink-0 text-slate-400" />
                      {booking.salon_phone}
                    </span>
                  )}
                  {booking.salon_address && (
                    <span className="flex items-start gap-1.5">
                      <MapPin size={12} className="mt-[3px] shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{booking.salon_address}</span>
                    </span>
                  )}
                </div>
              </OverviewSection>

              <OverviewSection label="User">
                <Person name={booking.user_name} sub={booking.contact_number} src={profile?.avatar} />
              </OverviewSection>

              <OverviewSection label="Staff">
                <Person
                  name={booking.staff_name}
                  sub={pick(booking, ["staff_role", "staff_designation"]) || booking.staff_phone}
                />
              </OverviewSection>

              <OverviewSection label="Feedback" last>
                {rating > 0 ? (
                  <>
                    <span className="flex items-center gap-2">
                      <Stars value={rating} />
                      <span className={`font-bold text-slate-900 ${T.base}`}>{rating.toFixed(1)}</span>
                    </span>
                    {typeof comment === "string" && <p className={`mt-1.5 text-slate-700 ${T.sm}`}>{comment}</p>}
                  </>
                ) : (
                  <p className={`text-slate-400 ${T.sm}`}>No feedback on this booking yet.</p>
                )}
              </OverviewSection>
            </Card>

            <Card className="p-4">
              <CardTitle>Quick Actions</CardTitle>
              <div className="mt-3 flex flex-col gap-2">
                <ActionRow label="Send SMS" icon={MessageSquare} disabled title={NOT_AVAILABLE} />
                <ActionRow
                  label="Send Email"
                  icon={Mail}
                  href={booking.email ? `mailto:${booking.email}?subject=${encodeURIComponent(`Your GloUp booking #${booking.id}`)}` : undefined}
                  disabled={!booking.email}
                  title={booking.email ? `Email ${booking.email}` : "No email on this booking"}
                />
                <ActionRow label="Print Invoice" icon={Printer} onClick={printInvoice} disabled={pdfLoading} />
                <ActionRow
                  label="Cancel Booking"
                  danger
                  onClick={() => setConfirming("cancel")}
                  disabled={!canCancel || busy}
                  title={canCancel ? undefined : `A ${meta?.label.toLowerCase() || status} booking can't be cancelled`}
                />
              </div>
            </Card>
          </div>

          {/* ============================================================== */}
          {/* Booking details, billing, timeline, notes                       */}
          {/* ============================================================== */}
          <Card className="p-4">
            <CardTitle
              right={
                <span className="flex items-center gap-2.5">
                  <span title={refundBlocked}>
                    <button
                      type="button"
                      onClick={() => setConfirming("refund")}
                      disabled={!canRefund || busy}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 ${T.sm}`}
                      style={{ borderColor: "#FDA29B", color: RED }}
                    >
                      <RotateCcw size={13} className="shrink-0" />
                      Refund Booking
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={downloadInvoice}
                    disabled={pdfLoading}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold transition-colors hover:bg-blue-50 disabled:opacity-50 ${T.sm}`}
                    style={{ borderColor: "#93C5FD", color: BLUE }}
                  >
                    <FileDown size={13} className="shrink-0" />
                    {pdfLoading ? "Generating…" : "Download Invoice"}
                  </button>
                </span>
              }
            >
              Booking Details
            </CardTitle>

            <div className={`mt-4 grid ${DETAIL_COLS} items-start ${GAP}`}>
              <div className={`flex min-w-0 flex-col ${GAP}`}>
                <div className="flex flex-col gap-2">
                  {tiles.map((row, i) => (
                    <div key={i} className="grid grid-cols-4 rounded-xl bg-[#F7F8FB]">
                      {row.map(([label, value]) => (
                        <Tile key={label} label={label}>
                          {value}
                        </Tile>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Billing - every amount is what the booking stored. */}
                <div className="overflow-hidden rounded-xl border border-[#E6E8F0]">
                  <h3 className={`px-4 pt-3.5 font-bold text-slate-900 ${T.md}`}>Billing Summary</h3>

                  <div className="mx-4 mt-3 rounded-xl border border-[#EEF0F5] px-3 py-2">
                    <p className={`text-slate-400 ${T.xs}`}>Service</p>
                    {items.length === 0 && <p className={`py-1.5 text-slate-400 ${T.sm}`}>No services on this booking.</p>}
                    {items.map((item, i) => (
                      <div key={`${item.service_name}-${i}`} className={`flex items-center justify-between gap-3 py-1.5 ${T.sm}`}>
                        <span className="min-w-0 truncate font-medium text-slate-800">{item.service_name || DASH}</span>
                        <span className="shrink-0 text-right">
                          {Number(item.item_discount) > 0 && (
                            <span className={`mr-2 text-slate-400 line-through ${T.xs}`}>{inr(item.list_amount)}</span>
                          )}
                          <span className="font-semibold text-slate-800">{inr(item.charged_amount)}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-2">
                    <BillRow label="Subtotal" value={inr(booking.items_total)} />
                    <BillRow
                      label="Coupon Discount"
                      value={inr(booking.coupon_discount)}
                      negative
                      extra={couponCode && <Chip className="bg-emerald-50 text-emerald-600">{couponCode}</Chip>}
                    />
                    <BillRow label="Taxable Amount" value={inr(booking.taxable_amount)} />
                    <BillRow label={`GST (${booking.gst_rate ?? DASH}%)`} value={inr(booking.gst_amount)} />
                    <BillRow label="Platform Fee" value={inr(booking.platform_fee)} />
                  </div>

                  <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                    <span className={`font-semibold ${T.md}`}>Payable Amount</span>
                    <span className={`font-bold ${T.lg}`}>{inr(booking.payable_amount)}</span>
                  </div>
                </div>
              </div>

              <div className={`flex min-w-0 flex-col ${GAP}`}>
                <div className="rounded-xl border border-[#E6E8F0] p-4">
                  <CardTitle>Timeline</CardTitle>
                  <Timeline steps={timeline} />
                </div>

                <div className="rounded-xl border border-[#E6E8F0] p-4">
                  <CardTitle>Notes</CardTitle>
                  {typeof note === "string" ? (
                    <div className={`mt-3 flex items-start gap-2 rounded-lg bg-[#F7F8FB] px-3 py-2.5 text-slate-700 ${T.sm}`}>
                      <StickyNote size={13} className="mt-[2px] shrink-0 text-slate-500" />
                      <span className="whitespace-pre-line">{note}</span>
                    </div>
                  ) : (
                    <p className={`mt-3 text-slate-400 ${T.sm}`}>No notes on this booking.</p>
                  )}
                  <span title={NOT_AVAILABLE} className="mt-3 block">
                    <button
                      type="button"
                      disabled
                      className={`flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[#E6E8F0] py-2 font-semibold opacity-50 ${T.sm}`}
                      style={{ color: BRAND }}
                    >
                      <PlusCircle size={13} className="shrink-0" />
                      Add Note
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={`grid ${BOTTOM_COLS} items-start ${GAP}`}>
          {/* ============================================================== */}
          {/* Services / payments / reminders / history                       */}
          {/* ============================================================== */}
          <Card>
            <div className="flex items-end gap-8 border-b border-[#EDEFF5] px-4 pt-3">
              {TABS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${T.sm} ${
                    tab === name ? "" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                  style={tab === name ? { color: BRAND, borderColor: BRAND } : undefined}
                >
                  {name} ({tabCounts[name]})
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === "Services" && (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className={`bg-[#F7F8FB] text-slate-500 ${T.xs}`}>
                      {["Service", "Staff", "Duration", "Price"].map((column) => (
                        <th key={column} className="px-3 py-2.5 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className={`px-3 py-6 text-center text-slate-400 ${T.sm}`}>
                          No services on this booking.
                        </td>
                      </tr>
                    )}
                    {items.map((item, i) => {
                      const minutes = pick(item, ["duration", "service_duration"]) ?? (items.length === 1 ? slot?.minutes : null);
                      return (
                        <tr key={`${item.service_name}-${i}`} className={`border-b border-[#F3F5F9] last:border-0 text-slate-800 ${T.sm}`}>
                          <td className="truncate px-3 py-3 font-medium">{item.service_name || DASH}</td>
                          <td className="truncate px-3 py-3">{booking.staff_name || DASH}</td>
                          <td className="px-3 py-3">{minutes != null ? `${minutes} mins` : DASH}</td>
                          <td className="px-3 py-3 font-semibold">{inr(item.charged_amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab === "Payments" && (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className={`bg-[#F7F8FB] text-slate-500 ${T.xs}`}>
                      {["Amount", "Status", "Method", "Transaction ID", "Date"].map((column) => (
                        <th key={column} className="px-3 py-2.5 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`text-slate-800 ${T.sm}`}>
                      <td className="px-3 py-3 font-semibold">{inr(booking.payable_amount)}</td>
                      <td className="px-3 py-3">
                        <Chip className={PAYMENT_STYLES[payment]}>{payment}</Chip>
                      </td>
                      <td className="truncate px-3 py-3">{paymentMethod || DASH}</td>
                      <td className="truncate px-3 py-3">{transactionId || DASH}</td>
                      <td className="px-3 py-3">{fmtDateTime(bookedOn)}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {tab === "Reminders" && (
                <p className={`py-6 text-center text-slate-400 ${T.sm}`}>Reminders sent for a booking aren't recorded yet.</p>
              )}

              {tab === "History" && (
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className={`bg-[#F7F8FB] text-slate-500 ${T.xs}`}>
                      {["Event", "Date & Time"].map((column) => (
                        <th key={column} className="px-3 py-2.5 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((step) => (
                      <tr key={step.key} className={`border-b border-[#F3F5F9] last:border-0 text-slate-800 ${T.sm}`}>
                        <td className="px-3 py-3 font-medium">{step.label}</td>
                        <td className="px-3 py-3 text-slate-600">{step.time ? fmtDateTime(step.time) : "Time not recorded"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* ============================================================== */}
          {/* Customer                                                        */}
          {/* ============================================================== */}
          <Card className="p-4">
            <CardTitle>Customer Details</CardTitle>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={booking.user_name} src={profile?.avatar} size={44} />
              <div className="min-w-0 leading-tight">
                <p className={`truncate font-bold capitalize text-slate-900 ${T.base}`}>{booking.user_name || DASH}</p>
                {booking.contact_number && <p className={`mt-1 truncate text-slate-600 ${T.sm}`}>{booking.contact_number}</p>}
                {booking.email && <p className={`mt-1 truncate text-slate-600 ${T.sm}`}>{booking.email}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Total Bookings", profile ? profile.counts.total.toLocaleString("en-IN") : null],
                ["Total Spent", profile ? inr(profile.spent) : null],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className={`text-slate-400 ${T.xxs}`}>{label}</p>
                  <p className={`mt-1 truncate font-bold text-slate-900 ${T.base}`}>
                    {value ?? (customer ? DASH : "Loading…")}
                  </p>
                </div>
              ))}
            </div>

            <span title={customerId ? undefined : "This customer's account wasn't found"} className="mt-4 block">
              <button
                type="button"
                onClick={() => navigate(`/user-details-v2/${customerId}`)}
                disabled={!customerId}
                className={`w-full rounded-lg border border-[#E6E8F0] py-2 font-semibold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${T.sm}`}
                style={{ color: BRAND }}
              >
                View Customer Profile
              </button>
            </span>
          </Card>
        </div>
      </ScaledCanvas>

      {confirming && (
        <ConfirmDialog
          kind={confirming}
          booking={booking}
          busy={busy}
          onCancel={() => setConfirming(null)}
          onConfirm={confirmAction}
        />
      )}
    </>
  );
};

export default BookingDetailsV2;
