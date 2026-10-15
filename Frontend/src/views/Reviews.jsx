import React, { useState } from "react";
import { Link } from "react-router-dom";

const Reviews = () => {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);

  const decide = (id, status) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage(`Marked ${status}. Review API is not connected yet.`);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-white">Review queue</h1>
          <p className="mt-2 text-gray-400">
            Accept, reject, or ignore suggested matches before export.
          </p>
        </div>
        <Link
          to="/dashboard/export"
          className="rounded-md bg-indigo-500 px-4 py-2.5 text-center font-medium text-white hover:bg-indigo-400"
        >
          Go to export
        </Link>
      </div>

      {message ? (
        <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-indigo-400/30 bg-[#22262d] shadow-[0_0_24px_rgba(99,102,241,0.12)]">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">
            Queue is empty. Matches waiting for a human decision will land here.
          </p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Our product</th>
                <th className="px-4 py-3 font-medium">Suggested match</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-white">
                    <p>{item.ourName}</p>
                    <p className="text-xs text-gray-400">{item.ourSku}</p>
                  </td>
                  <td className="px-4 py-3 text-white">
                    <p>{item.theirName}</p>
                    <p className="text-xs text-gray-400">{item.theirSku}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{item.score}</td>
                  <td className="px-4 py-3 text-gray-300">{item.reason}</td>
                  <td className="px-4 py-3">
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
                        className="text-red-400 hover:text-red-300"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(item.id, "ignored")}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        Ignore
                      </button>
                    </div>
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
