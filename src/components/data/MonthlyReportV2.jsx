import { useState } from "react";
import {
  ArrowUpDown,
  BadgeIndianRupee,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  IndianRupee,
  ListFilter,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  Star,
  Target,
  XCircle,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD, initials } from "../v2/tokens";
import { Card, Chip as BaseChip, HeaderBell } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Monthly Report" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number below is static demo data matching the mockup.
// Wire it to the monthly report thunks once the design is signed off; the live
// page is components/data/MonthlyReportPartners.jsx.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1460;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const AMBER = "#F5A623";
const VIOLET = "#7C3AED";
const INDIGO = "#4F46E5";
const TEAL = "#0E9F9F";
const GOLD = "#E3B85C";

// Type scale in design px on the 1460px canvas. See the note above before
// changing these.
//
// `th` is deliberately a step below `xs`: the column headers are short, static,
// uppercase labels, and holding them back is what buys fourteen columns of body
// text enough room to sit on one line each.
const T = {
  tiny: "text-[10px]", // partner id, "(126 Orders)", "(15%)", chips
  xxs: "text-[11px]", // email line, KPI delta, summary sub-line
  th: "text-[10px]", // table column headers
  xs: "text-[12px]", // table body cells
  sm: "text-[13px]", // buttons, inputs, field labels, pagination
  base: "text-[14px]", // toolbar values
  md: "text-[15px]", // table booking counts
  lg: "text-[18px]", // summary strip values, KPI currency values
  kpi: "text-[22px]", // KPI count values
};

const GAP = "gap-3";

// Measured column widths from the mockup, in design px, scaled onto this canvas
// and then trimmed against the real Outfit metrics so that every header and
// every numeric cell clears its column with a few px to spare. They add up to
// DESIGN_WIDTH; the first and last are the card's own gutters.
//
// The slack all comes out of "Partner / Salon Details", which is the one column
// whose content truncates gracefully - widening the numeric columns instead
// would push a header like "AVG. ORDER VALUE" over its neighbour.
const COLS = [11, 224, 143, 119, 114, 74, 72, 109, 64, 92, 54, 112, 50, 95, 115, 12];

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Total Bookings",
    value: "954",
    delta: "12.5%",
    up: true,
    sub: "vs July 2026",
    icon: CalendarDays,
    color: BLUE,
    tint: "#E1F0FF",
  },
  {
    label: "Total Partners",
    value: "75",
    delta: "5.6%",
    up: true,
    sub: "vs July 2026",
    icon: Briefcase,
    color: GREEN,
    tint: "#E1F7EC",
  },
  {
    label: "Completed Bookings",
    value: "862",
    delta: "11.3%",
    up: true,
    sub: "vs July 2026",
    icon: CheckCircle2,
    color: AMBER,
    tint: "#FFF2DC",
  },
  {
    label: "Cancelled Bookings",
    value: "92",
    delta: "2.4%",
    up: false,
    sub: "vs July 2026",
    icon: XCircle,
    color: RED,
    tint: "#FDE7E7",
  },
  {
    label: "Avg. Bookings / Partner",
    value: "4.8",
    delta: "8.1%",
    up: true,
    sub: "vs July 2026",
    icon: Clock,
    color: VIOLET,
    tint: "#EDE7FF",
  },
  {
    label: "Total Amount Paid In",
    value: "₹9,85,240",
    money: true,
    delta: "14.6%",
    up: true,
    sub: "vs July 2026",
    icon: IndianRupee,
    color: INDIGO,
    tint: "#E8E9FD",
  },
  {
    label: "Total Payout",
    value: "₹8,19,750",
    money: true,
    delta: "13.2%",
    up: true,
    sub: "vs July 2026",
    icon: BadgeIndianRupee,
    color: TEAL,
    tint: "#DCF5F2",
  },
  {
    label: "CAC (Customer)",
    value: "₹186.45",
    money: true,
    delta: "6.7%",
    up: false,
    sub: "vs July 2026",
    icon: Target,
    color: VIOLET,
    tint: "#EDE7FF",
  },
];

// The strip under the toolbar - the same month rolled up as money rather than as
// counts. The first five carry a parenthetical caption, the last three a
// month-on-month delta.
const summary = [
  { label: "Total Amount Paid In", value: "₹9,85,240.00", note: "(From Customers)" },
  { label: "Total Platform Fee", value: "₹1,45,240.00", note: "(Platform Revenue)" },
  { label: "Total GST", value: "₹20,250.00", note: "(Collected)" },
  { label: "Total Partner Payout", value: "₹8,19,750.00", note: "(To Partners)" },
  { label: "Estimated CAC", value: "₹186.45", note: "(This Month)" },
  { label: "Total New Customers", value: "5,284", delta: "9.3%", up: true, sub: "vs July" },
  { label: "Repeat Customers", value: "3,612", delta: "12.6%", up: true, sub: "vs July" },
  { label: "Returning Rate", value: "40.6%", delta: "2.4%", up: true, sub: "vs July" },
];

const salons = [
  {
    id: "PRT12345",
    name: "Adam Affordable Mens Salon",
    type: "Mens Salon",
    phone: "9840311162",
    email: "gloup@gmail.com",
    area: "Anna Nagar West",
    city: "Chennai, Tamil Nadu",
    bookings: "128",
    completed: "116",
    completedPct: "90.6%",
    cancelled: "12",
    cancelledPct: "9.4%",
    paidIn: "₹1,24,560",
    orders: "126 Orders",
    payout: "₹1,03,200",
    fee: "₹18,720",
    cac: "₹172.35",
    aov: "₹987",
    rating: "4.6",
    ratingCount: "126",
    lastDate: "31 Aug 2026",
    lastTime: "09:40 PM",
  },
  {
    id: "PRT12312",
    name: "5 Star New Look",
    type: "Unisex Salon",
    phone: "9003866903",
    email: "venkat6454@gmail.com",
    area: "T. Nagar",
    city: "Chennai, Tamil Nadu",
    bookings: "98",
    completed: "88",
    completedPct: "89.8%",
    cancelled: "10",
    cancelledPct: "10.2%",
    paidIn: "₹95,230",
    orders: "96 Orders",
    payout: "₹78,400",
    fee: "₹14,285",
    cac: "₹198.76",
    aov: "₹971",
    rating: "4.7",
    ratingCount: "98",
    lastDate: "31 Aug 2026",
    lastTime: "08:15 PM",
  },
  {
    id: "PRT12567",
    name: "6 Face Salon",
    type: "Unisex Salon",
    phone: "9840141312",
    email: "6face12356@gmail.com",
    area: "Velachery",
    city: "Chennai, Tamil Nadu",
    bookings: "76",
    completed: "70",
    completedPct: "92.1%",
    cancelled: "6",
    cancelledPct: "7.9%",
    paidIn: "₹78,450",
    orders: "74 Orders",
    payout: "₹64,100",
    fee: "₹11,768",
    cac: "₹155.42",
    aov: "₹1,060",
    rating: "4.5",
    ratingCount: "76",
    lastDate: "31 Aug 2026",
    lastTime: "07:50 PM",
  },
  {
    id: "PRT12401",
    name: "7 Star Family Salon",
    type: "Family Salon",
    phone: "8825712767",
    email: "7star@gmail.com",
    area: "Porur",
    city: "Chennai, Tamil Nadu",
    bookings: "64",
    completed: "60",
    completedPct: "93.8%",
    cancelled: "4",
    cancelledPct: "6.2%",
    paidIn: "₹62,780",
    orders: "62 Orders",
    payout: "₹51,400",
    fee: "₹9,417",
    cac: "₹164.83",
    aov: "₹981",
    rating: "4.4",
    ratingCount: "63",
    lastDate: "31 Aug 2026",
    lastTime: "07:20 PM",
  },
  {
    id: "PRT12122",
    name: "Aanand Park Family Salon",
    type: "Family Salon",
    phone: "9500185454",
    email: "gloup@gmail.com",
    area: "Alandur",
    city: "Chennai, Tamil Nadu",
    bookings: "53",
    completed: "49",
    completedPct: "92.5%",
    cancelled: "4",
    cancelledPct: "7.5%",
    paidIn: "₹51,220",
    orders: "52 Orders",
    payout: "₹41,950",
    fee: "₹7,680",
    cac: "₹193.26",
    aov: "₹985",
    rating: "4.6",
    ratingCount: "52",
    lastDate: "31 Aug 2026",
    lastTime: "06:45 PM",
  },
  {
    id: "PRT12123",
    name: "Aanand Park Salon & SPA",
    type: "Salon & Spa",
    phone: "9487235384",
    email: "selvamrachanal234@gmail.com",
    area: "Alandur",
    city: "Chennai, Tamil Nadu",
    bookings: "48",
    completed: "45",
    completedPct: "93.8%",
    cancelled: "3",
    cancelledPct: "6.2%",
    paidIn: "₹59,860",
    orders: "47 Orders",
    payout: "₹49,100",
    fee: "₹8,979",
    cac: "₹180.55",
    aov: "₹1,273",
    rating: "4.7",
    ratingCount: "48",
    lastDate: "31 Aug 2026",
    lastTime: "06:10 PM",
  },
  {
    id: "PRT12124",
    name: "Aanand Park Unisex Salon & Spa",
    type: "Unisex Salon",
    phone: "9791183562",
    email: "gloup@gmail.com",
    area: "Alandur",
    city: "Chennai, Tamil Nadu",
    bookings: "36",
    completed: "34",
    completedPct: "94.4%",
    cancelled: "2",
    cancelledPct: "5.6%",
    paidIn: "₹38,760",
    orders: "35 Orders",
    payout: "₹31,750",
    fee: "₹5,815",
    cac: "₹167.31",
    aov: "₹1,108",
    rating: "4.5",
    ratingCount: "36",
    lastDate: "31 Aug 2026",
    lastTime: "05:40 PM",
  },
  {
    id: "PRT12125",
    name: "Adam Affordable Mens Salon",
    type: "Mens Salon",
    phone: "7305568909",
    email: "gloup@gmail.com",
    area: "Kodambakkam",
    city: "Chennai, Tamil Nadu",
    bookings: "28",
    completed: "25",
    completedPct: "89.3%",
    cancelled: "3",
    cancelledPct: "10.7%",
    paidIn: "₹29,540",
    orders: "27 Orders",
    payout: "₹24,150",
    fee: "₹4,418",
    cac: "₹182.11",
    aov: "₹1,094",
    rating: "4.3",
    ratingCount: "28",
    lastDate: "31 Aug 2026",
    lastTime: "05:15 PM",
  },
];

// Column headers, in order. `sortable` draws the affordance the mockup shows on
// the two columns the list can actually be ordered by.
const COLUMNS = [
  { label: "Partner / Salon Details" },
  { label: "Contact" },
  { label: "Location" },
  { label: "Total Bookings", sortable: true },
  { label: "Completed" },
  { label: "Cancelled" },
  { label: "Amount Paid In", sortable: true },
  { label: "Payout" },
  { label: "Platform Fee" },
  { label: "CAC" },
  { label: "Avg. Order Value" },
  { label: "Rating" },
  { label: "Last Booking" },
  { label: "Actions" },
];

const MONTHS = [
  "August 2026",
  "July 2026",
  "June 2026",
  "May 2026",
  "April 2026",
  "March 2026",
];

const SORT_OPTIONS = [
  "Total Bookings (High to Low)",
  "Total Bookings (Low to High)",
  "Amount Paid In (High to Low)",
  "Amount Paid In (Low to High)",
  "Rating (High to Low)",
  "Salon Name (A to Z)",
];

const ROWS_PER_PAGE = ["10", "25", "50", "100"];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const Delta = ({ value, up }) => (
  <span className={`whitespace-nowrap font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
    {up ? "↑" : "↓"} {value}
  </span>
);

const Chip = (props) => <BaseChip size={`px-1.5 py-[2px] ${T.tiny}`} {...props} />;

const FieldLabel = ({ children }) => (
  <span className={`mb-1 block font-medium text-slate-500 ${T.xxs}`}>{children}</span>
);

// The mockup shows each salon's own logo - a gold mark on a dark plate. Initials
// under a star stand in for them until the API returns partner logos.
const SalonLogo = ({ name }) => (
  <span
    className="grid h-9 w-9 shrink-0 place-content-center justify-items-center rounded-lg leading-none"
    style={{ background: "linear-gradient(135deg,#2B2118,#4C3C28)" }}
  >
    <Star size={9} fill={GOLD} strokeWidth={0} />
    <span className="mt-[2px] text-[7px] font-bold tracking-tight" style={{ color: GOLD }}>
      {initials(name.replace(/[^A-Za-z ]/g, ""))}
    </span>
  </span>
);

// Title, subtitle and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title, subtitle }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="hidden truncate text-[11px] leading-tight text-slate-400 md:block">
          {subtitle}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-slate-500 transition-colors hover:text-slate-700"
        >
          <HelpCircle size={14} className="shrink-0 text-slate-400" />
          <span className="hidden lg:inline">How it works?</span>
        </button>

        <HeaderBell count={12} color={RED} className="text-slate-500" />
      </div>
    </div>
  </PageHeaderPortal>
);

// One page button in the footer - the active page is the only filled one.
const PageButton = ({ pageNumber, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`grid h-7 min-w-[28px] place-items-center rounded-lg px-1 font-semibold transition-colors ${T.sm} ${
      active ? "text-white" : "border border-[#E6E8F0] text-slate-500 hover:bg-slate-50"
    }`}
    style={active ? { background: BRAND } : undefined}
  >
    {pageNumber}
  </button>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const MonthlyReportV2 = ({ title = "Monthly Report" }) => {
  // The search box, filters, sort and pagination are presentational for now -
  // nothing here narrows the demo dataset. Only the month select feeds anything,
  // and only the subtitle.
  const [month, setMonth] = useState(MONTHS[0]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");

  return (
    <>
      <PageHeader title={title} subtitle={`Salon wise appointment summary for ${month}`} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Month picker + report download - the title row lives in the app    */}
        {/* bar, see PageHeader above                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-end justify-end gap-3">
          <label className="w-[148px] shrink-0">
            <FieldLabel>Month</FieldLabel>
            <span className="relative block">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={`w-full appearance-none rounded-xl border border-[#E6E8F0] bg-white py-2 pl-3 pr-8 font-medium text-slate-700 focus:outline-none ${T.sm}`}
              >
                {MONTHS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <CalendarDays
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </span>
          </label>

          <button
            type="button"
            className={`flex w-[147px] shrink-0 items-center justify-center gap-2 rounded-xl border bg-white py-2 font-semibold transition-colors hover:bg-[#F8F5FF] ${T.sm}`}
            style={{ borderColor: "#D6C9FB", color: BRAND }}
          >
            <Download size={14} className="shrink-0" />
            Download Report
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-8 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            // p-3 / 32px icon / gap-1.5 rather than p-3.5 / 36 / gap-2: the 10px
            // reclaimed is what keeps "Avg. Bookings / Partner" on one line.
            <Card key={kpi.label} className="p-3">
              <div className="flex items-start gap-1.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ background: kpi.tint }}
                >
                  <Icon size={17} style={{ color: kpi.color }} />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-extrabold leading-none tracking-tight text-slate-900 ${
                      kpi.money ? T.lg : T.kpi
                    }`}
                  >
                    {kpi.value}
                  </p>

                  <p className={`mt-1.5 truncate font-medium text-slate-500 ${T.tiny}`}>
                    {kpi.label}
                  </p>

                  <p className={`mt-1.5 truncate ${T.xxs}`}>
                    <Delta value={kpi.delta} up={kpi.up} />
                  </p>

                  <p className={`mt-0.5 truncate text-slate-400 ${T.tiny}`}>{kpi.sub}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Toolbar - search, filters, sort, export                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-3">
          <span className="relative block w-[440px] shrink-0">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by salon name, phone or email..."
              className={`w-full rounded-xl border border-[#E6E8F0] bg-white py-2 pl-10 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
            />
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              className={`flex w-[110px] items-center justify-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
            >
              <Filter size={13} className="shrink-0" style={{ color: BRAND }} />
              Filters
              <ListFilter size={11} className="shrink-0 text-slate-400" />
            </button>

            <div className="relative flex w-[300px] shrink-0 items-center rounded-xl border border-[#E6E8F0] bg-white pl-3.5 pr-8">
              <span className={`shrink-0 whitespace-nowrap text-slate-400 ${T.base}`}>Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={`min-w-0 flex-1 appearance-none truncate bg-transparent py-2 pl-1.5 font-semibold text-slate-700 focus:outline-none ${T.base}`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              className={`flex w-[126px] items-center justify-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
            >
              <FileSpreadsheet size={14} className="shrink-0" style={{ color: BRAND }} />
              Export XLS
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Money summary strip                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-8 divide-x divide-[#E6E8F0] rounded-2xl border border-[#E6E8F0] bg-[#F8F9FC]">
          {summary.map((item) => (
            <div key={item.label} className="min-w-0 px-4 py-3">
              <p className={`truncate font-medium text-slate-500 ${T.xxs}`}>{item.label}</p>

              <p className={`mt-1 truncate font-extrabold tracking-tight text-slate-900 ${T.lg}`}>
                {item.value}
              </p>

              <p className={`mt-0.5 truncate ${T.tiny}`}>
                {item.delta ? (
                  <>
                    <Delta value={item.delta} up={item.up} />{" "}
                    <span className="text-slate-400">{item.sub}</span>
                  </>
                ) : (
                  <span className="text-slate-400">{item.note}</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Salon table                                                       */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              {COLS.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>

            <thead>
              <tr className="border-b border-[#EDEFF5]">
                <th />
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    className={`whitespace-nowrap py-3 pr-1.5 font-semibold uppercase tracking-wide text-slate-400 ${T.th}`}
                  >
                    <span className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && (
                        <ArrowUpDown size={9} className="shrink-0 text-slate-300" />
                      )}
                    </span>
                  </th>
                ))}
                <th />
              </tr>
            </thead>

            <tbody>
              {salons.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                >
                  <td />

                  {/* Partner / Salon Details */}
                  <td className="py-3 pr-1.5 align-middle">
                    <span className="flex items-center gap-2.5">
                      <SalonLogo name={row.name} />

                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className={`truncate font-bold text-slate-800 ${T.xs}`}>
                            {row.name}
                          </span>
                          <Chip className="bg-[#EDE7FF] text-[#5B21F0]">Partner</Chip>
                        </span>
                        <span className={`mt-0.5 block truncate text-slate-500 ${T.tiny}`}>
                          {row.type}
                        </span>
                        <span className={`mt-0.5 block truncate text-slate-400 ${T.tiny}`}>
                          Partner ID: {row.id}
                        </span>
                      </span>
                    </span>
                  </td>

                  {/* Contact */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`flex items-center gap-1.5 text-slate-600 ${T.xxs}`}>
                      <Phone size={11} className="shrink-0" style={{ color: GREEN }} />
                      <span className="truncate">{row.phone}</span>
                    </span>
                    <span className={`mt-1 flex items-center gap-1.5 text-slate-400 ${T.tiny}`}>
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{row.email}</span>
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`flex items-center gap-1.5 text-slate-600 ${T.xxs}`}>
                      <MapPin size={11} className="shrink-0" style={{ color: RED }} />
                      <span className="truncate">{row.area}</span>
                    </span>
                    <span className={`mt-1 block truncate pl-[17px] text-slate-400 ${T.tiny}`}>
                      {row.city}
                    </span>
                  </td>

                  {/* Total Bookings */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block font-extrabold text-slate-900 ${T.md}`}>
                      {row.bookings}
                    </span>
                    <Chip className="mt-1 bg-[#EAF2FE] text-[#2E90FA]">Bookings</Chip>
                  </td>

                  {/* Completed */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block font-bold text-slate-800 ${T.md}`}>
                      {row.completed}
                    </span>
                    <span className={`mt-1 block font-semibold ${T.tiny}`} style={{ color: GREEN }}>
                      {row.completedPct}
                    </span>
                  </td>

                  {/* Cancelled */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block font-bold text-slate-800 ${T.md}`}>
                      {row.cancelled}
                    </span>
                    <span className={`mt-1 block font-semibold ${T.tiny}`} style={{ color: RED }}>
                      {row.cancelledPct}
                    </span>
                  </td>

                  {/* Amount Paid In */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.xs}`}>
                      {row.paidIn}
                    </span>
                    <span className={`mt-1 block truncate text-slate-400 ${T.tiny}`}>
                      ({row.orders})
                    </span>
                  </td>

                  {/* Payout */}
                  <td
                    className={`whitespace-nowrap py-3 pr-1.5 align-middle font-bold text-slate-900 ${T.xs}`}
                  >
                    {row.payout}
                  </td>

                  {/* Platform Fee */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className={`block whitespace-nowrap font-bold text-slate-900 ${T.xs}`}>
                      {row.fee}
                    </span>
                    <span className={`mt-1 block text-slate-400 ${T.tiny}`}>(15%)</span>
                  </td>

                  {/* CAC */}
                  <td
                    className={`whitespace-nowrap py-3 pr-1.5 align-middle font-semibold text-slate-700 ${T.xs}`}
                  >
                    {row.cac}
                  </td>

                  {/* Avg. Order Value */}
                  <td
                    className={`whitespace-nowrap py-3 pr-1.5 align-middle font-bold text-slate-900 ${T.xs}`}
                  >
                    {row.aov}
                  </td>

                  {/* Rating */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span className="flex items-center gap-1">
                      <Star size={11} className="shrink-0" fill={AMBER} strokeWidth={0} />
                      <span className={`font-bold text-slate-800 ${T.xs}`}>{row.rating}</span>
                    </span>
                    <span className={`mt-1 block text-slate-400 ${T.tiny}`}>
                      ({row.ratingCount})
                    </span>
                  </td>

                  {/* Last Booking */}
                  <td className="py-3 pr-1.5 align-middle leading-tight">
                    <span
                      className={`block whitespace-nowrap font-semibold text-slate-700 ${T.xs}`}
                    >
                      {row.lastDate}
                    </span>
                    <span className={`mt-1 block whitespace-nowrap text-slate-400 ${T.tiny}`}>
                      {row.lastTime}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 pr-1.5 align-middle">
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={`whitespace-nowrap rounded-md border border-[#E6E8F0] bg-white px-2 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.tiny}`}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="shrink-0 text-slate-300 transition-colors hover:text-slate-500"
                        aria-label="More actions"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </span>
                  </td>

                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Pagination                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${CARD}`}>
          <p className={`whitespace-nowrap text-slate-500 ${T.sm}`}>
            Showing 1 to {salons.length} of 75 salons
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {[1, 2, 3, 4].map((pageNumber) => (
              <PageButton
                key={pageNumber}
                pageNumber={pageNumber}
                active={page === pageNumber}
                onClick={() => setPage(pageNumber)}
              />
            ))}

            <span className={`px-0.5 text-slate-400 ${T.sm}`}>...</span>

            {[8, 9, 10].map((pageNumber) => (
              <PageButton
                key={pageNumber}
                pageNumber={pageNumber}
                active={page === pageNumber}
                onClick={() => setPage(pageNumber)}
              />
            ))}

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(10, prev + 1))}
              className="grid h-7 w-7 place-items-center rounded-lg border border-[#E6E8F0] text-slate-400 transition-colors hover:bg-slate-50"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={`whitespace-nowrap text-slate-500 ${T.sm}`}>Rows per page</span>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(e.target.value)}
                className={`appearance-none rounded-lg border border-[#E6E8F0] bg-white py-1.5 pl-3 pr-7 font-medium text-slate-700 focus:outline-none ${T.sm}`}
              >
                {ROWS_PER_PAGE.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default MonthlyReportV2;
