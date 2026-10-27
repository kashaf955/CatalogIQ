import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/15 bg-[#11181e] px-3 py-2.5 text-white outline-none focus:border-teal-400";

const Export = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [sourceId, setSourceId] = useState("");
  const [format, setFormat] = useState("csv");
  const [scope, setScope] = useState("accepted");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get("/api/v1/catalogs", {
          withCredentials: true,
        });
        const list = Array.isArray(response.data) ? response.data : [];
        setCatalogs(list);
        const ours = list.find((item) => item.type === "our_catalog");
        if (ours) setSourceId(ours._id);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load catalogs");
      }
    };

    load();
  }, []);

  const onExport = (event) => {
    event.preventDefault();
    setMessage(
      "Export is UI-only for now. The download will use accepted matches on the next backend pass."
    );
  };

  return (
    <div className="flex justify-center py-4">
      <form
        onSubmit={onExport}
        className="w-full max-w-md rounded-2xl border border-teal-400/40 bg-[#1a242b] p-8 shadow-[0_0_32px_rgba(13,148,136,0.25)]"
      >
        <p className="mb-1 text-sm uppercase tracking-[0.18em] text-teal-300">
          Workspace
        </p>
        <h1 className="mb-2 text-3xl font-semibold text-white">Export</h1>
        <p className="mb-6 text-gray-400">
          Download a file after matches have been reviewed.
        </p>

        {error ? (
          <p className="mb-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}

        <label className="mb-4 block text-sm text-gray-300">
          Catalog
          <select
            className={fieldClass}
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            required
          >
            <option value="" disabled>
              Select a catalog
            </option>
            {catalogs.map((catalog) => (
              <option key={catalog._id} value={catalog._id}>
                {catalog.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block text-sm text-gray-300">
          Include
          <select
            className={fieldClass}
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="accepted">Accepted matches only</option>
            <option value="all">All products</option>
            <option value="pending">Pending review</option>
          </select>
        </label>

        <label className="mb-6 block text-sm text-gray-300">
          Format
          <select
            className={fieldClass}
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
          </select>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-teal-600 py-3 font-medium text-white hover:bg-teal-500"
        >
          Download {format.toUpperCase()}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link
            to="/dashboard/reviews"
            className="text-teal-300 hover:text-teal-200"
          >
            Back to review
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Export;
