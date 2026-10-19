import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const fieldClass =
  "rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2 text-sm text-white outline-none focus:border-indigo-400";

const Matches = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [against, setAgainst] = useState("manufacturer");
  const [status, setStatus] = useState("all");
  const [matches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get("/api/v1/catalogs", {
          withCredentials: true,
        });
        setCatalogs(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load catalogs");
      }
    };

    load();
  }, []);

  const ours = catalogs.filter((item) => item.type === "our_catalog");
  const other = catalogs.filter((item) => item.type === against);

  const rows = useMemo(() => {
    if (status === "all") return matches;
    return matches.filter((item) => item.status === status);
  }, [matches, status]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-white">Matches</h1>
          <p className="mt-2 text-gray-400">
            Compare your catalog to manufacturer or competitor products.
          </p>
        </div>
        <Link
          to="/dashboard/reviews"
          className="rounded-md bg-indigo-500 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-400"
        >
          Open review queue
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          className={fieldClass}
          value={against}
          onChange={(event) => setAgainst(event.target.value)}
        >
          <option value="manufacturer">Vs manufacturer Excel</option>
          <option value="competitor">Vs competitor website</option>
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
        </select>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      <p className="mb-4 text-sm text-gray-400">
        {ours.length} of your catalogs · {other.length} {against} sources
      </p>

      <div className="overflow-x-auto rounded-2xl border border-indigo-400/30 bg-[#22262d] shadow-[0_0_24px_rgba(99,102,241,0.12)]">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">
            No matches yet. Ingest your catalog and a {against} source, then run
            matching from the backend.
          </p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Our SKU</th>
                <th className="px-4 py-3 font-medium">Our name</th>
                <th className="px-4 py-3 font-medium">Candidate SKU</th>
                <th className="px-4 py-3 font-medium">Candidate name</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((match) => (
                <tr
                  key={match.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-gray-300">{match.ourSku}</td>
                  <td className="px-4 py-3 text-white">{match.ourName}</td>
                  <td className="px-4 py-3 text-gray-300">{match.theirSku}</td>
                  <td className="px-4 py-3 text-white">{match.theirName}</td>
                  <td className="px-4 py-3 text-gray-300">{match.score}</td>
                  <td className="px-4 py-3 capitalize text-gray-300">
                    {match.status}
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
