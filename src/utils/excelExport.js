// Excel (.xlsx) downloads for the V2 report pages. `write-excel-file` is
// imported on demand, so it is only fetched when someone actually exports.
//
// A column is { header, kind, width, get(row) } where kind is one of
// text | int | decimal | money | percent | date. The same column list can feed
// downloadCsv (utils/format.js) so a page's CSV and Excel files always match.

// "YYYY-MM-DD" (or a full ISO timestamp) -> a Date at UTC midnight of that
// calendar day, so Excel shows the same day regardless of time zone.
export const excelDate = (day) => {
  if (!day) return null;
  const [y, m, d] = String(day).slice(0, 10).split("-").map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
};

const FORMATS = {
  int: "0",
  decimal: "0.00",
  money: '"₹"#,##0.00',
  percent: '0.0"%"', // values are already percentages, e.g. 90.6
  date: "dd mmm yyyy",
};

export const excelCell = (column, row) => {
  const value = column.get(row);
  if (value === null || value === undefined || value === "") return null;
  switch (column.kind) {
    case "int":
    case "decimal":
    case "money":
    case "percent":
      return { type: Number, value: Number(value), format: FORMATS[column.kind] };
    case "date": {
      const date = excelDate(value);
      return date ? { type: Date, value: date, format: FORMATS.date } : null;
    }
    default:
      return { type: String, value: String(value) };
  }
};

const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#EEF0F6" };

// sheets: [{ name, rows, columns }] (objects + column list, header row frozen)
//      or [{ name, data, widths }]  (ready-made rows of cells)
export const downloadXlsx = async (fileName, sheets) => {
  const { default: writeXlsxFile, getSheetData } = await import("write-excel-file/browser");
  const built = sheets.map((sheet) =>
    sheet.rows
      ? {
          sheet: sheet.name,
          data: getSheetData(
            sheet.rows,
            sheet.columns.map((column) => ({
              header: { value: column.header, ...HEADER_STYLE },
              cell: (row) => excelCell(column, row),
            }))
          ),
          columns: sheet.columns.map((column) => ({ width: column.width })),
          stickyRowsCount: 1,
        }
      : {
          sheet: sheet.name,
          data: sheet.data,
          columns: (sheet.widths || []).map((width) => ({ width })),
        }
  );
  await writeXlsxFile(built).toFile(fileName);
};

export const headerCell = (value) => ({ value, ...HEADER_STYLE });
