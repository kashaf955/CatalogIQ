import Papa from "papaparse";
import ExcelJS from "exceljs";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export async function parseUploadedFile(
  buffer: Buffer,
  originalName: string
): Promise<ParsedFile> {
  const lower = originalName.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsv(buffer);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcel(buffer);
  }
  throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
}

function parseCsv(buffer: Buffer): ParsedFile {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0) {
      throw new Error(`CSV parse error: ${fatal[0].message}`);
    }
  }
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

async function parseExcel(buffer: Buffer): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in uploaded Excel file.");
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      const cell = row.getCell(idx + 1);
      record[header] = cellToString(cell.value);
    });
    rows.push(record);
  });

  return { headers: headers.filter(Boolean), rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text: unknown }).text === "string") {
      return (value as { text: string }).text;
    }
    if ("result" in value) {
      return String((value as { result: unknown }).result ?? "");
    }
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }
  return String(value);
}
