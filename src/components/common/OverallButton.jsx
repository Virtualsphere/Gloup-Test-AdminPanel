// The "Overall" button beside a page's date filter: one click applies
// OVERALL_FROM -> today (utils/overall.js). Like Segmented it is a preset,
// not an on/off switch: `active` fills it while that range is applied, and
// the page's own date controls are how you leave it.
//
// `className` carries the display / breakpoint classes ("hidden lg:flex"),
// like HeaderButton's. `look` is the shape, size and idle colours; the
// default matches the V2 app-bar pills (DateRangeButton, HeaderSelect), so a
// page passes its own only where the button sits in a canvas toolbar or on a
// V1 page. Text only, like the app bar's Compare toggle: the busiest app bars
// (Click & Interaction, Service Intelligence) have no room for an icon too.
import { format } from "date-fns";
import { parseYmd } from "../../utils/dateValue";
import { OVERALL_FROM, OVERALL_LABEL } from "../../utils/overall";
import { PICKER_BLUE } from "./DatePicker";

const SINCE = format(parseYmd(OVERALL_FROM), "d MMM yyyy");

const APP_BAR_LOOK =
  "rounded-lg border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50";

const OverallButton = ({
  active = false,
  onClick,
  color = PICKER_BLUE,
  className = "flex",
  look = APP_BAR_LOOK,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={`All data from ${SINCE} to today`}
    className={`shrink-0 items-center justify-center whitespace-nowrap border transition-colors ${look} ${className}`}
    style={active ? { background: color, borderColor: color, color: "#fff" } : undefined}
  >
    {OVERALL_LABEL}
  </button>
);

export default OverallButton;
