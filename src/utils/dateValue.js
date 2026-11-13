// String <-> local Date helpers for the shared DatePicker's values
// ("YYYY-MM-DD", or "YYYY-MM-DDTHH:mm" whose day part is what's read).

const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" (or the day part of a date-time) -> local Date, or null.
export const parseYmd = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

// Local Date -> "YYYY-MM-DD" (no UTC shift, unlike toISOString()).
export const toYmd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
