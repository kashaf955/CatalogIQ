import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { apiMessage } from "../utils/apiError";
import type { AiDescriptionStatus } from "../types/api";

const fetchStatus = async (catalogId: string): Promise<AiDescriptionStatus | null> => {
  try {
    const response = await axios.get<AiDescriptionStatus>(
      `/api/v1/catalogs/${catalogId}/ai-descriptions`,
      { withCredentials: true }
    );
    return response.data;
  } catch {
    return null;
  }
};

interface AiDescriptionsPanelProps {
  catalogId: string;
  canManage: boolean;
}

// AI-written, store-ready descriptions for the company catalog. They are
// added to exports as an "Enhanced description" column.
const AiDescriptionsPanel = ({ catalogId, canManage }: AiDescriptionsPanelProps) => {
  const [status, setStatus] = useState<AiDescriptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchStatus(catalogId).then(setStatus);
  }, [catalogId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const running = status?.job?.status === "running";

  // Poll while a run is in progress.
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [running, refresh]);

  const start = async () => {
    setError(null);
    try {
      await axios.post(
        `/api/v1/catalogs/${catalogId}/ai-descriptions`,
        {},
        { withCredentials: true }
      );
      refresh();
    } catch (err) {
      setError(apiMessage(err, "Could not start writing descriptions"));
    }
  };

  if (!status) return null;
  const job = status.job;

  return (
    <div className="mb-4 rounded-lg border border-brand/20 bg-canvas p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">AI descriptions</p>
          <p className="mt-1 text-xs text-mute">
            {status.ready} of {status.total} products ready. Added to the
            export as an &ldquo;Enhanced description&rdquo; column.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={start}
            disabled={running || !status.configured}
            className="shrink-0 rounded-md bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {running ? "Writing…" : "Write descriptions"}
          </button>
        ) : null}
      </div>

      {!status.configured ? (
        <p className="mt-2 text-xs text-amber-300">
          AI is not set up yet: add ANTHROPIC_API_KEY to the server .env.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      {job ? (
        <p className="mt-2 text-xs text-mute">
          {job.status === "running" ? "Running" : "Last run"}: {job.written} written,{" "}
          {job.upToDate} already up to date, {job.notEnoughInfo} skipped (not
          enough product info)
          {job.skipped
            ? `, ${job.skipped} left for the next run (limit ${job.limit} per run)`
            : ""}
          {job.errors ? `, ${job.errors} errors` : ""}
          {job.stopReason ? ` — ${job.stopReason}` : ""}
        </p>
      ) : null}
    </div>
  );
};

export default AiDescriptionsPanel;
