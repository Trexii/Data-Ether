/**
 * Excel export utility using ExcelJS directly in the browser.
 * Generates a two-sheet .xlsx workbook (Data and Info) directly from React state.
 */

export interface ExcelExportData {
  query: string;
  note?: string;
  columns: string[];
  rows: Record<string, string | number>[];
  model?: string;
  createdAt?: string;
}

export async function exportToExcel(data: ExcelExportData): Promise<void> {
  // Dynamically import exceljs so it is only loaded in the browser when needed
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AI Data Fetch Tool";
  workbook.created = new Date();

  // ----------------------------------------------------
  // Sheet 1: Data
  // ----------------------------------------------------
  const dataSheet = workbook.addWorksheet("Data", {
    views: [{ state: "frozen", ySplit: 1 }], // Freeze top header row
  });

  // Setup columns
  dataSheet.columns = data.columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(col.length + 4, 15),
  }));

  // Style header row
  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" }, // Blue-600 accent
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 24;

  // Add data rows, preserving numbers as numbers
  data.rows.forEach((row) => {
    const rowValues: Record<string, string | number> = {};
    data.columns.forEach((col) => {
      const val = row[col];
      if (val === undefined || val === null || val === "") {
        rowValues[col] = "N/A";
      } else {
        const num = Number(val);
        rowValues[col] = !isNaN(num) && typeof val !== "boolean" && String(val).trim() !== "" ? num : val;
      }
    });
    dataSheet.addRow(rowValues);
  });

  // Enable AutoFilter on header range
  dataSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: data.columns.length },
  };

  // Adjust column widths automatically based on cell content
  dataSheet.columns.forEach((column) => {
    let maxLength = column.header ? column.header.length : 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : "";
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    column.width = Math.min(Math.max(maxLength + 3, 12), 40);
  });

  // ----------------------------------------------------
  // Sheet 2: Info (Metadata)
  // ----------------------------------------------------
  const infoSheet = workbook.addWorksheet("Info");
  infoSheet.columns = [
    { header: "Property", key: "property", width: 20 },
    { header: "Value", key: "value", width: 50 },
  ];

  const infoHeaderRow = infoSheet.getRow(1);
  infoHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  infoHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF475569" }, // Slate-600
  };

  infoSheet.addRow({ property: "Query", value: data.query });
  infoSheet.addRow({ property: "Total Rows", value: data.rows.length });
  infoSheet.addRow({ property: "Note / Interpretation", value: data.note || "N/A" });
  infoSheet.addRow({ property: "Model", value: data.model || "Gemini" });
  infoSheet.addRow({
    property: "Generated / Saved Date",
    value: data.createdAt || new Date().toISOString(),
  });
  infoSheet.addRow({ property: "Disclaimer", value: "AI-generated data. Verify before use." });

  // ----------------------------------------------------
  // Trigger Browser Download
  // ----------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Slugify query and append current date (e.g. fortune-500-top-20-2026-10-08.xlsx)
  const slug = data.query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${slug || "dataset"}-${dateStr}.xlsx`;

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
