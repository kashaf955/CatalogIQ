import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { reviewQueueApi } from "../api/client";
import type { MatchResult } from "../api/types";
import { ComparisonRow } from "../components/features/ComparisonRow";
import { Card, CardContent } from "../components/ui/card";

export function ReviewQueue() {
  const [items, setItems] = useState<MatchResult[]>([]);

  function refresh() {
    reviewQueueApi.list().then(setItems);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          Ambiguous matches the deterministic engine and Claude verification couldn't confidently
          resolve on their own — approve, reject, mark as a variant, or ask for more information.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((r) => (
          <ComparisonRow key={r._id} result={r} onUpdated={refresh} />
        ))}
        {items.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nothing needs human review right now.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
