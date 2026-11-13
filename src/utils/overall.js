// "Overall": every record from the day Gloup's data starts up to today. Each
// page that filters by date offers it as one button (OverallButton) beside
// its date controls. Change OVERALL_FROM here to move it on every page.
import { differenceInCalendarDays } from "date-fns";
import { parseYmd, toYmd } from "./dateValue";

// First day counted, inclusive ("YYYY-MM-DD").
export const OVERALL_FROM = "2026-06-11";

// A page's period state while Overall is applied, and the option its period
// select lists for it - only while it is applied, as with "Custom".
export const OVERALL = "overall";
export const OVERALL_LABEL = "Overall";
export const OVERALL_OPTION = { value: OVERALL, label: OVERALL_LABEL };

// { from, to } as inclusive "YYYY-MM-DD" days. `today` defaults to the
// browser's date; pass the page's own "today" where it uses another (IST).
export const overallRange = (today = toYmd(new Date())) => ({ from: OVERALL_FROM, to: today });

export const isOverallRange = (from, to, today = toYmd(new Date())) =>
  from === OVERALL_FROM && to === today;

// Days in the Overall range, for pages that size their periods in days.
export const overallDays = (today = toYmd(new Date())) =>
  differenceInCalendarDays(parseYmd(today), parseYmd(OVERALL_FROM)) + 1;
