import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const fieldClass =
  "rounded-md border border-white/10 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand";

const money = (value) =>
  typeof value === "number" ? value.toFixed(2) : "—";

const Matches = () => {
  const { role } = useSelector((state) => state.auth);
  const canManage =
    role === "owner" || role === "admin" || role === "manager";
  const [catalogs, setCatalogs] = useState([]);
  const [against, setAgainst] = useState("manufacturer");
  const [status, setStatus] = useState("all");
  const [matches, setMatches] = useState([]);
  const [running, setRunning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [autoScore, setAutoScore] = useState("");
  const [savingAuto, setSavingAuto] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [catalogResponse, settingsResponse] = await Promise.all([
          axios.get("/api/v1/catalogs", { withCredentials: true }),
          axios.get("/api/v1/tenants/me/settings", { withCredentials: true }),
        ]);
        setCatalogs(
          Array.isArray(catalogResponse.data) ? catalogResponse.data : []
        );
        const score = settingsResponse.data?.autoAcceptScore;
        setAutoScore(typeof score === "number" ? String(score) : "");
      } catch (err) {
        setError(err.response?.data?.message || "Could not load catalogs");
      }
    };

    load();
  }, []);

  const saveAutoScore = async (event) => {
    event.preventDefault();
    setSavingAuto(true);
    setError(null);
    setMessage(null);
    try {
      const response = await axios.patch(
        "/api/v1/tenants/me/settings",
        { autoAcceptScore: autoScore === "" ? null : Number(autoScore) },
        { withCredentials: true }
      );
      const score = response.data?.autoAcceptScore;
      setMessage(
        typeof score === "number"
          ? `Matches scoring ${score}% or higher will be accepted automatically on the next run.`
          : "Auto-accept is off. Every match goes to the review queue."
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not save auto-accept score");
    } finally {
      setSavingAuto(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const params = { against };
        if (status !== "all") params.status = status;
        const response = await axios.get("/api/v1/matches", {
          params,
          withCredentials: true,
        });
        setMatches(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load matches");
      }
    };

    load();
  }, [against, status, reloadKey]);

  const runMatching = async () => {
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const response = await axios.post(
        "/api/v1/matches/run",
        { against },
        { withCredentials: true }
      );
      const { matched, ourProducts, matches: total, autoAccepted } =
        response.data;
      setMessage(
        `Matched ${matched} of ${ourProducts} products (${total} candidate matches, ${autoAccepted || 0} auto-accepted).`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Matching failed");
    } finally {
      setRunning(false);
    }
  };

  const ours = catalogs.filter((item) => item.type === "our_catalog");
  const other = catalogs.filter((item) => item.type === against);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-ink">Matches</h1>
          <p className="mt-2 text-mute">
            Compare your catalog to manufacturer or competitor products.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {canManage ? (
            <button
              type="button"
              onClick={runMatching}
              disabled={running}
              className="rounded-md border border-brand/40 px-4 py-2.5 font-medium text-brand hover:bg-brand-hover/10 disabled:opacity-50"
            >
              {running ? "Matching..." : "Run matching"}
            </button>
          ) : null}
          <Link
            to="/dashboard/reviews"
            className="rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            Open review queue
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          className={fieldClass}
          value={against}
          onChange={(event) => setAgainst(event.target.value)}
        >
          <option value="manufacturer">Vs manufacturer Excel</option>
          <option value="competitor">Vs competitor catalog</option>
        </select>
        <select
          className={fieldClass}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="ignored">Ignored</option>
        </select>
        {canManage ? (
        <form
          onSubmit={saveAutoScore}
          className="flex items-center gap-2 sm:ml-auto"
        >
          <label htmlFor="auto-score" className="text-sm text-mute">
            Auto-accept at =
          </label>
          <input
            id="auto-score"
            type="number"
            min="0"
            max="100"
            placeholder="Off"
            className={`${fieldClass} w-20`}
            value={autoScore}
            onChange={(event) => setAutoScore(event.target.value)}
          />
          <span className="text-sm text-mute">%</span>
          <button
            type="submit"
            disabled={savingAuto}
            className="rounded-md border border-brand/40 px-3 py-2 text-sm text-brand hover:bg-brand-hover/10 disabled:opacity-50"
          >
            {savingAuto ? "Saving..." : "Save"}
          </button>
        </form>
        ) : null}
      </div>
      {canManage ? (
        <p className="mb-4 text-xs text-mute">
          Scores: GTIN 100 · MPN 95 · SKU 90 · part number 80. A product with
          more than one candidate always goes to review. Leave empty to turn
          auto-accept off.
        </p>
      ) : null}

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {message ? (
        <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}

      <p className="mb-4 text-sm text-mute">
        {ours.length} of your catalogs · {other.length} {against} sources
      </p>

      <div className="overflow-x-auto rounded-2xl border border-brand/20 bg-panel shadow-sm">
        {matches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mute">
            No matches yet. Ingest your catalog and a {against} source, then
            click Run matching.
          </p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Our SKU</th>
                <th className="px-4 py-3 font-medium">Our name</th>
                <th className="px-4 py-3 font-medium">Our price</th>
                <th className="px-4 py-3 font-medium">Candidate SKU</th>
                <th className="px-4 py-3 font-medium">Candidate name</th>
                <th className="px-4 py-3 font-medium">Their price</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr
                  key={match.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-ink">{match.ourSku}</td>
                  <td className="px-4 py-3 text-ink">{match.ourName}</td>
                  <td className="px-4 py-3 text-ink">
                    {money(match.ourPrice)}
                  </td>
                  <td className="px-4 py-3 text-ink">{match.theirSku}</td>
                  <td className="px-4 py-3 text-ink">
                    {match.theirUrl ? (
                      <a
                        href={match.theirUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-brand"
                      >
                        {match.theirName}
                      </a>
                    ) : (
                      match.theirName
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {money(match.theirPrice)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {match.score}
                    <span className="ml-1 text-xs text-mute">
                      {match.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-ink">
                    {match.status}
                    {match.autoAccepted ? (
                      <span className="ml-1 text-xs normal-case text-mute">
                        (auto)
                      </span>
                    ) : null}
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

export default Matches;
