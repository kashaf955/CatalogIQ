import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { manufacturersApi, matchingApi } from "../api/client";
import type { Manufacturer } from "../api/types";
import { UploadWizard } from "../components/features/UploadWizard";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function ManufacturerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [brandCounts, setBrandCounts] = useState<{ brand: string; count: number }[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  function refresh() {
    if (!id) return;
    manufacturersApi.list().then((all) => setManufacturer(all.find((m) => m._id === id) ?? null));
    manufacturersApi.brands(id).then(setBrandCounts);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleBrand(brand: string) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  }

  async function runComparison() {
    if (!id || selectedBrands.length === 0) return;
    setRunning(true);
    setRunResult(null);
    try {
      const result = await matchingApi.run(id, selectedBrands);
      setRunResult(
        `Processed ${result.manufacturerProductsProcessed} manufacturer products, wrote ${result.matchResultsWritten} comparison rows.`
      );
      navigate(
        `/comparison?manufacturer=${id}&brand=${encodeURIComponent(selectedBrands.join(","))}`
      );
    } catch (err) {
      setRunResult(err instanceof Error ? err.message : "Matching run failed");
    } finally {
      setRunning(false);
    }
  }

  if (!id) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{manufacturer?.name ?? "Manufacturer"}</h1>
        <p className="text-sm text-muted-foreground">
          Upload this manufacturer's catalog, then compare only the brand(s) you select against
          our catalog — not the entire combined website.
        </p>
      </div>

      <UploadWizard
        showBrandColumn
        onPreview={(file) => manufacturersApi.previewUpload(id, file)}
        onImport={(file, fieldMap, brandColumn) =>
          manufacturersApi.importUpload(id, file, fieldMap, brandColumn)
        }
        onImported={refresh}
      />

      <Card>
        <CardHeader>
          <CardTitle>Select brand(s) to compare</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {brandCounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No brands imported yet. Upload a manufacturer file above first.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {brandCounts.map(({ brand, count }) => (
              <label
                key={brand}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />
                {brand} <span className="text-muted-foreground">({count})</span>
              </label>
            ))}
          </div>
          <Button onClick={runComparison} disabled={running || selectedBrands.length === 0}>
            {running ? "Running comparison..." : "Compare selected brand(s)"}
          </Button>
          {runResult && <p className="text-sm text-muted-foreground">{runResult}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
