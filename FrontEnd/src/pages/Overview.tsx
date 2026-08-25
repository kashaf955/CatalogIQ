import { useEffect, useState } from "react";
import { overviewApi } from "../api/client";
import type { OverviewStats } from "../api/types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const CARDS: { key: keyof OverviewStats; label: string }[] = [
  { key: "totalProducts", label: "Total products" },
  { key: "totalManufacturerProducts", label: "Manufacturer products" },
  { key: "productsProcessed", label: "Products processed" },
  { key: "matched", label: "Matched products" },
  { key: "needsReview", label: "Needs review" },
  { key: "pendingReview", label: "Pending human review" },
  { key: "discontinued", label: "Discontinued" },
  { key: "replacementAvailable", label: "Replacement available" },
  { key: "noMatch", label: "No-match products" },
];

export function Overview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    overviewApi.get().then(setStats);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Product matching, manufacturer comparison and competitor intelligence at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {CARDS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold">{stats ? stats[key] : "…"}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
