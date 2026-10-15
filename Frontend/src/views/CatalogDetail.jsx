import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const typeLabel = {
  our_catalog: "Our catalog",
  manufacturer: "Manufacturer",
  competitor: "Competitor",
};

const kindLabel = {
  api: "API",
  csv: "CSV",
  excel: "Excel",
  feed: "Feed",
  website: "Website",
};

const fieldClass =
  "mt-2 w-full rounded-md border border-white/15 bg-[#1c1f24] px-3 py-2.5 text-white outline-none placeholder:text-gray-500 focus:border-indigo-400";

const CatalogDetail = () => {
  const { id } = useParams();
  const { role } = useSelector((state) => state.auth);
  const canManage = role === "owner" || role === "admin";
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await axios.get(`/api/v1/catalogs/${id}`, {
          withCredentials: true,
        });
        if (!response.data?._id) {
          setError("Catalog not found");
          return;
        }
        setCatalog(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load catalog");
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [id]);

  const kind = catalog?.connection?.kind;
  const onIngest = (event) => {
    event.preventDefault();
    setMessage(
      "Ingest is UI-only for now. The job will write products on the next backend pass."
    );
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading catalog...</p>;
  }

  if (!catalog) {
    return (
      <div>
        <p className="text-sm text-red-300">{error || "Catalog not found"}</p>
        <Link
          to="/dashboard/catalogs"
          className="mt-4 inline-block text-indigo-300 hover:text-indigo-200"
        >
          Back to catalogs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-indigo-300">
            Catalog
          </p>
          <h1 className="text-3xl font-semibold text-white">{catalog.name}</h1>
          <p className="mt-2 text-gray-400">
            {typeLabel[catalog.type] || catalog.type}
            {" · "}
            {kindLabel[kind] || kind || "No connection"}
            {catalog.connection?.platform ? ` · ${catalog.connection.platform}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage ? (
            <Link
              to={`/dashboard/catalogs/${catalog._id}/edit`}
              className="rounded-md border border-white/20 px-4 py-2.5 text-center text-sm text-white hover:border-indigo-400"
            >
              Edit source
            </Link>
          ) : null}
          <Link
            to={`/dashboard/products?source=${catalog._id}`}
            className="rounded-md bg-indigo-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-400"
          >
            View products
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-5">
          <p className="text-sm text-gray-400">Status</p>
          <p className="mt-1 capitalize text-white">{catalog.status}</p>
        </div>
        <div className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-5">
          <p className="text-sm text-gray-400">URL</p>
          <p className="mt-1 truncate text-white">{catalog.url || "—"}</p>
        </div>
        <div className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-5">
          <p className="text-sm text-gray-400">Brands</p>
          <p className="mt-1 text-white">
            {(catalog.brands || []).join(", ") || "—"}
          </p>
        </div>
      </div>

      <form
        onSubmit={onIngest}
        className="rounded-2xl border border-indigo-400/30 bg-[#22262d] p-6 shadow-[0_0_24px_rgba(99,102,241,0.12)]"
      >
        <h2 className="text-xl font-semibold text-white">Ingest</h2>
        <p className="mt-2 text-sm text-gray-400">
          Pull this source into products. Matching starts after a successful run.
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}

        {kind === "excel" || kind === "csv" ? (
          <label className="mt-6 block text-sm text-gray-300">
            File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className={fieldClass}
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name || "")
              }
            />
            {fileName ? (
              <span className="mt-2 block text-xs text-gray-400">{fileName}</span>
            ) : null}
          </label>
        ) : null}

        {kind === "api" ? (
          <p className="mt-6 text-sm text-gray-400">
            This will call the {catalog.connection?.platform || "API"} connection
            stored on the source.
          </p>
        ) : null}

        {kind === "website" ? (
          <p className="mt-6 text-sm text-gray-400">
            This will crawl {catalog.url || "the competitor URL"} for product
            pages.
          </p>
        ) : null}

        {!kind ? (
          <p className="mt-6 text-sm text-gray-400">
            Edit this source and choose a connection before ingesting.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!kind}
            className="rounded-md bg-indigo-500 px-4 py-2.5 font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            Run ingest
          </button>
          <Link
            to="/dashboard/catalogs"
            className="rounded-md px-4 py-2.5 text-sm text-indigo-300 hover:text-indigo-200"
          >
            Back to catalogs
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CatalogDetail;
