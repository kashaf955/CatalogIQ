import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
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
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="text-sm"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

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

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {preview.headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-3 py-2">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={handleImport} disabled={busy}>
              {busy ? "Importing..." : "Import"}
            </Button>
          </>
        )}

        {summary && (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
            <p>
              Imported <strong>{summary.imported}</strong>, skipped{" "}
              <strong>{summary.skipped}</strong>.
              {summary.brandsSeen && summary.brandsSeen.length > 0 && (
                <> Brands: {summary.brandsSeen.join(", ")}.</>
              )}
            </p>
            {summary.errors.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-xs text-destructive">
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
