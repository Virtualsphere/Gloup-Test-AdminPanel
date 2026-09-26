import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  IndianRupee,
  Info,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { PageHeaderPortal } from "../layout/PageHeaderSlot";
import ScaledCanvas from "../v2/ScaledCanvas";
import { CARD } from "../v2/tokens";
import { Card, Chip as BaseChip, HeaderBell, SalonLogo } from "../v2/ui";

// ---------------------------------------------------------------------------
// 1:1 reproduction of the approved "Invoices & Payouts" mockup, on a fixed
// DESIGN_WIDTH canvas that ScaledCanvas scales to the available width (see
// there for why bigger px sizes in T read smaller on screen).
//
// UI only for now - every number below is static demo data matching the
// mockup. Wire it to invoiceSlice (getinvoicepartnerstoday / markinvoicepayout)
// once the design is signed off; the live page is
// components/data/InvoicePartners.jsx.
// ---------------------------------------------------------------------------

const DESIGN_WIDTH = 1520;

const BRAND = "#5B21F0";
const GREEN = "#12B76A";
const BLUE = "#2E90FA";
const RED = "#F04438";
const AMBER = "#F5A623";
const VIOLET = "#7C3AED";
const INDIGO = "#4F46E5";

// Measured card widths from the mockup, used directly as grid fr units.
const MAIN_COLS = "grid-cols-[918fr_587fr]";

// Type scale in design px on the 1520px canvas. See the note above before
// changing these.
//
// These sit ~18% above the values first measured off the mockup screenshot.
// That screenshot was 1536px wide (1305px of content) while this canvas is
// 1520px, so the original numbers were ~16% under-scaled relative to the
// design's own proportions - the page rendered smaller than the mockup rather
// than matching it. The column widths were already scaled by that factor, so
// raising type to match is a correction, not a redesign.
//
// `th` is deliberately a step below `xs`: table headers are short, static
// labels, and holding them back is what buys the body rows their width.
const T = {
  tiny: "text-[10px]", // email line, chips, "(Due for 3+ days)"
  xxs: "text-[12px]", // KPI label
  th: "text-[12px]", // table column headers
  xs: "text-[13px]", // table body cells, field labels
  sm: "text-[14px]", // card titles
  base: "text-[15px]", // body, buttons, inputs
  md: "text-[18px]", // KPI currency values
  lg: "text-[22px]", // payout schedule amounts
  kpi: "text-[26px]", // KPI count values
};

const GAP = "gap-3";

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Total Invoices",
    value: "25",
    delta: "19.0%",
    up: true,
    sub: "vs Aug 2026",
    icon: FileText,
    color: INDIGO,
    tint: "#E8E9FD",
  },
  {
    label: "Paid Invoices",
    value: "10",
    delta: "14.3%",
    up: true,
    sub: "vs Aug 2026",
    icon: ClipboardCheck,
    color: GREEN,
    tint: "#E1F7EC",
  },
  {
    label: "Pending Invoices",
    value: "12",
    delta: "22.2%",
    up: true,
    sub: "vs Aug 2026",
    icon: Clock,
    color: AMBER,
    tint: "#FFF2DC",
  },
  {
    label: "Overdue Invoices",
    value: "3",
    delta: "50.0%",
    up: true,
    sub: "vs Aug 2026",
    icon: AlertTriangle,
    color: RED,
    tint: "#FDE7E7",
  },
  {
    label: "Total Amount Paid In",
    value: "₹2,85,420.00",
    money: true,
    delta: "16.8%",
    up: true,
    sub: "vs Aug 2026",
    icon: IndianRupee,
    color: BLUE,
    tint: "#E1F0FF",
  },
  {
    label: "Total Payout (All Time)",
    value: "₹18,19,750.00",
    money: true,
    delta: "14.6%",
    up: true,
    sub: "vs Aug 2026",
    icon: Wallet,
    color: VIOLET,
    tint: "#EDE7FF",
  },
  {
    label: "Pending Payout (All)",
    value: "₹5,62,340.00",
    money: true,
    icon: CheckCircle2,
    color: GREEN,
    tint: "#E1F7EC",
  },
  {
    label: "Overdue Payout",
    value: "₹1,23,450.00",
    money: true,
    danger: true,
    note: "(Due for 3+ days)",
    icon: AlertOctagon,
    color: RED,
    tint: "#FDE7E7",
  },
];

const dailyPartners = [
  {
    name: "Care Me Salon",
    phone: "9092726731",
    email: "arunthakurspc@gmail.com",
    next: "02 Sep 2026",
    when: "(Tomorrow)",
    amount: "₹12,450.00",
    last: "01 Sep 2026",
  },
  {
    name: "Honeylang Men's Salon",
    phone: "8807411414",
    email: "gloup@gmail.com",
    next: "02 Sep 2026",
    when: "(Tomorrow)",
    amount: "₹11,230.00",
    last: "01 Sep 2026",
  },
  {
    name: "KGF Salon",
    phone: "9566256586",
    email: "kgftravelcompany@gmail.com",
    next: "02 Sep 2026",
    when: "(Tomorrow)",
    amount: "₹9,850.00",
    last: "01 Sep 2026",
  },
  {
    name: "Musk & Tusk Perungudi",
    phone: "9597177534",
    email: "gloup@gmail.com",
    next: "02 Sep 2026",
    when: "(Tomorrow)",
    amount: "₹7,680.00",
    last: "01 Sep 2026",
  },
  {
    name: "B Unique Unisex Salon",
    phone: "9344850554",
    email: "buniqueunisexsalon33@gmail.com",
    next: "02 Sep 2026",
    when: "(Tomorrow)",
    amount: "₹23,680.00",
    last: "01 Sep 2026",
  },
];

const weeklyPartners = [
  {
    name: "Adam Affordable Mens Salon",
    phone: "9884073307",
    email: "adamaffordable@gmail.com",
    next: "05 Sep 2026",
    when: "(In 4 days)",
    amount: "₹20,880.00",
    last: "29 Aug 2026",
  },
  {
    name: "5 Star New Look",
    phone: "9840112233",
    email: "5starnewlook@gmail.com",
    next: "05 Sep 2026",
    when: "(In 4 days)",
    amount: "₹80,945.00",
    last: "29 Aug 2026",
  },
  {
    name: "7 Star Family Salon",
    phone: "9791045566",
    email: "7starfamily@gmail.com",
    next: "05 Sep 2026",
    when: "(In 4 days)",
    amount: "₹53,363.00",
    last: "29 Aug 2026",
  },
  {
    name: "Anand Park Family Salon",
    phone: "9566778899",
    email: "anandparkfamily@gmail.com",
    next: "05 Sep 2026",
    when: "(In 4 days)",
    amount: "₹43,540.00",
    last: "29 Aug 2026",
  },
  {
    name: "Anand Park Salon & SPA",
    phone: "9080661234",
    email: "anandparkspa@gmail.com",
    next: "05 Sep 2026",
    when: "(In 4 days)",
    amount: "₹50,881.00",
    last: "29 Aug 2026",
  },
];

const monthlyPartners = [
  {
    name: "Adand Park Unisex Salon & Spa",
    phone: "9840556677",
    email: "adandparkunisex@gmail.com",
    next: "10 Sep 2026",
    when: "(In 9 days)",
    amount: "₹32,946.00",
    last: "10 Aug 2026",
  },
  {
    name: "Adam Affordable Mens Salon",
    phone: "9884073307",
    email: "adamaffordable@gmail.com",
    next: "10 Sep 2026",
    when: "(In 9 days)",
    amount: "₹25,122.00",
    last: "10 Aug 2026",
  },
  {
    name: "6 Face Salon",
    phone: "9791220044",
    email: "6facesalon@gmail.com",
    next: "10 Sep 2026",
    when: "(In 9 days)",
    amount: "₹66,682.00",
    last: "10 Aug 2026",
  },
  {
    name: "Blink Unisex Salon & Academy",
    phone: "9003314455",
    email: "blinkunisex@gmail.com",
    next: "10 Sep 2026",
    when: "(In 9 days)",
    amount: "₹18,760.00",
    last: "10 Aug 2026",
  },
  {
    name: "Mohan Mens Park Salon & SPA",
    phone: "9566009911",
    email: "mohanmenspark@gmail.com",
    next: "10 Sep 2026",
    when: "(In 9 days)",
    amount: "₹24,150.00",
    last: "10 Aug 2026",
  },
];

// `count` is the real partner total; `rows` is only the page the mockup lists,
// which is what lets the rails say "+ N more partners".
const TABS = [
  { key: "daily", label: "Daily", count: 5, rows: dailyPartners },
  { key: "weekly", label: "Weekly", count: 12, rows: weeklyPartners },
  { key: "monthly", label: "Monthly", count: 8, rows: monthlyPartners },
];

const schedule = [
  { key: "daily", label: "Daily Payout", partners: "8 Partners", amount: "₹64,890.00" },
  { key: "weekly", label: "Weekly Payout", partners: "12 Partners", amount: "₹1,87,230.00" },
  { key: "monthly", label: "Monthly Payout", partners: "8 Partners", amount: "₹2,75,640.00" },
];

const overduePartners = [
  {
    name: "Adam Affordable Mens Salon",
    since: "25 Aug 2026",
    amount: "₹18,750.00",
    days: "7 Days",
    last: "18 Aug 2026",
  },
  {
    name: "5 Star New Look",
    since: "26 Aug 2026",
    amount: "₹15,230.00",
    days: "6 Days",
    last: "19 Aug 2026",
  },
  {
    name: "Blink Unisex Salon & Academy",
    since: "27 Aug 2026",
    amount: "₹9,470.00",
    days: "5 Days",
    last: "20 Aug 2026",
  },
];

const payoutSummary = [
  { label: "Total Payout", value: "₹2,75,640.00", icon: CalendarDays, color: BLUE, tint: "#E1F0FF" },
  { label: "Paid", value: "₹1,52,300.00", icon: ClipboardCheck, color: GREEN, tint: "#E1F7EC" },
  { label: "Processing", value: "₹98,450.00", icon: CheckCircle2, color: AMBER, tint: "#FFF2DC" },
  { label: "Pending", value: "₹24,890.00", icon: Wallet, color: VIOLET, tint: "#EDE7FF" },
];

const PAYOUT_TYPES = ["All Payouts", "Daily Payout", "Weekly Payout", "Monthly Payout"];
const STATUSES = ["All Status", "Scheduled", "Processing", "Paid", "Overdue"];

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// Uppercase card heading used by every panel on this page.
const SectionTitle = ({ children, className = "" }) => (
  <h2
    className={`flex min-w-0 items-center gap-1.5 whitespace-nowrap font-bold uppercase tracking-wide text-slate-800 ${T.sm} ${className}`}
  >
    {children}
  </h2>
);

const Delta = ({ value, up }) => (
  <span className={`whitespace-nowrap font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
    {up ? "▲" : "▼"} {value}
  </span>
);

const Chip = (props) => <BaseChip size={`px-1.5 py-[3px] ${T.tiny}`} {...props} />;

const FieldLabel = ({ children }) => (
  <span className={`mb-1 block font-medium text-slate-500 ${T.xs}`}>{children}</span>
);

// Footer call-to-action shared by the list cards.
const ViewAllButton = ({ children }) => (
  <button
    type="button"
    className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#E6E8F0] bg-white px-4 py-1.5 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.xs}`}
  >
    {children}
    <ArrowRight size={12} className="shrink-0" style={{ color: BRAND }} />
  </button>
);

// Title, subtitle and header affordances live in the app bar, not the canvas.
const PageHeader = ({ title }) => (
  <PageHeaderPortal>
    <div className="flex min-w-0 flex-1 items-center gap-4 pl-1 pr-4">
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="hidden truncate text-[11px] leading-tight text-slate-400 md:block">
          Manage salon invoices, payments and partner payouts
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

// Weekly / Monthly right-rail panel - same shape, different dataset.
const PayoutRailCard = ({ title, count, rows, more }) => (
  <Card>
    <div className="flex items-center justify-between gap-2 border-b border-[#EDEFF5] px-3.5 py-2.5">
      <SectionTitle>
        {title} ({count})
        <Info size={11} className="shrink-0 text-slate-300" />
      </SectionTitle>

      <button
        type="button"
        className={`flex shrink-0 items-center gap-1 font-semibold ${T.xs}`}
        style={{ color: BRAND }}
      >
        View All
        <ArrowRight size={11} className="shrink-0" />
      </button>
    </div>

    <table className="w-full table-fixed border-collapse text-left">
      <colgroup>
        <col style={{ width: 21 }} />
        <col style={{ width: 247 }} />
        <col style={{ width: 175 }} />
        <col style={{ width: 123 }} />
        <col style={{ width: 21 }} />
      </colgroup>

      <thead>
        <tr className="border-b border-[#EDEFF5]">
          <th />
          <th className={`whitespace-nowrap py-2 pr-2 font-semibold text-slate-500 ${T.th}`}>
            Partner / Salon
          </th>
          <th className={`whitespace-nowrap py-2 pr-2 font-semibold text-slate-500 ${T.th}`}>
            Next Payout Date
          </th>
          <th
            className={`whitespace-nowrap py-2 pr-2 text-right font-semibold text-slate-500 ${T.th}`}
          >
            Estimated Payout
          </th>
          <th />
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr
            key={row.name}
            className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
          >
            <td />
            <td className={`truncate py-2.5 pr-2 font-semibold text-slate-700 ${T.xs}`}>
              {row.name}
            </td>
            <td className={`whitespace-nowrap py-2.5 pr-2 text-slate-600 ${T.xs}`}>{row.next}</td>
            <td
              className={`whitespace-nowrap py-2.5 pr-2 text-right font-bold text-slate-900 ${T.xs}`}
            >
              {row.amount}
            </td>
            <td />
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
      <span className={`whitespace-nowrap text-slate-400 ${T.xs}`}>+ {more} more partners</span>
      <ViewAllButton>View All</ViewAllButton>
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const InvoicePayoutsV2 = ({ title = "Invoices & Payouts" }) => {
  // The filter bar is presentational for now - nothing here narrows the demo
  // dataset. Only the payout-frequency tabs actually swap what the table shows.
  const [activeTab, setActiveTab] = useState("daily");
  const [search, setSearch] = useState("");
  const [payoutType, setPayoutType] = useState(PAYOUT_TYPES[0]);
  const [status, setStatus] = useState(STATUSES[0]);

  const tab = TABS.find((item) => item.key === activeTab) || TABS[0];

  return (
    <>
      <PageHeader title={title} />

      <ScaledCanvas width={DESIGN_WIDTH} className={`flex flex-col pb-4 ${GAP}`}>
        {/* ---------------------------------------------------------------- */}
        {/* Export / create - the title row lives in the app bar, see          */}
        {/* PageHeader above                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${T.base}`}
          >
            <FileSpreadsheet size={14} className="shrink-0 text-slate-500" />
            Export XLS
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold text-white shadow-sm ${T.base}`}
            style={{ background: BRAND }}
          >
            <Plus size={14} className="shrink-0" />
            Create Invoice
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* KPI row                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid grid-cols-8 ${GAP}`}>
          {kpis.map(({ icon: Icon, ...kpi }) => (
            // p-3 / 28px icon / gap-1.5 rather than p-3.5 / 32 / gap-2: the
            // 10px reclaimed is what keeps "Total Payout (All Time)" on one
            // line at the larger label size. 2px of padding at this scale.
            <Card key={kpi.label} className="p-3">
              <div className="flex items-start gap-1.5">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ background: kpi.tint }}
                >
                  <Icon size={15} style={{ color: kpi.color }} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium text-slate-500 ${T.xxs}`}>{kpi.label}</p>

                  <p
                    className={`mt-0.5 truncate font-extrabold tracking-tight ${
                      kpi.money ? T.md : T.kpi
                    } ${kpi.danger ? "" : "text-slate-900"}`}
                    style={kpi.danger ? { color: RED } : undefined}
                  >
                    {kpi.value}
                  </p>

                  <p className={`mt-1 truncate ${T.tiny}`}>
                    {kpi.delta ? (
                      <>
                        <Delta value={kpi.delta} up={kpi.up} />{" "}
                        <span className="text-slate-400">{kpi.sub}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">{kpi.note || " "}</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className={`flex items-end gap-4 px-4 py-3 ${CARD}`}>
          <label className="w-[215px] shrink-0">
            <FieldLabel>Date Range</FieldLabel>
            <span
              className={`flex items-center justify-between rounded-lg border border-[#E6E8F0] bg-white px-3 py-2 text-slate-700 ${T.base}`}
            >
              01/08/2026 - 31/08/2026
              <CalendarDays size={14} className="shrink-0 text-slate-400" />
            </span>
          </label>

          <label className="w-[328px] shrink-0">
            <FieldLabel>Partner / Salon</FieldLabel>
            <span className="relative block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search salon name, phone or email..."
                className={`w-full rounded-lg border border-[#E6E8F0] bg-white py-2 pl-9 pr-3 text-slate-700 placeholder:text-slate-400 focus:outline-none ${T.base}`}
              />
            </span>
          </label>

          <label className="w-[217px] shrink-0">
            <FieldLabel>Payout Type</FieldLabel>
            <span className="relative block">
              <select
                value={payoutType}
                onChange={(e) => setPayoutType(e.target.value)}
                className={`w-full appearance-none rounded-lg border border-[#E6E8F0] bg-white py-2 pl-3 pr-8 text-slate-700 focus:outline-none ${T.base}`}
              >
                {PAYOUT_TYPES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </span>
          </label>

          <label className="w-[212px] shrink-0">
            <FieldLabel>Status</FieldLabel>
            <span className="relative block">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full appearance-none rounded-lg border border-[#E6E8F0] bg-white py-2 pl-3 pr-8 text-slate-700 focus:outline-none ${T.base}`}
              >
                {STATUSES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </span>
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPayoutType(PAYOUT_TYPES[0]);
                setStatus(STATUSES[0]);
              }}
              className={`w-[92px] rounded-lg border border-[#E6E8F0] bg-white py-2 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.base}`}
            >
              Clear
            </button>

            <button
              type="button"
              className={`flex w-[147px] items-center justify-center gap-1.5 rounded-lg py-2 font-semibold text-white shadow-sm ${T.base}`}
              style={{ background: BRAND }}
            >
              <Filter size={13} className="shrink-0" />
              Apply Filters
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Main grid - payout tables on the left, rails on the right         */}
        {/* ---------------------------------------------------------------- */}
        <div className={`grid ${MAIN_COLS} ${GAP}`}>
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            {/* ------------------------------------------------------------ */}
            {/* Payout schedule overview                                      */}
            {/* ------------------------------------------------------------ */}
            <Card className="p-3.5">
              <SectionTitle className="mb-3">Payout Schedule Overview</SectionTitle>

              <div className="grid grid-cols-3 divide-x divide-[#EDEFF5] rounded-xl border border-[#E6E8F0]">
                {schedule.map((item) => (
                  <div key={item.key} className="flex flex-col items-center px-3 py-4">
                    <p className={`font-bold text-slate-800 ${T.base}`}>{item.label}</p>
                    <p className={`mt-1 text-slate-400 ${T.xs}`}>{item.partners}</p>
                    <p className={`mt-2 font-extrabold tracking-tight text-slate-900 ${T.lg}`}>
                      {item.amount}
                    </p>

                    <button
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={`mt-2.5 flex items-center gap-1 font-semibold text-slate-500 transition-colors hover:text-slate-700 ${T.xs}`}
                    >
                      View Partners
                      <ArrowRight size={11} className="shrink-0" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* ------------------------------------------------------------ */}
            {/* Payout partners - Daily / Weekly / Monthly                    */}
            {/* ------------------------------------------------------------ */}
            <Card>
              {/* items-end + the -mb-px below is what drops the active tab's
                  underline exactly onto the header's bottom border. */}
              <div className="flex items-end gap-10 border-b border-[#EDEFF5] px-3.5 pt-3">
                <SectionTitle className="pb-3">Payout Partners</SectionTitle>

                <div className="flex items-end gap-14">
                  {TABS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveTab(item.key)}
                      className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${T.base} ${
                        activeTab === item.key
                          ? ""
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                      style={
                        activeTab === item.key ? { color: BRAND, borderColor: BRAND } : undefined
                      }
                    >
                      {item.label} ({item.count})
                    </button>
                  ))}
                </div>
              </div>

              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: 254 }} />
                  <col style={{ width: 131 }} />
                  <col style={{ width: 106 }} />
                  <col style={{ width: 106 }} />
                  <col style={{ width: 67 }} />
                  <col style={{ width: 104 }} />
                  <col style={{ width: 94 }} />
                  <col style={{ width: 28 }} />
                </colgroup>

                <thead>
                  <tr className="border-b border-[#EDEFF5]">
                    <th />
                    {[
                      "Partner / Salon",
                      "Contact",
                      "Next Payout Date",
                      "Estimated Payout",
                      "Status",
                      "Last Payout Date",
                      "Actions",
                    ].map((column) => (
                      <th
                        key={column}
                        className={`whitespace-nowrap py-2.5 pr-2 font-semibold text-slate-500 ${T.th}`}
                      >
                        {column}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {tab.rows.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      <td />

                      <td className="py-2.5 pr-2 align-middle">
                        <span className="flex items-center gap-2">
                          <SalonLogo name={row.name} size={32} className={`rounded-md ${T.tiny}`} />
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className={`truncate font-semibold text-slate-800 ${T.xs}`}>
                              {row.name}
                            </span>
                            <Chip className="bg-[#EDE7FF] text-[#5B21F0]">Partner</Chip>
                          </span>
                        </span>
                      </td>

                      <td className="py-2.5 pr-2 align-middle leading-tight">
                        <span className={`flex items-center gap-1 text-slate-600 ${T.tiny}`}>
                          <Phone size={10} className="shrink-0" style={{ color: GREEN }} />
                          <span className="truncate">{row.phone}</span>
                        </span>
                        <span className={`mt-0.5 flex items-center gap-1 text-slate-400 ${T.tiny}`}>
                          <Mail size={10} className="shrink-0" />
                          <span className="truncate">{row.email}</span>
                        </span>
                      </td>

                      <td className="py-2.5 pr-2 align-middle leading-tight">
                        <span className={`block truncate font-semibold text-slate-700 ${T.xs}`}>
                          {row.next}
                        </span>
                        <span className={`block truncate text-slate-400 ${T.tiny}`}>
                          {row.when}
                        </span>
                      </td>

                      <td
                        className={`whitespace-nowrap py-2.5 pr-2 align-middle font-bold text-slate-900 ${T.xs}`}
                      >
                        {row.amount}
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <Chip className="bg-emerald-50 text-emerald-600">Scheduled</Chip>
                      </td>

                      <td
                        className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}
                      >
                        {row.last}
                      </td>

                      <td className="py-2.5 pr-2 align-middle">
                        <span className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className={`whitespace-nowrap rounded-md border border-[#E6E8F0] bg-white px-2 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${T.tiny}`}
                          >
                            View Details
                          </button>
                          <MoreVertical size={12} className="shrink-0 text-slate-300" />
                        </span>
                      </td>

                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-center px-3.5 py-3">
                <ViewAllButton>View All {tab.label} Payout Partners</ViewAllButton>
              </div>
            </Card>

            {/* ------------------------------------------------------------ */}
            {/* Overdue payout partners                                       */}
            {/* ------------------------------------------------------------ */}
            <div className="flex min-w-0 flex-col rounded-2xl border border-[#FBD5D1] bg-white">
              <div className="rounded-t-2xl border-b border-[#FBD5D1] bg-[#FEF4F3] px-3.5 py-2.5">
                <SectionTitle>Overdue Payout Partners</SectionTitle>
              </div>

              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: 234 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 129 }} />
                  <col style={{ width: 133 }} />
                  <col style={{ width: 148 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 28 }} />
                </colgroup>

                <thead>
                  <tr className="border-b border-[#F3F5F9]">
                    <th />
                    {[
                      "Partner / Salon",
                      "Overdue Since",
                      "Overdue Amount",
                      "Days Overdue",
                      "Last Payout Date",
                    ].map((column) => (
                      <th
                        key={column}
                        className={`whitespace-nowrap py-2.5 pr-2 font-semibold text-slate-500 ${T.th}`}
                      >
                        {column}
                      </th>
                    ))}
                    <th
                      className={`whitespace-nowrap py-2.5 pr-2 text-center font-semibold text-slate-500 ${T.th}`}
                    >
                      Action
                    </th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {overduePartners.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-[#F3F5F9] transition-colors last:border-0 hover:bg-rose-50/40"
                    >
                      <td />

                      <td
                        className={`truncate py-2.5 pr-2 align-middle font-semibold text-slate-800 ${T.xs}`}
                      >
                        {row.name}
                      </td>

                      <td
                        className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}
                      >
                        {row.since}
                      </td>

                      <td
                        className={`whitespace-nowrap py-2.5 pr-2 align-middle font-bold ${T.xs}`}
                        style={{ color: RED }}
                      >
                        {row.amount}
                      </td>

                      <td
                        className={`whitespace-nowrap py-2.5 pr-2 align-middle font-semibold ${T.xs}`}
                        style={{ color: RED }}
                      >
                        {row.days}
                      </td>

                      <td
                        className={`whitespace-nowrap py-2.5 pr-2 align-middle text-slate-600 ${T.xs}`}
                      >
                        {row.last}
                      </td>

                      <td className="py-2.5 pr-2 text-center align-middle">
                        <button
                          type="button"
                          className={`w-[76px] rounded-md border border-[#FDA29B] bg-[#FEF3F2] py-1 font-semibold transition-colors hover:bg-[#FEE4E2] ${T.tiny}`}
                          style={{ color: "#D92D20" }}
                        >
                          Pay Now
                        </button>
                      </td>

                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-center px-3.5 py-3">
                <ViewAllButton>View All Overdue Partners</ViewAllButton>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Right rail                                                      */}
          {/* -------------------------------------------------------------- */}
          <div className={`flex min-w-0 flex-col ${GAP}`}>
            <PayoutRailCard
              title="Weekly Payout Partners"
              count={12}
              rows={weeklyPartners}
              more={12 - weeklyPartners.length}
            />

            <PayoutRailCard
              title="Monthly Payout Partners"
              count={8}
              rows={monthlyPartners}
              more={8 - monthlyPartners.length}
            />

            <Card>
              <div className="border-b border-[#EDEFF5] px-3.5 py-2.5">
                <SectionTitle>Payout Summary (This Month)</SectionTitle>
              </div>

              <div className="grid grid-cols-4 gap-2.5 p-3.5">
                {payoutSummary.map(({ icon: Icon, ...tile }) => (
                  <div
                    key={tile.label}
                    className="flex min-w-0 flex-col items-center rounded-xl border border-[#E6E8F0] px-1.5 py-3"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                      style={{ background: tile.tint }}
                    >
                      <Icon size={17} style={{ color: tile.color }} />
                    </span>

                    <p className={`mt-2 truncate text-slate-500 ${T.xs}`}>{tile.label}</p>
                    <p
                      className={`mt-1 whitespace-nowrap font-extrabold tracking-tight text-slate-900 ${T.xs}`}
                    >
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </ScaledCanvas>
    </>
  );
};

export default InvoicePayoutsV2;
