import { useId, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { TableShell, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "../ui/table";
import type { ImportSummary, UploadPreview } from "../../api/types";

const STANDARD_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "sku", label: "SKU" },
  { key: "mpn", label: "MPN / Part Number", required: true },
  { key: "name", label: "Product Name", required: true },
  { key: "brand", label: "Brand" },
  { key: "description", label: "Description" },
  { key: "gtin", label: "GTIN / UPC / EAN" },
  { key: "price", label: "Price" },
  { key: "category", label: "Category" },
  { key: "images", label: "Images (pipe/comma separated)" },
  { key: "weight", label: "Weight" },
  { key: "dimensions", label: "Dimensions" },
  { key: "material", label: "Material" },
  { key: "finish", label: "Finish" },
  { key: "fitment", label: "Fitment" },
  { key: "availability", label: "Availability" },
];

interface UploadWizardProps {
  requireSku?: boolean;
  showBrandColumn?: boolean;
  onPreview: (file: File) => Promise<UploadPreview>;
  onImport: (file: File, fieldMap: Record<string, string>, brandColumn?: string) => Promise<ImportSummary>;
  onImported?: (summary: ImportSummary) => void;
}

export function UploadWizard({
  requireSku,
  showBrandColumn,
  onPreview,
  onImport,
  onImported,
}: UploadWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [brandColumn, setBrandColumn] = useState<string>("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const fields = requireSku
    ? [{ key: "sku", label: "SKU", required: true }, ...STANDARD_FIELDS.filter((f) => f.key !== "sku")]
    : STANDARD_FIELDS;

  async function handleFileChange(selected: File | null) {
    setFile(selected);
    setSummary(null);
    setError(null);
    setPreview(null);
    if (!selected) return;
    setBusy(true);
    try {
      const result = await onPreview(selected);
      setPreview(result);
      setFieldMap(result.suggestedMapping);
      setBrandColumn(result.suggestedBrandColumn ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onImport(file, fieldMap, showBrandColumn ? brandColumn : undefined);
      setSummary(result);
      onImported?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV or Excel file</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/40"
        >
          {file ? (
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          ) : (
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">{file ? file.name : "Click to choose a file"}</p>
          <p className="text-xs text-muted-foreground">CSV or Excel (.csv, .xlsx, .xls)</p>
          <input
            id={inputId}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {preview && (
          <>
            <p className="text-sm text-muted-foreground">
              Detected {preview.headers.length} columns, {preview.totalRows} rows. Map each field
              to a column below.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map(({ key, label, required }) => (
                <div key={key} className="flex flex-col gap-1">
                  <Label>
                    {label}
                    {required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    value={fieldMap[key] ?? ""}
                    onChange={(e) =>
                      setFieldMap((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  >
                    <option value="">-- not mapped --</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}

              {showBrandColumn && (
                <div className="flex flex-col gap-1">
                  <Label>Brand column (raw, for manufacturer brand grouping)</Label>
                  <Select value={brandColumn} onChange={(e) => setBrandColumn(e.target.value)}>
                    <option value="">-- use mapped Brand field --</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <TableShell className="text-xs">
              <TableHead>
                <tr>
                  {preview.headers.map((h) => (
                    <TableHeadCell key={h} className="whitespace-nowrap">
                      {h}
                    </TableHeadCell>
                  ))}
                </tr>
              </TableHead>
              <TableBody>
                {preview.sampleRows.map((row, i) => (
                  <TableRow key={i}>
                    {preview.headers.map((h) => (
                      <TableCell key={h} className="whitespace-nowrap py-2">
                        {row[h]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </TableShell>

            <Button onClick={handleImport} disabled={busy} size="lg" className="w-fit">
              {busy ? "Importing..." : "Import"}
            </Button>
          </>
        )}

        {summary && (
          <div className="flex flex-col gap-2 rounded-lg border border-success/30 bg-success-bg p-3.5 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Imported {summary.imported}, skipped {summary.skipped}
              {summary.brandsSeen && summary.brandsSeen.length > 0 && (
                <span className="font-normal text-success/80"> — brands: {summary.brandsSeen.join(", ")}</span>
              )}
            </p>
            {summary.errors.length > 0 && (
              <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs text-destructive">
                {summary.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
