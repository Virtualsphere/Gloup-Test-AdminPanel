import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import moment from "moment";
import { Autocomplete, CircleF, GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  CloudUpload,
  Info,
  Laptop,
  Loader2,
  MapPin,
  Plus,
  ReceiptText,
  Store,
  X,
} from "lucide-react";
import { FaBuilding, FaCar, FaCreditCard, FaSnowflake, FaStore, FaToilet, FaTv, FaUser, FaUsers, FaWheelchair, FaWifi } from "react-icons/fa";
import { MdChair, MdOutlineFace3, MdOutlineFace6 } from "react-icons/md";
import { RiDiscountPercentFill } from "react-icons/ri";
import { getAllPartnersList, getLanguageList, getPartnerDetail, getServiceProvidedForOptions } from "../../redux/slices/partnersSlice";
import { savePartnerEdit } from "./PartnerDetails";
import { DatePicker } from "../common/DatePicker";
import SelectMenu from "../common/Select";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas, { Unscaled } from "../v2/ScaledCanvas";
import { WRAP, WRAP_FLOW, WRAP_WIDE } from "../v2/tokens";
import { getImageUrl } from "../../utils/image";
import { GOOGLE_MAPS_LOADER, HAS_MAPS_KEY } from "../../utils/googleMaps";

// ---------------------------------------------------------------------------
// Edit Salon V2 (/partner-details-v2/:id/edit), opened from Partner Details
// V2's More Actions > Edit Salon. The approved "Partner Details - Salon profile
// & business information" form mockup on a fixed DESIGN_WIDTH canvas that
// ScaledCanvas scales to the available width; sizes are the mockup's x1.17 (a
// 1536px screenshot with ~1297px of content), as on Partner Details V2.
//
// Data: the salon's store_details from /getallpartnerdetails, saved through
// the classic page's savePartnerEdit() to /editpartner - the classic Edit Salon
// modal's payload and rules, checked inline here first so its alert()s never
// fire. The mockup's Salon Category is the salon's store_type.
//
// Kept beyond the mockup: everything the classic modal edits that the mockup
// leaves out - email, WhatsApp and income (a third Basic Information row),
// the description (with Notes), area / district / state / pincode / landmark,
// the map location and radius (12), and services provided for, languages,
// premium and the logo (13). Photos are required, not "(Optional)": the save
// needs at least one.
//
// The rest of the mockup has no column yet: owner_name, salon_classification
// ("A" | "B"), gloup_offer_status, ownership_type, uses_computer and
// uses_billing_software (true / false), billing_software_name, opening_date
// ("YYYY-MM-DD"), chair_count, employee_count, opening_time / closing_time
// ("HH:mm"), working_days (["mon", ...]), amenities (AMENITIES values plus
// "other"), amenities_other and notes. Save sends them to /editpartner under
// those keys (arrays as JSON, like languages) and the form prefills from the
// same keys, so they start working once the backend stores them. Until
// store_details returns a section's keys, the note at the top names it and its
// * fields aren't required.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;
// Narrowest canvas the wrapped layout still fits at full type size.
const MIN_WIDTH = 1000;

const BLUE = "#0773F8";
const TOAST = "edit-salon-v2";

// Measured card widths from the mockup, used directly as grid fr units.
const ROW1_COLS = `grid-cols-[464fr_458fr_345fr] ${WRAP[3]}`;
// Rows 4-6 and 7-8 pair up across the row boundary once wrapped (see the
// ROWS_4_8 container): Ownership | Billing, Opening Date | Capacity, then
// Working Hours on a full row, instead of leaving Opening Date alone on one.
const ROWS_4_8 = `flex flex-col ${WRAP_FLOW}`;
const ROW2_COLS = `grid-cols-[500fr_492fr_275fr] ${WRAP.flow}`;
const ROW3_COLS = `grid-cols-[536fr_746fr] ${WRAP.flow}`;
const ROW5_COLS = `grid-cols-[516fr_766fr] ${WRAP[2]}`;
const ROW6_COLS = `grid-cols-[766fr_516fr] ${WRAP[2]}`;
const AMENITY_COLS = "grid-cols-[126fr_128fr_157fr_140fr_160fr_160fr_115fr_240fr] wrapped:grid-cols-4";

// Type scale in design px on the 1520px canvas.
const T = {
  tiny: "text-[13px]", // errors, hints
  small: "text-[14px]", // tile sub-lines, upload copy
  label: "text-[15px]", // field labels
  input: "text-[15.5px]", // inputs, chips
  option: "text-[16px]", // tile titles
  section: "text-[18px]", // numbered card titles
  card: "text-[20px]", // "Basic Information"
  letter: "text-[34px]", // classification A / B
};

const GAP = "gap-4";
const INPUT_BASE =
  "h-[42px] w-full min-w-0 rounded-[7px] border bg-white px-4 text-slate-900 outline-none transition placeholder:text-[#98A2B3] focus:border-[#0773F8] focus:ring-[3px] focus:ring-[#0773F8]/15 disabled:cursor-not-allowed disabled:bg-[#E9EEF4] disabled:text-slate-600";
const INPUT = `${INPUT_BASE} ${T.input}`;
const TEXTAREA = `block w-full resize-none rounded-[7px] border bg-white px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-[#98A2B3] focus:border-[#0773F8] focus:ring-[3px] focus:ring-[#0773F8]/15 ${T.input}`;
const inputBorder = (error) => (error ? "border-[#E5484D]" : "border-[#D7DEE7]");
const ICON_CIRCLE = "grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full bg-[#EEF2F6] text-slate-900";
const TILE_ON = "border-[#3B87F6] bg-[#EEF6FF]";
const TILE_OFF = "border-[#DCE3EB] bg-white hover:border-[#B7C4D4]";
const AMENITY_ON = "border-[#9CC8FA] bg-[#EBF5FF]";
const DIVIDER = "border-[#E7EDF3]";

const CATEGORIES = [
  { value: "men", lines: ["Men's", "Salon"], icons: [MdOutlineFace6] },
  { value: "women", lines: ["Women's", "Salon"], icons: [MdOutlineFace3] },
  { value: "unisex", lines: ["Unisex", "Salon"], icons: [MdOutlineFace6, MdOutlineFace3] },
];
// What a changed category writes to store_type.
const CATEGORY_LABEL = { men: "Men's Salon", women: "Women's Salon", unisex: "Unisex Salon" };
const CLASSIFICATIONS = ["A", "B"];
const OFFER_STATUSES = [
  { value: "gloup_offer", lines: ["GloUp Offer", "Salon"], color: BLUE },
  { value: "non_gloup_offer", lines: ["Non-GloUp", "Offer Salon"], color: "#9AA4B2" },
];
const OWNERSHIP = [
  { value: "owner_operated", title: "Work by salon owner", sub: "(Owner-operated)", icon: FaUser },
  { value: "employee_operated", title: "Work by employees only", sub: "(Employee-operated)", icon: FaUsers },
  { value: "franchise", title: "Franchise Salon", icon: FaStore },
  { value: "multi_branch", title: "Multi-branch Salon", sub: "(Multi-store Salon)", icon: FaBuilding },
];
const DAYS = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
];
const AMENITIES = [
  { value: "ac", lines: ["AC"], icon: FaSnowflake },
  { value: "wifi", lines: ["WiFi"], icon: FaWifi },
  { value: "car_parking", lines: ["Dedicated", "Car Parking"], icon: FaCar },
  { value: "washroom", lines: ["Washroom"], icon: FaToilet },
  { value: "wheelchair_access", lines: ["Wheelchair", "Accessibility"], icon: FaWheelchair },
  { value: "card_machine", lines: ["Card Machine", "(UPI / Card)"], icon: FaCreditCard },
  { value: "tv", lines: ["TV"], icon: FaTv },
];

const pad = (n) => String(n).padStart(2, "0");
const timeLabel = (hm) => moment(hm, "HH:mm").format("hh:mm A");
// 05:00 AM to 11:45 PM in 15-minute steps.
const TIMES = Array.from({ length: 76 }, (_, i) => {
  const mins = 5 * 60 + i * 15;
  const value = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  return { value, label: timeLabel(value) };
});

// The mockup sections the API doesn't store yet, by the store_details keys
// that would carry them.
const PENDING_SECTIONS = [
  ["Owner / Manager Name", ["owner_name"]],
  ["Salon Classification", ["salon_classification"]],
  ["GloUp Offer Status", ["gloup_offer_status"]],
  ["Ownership & Operations", ["ownership_type"]],
  ["Uses Computer / Billing", ["uses_computer", "uses_billing_software", "billing_software_name"]],
  ["Opening Date", ["opening_date"]],
  ["Capacity Details", ["chair_count", "employee_count"]],
  ["Working Hours", ["opening_time", "closing_time", "working_days"]],
  ["Amenities", ["amenities", "amenities_other"]],
  ["Notes", ["notes"]],
];

// Required whatever the API returns - the classic save checks these too.
const ALWAYS_REQUIRED = new Set(["name", "phone", "email", "addressLine1", "city", "district", "state", "location", "images"]);
// The mockup's * fields, required once store_details returns their key.
const DESIGN_REQUIRED = {
  owner_name: ["owner_name", "Enter the owner or manager name"],
  category: ["store_type", "Choose a salon category"],
  salon_classification: ["salon_classification", "Choose a classification"],
  gloup_offer_status: ["gloup_offer_status", "Choose an offer status"],
  ownership_type: ["ownership_type", "Choose how the salon is run"],
  uses_computer: ["uses_computer", "Choose Yes or No"],
  uses_billing_software: ["uses_billing_software", "Choose Yes or No"],
  opening_date: ["opening_date", "Pick the opening date"],
  chair_count: ["chair_count", "Enter the chair count"],
  employee_count: ["employee_count", "Enter the employee count"],
  opening_time: ["opening_time", "Pick a time"],
  closing_time: ["closing_time", "Pick a time"],
  working_days: ["working_days", "Pick at least one day"],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isNum = (v) => v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v));
const blank = (v) => v === null || v === undefined || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
const str = (v) => (v === null || v === undefined ? "" : String(v));
const omit = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));

// Arrays may arrive as arrays, JSON strings or comma lists.
const toList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string" || !v.trim()) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
};
const toBool = (v) => {
  if ([true, 1, "1", "true", "yes"].includes(v)) return true;
  if ([false, 0, "0", "false", "no"].includes(v)) return false;
  return null;
};
const toYmd = (v) => (v && moment(v).isValid() ? moment(v).format("YYYY-MM-DD") : "");

// store_type is free text from Create Partner ("Unisex", "Women's Salon", ...).
// Women / female before men / male, which they contain.
const parseCategory = (v) => {
  const s = str(v).toLowerCase();
  if (/unisex|both/.test(s)) return "unisex";
  if (/women|female|ladies|girl/.test(s)) return "women";
  if (/men|male|gents|boy|barber/.test(s)) return "men";
  return "";
};

const toForm = (d) => ({
  // What /editpartner saves today (savePartnerEdit's fields).
  name: str(d.name),
  email: str(d.email),
  phone: str(d.phone),
  whatsapp_number: str(d.whatsapp_number),
  income: str(d.income),
  description: str(d.description),
  addressLine1: str(d.addressLine1),
  area: str(d.area),
  city: str(d.city),
  district: str(d.district),
  state: str(d.state),
  zipcode: str(d.zipcode),
  landmark: str(d.landmark),
  latitude: str(d.latitude),
  longitude: str(d.longitude),
  radius: str(d.radius),
  status: d.status,
  images: toList(d.images),
  newImagesAdded: false,
  logo: d.logo || null,
  newLogoAdded: false,
  servicesProvidedFor: toList(d.services_provided_for),
  languages: toList(d.languages),
  isPremium: toBool(d.is_premium) === true,
  // The mockup's fields (category -> store_type; the rest not stored yet).
  category: parseCategory(d.store_type),
  owner_name: str(d.owner_name),
  salon_classification: str(d.salon_classification).toUpperCase(),
  gloup_offer_status: str(d.gloup_offer_status),
  ownership_type: str(d.ownership_type),
  uses_computer: toBool(d.uses_computer),
  uses_billing_software: toBool(d.uses_billing_software),
  billing_software_name: str(d.billing_software_name),
  opening_date: toYmd(d.opening_date),
  chair_count: str(d.chair_count),
  employee_count: str(d.employee_count),
  opening_time: str(d.opening_time).slice(0, 5),
  closing_time: str(d.closing_time).slice(0, 5),
  working_days: toList(d.working_days).map((day) => str(day).slice(0, 3).toLowerCase()),
  amenities: toList(d.amenities).map(str),
  amenities_other: str(d.amenities_other),
  notes: str(d.notes),
});

// The extra /editpartner fields. An unchanged category keeps the stored text.
const designFields = (form, store) => ({
  store_type: form.category === parseCategory(store.store_type) ? str(store.store_type) : CATEGORY_LABEL[form.category] || "",
  owner_name: form.owner_name.trim(),
  salon_classification: form.salon_classification,
  gloup_offer_status: form.gloup_offer_status,
  ownership_type: form.ownership_type,
  uses_computer: form.uses_computer,
  uses_billing_software: form.uses_billing_software,
  billing_software_name: form.uses_billing_software === false ? "" : form.billing_software_name.trim(),
  opening_date: form.opening_date,
  chair_count: form.chair_count,
  employee_count: form.employee_count,
  opening_time: form.opening_time,
  closing_time: form.closing_time,
  working_days: form.working_days,
  amenities: form.amenities,
  amenities_other: form.amenities.includes("other") ? form.amenities_other.trim() : "",
  notes: form.notes.trim(),
});

// Field -> message, in page order so the first one is nearest the top.
const validate = (form, required) => {
  const errors = {};
  const check = (key, message, ok = !blank(form[key])) => {
    if (!ok && !errors[key]) errors[key] = message;
  };
  const design = (key) => required(key) && check(key, DESIGN_REQUIRED[key][1]);

  check("name", "Enter the salon name");
  design("owner_name");
  check("phone", "Enter a valid 10-digit mobile number", /^[6-9]\d{9}$/.test(form.phone));
  check("addressLine1", "Enter the address");
  check("city", "Enter the city");
  check("email", "Enter a valid email address", EMAIL.test(form.email.trim()));
  if (form.whatsapp_number) check("whatsapp_number", "Enter a 10-digit number", /^\d{10}$/.test(form.whatsapp_number));
  if (!blank(form.income)) check("income", "Enter an amount", isNum(form.income));
  ["category", "salon_classification", "gloup_offer_status", "ownership_type", "uses_computer", "uses_billing_software", "opening_date"].forEach(design);
  ["chair_count", "employee_count", "opening_time", "closing_time", "working_days"].forEach(design);
  if (form.opening_time && form.closing_time) {
    check("closing_time", "Must be after the opening time", form.closing_time > form.opening_time);
  }
  check("images", "Add at least one photo", form.images.length > 0);
  check("district", "Enter the district");
  check("state", "Enter the state");
  if (!blank(form.radius)) check("radius", "Enter a distance in km", isNum(form.radius) && Number(form.radius) >= 0);
  check("location", "Pick the salon's location on the map", isNum(form.latitude) && isNum(form.longitude));
  return errors;
};

// Object URL for a new File (revoked when it changes), image URL for a stored path.
const usePreview = (src) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!src) {
      setUrl(null);
      return undefined;
    }
    if (!(src instanceof Blob)) {
      setUrl(getImageUrl(src));
      return undefined;
    }
    const objectUrl = URL.createObjectURL(src);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [src]);
  return url;
};

const NO_IMAGE = "/uploads/common/no-image.png";
const fileKeys = new WeakMap();
let fileSeq = 0;
const photoKey = (img, i) => {
  if (!(img instanceof Blob)) return `${img}|${i}`;
  if (!fileKeys.has(img)) fileKeys.set(img, `file-${++fileSeq}`);
  return fileKeys.get(img);
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const Req = () => <span className="ml-1 text-[#E5484D]">*</span>;

const ErrorText = ({ children }) =>
  children ? (
    <p role="alert" className={`mt-1.5 text-[#E5484D] ${T.tiny}`}>
      {children}
    </p>
  ) : null;

// A mockup card: light title band over a white body.
const Section = ({ n, title, hint, required, big = false, field, className = "", bodyClass = "p-4", children }) => (
  <section data-field={field} className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#E1E8EF] bg-white ${className}`}>
    <h2 className={`border-b border-[#E7EDF3] bg-[#F3F7FA] px-5 py-[7px] font-bold tracking-tight text-slate-900 ${big ? T.card : T.section}`}>
      {n && <span className="mr-3">{n}.</span>}
      {title}
      {required && <Req />}
      {hint && <span className="ml-2 font-normal text-slate-700">{hint}</span>}
    </h2>
    <div className={`flex-1 ${bodyClass}`}>{children}</div>
  </section>
);

const Field = ({ id, label, required, error, className = "", children }) => (
  <div data-field={id} className={`min-w-0 ${className}`}>
    <label htmlFor={`salon-${id}`} className={`mb-1.5 block font-semibold text-slate-800 ${T.label}`}>
      {label}
      {required && <Req />}
    </label>
    {children}
    <ErrorText>{error}</ErrorText>
  </div>
);

const Radio = ({ on, className = "" }) => (
  <span
    aria-hidden="true"
    className={`grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full border-2 bg-white ${on ? "border-[#0773F8]" : "border-[#B4BFCC]"} ${className}`}
  >
    {on && <span className="h-[11px] w-[11px] rounded-full bg-[#0773F8]" />}
  </span>
);

const Checkbox = ({ on }) => (
  <span
    aria-hidden="true"
    className={`grid h-[21px] w-[21px] shrink-0 place-items-center rounded-[5px] border-2 ${
      on ? "border-[#0773F8] bg-[#0773F8] text-white" : "border-[#B4BFCC] bg-white"
    }`}
  >
    {on && <Check size={14} strokeWidth={3.2} />}
  </span>
);

// One choice in a group of option cards.
const Tile = ({ on, onClick, label, className = "", children }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    aria-label={label}
    onClick={onClick}
    className={`relative min-w-0 rounded-[9px] border-[1.5px] text-slate-900 transition-colors ${on ? TILE_ON : TILE_OFF} ${className}`}
  >
    {children}
  </button>
);

const YesNo = ({ label, value, onChange }) => (
  <div role="radiogroup" aria-label={label} className="mt-2.5 flex items-center gap-7">
    {[
      [true, "Yes"],
      [false, "No"],
    ].map(([option, text]) => (
      <button
        key={text}
        type="button"
        role="radio"
        aria-checked={value === option}
        onClick={() => onChange(option)}
        className={`flex items-center gap-2.5 text-slate-800 ${T.input}`}
      >
        <Radio on={value === option} />
        {text}
      </button>
    ))}
  </div>
);

const ToggleChip = ({ on, onClick, pad = "px-3.5", className = "", children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`h-[38px] rounded-[7px] border font-semibold transition-colors ${pad} ${
      on ? "border-[#0773F8] bg-[#0773F8] text-white" : "border-[#D3DAE2] bg-white text-slate-800 hover:border-[#B7C4D4]"
    } ${T.input} ${className}`}
  >
    {children}
  </button>
);

const Switch = ({ on, onClick, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onClick}
    className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${on ? "bg-[#0773F8]" : "bg-slate-300"}`}
  >
    <span className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
  </button>
);

// Count with the mockup's up / down arrows.
const Stepper = ({ id, value, onChange, error }) => {
  const n = Number(value) || 0;
  return (
    <div className="relative">
      <input
        id={`salon-${id}`}
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className={`${INPUT} ${inputBorder(error)} pr-10`}
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col text-slate-700">
        <button type="button" aria-label="Increase" onClick={() => onChange(String(n + 1))} className="rounded hover:bg-slate-100">
          <ChevronUp size={15} />
        </button>
        <button type="button" aria-label="Decrease" onClick={() => onChange(String(Math.max(0, n - 1)))} className="rounded hover:bg-slate-100">
          <ChevronDown size={15} />
        </button>
      </span>
    </div>
  );
};

const TimeSelect = ({ id, value, onChange, error }) => {
  // Keep a stored time that isn't on the 15-minute grid.
  const options =
    value && !TIMES.some((t) => t.value === value)
      ? [...TIMES, { value, label: timeLabel(value) }].sort((a, b) => a.value.localeCompare(b.value))
      : TIMES;
  return (
    <span className="relative block">
      <SelectMenu
        id={`salon-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Select time"
        className={`${INPUT} ${inputBorder(error)} appearance-none pr-9`}
      >
        {options.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectMenu>
      <ChevronsUpDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-700" />
    </span>
  );
};

// Toggle chips over an { id, name } option list.
const ChipField = ({ label, options, value, onToggle }) => (
  <div>
    <p className={`mb-2 font-semibold text-slate-800 ${T.label}`}>{label}</p>
    {options.length ? (
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ToggleChip key={option.id} on={value.includes(option.id)} onClick={() => onToggle(option.id)}>
            {option.name}
          </ToggleChip>
        ))}
      </div>
    ) : (
      <p className={`text-slate-400 ${T.small}`}>Loading options…</p>
    )}
  </div>
);

const Thumb = ({ img, onRemove }) => {
  const url = usePreview(img);
  const [broken, setBroken] = useState(false);
  return (
    <div className="group relative h-[100px] w-[118px] shrink-0 overflow-hidden rounded-[9px] border border-[#E1E8EF] bg-slate-100">
      {url && (
        <img
          src={broken ? getImageUrl(NO_IMAGE) : url}
          alt="Salon photo"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      )}
      {img instanceof Blob && (
        <span className="absolute left-1.5 top-1.5 rounded bg-emerald-500 px-1.5 py-px text-[11px] font-bold leading-4 text-white">NEW</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity hover:bg-[#E5484D] focus:opacity-100 group-hover:opacity-100"
      >
        <X size={15} />
      </button>
    </div>
  );
};

const Photos = ({ images, onAdd, onRemove }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const browse = () => inputRef.current?.click();
  const take = (files) => {
    const list = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (list.length) onAdd(list);
  };
  return (
    <div className="flex flex-wrap gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
        className={`flex h-[100px] w-[340px] items-center justify-center gap-5 rounded-[9px] border-[1.5px] border-dashed px-5 transition-colors ${
          dragging ? "border-[#0773F8] bg-[#EEF6FF]" : "border-[#CBD5E1] bg-[#FBFCFE]"
        }`}
      >
        <CloudUpload size={34} strokeWidth={1.6} className="shrink-0 text-slate-700" />
        <div className="flex flex-col items-center text-center">
          <p className={`text-slate-600 ${T.small}`}>
            Upload Salon Photos
            <br />
            (Interior, Exterior, etc.)
          </p>
          <button
            type="button"
            onClick={browse}
            className={`mt-2 rounded-md border border-[#0773F8] bg-[#EEF5FF] px-5 py-1 font-semibold text-[#0773F8] hover:bg-[#E1EDFF] ${T.small}`}
          >
            Choose Files
          </button>
        </div>
      </div>
      {images.map((img, i) => (
        <Thumb key={photoKey(img, i)} img={img} onRemove={() => onRemove(i)} />
      ))}
      <button
        type="button"
        onClick={browse}
        className={`flex h-[100px] w-[106px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed border-[#CBD5E1] text-slate-600 transition-colors hover:border-[#0773F8] hover:text-[#0773F8] ${T.small}`}
      >
        <Plus size={26} strokeWidth={1.6} />
        Add More
      </button>
    </div>
  );
};

const LogoEditor = ({ logo, onChange }) => {
  const inputRef = useRef(null);
  const url = usePreview(logo);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <span className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-full border border-[#DCE3EB] bg-[#F6F8FA] text-slate-400">
        {url && !broken ? <img src={url} alt="Salon logo" onError={() => setBroken(true)} className="h-full w-full object-cover" /> : <Store size={22} />}
      </span>
      <div className="min-w-0">
        <p className={`font-semibold text-slate-800 ${T.label}`}>Salon Logo</p>
        <div className={`mt-0.5 flex items-center gap-3 ${T.small}`}>
          <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-[#0773F8] hover:underline">
            {logo ? "Change" : "Upload"}
          </button>
          {logo && (
            <button type="button" onClick={() => onChange(null)} className="font-semibold text-slate-500 hover:text-[#E5484D]">
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Map: inside <Unscaled> so clicks, drags and wheel zoom track the cursor
// despite the canvas scaling; the search box sits on the map for the same
// reason (Places positions its dropdown from the input in screen pixels).
// ---------------------------------------------------------------------------

const MAP_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false };
const MAP_FALLBACK = { lat: 13.0724, lng: 80.246 }; // MapPicker's default centre
const CIRCLE_OPTIONS = { fillColor: BLUE, fillOpacity: 0.12, strokeColor: BLUE, strokeOpacity: 0.6, strokeWeight: 2, clickable: false };

const MapNote = ({ children }) => <div className={`absolute inset-0 grid place-items-center bg-slate-50 text-slate-400 ${T.small}`}>{children}</div>;

const LiveMap = ({ lat, lng, radiusKm, onPick }) => {
  const { isLoaded, loadError } = useLoadScript(GOOGLE_MAPS_LOADER);
  const [search, setSearch] = useState(null);
  // Same object until the pin moves, so typing elsewhere doesn't recentre the map.
  const pin = useMemo(() => (isNum(lat) && isNum(lng) ? { lat: Number(lat), lng: Number(lng) } : null), [lat, lng]);

  if (loadError) return <MapNote>Map unavailable</MapNote>;
  if (!isLoaded) return <MapNote>Loading map…</MapNote>;

  const pickAt = (e) => e.latLng && onPick(e.latLng.lat(), e.latLng.lng());
  return (
    <Unscaled>
      <GoogleMap mapContainerStyle={MAP_STYLE} center={pin || MAP_FALLBACK} zoom={pin ? 15 : 11} options={MAP_OPTIONS} onClick={pickAt}>
        {pin && <MarkerF position={pin} draggable onDragEnd={pickAt} />}
        {pin && radiusKm > 0 && <CircleF center={pin} radius={radiusKm * 1000} options={CIRCLE_OPTIONS} />}
      </GoogleMap>
      <Autocomplete
        onLoad={setSearch}
        onPlaceChanged={() => {
          const location = search?.getPlace()?.geometry?.location;
          if (location) onPick(location.lat(), location.lng());
        }}
        className="absolute left-2.5 top-2.5 w-[min(320px,calc(100%-20px))]"
      >
        <input
          type="text"
          placeholder="Search location"
          aria-label="Search location"
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 shadow-md outline-none focus:border-[#0773F8]"
        />
      </Autocomplete>
    </Unscaled>
  );
};

const LocationMap = (props) => (HAS_MAPS_KEY ? <LiveMap {...props} /> : <MapNote>Map unavailable - no Google Maps key</MapNote>);

// ---------------------------------------------------------------------------
// App bar: title, breadcrumb and the page's Cancel / Save.
// ---------------------------------------------------------------------------

const PageHeader = ({ id, salon, onLeave, onSave, saving, canSave }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">Edit Salon</h1>
        <p className="hidden truncate text-[11px] leading-tight text-slate-500 sm:block">Salon profile & business information</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-[12px] text-slate-500 lg:flex">
          <button type="button" onClick={() => onLeave("/partner-details-v2")} className="hover:text-slate-800">
            Partners
          </button>
          <ChevronRight size={12} className="text-slate-300" />
          <button type="button" onClick={() => onLeave(`/partner-details-v2/${id}`)} className="max-w-[180px] truncate hover:text-slate-800">
            {salon || `Salon #${id}`}
          </button>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="font-medium text-slate-800">Edit Salon</span>
        </nav>
        <button
          type="button"
          onClick={() => onLeave(`/partner-details-v2/${id}`)}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || saving}
          className="flex items-center gap-2 rounded-lg px-5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: BLUE }}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  </PageHeaderPortal>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const EditSalonV2 = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const partners = useSelector((state) => state.allPartners.allPartnersList);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "failed"
  const [loadError, setLoadError] = useState("");
  const [store, setStore] = useState(null); // store_details as loaded
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    dispatch(getPartnerDetail({ id: String(id) }))
      .unwrap()
      .then((payload) => {
        if (!alive) return;
        const details = payload?.store_details;
        if (!details) {
          setLoadError("Salon not found");
          setStatus("failed");
          return;
        }
        setStore(details);
        setForm(toForm(details));
        setErrors({});
        setDirty(false);
        setStatus("ready");
      })
      .catch((message) => {
        if (!alive) return;
        setLoadError(typeof message === "string" ? message : "Failed to load the salon");
        setStatus("failed");
      });
    return () => {
      alive = false;
    };
  }, [dispatch, id]);

  useEffect(() => {
    // A failed request leaves the error message (a string) in payload.
    dispatch(getServiceProvidedForOptions()).then((res) => setServiceOptions(Array.isArray(res.payload) ? res.payload : []));
    dispatch(getLanguageList()).then((res) => setLanguageOptions(Array.isArray(res.payload) ? res.payload : []));
  }, [dispatch]);

  // City suggestions come from every partner's city - the list the Partners
  // page and the salon picker already load (fetched here if they haven't).
  const hasPartners = Array.isArray(partners) && partners.length > 0;
  useEffect(() => {
    if (!hasPartners) dispatch(getAllPartnersList());
  }, [dispatch, hasPartners]);
  const cities = useMemo(() => {
    const byKey = new Map();
    (Array.isArray(partners) ? partners : []).forEach((p) => {
      const city = str(p.location?.city || p.city).trim();
      if (city && !byKey.has(city.toLowerCase())) byKey.set(city.toLowerCase(), city);
    });
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [partners]);

  // Unsaved edits survive neither a reload nor closing the tab without a prompt.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const stored = (key) => !!store && Object.prototype.hasOwnProperty.call(store, key);
  const required = (key) => ALWAYS_REQUIRED.has(key) || (DESIGN_REQUIRED[key] ? stored(DESIGN_REQUIRED[key][0]) : false);
  const missing = store ? PENDING_SECTIONS.filter(([, keys]) => !keys.some(stored)).map(([label]) => label) : [];

  const change = (updater, keys) => {
    setForm(updater);
    setDirty(true);
    setErrors((prev) => (keys.some((key) => prev[key]) ? omit(prev, keys) : prev));
  };
  const set = (key, value) => change((prev) => ({ ...prev, [key]: typeof value === "function" ? value(prev[key]) : value }), [key]);
  const toggleIn = (key, item) => set(key, (list) => (list.includes(item) ? list.filter((v) => v !== item) : [...list, item]));
  const setLocation = (lat, lng) => change((prev) => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }), ["location"]);

  const leave = (path) => {
    if (dirty && !window.confirm("Discard your changes to this salon?")) return;
    navigate(path);
  };

  const save = async () => {
    if (!form || saving) return;
    const found = validate(form, required);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      toast.error("Please fix the highlighted fields", { id: TOAST });
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      if (!(await savePartnerEdit(dispatch, String(id), form, designFields(form, store)))) return;
      toast.success(`${form.name.trim()} updated`, { id: TOAST });
      setDirty(false);
      navigate(`/partner-details-v2/${id}`);
    } catch (message) {
      toast.error(typeof message === "string" ? message : "Failed to save changes. Please try again.", { id: TOAST });
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <PageHeader id={id} salon={store?.name} onLeave={leave} onSave={save} saving={saving} canSave={status === "ready"} />
  );

  if (status !== "ready") {
    return (
      <>
        {header}
        <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className="pb-6 leading-snug">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E1E8EF] bg-white py-28 text-center">
            {status === "loading" ? (
              <>
                <Loader2 size={26} className="animate-spin text-slate-400" />
                <p className={`text-slate-500 ${T.label}`}>Loading salon…</p>
              </>
            ) : (
              <>
                <Store size={26} className="text-slate-400" />
                <p className={`font-semibold text-slate-700 ${T.label}`}>{loadError}</p>
                <button type="button" onClick={() => navigate(`/partner-details-v2/${id}`)} className={`font-semibold text-[#0773F8] hover:underline ${T.small}`}>
                  Back to the partner
                </button>
              </>
            )}
          </div>
        </ScaledCanvas>
      </>
    );
  }

  const f = form;
  // Props for a plain text input or textarea bound to form[key].
  const text = (key, filter) => ({
    id: `salon-${key}`,
    value: f[key] ?? "",
    onChange: (e) => set(key, filter ? filter(e.target.value) : e.target.value),
    "aria-invalid": errors[key] ? true : undefined,
    className: `${INPUT} ${inputBorder(errors[key])}`,
  });
  const digits = (max) => (v) => v.replace(/\D/g, "").slice(0, max);
  const otherOn = f.amenities.includes("other");

  return (
    <>
      {header}

      <ScaledCanvas width={DESIGN_WIDTH} minWidth={MIN_WIDTH} className={`flex flex-col pb-6 leading-snug ${GAP}`}>
        {missing.length > 0 && (
          <div className={`flex items-start gap-2.5 rounded-xl border border-[#F2DFA8] bg-[#FFF9EA] px-4 py-2.5 text-[#7A5B12] ${T.small}`}>
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">Not stored by the partner API yet: </span>
              {missing.join(", ")}. These start blank and Save sends them along, so they'll be kept once the backend adds them.
            </p>
          </div>
        )}

        {/* Basic Information (+ the contact row the mockup leaves out) */}
        <Section title="Basic Information" big bodyClass="grid grid-cols-3 gap-x-7 gap-y-4 px-5 pb-5 pt-3.5">
          <Field id="name" label="Salon Name" required error={errors.name}>
            <input {...text("name")} placeholder="Enter salon name" />
          </Field>
          <Field id="partner_id" label="Partner ID">
            <input id="salon-partner_id" value={id} disabled readOnly className={`${INPUT} ${inputBorder()}`} />
          </Field>
          <Field id="owner_name" label="Owner / Manager Name" required={required("owner_name")} error={errors.owner_name}>
            <input {...text("owner_name")} placeholder="Enter owner or manager name" />
          </Field>

          <Field id="phone" label="Mobile Number" required error={errors.phone}>
            <div
              className={`flex h-[42px] overflow-hidden rounded-[7px] border bg-white transition focus-within:border-[#0773F8] focus-within:ring-[3px] focus-within:ring-[#0773F8]/15 ${inputBorder(errors.phone)}`}
            >
              <span className={`grid w-[88px] shrink-0 place-items-center border-r border-[#D7DEE7] bg-[#F6F8FA] font-medium text-slate-800 ${T.input}`}>+91</span>
              <input
                {...text("phone", digits(10))}
                inputMode="numeric"
                placeholder="Enter mobile number"
                className={`min-w-0 flex-1 bg-transparent px-4 text-slate-900 outline-none placeholder:text-[#98A2B3] ${T.input}`}
              />
            </div>
          </Field>
          <Field id="addressLine1" label="Address / Area" required error={errors.addressLine1}>
            <input {...text("addressLine1")} placeholder="Enter full address or area" />
          </Field>
          <Field id="city" label="City" required error={errors.city}>
            <div className="relative">
              <input
                {...text("city")}
                list="salon-city-options"
                autoComplete="off"
                placeholder="Select city"
                className={`${INPUT} ${inputBorder(errors.city)} pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0`}
              />
              <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-700" />
            </div>
            <datalist id="salon-city-options">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </Field>

          <Field id="email" label="Email" required error={errors.email}>
            <input {...text("email")} type="email" placeholder="Enter email address" />
          </Field>
          <Field id="whatsapp_number" label="WhatsApp Number" error={errors.whatsapp_number}>
            <input {...text("whatsapp_number", digits(10))} inputMode="numeric" placeholder="Enter WhatsApp number" />
          </Field>
          <Field id="income" label="Salon Income (₹)" error={errors.income}>
            <input {...text("income", (v) => v.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="Enter income" />
          </Field>
        </Section>

        {/* 1-3 */}
        <div className={`grid ${ROW1_COLS} ${GAP}`}>
          <Section n={1} title="Salon Category" required={required("category")} field="category">
            <div role="radiogroup" aria-label="Salon category" className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map((c) => {
                const on = f.category === c.value;
                return (
                  <Tile
                    key={c.value}
                    on={on}
                    onClick={() => set("category", c.value)}
                    label={c.lines.join(" ")}
                    className="flex h-[110px] flex-col items-center justify-center gap-1.5 px-2 pt-1"
                  >
                    <Radio on={on} className="absolute left-3.5 top-6" />
                    <span className="flex items-center">
                      {c.icons.map((Icon, i) => (
                        <Icon key={i} size={c.icons.length > 1 ? 30 : 34} />
                      ))}
                    </span>
                    <span className={`text-center font-semibold leading-tight ${T.option}`}>
                      {c.lines[0]}
                      <br />
                      {c.lines[1]}
                    </span>
                  </Tile>
                );
              })}
            </div>
            <ErrorText>{errors.category}</ErrorText>
          </Section>

          <Section n={2} title="Salon Classification" required={required("salon_classification")} field="salon_classification">
            <div role="radiogroup" aria-label="Salon classification" className="grid grid-cols-2 gap-2.5">
              {CLASSIFICATIONS.map((letter) => {
                const on = f.salon_classification === letter;
                return (
                  <Tile
                    key={letter}
                    on={on}
                    onClick={() => set("salon_classification", letter)}
                    label={`${letter} Category Salon`}
                    className="grid h-[110px] grid-cols-[21px_1fr] content-center items-center gap-x-5 gap-y-2 px-4 text-left"
                  >
                    <Radio on={on} />
                    <span className={`font-extrabold leading-none ${T.letter}`}>{letter}</span>
                    <span className={`col-start-2 text-slate-700 ${T.option}`}>Category Salon</span>
                  </Tile>
                );
              })}
            </div>
            <ErrorText>{errors.salon_classification}</ErrorText>
          </Section>

          <Section n={3} title="GloUp Offer Status" required={required("gloup_offer_status")} field="gloup_offer_status">
            <div role="radiogroup" aria-label="GloUp offer status" className="grid grid-cols-2 gap-2.5">
              {OFFER_STATUSES.map((o) => {
                const on = f.gloup_offer_status === o.value;
                return (
                  <Tile
                    key={o.value}
                    on={on}
                    onClick={() => set("gloup_offer_status", o.value)}
                    label={o.lines.join(" ")}
                    className="flex h-[110px] flex-col items-center justify-center gap-1.5 pl-9 pr-2"
                  >
                    <Radio on={on} className="absolute left-3.5 top-6" />
                    <RiDiscountPercentFill size={34} style={{ color: o.color }} />
                    <span className={`text-center font-semibold leading-tight ${T.option}`}>
                      {o.lines[0]}
                      <br />
                      {o.lines[1]}
                    </span>
                  </Tile>
                );
              })}
            </div>
            <ErrorText>{errors.gloup_offer_status}</ErrorText>
          </Section>
        </div>

        {/* 4-8 */}
        <div className={`${ROWS_4_8} ${GAP}`}>
          <div className={`grid ${ROW2_COLS} ${GAP}`}>
            <Section n={4} title="Ownership & Operations" required={required("ownership_type")} field="ownership_type">
              <div role="radiogroup" aria-label="Ownership and operations" className="grid grid-cols-2 gap-2.5">
                {OWNERSHIP.map((o) => {
                  const on = f.ownership_type === o.value;
                  const Icon = o.icon;
                  return (
                    <Tile
                      key={o.value}
                      on={on}
                      onClick={() => set("ownership_type", o.value)}
                      label={o.title}
                      className="flex h-[61px] items-center gap-4 px-3.5 text-left"
                    >
                      <Radio on={on} />
                      <Icon size={24} className="shrink-0" />
                      <span className={`min-w-0 leading-tight ${T.small}`}>
                        <span className="block font-semibold">{o.title}</span>
                        {o.sub && <span className="block text-slate-700">{o.sub}</span>}
                      </span>
                    </Tile>
                  );
                })}
              </div>
              <ErrorText>{errors.ownership_type}</ErrorText>
            </Section>

            <Section n={5} title="Uses Computer / Billing" required={required("uses_computer")} bodyClass="grid grid-cols-2 p-4">
              <div data-field="uses_computer" className="flex min-w-0 gap-4 pr-4">
                <span className={ICON_CIRCLE}>
                  <Laptop size={24} />
                </span>
                <div className="min-w-0 pt-1">
                  <p className={`font-semibold text-slate-800 ${T.label}`}>Uses Computer / Laptop</p>
                  <YesNo label="Uses computer or laptop" value={f.uses_computer} onChange={(v) => set("uses_computer", v)} />
                  <ErrorText>{errors.uses_computer}</ErrorText>
                </div>
              </div>
              <div data-field="uses_billing_software" className={`min-w-0 border-l pl-4 ${DIVIDER}`}>
                <div className="flex gap-4">
                  <span className={ICON_CIRCLE}>
                    <ReceiptText size={24} />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className={`font-semibold text-slate-800 ${T.label}`}>Billing Software</p>
                    <YesNo label="Uses billing software" value={f.uses_billing_software} onChange={(v) => set("uses_billing_software", v)} />
                    <ErrorText>{errors.uses_billing_software}</ErrorText>
                  </div>
                </div>
                <input
                  {...text("billing_software_name")}
                  aria-label="Billing software name"
                  disabled={f.uses_billing_software === false}
                  placeholder="Software name (e.g. Tally, Marg)"
                  className={`${INPUT_BASE} ${T.small} ${inputBorder()} mt-3 pl-3 pr-3`}
                />
              </div>
            </Section>

            <Section n={6} title="Opening Date" required={required("opening_date")} field="opening_date" bodyClass="flex items-center gap-4 p-4">
              <span className={ICON_CIRCLE}>
                <CalendarDays size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <DatePicker
                  value={f.opening_date}
                  onChange={(v) => set("opening_date", v)}
                  placeholder="Select opening date"
                  icon="right"
                  ariaLabel="Opening date"
                  className={`${INPUT_BASE} ${T.small} ${inputBorder(errors.opening_date)} flex items-center gap-2 text-left`}
                />
                <ErrorText>{errors.opening_date}</ErrorText>
              </div>
            </Section>
          </div>

          <div className={`grid ${ROW3_COLS} ${GAP}`}>
            <Section n={7} title="Capacity Details" bodyClass="grid grid-cols-2 gap-6 p-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className={ICON_CIRCLE}>
                  <MdChair size={26} />
                </span>
                <Field id="chair_count" label="Chair Count" required={required("chair_count")} error={errors.chair_count} className="flex-1">
                  <Stepper id="chair_count" value={f.chair_count} onChange={(v) => set("chair_count", v)} error={errors.chair_count} />
                </Field>
              </div>
              <div className="flex min-w-0 items-center gap-4">
                <span className={ICON_CIRCLE}>
                  <FaUsers size={24} />
                </span>
                <Field id="employee_count" label="Employee Count" required={required("employee_count")} error={errors.employee_count} className="flex-1">
                  <Stepper id="employee_count" value={f.employee_count} onChange={(v) => set("employee_count", v)} error={errors.employee_count} />
                </Field>
              </div>
            </Section>

            <Section n={8} title="Working Hours" className={WRAP_WIDE} bodyClass="flex items-center gap-4 p-4">
              <span className={ICON_CIRCLE}>
                <Clock size={26} />
              </span>
              <Field id="opening_time" label="Opening Time" required={required("opening_time")} error={errors.opening_time} className="w-[140px] shrink-0">
                <TimeSelect id="opening_time" value={f.opening_time} onChange={(v) => set("opening_time", v)} error={errors.opening_time} />
              </Field>
              <Field id="closing_time" label="Closing Time" required={required("closing_time")} error={errors.closing_time} className="w-[140px] shrink-0">
                <TimeSelect id="closing_time" value={f.closing_time} onChange={(v) => set("closing_time", v)} error={errors.closing_time} />
              </Field>
              <div data-field="working_days" className={`min-w-0 flex-1 border-l pl-4 ${DIVIDER}`}>
                <p className={`mb-1.5 font-semibold text-slate-800 ${T.label}`}>
                  Working Days
                  {required("working_days") && <Req />}
                </p>
                <div role="group" aria-label="Working days" className="flex flex-wrap gap-1.5">
                  {DAYS.map(([value, label]) => (
                    <ToggleChip key={value} on={f.working_days.includes(value)} onClick={() => toggleIn("working_days", value)} pad="px-2" className="min-w-[54px]">
                      {label}
                    </ToggleChip>
                  ))}
                </div>
                <ErrorText>{errors.working_days}</ErrorText>
              </div>
            </Section>
          </div>
        </div>

        {/* 9 */}
        <Section n={9} title="Amenities" hint="(Select all that apply)">
          <div role="group" aria-label="Amenities" className={`grid ${AMENITY_COLS} gap-2.5`}>
            {AMENITIES.map((a) => {
              const on = f.amenities.includes(a.value);
              const Icon = a.icon;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={a.lines.join(" ")}
                  onClick={() => toggleIn("amenities", a.value)}
                  className={`flex h-[94px] min-w-0 items-center gap-2 rounded-[9px] border-[1.5px] px-3.5 transition-colors ${on ? AMENITY_ON : TILE_OFF}`}
                >
                  <Checkbox on={on} />
                  <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                    <Icon size={24} style={{ color: on ? BLUE : "#111827" }} />
                    <span className={`font-medium leading-tight text-slate-900 ${T.input}`}>
                      {a.lines[0]}
                      {a.lines[1] && (
                        <>
                          <br />
                          {a.lines[1]}
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
            <div
              className={`flex h-[94px] min-w-0 flex-col justify-center gap-2 rounded-[9px] border-[1.5px] px-3.5 transition-colors ${
                otherOn ? AMENITY_ON : "border-[#DCE3EB] bg-white"
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={otherOn}
                onClick={() => toggleIn("amenities", "other")}
                className={`flex items-center gap-3 font-medium text-slate-900 ${T.input}`}
              >
                <Checkbox on={otherOn} />
                Other
              </button>
              <div className="pl-[33px]">
                <input
                  aria-label="Other amenity"
                  value={f.amenities_other}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Typing an amenity ticks Other.
                    change(
                      (prev) => ({
                        ...prev,
                        amenities_other: value,
                        amenities: value.trim() && !prev.amenities.includes("other") ? [...prev.amenities, "other"] : prev.amenities,
                      }),
                      []
                    );
                  }}
                  placeholder="Enter other amenity"
                  className={`h-[36px] w-full min-w-0 rounded-[7px] border border-[#D7DEE7] bg-white px-3 text-slate-900 outline-none transition placeholder:text-[#98A2B3] focus:border-[#0773F8] focus:ring-[3px] focus:ring-[#0773F8]/15 ${T.small}`}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* 10-11 */}
        <div className={`grid ${ROW5_COLS} ${GAP}`}>
          <Section n={10} title="Additional Information" bodyClass="flex flex-col gap-3 p-4">
            <Field id="description" label="Salon Description">
              <textarea
                {...text("description")}
                rows={2}
                maxLength={500}
                placeholder="Describe the salon, its services, ambience and specialties"
                className={`${TEXTAREA} ${inputBorder()}`}
              />
              <p className={`mt-1 text-right text-slate-400 ${T.tiny}`}>{f.description.length}/500</p>
            </Field>
            <Field id="notes" label="Notes">
              <textarea {...text("notes")} rows={2} placeholder="Enter additional notes (optional)" className={`${TEXTAREA} ${inputBorder()}`} />
            </Field>
          </Section>

          <Section n={11} title="Photos" required field="images">
            <Photos
              images={f.images}
              onAdd={(files) => change((prev) => ({ ...prev, images: [...prev.images, ...files], newImagesAdded: true }), ["images"])}
              onRemove={(index) => set("images", (list) => list.filter((_, i) => i !== index))}
            />
            <ErrorText>{errors.images}</ErrorText>
          </Section>
        </div>

        {/* 12-13: the classic modal's fields the mockup leaves out */}
        <div className={`grid ${ROW6_COLS} ${GAP}`}>
          <Section n={12} title="Address & Location" bodyClass="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-3 gap-x-5 gap-y-3.5">
              <Field id="area" label="Area / Locality">
                <input {...text("area")} placeholder="Enter area or locality" />
              </Field>
              <Field id="district" label="District" required error={errors.district}>
                <input {...text("district")} placeholder="Enter district" />
              </Field>
              <Field id="state" label="State" required error={errors.state}>
                <input {...text("state")} placeholder="Enter state" />
              </Field>
              <Field id="zipcode" label="Pincode">
                <input {...text("zipcode", digits(6))} inputMode="numeric" placeholder="Enter pincode" />
              </Field>
              <Field id="landmark" label="Landmark">
                <input {...text("landmark")} placeholder="Enter landmark" />
              </Field>
              <Field id="radius" label="Service Radius (km)" error={errors.radius}>
                <input {...text("radius", (v) => v.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="e.g. 5" />
              </Field>
            </div>
            <div data-field="location">
              <p className={`mb-1.5 font-semibold text-slate-800 ${T.label}`}>
                Map Location
                <Req />
              </p>
              <div className={`relative h-[250px] overflow-hidden rounded-lg border ${errors.location ? "border-[#E5484D]" : "border-[#D7DEE7]"}`}>
                <LocationMap lat={f.latitude} lng={f.longitude} radiusKm={Number(f.radius) || 0} onPick={setLocation} />
              </div>
              <p className={`mt-1.5 flex items-center gap-1.5 text-slate-500 ${T.tiny}`}>
                <MapPin size={13} className="shrink-0" />
                {isNum(f.latitude) && isNum(f.longitude) ? `${Number(f.latitude).toFixed(6)}, ${Number(f.longitude).toFixed(6)}` : "No location set"}
                <span className="text-slate-400">· Search, click the map or drag the pin to move it</span>
              </p>
              <ErrorText>{errors.location}</ErrorText>
            </div>
          </Section>

          <Section n={13} title="Listing & Branding" bodyClass="flex flex-col gap-5 p-4">
            <ChipField label="Services Provided For" options={serviceOptions} value={f.servicesProvidedFor} onToggle={(item) => toggleIn("servicesProvidedFor", item)} />
            <ChipField label="Languages Known" options={languageOptions} value={f.languages} onToggle={(item) => toggleIn("languages", item)} />
            <div className={`mt-auto flex items-center gap-4 border-t pt-4 ${DIVIDER}`}>
              <LogoEditor logo={f.logo} onChange={(file) => change((prev) => ({ ...prev, logo: file, newLogoAdded: true }), [])} />
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <span className={`font-semibold text-slate-800 ${T.label}`}>Premium Partner</span>
                <Switch on={f.isPremium} onClick={() => set("isPremium", (on) => !on)} label="Premium partner" />
              </div>
            </div>
          </Section>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default EditSalonV2;
