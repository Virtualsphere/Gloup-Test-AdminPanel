import moment from "moment";

// "loyal_user" -> "Loyal User"
export const titleCase = (value) =>
  String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// First non-empty value among `keys` (dot paths allowed).
export const pick = (obj, keys) => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

// ₹1,234 (no decimals); "—" for null/undefined.
export const rupees = (n) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// A valid moment, or null.
export const toDate = (value) => {
  if (!value) return null;
  const date = moment(value);
  return date.isValid() ? date : null;
};

// Downloads `rows` (arrays of cells) as a CSV file.
export const downloadCsv = (filename, header, rows) => {
  const escape = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
  const lines = [header, ...rows].map((row) => row.map(escape).join(","));
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
