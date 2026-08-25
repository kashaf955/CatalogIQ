import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { comparisonApi, manufacturersApi } from "../api/client";
import type { Manufacturer, MatchResult, MatchStatus } from "../api/types";
import { ComparisonRow } from "../components/features/ComparisonRow";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

const MATCH_STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "matched", label: "Matched" },
  { value: "discontinued", label: "Discontinued" },
  { value: "replacement_available", label: "Replacement available" },
  { value: "no_match", label: "No match" },
  { value: "needs_review", label: "Needs review" },
];

export function Comparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<MatchStatus[]>([]);

  const manufacturerId = searchParams.get("manufacturer") ?? "";
  const selectedBrands = (searchParams.get("brand") ?? "").split(",").filter(Boolean);

  useEffect(() => {
    manufacturersApi.list().then(setManufacturers);
  }, []);

  useEffect(() => {
    if (!manufacturerId) {
      setBrandOptions([]);
      return;
    }
    const manufacturer = manufacturers.find((m) => m._id === manufacturerId);
    setBrandOptions(manufacturer?.brands ?? []);
  }, [manufacturerId, manufacturers]);

  function refresh() {
    comparisonApi
      .list({
        manufacturer: manufacturerId || undefined,
        brand: selectedBrands.length > 0 ? selectedBrands.join(",") : undefined,
        matchStatus: selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined,
        search: search || undefined,
      })
      .then(setResults);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manufacturerId, searchParams, selectedStatuses]);

  function updateParams(next: { manufacturer?: string; brand?: string[] }) {
    const params = new URLSearchParams(searchParams);
    if (next.manufacturer !== undefined) {
      if (next.manufacturer) params.set("manufacturer", next.manufacturer);
      else params.delete("manufacturer");
      params.delete("brand");
    }
    if (next.brand !== undefined) {
      if (next.brand.length > 0) params.set("brand", next.brand.join(","));
      else params.delete("brand");
    }
    setSearchParams(params);
  }

  function toggleBrand(brand: string) {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    updateParams({ brand: next });
  }

  function toggleStatus(status: MatchStatus) {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Manufacturer Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Pick a manufacturer and brand(s) to see the relevant products from our catalog side by
          side with the manufacturer's catalog and, where available, the competitor's product.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            className="max-w-xs"
            value={manufacturerId}
            onChange={(e) => updateParams({ manufacturer: e.target.value, brand: [] })}
          >
            <option value="">All manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>

          <Input
            placeholder="Search SKU, MPN or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={refresh}>
            Search
          </Button>
        </div>

        {brandOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brandOptions.map((brand) => (
              <label
                key={brand}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />
                {brand}
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {MATCH_STATUS_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="checkbox"
                checked={selectedStatuses.includes(value)}
                onChange={() => toggleStatus(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {results.map((r) => (
          <ComparisonRow key={r._id} result={r} onUpdated={refresh} />
        ))}
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comparison results yet. Select a manufacturer and run a comparison from its detail
            page, or adjust your filters.
          </p>
        )}
      </div>
    </div>
  );
}
