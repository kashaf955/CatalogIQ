import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const fieldClass =
  "mt-2 w-full rounded-md border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none focus:border-brand";

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
        className="w-full max-w-md rounded-2xl border border-brand/25 bg-panel p-8 shadow-sm"
      >
        <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
          Workspace
        </p>
        <h1 className="mb-2 text-3xl font-semibold text-ink">Export</h1>
        <p className="mb-6 text-mute">
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

        <label className="mb-4 block text-sm text-ink">
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

        <label className="mb-4 block text-sm text-ink">
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

        <label className="mb-6 block text-sm text-ink">
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
          className="w-full rounded-md bg-brand py-3 font-medium text-white hover:bg-brand-hover"
        >
          Download {format.toUpperCase()}
        </button>

        <p className="mt-6 text-center text-sm text-mute">
          <Link
            to="/dashboard/reviews"
            className="text-brand hover:text-brand-hover"
          >
            Back to review
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Export;
