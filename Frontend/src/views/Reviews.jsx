import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const fetchQueue = async () => {
  const response = await axios.get("/api/v1/matches", {
    params: { status: "pending" },
    withCredentials: true,
  });
  return Array.isArray(response.data) ? response.data : [];
};

const fetchAiStatus = async () => {
  try {
    const response = await axios.get("/api/v1/matches/ai-check", {
      withCredentials: true,
    });
    return response.data;
  } catch {
    return null;
  }
};

const Reviews = () => {
  const { role } = useSelector((state) => state.auth);
  const canReview = role === "owner" || role === "manager";
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [aiAgainst, setAiAgainst] = useState("competitor");
  const [ai, setAi] = useState(null);

  const showQueue = useCallback((request) => {
    request
      .then(setItems)
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load review queue")
      );
  }, []);

  useEffect(() => {
    showQueue(fetchQueue());
    fetchAiStatus().then(setAi);
  }, [showQueue]);

  const aiRunning = ai?.job?.status === "running";

  // While a check runs, poll its progress and refresh the queue when it ends.
  useEffect(() => {
    if (!aiRunning) return undefined;
    const timer = setInterval(async () => {
      const data = await fetchAiStatus();
      setAi(data);
      if (data?.job?.status !== "running") showQueue(fetchQueue());
    }, 2000);
    return () => clearInterval(timer);
  }, [aiRunning, showQueue]);

  const runAiCheck = async () => {
    setError(null);
    setMessage(null);
    try {
      await axios.post(
        "/api/v1/matches/ai-check",
        { against: aiAgainst },
        { withCredentials: true }
      );
      setAi(await fetchAiStatus());
    } catch (err) {
      setError(err.response?.data?.message || "Could not start AI check");
    }
  };

  const decide = async (id, status) => {
    setError(null);
    try {
      await axios.patch(
        `/api/v1/matches/${id}`,
        { status },
        { withCredentials: true }
      );
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage(`Marked ${status}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update match");
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-ink">Review queue</h1>
          <p className="mt-2 text-mute">
            Accept, reject, or ignore suggested matches before export.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/dashboard/compare"
            className="rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            Open compare
          </Link>
          <Link
            to="/dashboard/export"
            className="rounded-md border border-white/10 px-4 py-2.5 text-center font-medium text-ink hover:border-white/25"
          >
            Go to export
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-brand/20 bg-panel p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">AI check</p>
            <p className="text-sm text-mute">
              Asks AI about matches the rules could not settle. It only
              suggests; you still accept or reject.
            </p>
          </div>
          {canReview ? (
            <div className="flex gap-2">
              <select
                value={aiAgainst}
                onChange={(event) => setAiAgainst(event.target.value)}
                disabled={aiRunning}
                className="rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-ink"
              >
                <option value="competitor">Competitors</option>
                <option value="manufacturer">Manufacturers</option>
              </select>
              <button
                type="button"
                onClick={runAiCheck}
                disabled={aiRunning || ai?.configured === false}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {aiRunning ? "Checking…" : "Run AI check"}
              </button>
            </div>
          ) : null}
        </div>
        {ai?.configured === false ? (
          <p className="mt-3 text-sm text-amber-300">
            AI is not set up yet: add ANTHROPIC_API_KEY to the server .env.
          </p>
        ) : null}
        {ai?.job ? (
          <p className="mt-3 text-sm text-mute">
            {ai.job.status === "running" ? "Running" : "Last run"} (
            {ai.job.against}): {ai.job.done}/{ai.job.planned} checked,{" "}
            {ai.job.matched} matches found, {ai.job.aiCalls} AI calls,{" "}
            {ai.job.cached} reused from cache
            {ai.job.skipped
              ? `, ${ai.job.skipped} left for the next run (limit ${ai.job.limit})`
              : ""}
            {ai.job.errors ? `, ${ai.job.errors} errors` : ""}
            {ai.job.stopReason ? ` — ${ai.job.stopReason}` : ""}
          </p>
        ) : null}
        {ai?.usageLast30Days?.calls ? (
          <p className="mt-1 text-xs text-mute">
            Last 30 days: {ai.usageLast30Days.calls} calls,{" "}
            {ai.usageLast30Days.inputTokens.toLocaleString()} input +{" "}
            {ai.usageLast30Days.cacheReadTokens.toLocaleString()} cached +{" "}
            {ai.usageLast30Days.outputTokens.toLocaleString()} output tokens
          </p>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {message ? (
        <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-brand/20 bg-panel shadow-sm">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mute">
            Queue is empty. Matches waiting for a human decision will land here.
          </p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Our product</th>
                <th className="px-4 py-3 font-medium">Suggested match</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">AI</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-ink">
                    <p>{item.ourName}</p>
                    <p className="text-xs text-mute">{item.ourSku}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <p>{item.theirName}</p>
                    <p className="text-xs text-mute">{item.theirSku}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">{item.score}</td>
                  <td className="px-4 py-3 text-ink">{item.reason}</td>
                  <td className="max-w-xs px-4 py-3">
                    {item.aiVerdict ? (
                      <>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            item.aiVerdict === "match"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {item.aiVerdict === "match" ? "Same part" : "Not same"}
                          {item.aiConfidence != null
                            ? ` · ${Math.round(item.aiConfidence * 100)}%`
                            : ""}
                        </span>
                        {item.aiReason ? (
                          <p className="mt-1 text-xs text-mute">
                            {item.aiReason}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canReview ? (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => decide(item.id, "accepted")}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(item.id, "rejected")}
                          className="text-red-300 hover:text-red-200"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(item.id, "ignored")}
                          className="text-mute hover:text-ink"
                        >
                          Ignore
                        </button>
                      </div>
                    ) : (
                      <span className="text-mute">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reviews;
