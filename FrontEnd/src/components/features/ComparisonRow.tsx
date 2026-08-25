import { useState } from "react";
import type { ReactNode } from "react";
import { reviewQueueApi } from "../../api/client";
import type { MatchResult } from "../../api/types";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { MatchStatusBadge, ReviewStatusBadge } from "./StatusBadge";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex-1 rounded-md border border-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  );
}

export function ComparisonRow({ result, onUpdated }: { result: MatchResult; onUpdated: () => void }) {
  const [note, setNote] = useState(result.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function decide(action: "approve" | "reject" | "variant" | "needs-info") {
    setBusy(true);
    try {
      await reviewQueueApi.decide(result._id, action, note || undefined);
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  const { ourProduct: our, manufacturerProduct: mfg, competitorProduct: comp } = result;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <MatchStatusBadge status={result.matchStatus} />
          <ReviewStatusBadge status={result.reviewStatus} />
          {result.matchedSignal && (
            <span className="text-xs text-muted-foreground">signal: {result.matchedSignal}</span>
          )}
          <span className="text-xs text-muted-foreground">
            confidence: {(result.confidence * 100).toFixed(0)}%
          </span>
          {result.decisionSource === "ai" && (
            <span className="text-xs text-muted-foreground">via Claude</span>
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Column title="Our Product">
            {our ? (
              <>
                <Field label="SKU" value={our.sku} />
                <Field label="MPN" value={our.mpn} />
                <p className="font-medium">{our.name}</p>
                <Field label="Brand" value={our.brand} />
                <Field label="Price" value={our.price != null ? `$${our.price.toFixed(2)}` : undefined} />
                <Field label="Category" value={our.category} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not in our catalog</p>
            )}
          </Column>

          <Column title="Manufacturer">
            {mfg ? (
              <>
                <Field label="MPN" value={mfg.mpn} />
                <p className="font-medium">{mfg.name}</p>
                <Field label="Brand" value={mfg.brand} />
                <Field label="Status" value={mfg.status} />
                <Field label="Replacement MPN" value={mfg.replacementMpn} />
                <Field label="Price" value={mfg.price != null ? `$${mfg.price.toFixed(2)}` : undefined} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not found in manufacturer file</p>
            )}
          </Column>

          <Column title="Competitor">
            {comp ? (
              <>
                <p className="font-medium">{comp.name}</p>
                <Field label="Price" value={comp.price != null ? `$${comp.price.toFixed(2)}` : undefined} />
                <Field label="Availability" value={comp.availability} />
                <a href={comp.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  View listing
                </a>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not discovered yet</p>
            )}
          </Column>
        </div>

        {result.aiReasoning && (
          <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            {result.aiReasoning}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Add a note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" disabled={busy} onClick={() => decide("approve")}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide("reject")}>
            Reject
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("variant")}>
            Mark variant
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("needs-info")}>
            Needs more info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
