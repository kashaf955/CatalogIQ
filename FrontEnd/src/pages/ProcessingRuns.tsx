import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { processingRunsApi } from "../api/client";
import type { ProcessingRun } from "../api/types";
import { Badge } from "../components/ui/badge";
import {
  TableShell,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "../components/ui/table";

const STATUS_VARIANT: Record<ProcessingRun["status"], "secondary" | "warning" | "success" | "destructive"> = {
  queued: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
};

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">
        {value} / {total || "?"}
      </span>
    </div>
  );
}

export function ProcessingRuns() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);

  function refresh() {
    processingRunsApi.list().then(setRuns);
  }

  useEffect(() => {
    refresh();
    const socket = io({ path: "/socket.io" });
    socket.on("processing-run:update", () => refresh());
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Processing Runs</h1>
        <p className="text-sm text-muted-foreground">
          Imports, matching runs and competitor scrapes run as background jobs rather than long
          browser requests. Live updates arrive over Socket.IO when the queue worker is running.
        </p>
      </div>

      <TableShell>
        <TableHead>
          <tr>
            <TableHeadCell>Type</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Progress</TableHeadCell>
            <TableHeadCell>Errors</TableHeadCell>
            <TableHeadCell>Started</TableHeadCell>
          </tr>
        </TableHead>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r._id}>
              <TableCell className="font-medium capitalize">{r.type.replace(/_/g, " ")}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </TableCell>
              <TableCell>
                <ProgressBar value={r.processedItems} total={r.totalItems} />
              </TableCell>
              <TableCell className={r.errorCount > 0 ? "text-destructive" : "text-muted-foreground"}>
                {r.errorCount}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          {runs.length === 0 && <TableEmpty colSpan={5}>No processing runs yet.</TableEmpty>}
        </TableBody>
      </TableShell>
    </div>
  );
}
