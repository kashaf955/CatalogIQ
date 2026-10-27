import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const Reviews = () => {
  const { role } = useSelector((state) => state.auth);
  const canReview =
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "reviewer";
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get("/api/v1/matches", {
          params: { status: "pending" },
          withCredentials: true,
        });
        setItems(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load review queue");
      }
    };

    load();
  }, []);

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
        <Link
          to="/dashboard/export"
          className="rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
        >
          Go to export
        </Link>
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
