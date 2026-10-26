import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Award,
  BadgeCheck,
  BatteryFull,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  Gift,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Link2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Signal,
  Sparkles,
  Star,
  UserPlus,
  UserRound,
  Users,
  Variable,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD } from "../v2/tokens";
import { Card, HeaderBell, SectionTitle as BaseSectionTitle } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Send Marketing SMS" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width.
//
// UI only for now - segment sizes and templates are static demo data. The
// segment picker, template search / category filter, message editor, variable
// insertion, live phone preview, SMS part counting and cost estimate all work
// against that data. Sending is NOT wired: the live endpoint
// (/admin/app/sendmarketingsms, see marketingSlice + MarketingSMS.jsx) takes
// an uploaded phone-number sheet and a fixed DLT template, not a segment. Wire
// it up once the backend exposes segment broadcasts.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1240;

const VIOLET = "#5B4BF5";
const GREEN = "#16A34A";

const MAIN_COLS = "grid-cols-[808fr_408fr]";

// Type scale in design px on the 1240px canvas.
const T = {
  tiny: "text-[11px]",
  xxs: "text-[12px]",
  xs: "text-[13px]",
  sm: "text-[14px]",
  title: "text-[15px]",
};

// Rough per-SMS rate used for the cost estimate (INR).
const SMS_RATE = 0.03;

const DRAFT_KEY = "marketingSmsV2Draft";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const segments = [
  { id: "all", label: "All Users", count: 28452, icon: Users, color: VIOLET, tint: "#EEF0FF" },
  { id: "new", label: "New Users", count: 3842, icon: UserPlus, color: VIOLET, tint: "#EEF0FF" },
  { id: "first", label: "1st Time Booking", count: 4912, icon: CalendarCheck, color: VIOLET, tint: "#EEF0FF" },
  { id: "second", label: "2nd Time Booking", count: 3276, icon: CalendarDays, color: VIOLET, tint: "#EEF0FF" },
  { id: "3to4", label: "3 - 4 Bookings", count: 5842, icon: CalendarRange, color: VIOLET, tint: "#EEF0FF" },
  { id: "5plus", label: "5+ Bookings", count: 6318, icon: Award, color: GREEN, tint: "#DCFCE7" },
  { id: "10plus", label: "10+ Bookings", count: 2142, icon: Star, color: VIOLET, tint: "#EEF0FF" },
  { id: "inactive", label: "Inactive Users", count: 7838, icon: UserRound, color: "#F97316", tint: "#FFEDD5" },
];

const CATEGORIES = [
  { id: "offers", label: "Offers & Discounts", chip: "bg-green-50 text-green-700" },
  { id: "reminders", label: "Booking Reminders", chip: "bg-blue-50 text-blue-700" },
  { id: "reengagement", label: "Re-engagement", chip: "bg-orange-50 text-orange-600" },
  { id: "festivals", label: "Festivals", chip: "bg-pink-50 text-pink-600" },
];

const categoryById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// `thumb` drives the little banner rendered in place of the mockup's photos.
const templates = [
  {
    id: "flat50",
    title: "Flat 50% OFF on All Services",
    category: "offers",
    thumb: { kicker: "UP TO", headline: "50% OFF", sub: "ON ALL SERVICES", bg: "from-[#2A1B6E] to-[#5B3FD9]", accent: "#FACC15", icon: Sparkles },
    body: "GLOUP: ✨ Chennai's salon offers are here! Haircut @₹49 | Trim @₹29 | Shave @₹29 | De-Tan @₹49. 800+ salons available in Chennai. Book now on GloUp and save money & time! T&C apply.\n\nJoin GloUp: https://api.v1.gloup.in/download",
  },
  {
    id: "weekday",
    title: "Weekday Happy Hours",
    category: "offers",
    thumb: { kicker: "MON - FRI", headline: "30% OFF", sub: "11 AM - 4 PM", bg: "from-[#0F766E] to-[#14B8A6]", accent: "#FEF08A", icon: CalendarClock },
    body: "GLOUP: Weekday happy hours! Get 30% off Mon-Fri, 11AM-4PM at 800+ salons near you. Book now on GloUp. T&C apply.\n\nhttps://api.v1.gloup.in/download",
  },
  {
    id: "firstspa",
    title: "Free Hair Spa on First Booking",
    category: "offers",
    thumb: { kicker: "FIRST BOOKING", headline: "FREE SPA", sub: "ON GLOUP", bg: "from-[#9D174D] to-[#EC4899]", accent: "#FFFFFF", icon: Gift },
    body: "GLOUP: Hi {name}, your first booking on GloUp comes with a FREE hair spa at select salons. Book today! T&C apply.",
  },
  {
    id: "refer",
    title: "Refer & Earn ₹100",
    category: "offers",
    thumb: { kicker: "REFER & EARN", headline: "₹100", sub: "PER FRIEND", bg: "from-[#1E3A8A] to-[#3B82F6]", accent: "#FDE68A", icon: Gift },
    body: "GLOUP: Hi {name}, invite friends to GloUp and earn ₹100 for every friend who books their first salon visit. Share now!",
  },
  {
    id: "missyou",
    title: "We Miss You! Come Back",
    category: "reengagement",
    thumb: { kicker: "", headline: "It's been a while!", sub: "We miss you!", bg: "from-[#FCE7F3] to-[#FBCFE8]", accent: "#111827", dark: true, icon: Heart },
    body: "We noticed you haven't booked in a while.\nCome back to GloUp & enjoy amazing offers!",
  },
  {
    id: "favsalon",
    title: "Your Favourite Salon Misses You",
    category: "reengagement",
    thumb: { kicker: "", headline: "{salon_name}", sub: "is waiting for you", bg: "from-[#FFEDD5] to-[#FED7AA]", accent: "#7C2D12", dark: true, icon: Heart },
    body: "Hi {name}, {salon_name} misses you! Book your next visit on GloUp and get 20% off this week. T&C apply.",
  },
  {
    id: "confirm",
    title: "Booking Confirmation",
    category: "reminders",
    thumb: { kicker: "Your Booking is", headline: "Confirmed!", sub: "", bg: "from-[#CCFBF1] to-[#E0F2FE]", accent: "#0F172A", dark: true, icon: CalendarCheck },
    body: "Hi {name}, your booking at {salon_name} on {date} at {time} is confirmed. Thank you for choosing GloUp!",
  },
  {
    id: "reminder",
    title: "Appointment Reminder",
    category: "reminders",
    thumb: { kicker: "Don't forget!", headline: "Tomorrow", sub: "at {time}", bg: "from-[#DBEAFE] to-[#E0E7FF]", accent: "#1E3A8A", dark: true, icon: CalendarClock },
    body: "Hi {name}, a reminder that your appointment at {salon_name} is on {date} at {time}. See you there! - GloUp",
  },
  {
    id: "diwali",
    title: "Diwali Glow-Up Sale",
    category: "festivals",
    thumb: { kicker: "DIWALI", headline: "GLOW-UP", sub: "UP TO 40% OFF", bg: "from-[#7C2D12] to-[#EA580C]", accent: "#FDE047", icon: Sparkles },
    body: "GLOUP: Get festive-ready! Diwali Glow-Up Sale - up to 40% off on facials, hair & makeup at 800+ salons. Book on GloUp. T&C apply.",
  },
  {
    id: "pongal",
    title: "Pongal Special",
    category: "festivals",
    thumb: { kicker: "PONGAL", headline: "SPECIAL", sub: "FLAT ₹99 OFF", bg: "from-[#A16207] to-[#EAB308]", accent: "#FFFFFF", icon: Gift },
    body: "GLOUP: Happy Pongal, {name}! Flat ₹99 off on your next salon booking this festive week. Book on GloUp. T&C apply.",
  },
];

const VARIABLES = [
  { token: "{name}", label: "Customer name", sample: "Priya" },
  { token: "{salon_name}", label: "Salon name", sample: "Glow Studio" },
  { token: "{date}", label: "Booking date", sample: "28 Sep" },
  { token: "{time}", label: "Booking time", sample: "10:30 AM" },
];

// ---------------------------------------------------------------------------
// SMS helpers
// ---------------------------------------------------------------------------

// GSM 03.38 basic set; anything outside it (emoji, ₹, …) forces UCS-2.
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€";

// Returns how the carrier will bill `text`: encoding, billed length, parts.
const smsInfo = (text) => {
  let gsm = true;
  let gsmLength = 0;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(ch)) gsmLength += 2;
    else {
      gsm = false;
      break;
    }
  }

  if (gsm) {
    const parts = gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153);
    return { unicode: false, length: gsmLength, parts, capacity: parts === 1 ? 160 : parts * 153 };
  }

  // UCS-2 counts UTF-16 code units, so an emoji is 2 - which is what .length gives.
  const length = text.length;
  const parts = length <= 70 ? 1 : Math.ceil(length / 67);
  return { unicode: true, length, parts, capacity: parts === 1 ? 70 : parts * 67 };
};

const fillSamples = (text) =>
  VARIABLES.reduce((acc, v) => acc.split(v.token).join(v.sample), text);

const formatCount = (n) => n.toLocaleString("en-IN");

const URL_RE = /(https?:\/\/[^\s]+)/g;

// Renders URLs as blue links, like a phone's messaging app does.
const Linkified = ({ text }) =>
  text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="break-all text-[#2563EB] underline underline-offset-2">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );

const readDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const SectionTitle = (props) => <BaseSectionTitle size={T.title} {...props} />;

const Radio = ({ checked }) => (
  <span
    className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 transition-colors ${
      checked ? "border-[#5B4BF5]" : "border-slate-300"
    }`}
  >
    {checked && <span className="h-2 w-2 rounded-full" style={{ background: VIOLET }} />}
  </span>
);

const SegmentCard = ({ segment, selected, onSelect }) => {
  const Icon = segment.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-[60px] min-w-0 items-center gap-3 rounded-xl border bg-white px-3 text-left transition-colors ${
        selected
          ? "border-[#5B4BF5] ring-1 ring-[#5B4BF5]"
          : "border-[#E6E8F0] hover:border-slate-300"
      }`}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: segment.tint, color: segment.color }}
      >
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold text-slate-900 ${T.xs}`}>{segment.label}</span>
        <span className={`block text-slate-500 ${T.xxs}`}>{formatCount(segment.count)}</span>
      </span>
      <Radio checked={selected} />
    </button>
  );
};

const TemplateThumb = ({ thumb }) => {
  const Icon = thumb.icon;
  const text = thumb.dark ? "text-slate-900" : "text-white";
  return (
    <div
      className={`relative h-[74px] w-[126px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${thumb.bg}`}
    >
      <div className={`absolute left-2.5 top-2 max-w-[82px] leading-tight ${text}`}>
        {thumb.kicker && <div className="text-[8px] font-bold uppercase tracking-wide opacity-90">{thumb.kicker}</div>}
        <div className="text-[15px] font-black leading-[1.05]" style={{ color: thumb.accent }}>
          {thumb.headline}
        </div>
        {thumb.sub && <div className="mt-0.5 text-[8px] font-bold uppercase opacity-90">{thumb.sub}</div>}
      </div>
      <span className={`absolute bottom-1.5 left-2.5 rounded-full px-1.5 py-[1px] text-[6px] font-bold ${thumb.dark ? "bg-slate-900 text-white" : "bg-white/90 text-slate-900"}`}>
        BOOK NOW
      </span>
      <Icon
        size={42}
        strokeWidth={1.4}
        className={`absolute -bottom-1 -right-1 ${thumb.dark ? "text-slate-900/25" : "text-white/35"}`}
      />
    </div>
  );
};

const TemplateRow = ({ template, selected, onSelect }) => {
  const info = smsInfo(template.body);
  const category = categoryById[template.category];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full min-w-0 items-start gap-4 rounded-xl border p-3 text-left transition-colors ${
        selected ? "border-[#5B4BF5] bg-[#FAFAFF] ring-1 ring-[#5B4BF5]" : "border-[#E6E8F0] hover:border-slate-300"
      }`}
    >
      <TemplateThumb thumb={template.thumb} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className={`min-w-0 flex-1 truncate font-bold text-slate-900 ${T.xs}`}>{template.title}</div>
          {selected ? (
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-white" style={{ background: VIOLET }}>
              <Check size={12} strokeWidth={3} />
            </span>
          ) : (
            <Radio checked={false} />
          )}
        </div>
        <p className={`mt-1 line-clamp-2 whitespace-pre-line leading-snug text-slate-500 ${T.tiny}`}>{template.body}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className={`rounded px-1.5 py-[2px] text-[10px] font-semibold ${category.chip}`}>{category.label}</span>
          <span className="shrink-0 text-[10px] text-slate-500">
            {info.length} / {info.capacity} chars
          </span>
        </div>
      </div>
    </button>
  );
};

const SummaryRow = ({ label, value, last }) => (
  <div className={`flex items-center justify-between px-3 py-2.5 ${T.xs} ${last ? "" : "border-b border-[#EEF0F5]"}`}>
    <span className="text-slate-600">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

// Closes a popover when clicking anywhere outside `ref`.
const useOutsideClose = (ref, open, onClose) => {
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, open, onClose]);
};

// Title and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title }) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);
  useOutsideClose(helpRef, helpOpen, () => setHelpOpen(false));

  return (
    <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[18px] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h1>
        <p className="hidden truncate text-[12px] text-slate-500 md:block">
          Create and send promotional SMS to your users. Only the recipient list will change.
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <div ref={helpRef} className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900"
          >
            <HelpCircle size={15} />
            How it works?
          </button>
          {helpOpen && (
            <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-[#E6E8F0] bg-white p-4 text-[12px] leading-relaxed text-slate-600 shadow-xl">
              <ol className="list-decimal space-y-1 pl-4">
                <li>Pick the user segment that should receive the SMS.</li>
                <li>Choose a DLT-approved template, or start from a blank one.</li>
                <li>Adjust the content - variables are filled per recipient.</li>
                <li>Send now or schedule it. Only users with a valid mobile number receive it.</li>
              </ol>
            </div>
          )}
        </div>

        <HeaderBell count={12} color="#F0445F" />
      </div>
    </div>
    </PageHeaderPortal>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const MarketingSMSV2 = ({ title = "Send Marketing SMS" }) => {
  const navigate = useNavigate();
  const initialDraft = useMemo(readDraft, []);

  const [segmentId, setSegmentId] = useState(initialDraft?.segmentId || "all");
  const [templateId, setTemplateId] = useState(initialDraft ? initialDraft.templateId : "flat50");
  const [message, setMessage] = useState(initialDraft?.message ?? templates[0].body);
  const [templateSearch, setTemplateSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [scheduleMode, setScheduleMode] = useState(initialDraft?.scheduleMode || "now");
  const [scheduleAt, setScheduleAt] = useState(initialDraft?.scheduleAt || "");
  const [variableOpen, setVariableOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const textareaRef = useRef(null);
  const variableRef = useRef(null);
  const testRef = useRef(null);
  useOutsideClose(variableRef, variableOpen, () => setVariableOpen(false));
  useOutsideClose(testRef, testOpen, () => setTestOpen(false));

  useEffect(() => {
    if (initialDraft) toast.success("Restored your saved draft", { id: "marketing-sms-v2-draft" });
  }, [initialDraft]);

  const segment = segments.find((s) => s.id === segmentId);
  const info = smsInfo(message);
  const previewText = fillSamples(message);
  const cost = segment.count * info.parts * SMS_RATE;

  const categoryCounts = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.id, templates.filter((t) => t.category === c.id).length])),
    []
  );

  const visibleTemplates = useMemo(() => {
    const term = templateSearch.trim().toLowerCase();
    return templates.filter(
      (t) =>
        (category === "all" || t.category === category) &&
        (!term || t.title.toLowerCase().includes(term) || t.body.toLowerCase().includes(term))
    );
  }, [templateSearch, category]);

  const selectTemplate = (template) => {
    setTemplateId(template.id);
    setMessage(template.body);
  };

  const startBlankTemplate = () => {
    setTemplateId(null);
    setMessage("");
    textareaRef.current?.focus();
  };

  // Inserts at the caret so variables land where the admin is typing.
  const insertVariable = (token) => {
    const el = textareaRef.current;
    const start = el ? el.selectionStart : message.length;
    const end = el ? el.selectionEnd : message.length;
    const next = message.slice(0, start) + token + message.slice(end);
    setMessage(next);
    setVariableOpen(false);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleMessageChange = (value) => {
    setMessage(value);
    // Editing detaches from the template so the list no longer claims it's unchanged.
    if (templateId && templates.find((t) => t.id === templateId)?.body !== value) setTemplateId(null);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ segmentId, templateId, message, scheduleMode, scheduleAt })
      );
      toast.success("Draft saved", { id: "marketing-sms-v2-draft" });
    } catch {
      toast.error("Couldn't save the draft in this browser", { id: "marketing-sms-v2-draft" });
    }
  };

  const sendTest = () => {
    const digits = testNumber.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Enter a 10-digit mobile number", { id: "marketing-sms-v2-test" });
      return;
    }
    toast("Test SMS isn't connected to the API yet", { id: "marketing-sms-v2-test", icon: "ℹ️" });
    setTestOpen(false);
  };

  const sendBroadcast = () => {
    if (!message.trim()) {
      toast.error("Write a message first", { id: "marketing-sms-v2-send" });
      return;
    }
    if (scheduleMode === "later" && (!scheduleAt || new Date(scheduleAt) <= new Date())) {
      toast.error("Pick a future date and time", { id: "marketing-sms-v2-send" });
      return;
    }
    toast(
      "Segment broadcasts aren't connected to the API yet. Use Marketing → SMS to send from a sheet.",
      { id: "marketing-sms-v2-send", icon: "ℹ️", duration: 5000 }
    );
  };

  const channelTab = (label, Icon, active, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[34px] w-[104px] items-center justify-center gap-2 rounded-lg font-medium transition-colors ${T.xs} ${
        active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <>
      <PageHeader title={title} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`grid ${MAIN_COLS} items-start gap-5 pb-4`}>
        {/* ================================================================ */}
        {/* Left column - the four composition steps                         */}
        {/* ================================================================ */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Image / Video live on the existing Marketing page. */}
          <div className={`flex w-fit gap-1 p-1 ${CARD} rounded-xl`}>
            {channelTab("Image", ImageIcon, false, () => navigate("/marketing"))}
            {channelTab("Video", Video, false, () => navigate("/marketing"))}
            {channelTab("SMS", MessageSquare, true, () => {})}
          </div>

          {/* 1. Segment ------------------------------------------------- */}
          <Card className="p-4">
            <SectionTitle>1. Select User Segment</SectionTitle>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {segments.map((s) => (
                <SegmentCard key={s.id} segment={s} selected={s.id === segmentId} onSelect={() => setSegmentId(s.id)} />
              ))}
            </div>
            <p className={`mt-3 text-slate-600 ${T.xxs}`}>
              Estimated recipients:{" "}
              <span className="font-semibold" style={{ color: VIOLET }}>
                {formatCount(segment.count)}
              </span>{" "}
              users
            </p>
          </Card>

          {/* 2. Template + 3. Content + 4. Schedule share one card, as in the mockup. */}
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <SectionTitle className="flex-1">2. Choose Message Template</SectionTitle>
                <span className="flex h-9 w-[200px] items-center gap-2 rounded-lg border border-[#E6E8F0] px-3">
                  <Search size={14} className="shrink-0 text-slate-400" />
                  <input
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    className={`w-full min-w-0 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.xxs}`}
                  />
                  {templateSearch && (
                    <button type="button" onClick={() => setTemplateSearch("")} className="text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </span>
                <span className="relative flex h-9 w-[118px] items-center rounded-lg border border-[#E6E8F0]">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`h-full w-full cursor-pointer appearance-none bg-transparent pl-3 pr-7 text-slate-700 focus:outline-none ${T.xxs}`}
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-slate-500" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-[180px_1fr] gap-4">
                <nav className="flex flex-col gap-0.5">
                  {[{ id: "all", label: "All Templates" }, ...CATEGORIES].map((c) => {
                    const active = category === c.id;
                    const count = c.id === "all" ? templates.length : categoryCounts[c.id];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`rounded-lg px-3 py-2.5 text-left transition-colors ${T.xs} ${
                          active ? "bg-[#EEF0FF] font-semibold" : "text-slate-700 hover:bg-slate-50"
                        }`}
                        style={active ? { color: VIOLET } : undefined}
                      >
                        {c.label} ({count})
                      </button>
                    );
                  })}
                </nav>

                <div className="min-w-0">
                  <div className="flex h-[312px] flex-col gap-2 overflow-y-auto pr-1">
                    {visibleTemplates.length === 0 ? (
                      <div className={`grid flex-1 place-items-center text-slate-400 ${T.xs}`}>
                        No templates match your search.
                      </div>
                    ) : (
                      visibleTemplates.map((t) => (
                        <TemplateRow key={t.id} template={t} selected={t.id === templateId} onSelect={() => selectTemplate(t)} />
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={startBlankTemplate}
                    className={`mx-auto mt-2 flex items-center gap-1.5 font-medium ${T.xs}`}
                    style={{ color: VIOLET }}
                  >
                    <Plus size={15} />
                    Create New Template
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Content ---------------------------------------------- */}
            <div className="border-t border-[#EEF0F5] p-4">
              <SectionTitle>3. Message Content</SectionTitle>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                rows={4}
                placeholder="Type your SMS…"
                className={`mt-3 w-full resize-none rounded-xl border border-[#E6E8F0] px-4 py-3 leading-relaxed text-slate-800 focus:border-[#5B4BF5] focus:outline-none ${T.xs}`}
              />

              <div className="mt-3 flex items-center gap-3">
                <div ref={variableRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setVariableOpen((v) => !v)}
                    className={`flex h-9 items-center gap-2 rounded-lg border border-[#E6E8F0] px-3 font-medium text-slate-700 hover:bg-slate-50 ${T.xxs}`}
                  >
                    <Variable size={14} />
                    Insert Variable
                    <ChevronDown size={13} />
                  </button>
                  {variableOpen && (
                    <div className="absolute left-0 top-10 z-20 w-56 rounded-xl border border-[#E6E8F0] bg-white p-1 shadow-xl">
                      {VARIABLES.map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          onClick={() => insertVariable(v.token)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 ${T.xxs}`}
                        >
                          <span className="font-mono font-semibold" style={{ color: VIOLET }}>
                            {v.token}
                          </span>
                          <span className="text-slate-500">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toast("Link shortener isn't connected yet", { id: "marketing-sms-v2-shorten", icon: "ℹ️" })}
                  className={`flex h-9 items-center gap-2 rounded-lg border border-[#E6E8F0] px-3 font-medium text-slate-700 hover:bg-slate-50 ${T.xxs}`}
                >
                  <Link2 size={14} />
                  Shorten Link
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className={`flex h-9 items-center gap-2 rounded-lg border border-[#E6E8F0] px-3 font-medium text-slate-700 hover:bg-slate-50 ${T.xxs}`}
                >
                  <Eye size={14} />
                  Preview
                </button>

                <span className={`ml-auto text-right font-medium ${T.xxs}`} style={{ color: GREEN }}>
                  {info.length} / {info.capacity} chars ({info.parts} SMS)
                  {info.unicode && <span className="block text-[10px] font-normal text-slate-500">Unicode - emoji / ₹ shortens each SMS to 70 chars</span>}
                </span>
              </div>
            </div>

            {/* 4. Schedule --------------------------------------------- */}
            <div className="border-t border-[#EEF0F5] p-4">
              <SectionTitle>4. Schedule</SectionTitle>
              <div className="mt-3 flex items-center gap-6">
                <button type="button" onClick={() => setScheduleMode("now")} className={`flex items-center gap-2 font-medium text-slate-800 ${T.xs}`}>
                  <Radio checked={scheduleMode === "now"} />
                  Send Now
                </button>
                <button type="button" onClick={() => setScheduleMode("later")} className={`flex items-center gap-2 font-medium text-slate-800 ${T.xs}`}>
                  <Radio checked={scheduleMode === "later"} />
                  Schedule for Later
                  <CalendarDays size={15} className="text-slate-500" />
                </button>
                {scheduleMode === "later" && (
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className={`h-9 rounded-lg border border-[#E6E8F0] px-2 text-slate-700 focus:border-[#5B4BF5] focus:outline-none ${T.xxs}`}
                  />
                )}

                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={saveDraft}
                    className={`h-10 w-[134px] rounded-lg border border-slate-300 font-semibold text-slate-800 hover:bg-slate-50 ${T.xs}`}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={sendBroadcast}
                    className={`flex h-10 w-[204px] items-center justify-center gap-2 rounded-lg font-semibold text-white shadow-md transition-opacity hover:opacity-90 ${T.xs}`}
                    style={{ background: VIOLET }}
                  >
                    <Send size={15} />
                    {scheduleMode === "later" ? "Schedule Broadcast" : "Send SMS Broadcast"}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ================================================================ */}
        {/* Right column - live preview + summary                            */}
        {/* ================================================================ */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Message Preview</SectionTitle>
              <div ref={testRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTestOpen((v) => !v)}
                  className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 font-medium ${T.xxs}`}
                  style={{ borderColor: VIOLET, color: VIOLET }}
                >
                  <Send size={13} />
                  Test SMS
                </button>
                {testOpen && (
                  <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-[#E6E8F0] bg-white p-3 shadow-xl">
                    <label className={`font-medium text-slate-700 ${T.xxs}`}>Send a test to</label>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={testNumber}
                        onChange={(e) => setTestNumber(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendTest()}
                        placeholder="10-digit mobile"
                        inputMode="numeric"
                        className={`h-8 min-w-0 flex-1 rounded-lg border border-[#E6E8F0] px-2 focus:border-[#5B4BF5] focus:outline-none ${T.xxs}`}
                      />
                      <button type="button" onClick={sendTest} className={`h-8 rounded-lg px-3 font-semibold text-white ${T.xxs}`} style={{ background: VIOLET }}>
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phone - the frame runs past the bottom edge and is clipped, as in the mockup. */}
            <div className="mt-4 h-[410px] overflow-hidden border-b border-[#EEF0F5]">
              <div className="mx-auto h-[470px] w-[322px] rounded-[46px] border-[5px] border-slate-900 bg-white px-4 pt-3 shadow-[0_0_0_2px_#CBD5E1]">
                <div className="flex items-center justify-between px-4 text-[13px] font-semibold text-slate-900">
                  <span>9:41</span>
                  <span className="h-[26px] w-[92px] rounded-full bg-slate-900" />
                  <span className="flex items-center gap-1">
                    <Signal size={13} strokeWidth={2.5} />
                    <Wifi size={13} strokeWidth={2.5} />
                    <BatteryFull size={16} strokeWidth={2} />
                  </span>
                </div>

                <div className="relative mt-3 flex flex-col items-center">
                  <ChevronLeft size={22} className="absolute left-0 top-2 text-[#2563EB]" />
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#3B82F6] text-[16px] font-bold text-white">G</span>
                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-700">
                    GloUp
                    <BadgeCheck size={12} className="text-white" fill={GREEN} />
                  </span>
                </div>

                <div className="mt-2 border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">Today, 10:30 AM</div>

                <div className="mt-3 max-h-[260px] w-[82%] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-[#F1F2F6] px-3.5 py-3 text-[12.5px] leading-[1.55] text-slate-900">
                  {previewText ? <Linkified text={previewText} /> : <span className="text-slate-400">Your message will appear here</span>}
                </div>
              </div>
            </div>

            <p className={`mt-3 text-center text-slate-600 ${T.xxs}`}>
              Approx. {info.length} characters | {info.parts} SMS
            </p>
            <p className="mt-1 text-center text-[11px]" style={{ color: GREEN }}>
              {message.includes("{") ? "Variables shown with sample values" : "Message may vary slightly on different devices"}
            </p>
          </Card>

          <Card className="p-4">
            <SectionTitle className="!text-[16px]">Broadcast Summary</SectionTitle>
            <div className="mt-3 rounded-lg border border-[#EEF0F5]">
              <SummaryRow label="Selected Segment" value={segment.label} />
              <SummaryRow label="Total Recipients" value={formatCount(segment.count)} />
              <SummaryRow label="Message Type" value={info.unicode ? "SMS (Unicode)" : "SMS"} />
              <SummaryRow label="Estimated SMS" value={info.parts} />
              <SummaryRow label="Schedule" value={scheduleMode === "later" && scheduleAt ? new Date(scheduleAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Send now"} />
              <SummaryRow
                label="Cost (Approx.)"
                value={`₹${cost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                last
              />
            </div>
            <div className={`mt-4 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 ${T.xxs}`}>
              <Info size={15} className="mt-[1px] shrink-0" />
              Only users with valid mobile numbers will receive this SMS.
            </div>
          </Card>
        </div>
      </ScaledCanvas>

      {/* Full-size preview modal - outside the scaled canvas so it isn't shrunk. */}
      {previewOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-slate-900">Message Preview</h3>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-full p-1 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-[#F1F2F6] px-4 py-3 text-[14px] leading-relaxed text-slate-900">
              {previewText ? <Linkified text={previewText} /> : <span className="text-slate-400">Nothing to preview yet</span>}
            </div>
            <div className="mt-3 flex justify-between text-[12px] text-slate-500">
              <span>To: {segment.label} ({formatCount(segment.count)})</span>
              <span>
                {info.length} chars · {info.parts} SMS{info.unicode ? " · Unicode" : ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketingSMSV2;
