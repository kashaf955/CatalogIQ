import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { processingRunsApi } from "../api/client";
import type { ProcessingRun } from "../api/types";
import { Badge } from "../components/ui/badge";

const STATUS_VARIANT: Record<ProcessingRun["status"], "secondary" | "warning" | "success" | "destructive"> = {
  queued: "secondary",
  running: "warning",
  completed: "success",
  failed: "destructive",
};

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
        <h1 className="text-2xl font-semibold">Processing Runs</h1>
        <p className="text-sm text-muted-foreground">
          Imports, matching runs and competitor scrapes run as background jobs rather than long
          browser requests (spec section 23). Live updates arrive over Socket.IO when the queue
          worker is running.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Progress</th>
              <th className="px-3 py-2 font-medium">Errors</th>
              <th className="px-3 py-2 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r._id} className="border-t border-border">
                <td className="px-3 py-2">{r.type.replace(/_/g, " ")}</td>
                <td className="px-3 py-2">
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  {r.processedItems} / {r.totalItems || "?"}
                </td>
                <td className="px-3 py-2">{r.errorCount}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No processing runs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
