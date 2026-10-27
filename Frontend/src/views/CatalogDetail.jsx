import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import ProcessingBar from "../components/ProcessingBar.jsx";

const typeLabel = {
  our_catalog: "Company catalog",
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
  "mt-2 w-full rounded-md border border-white/10 bg-canvas px-3 py-2.5 text-ink outline-none placeholder:text-mute focus:border-brand";

const CatalogDetail = () => {
  const { id } = useParams();
  const { role } = useSelector((state) => state.auth);
  const canManage =
    role === "owner" || role === "admin" || role === "manager";
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imported, setImported] = useState(null);

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

  const kind =
    catalog?.connection?.kind ||
    (catalog?.type === "manufacturer" || catalog?.type === "our_catalog"
      ? "excel"
      : catalog?.type === "competitor"
        ? "website"
        : undefined);
  const isBigCommerce =
    kind === "api" &&
    String(catalog?.connection?.platform || "").toLowerCase() === "bigcommerce";

  const onIngest = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setImported(null);

    const isExcel = kind === "excel" || kind === "csv";
    if (isExcel && !file) {
      setError("Choose an Excel or CSV file to upload");
      return;
    }

    if (kind === "website" && !catalog?.url) {
      setError("Add a competitor website URL before ingesting");
      return;
    }

    if (kind === "api" && !isBigCommerce && !catalog?.url) {
      setError("Add an API URL before ingesting");
      return;
    }

    setSaving(true);
    try {
      let response;
      if (isExcel) {
        const form = new FormData();
        form.append("file", file);
        response = await axios.post(`/api/v1/catalogs/${id}/ingest`, form, {
          withCredentials: true,
        });
      } else {
        response = await axios.post(
          `/api/v1/catalogs/${id}/ingest`,
          {},
          {
            withCredentials: true,
            timeout: kind === "excel" || kind === "csv" ? 60000 : 15 * 60 * 1000,
          }
        );
      }
      const count = response.data.imported ?? 0;
      setImported(count);
      setMessage(
        response.data.message
          ? `${response.data.message}. Imported ${count} products.`
          : "Products imported"
      );
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.message === "Network Error" || !err.response) {
        setImported(0);
        setError(
          "The request timed out, but the server may still be importing. Open this catalog's products to check."
        );
      } else {
        setError(err.response?.data?.message || "Ingest failed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-mute">Loading catalog...</p>;
  }

  if (!catalog) {
    return (
      <div>
        <p className="text-sm text-red-300">{error || "Catalog not found"}</p>
        <Link
          to="/dashboard/catalogs"
          className="mt-4 inline-block text-brand hover:text-brand-hover"
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
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Catalog
          </p>
          <h1 className="text-3xl font-semibold text-ink">{catalog.name}</h1>
          <p className="mt-2 text-mute">
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
              className="rounded-md border border-white/20 px-4 py-2.5 text-center text-sm text-ink hover:border-brand"
            >
              Edit source
            </Link>
          ) : null}
          <Link
            to={`/dashboard/products?source=${catalog._id}`}
            className="rounded-md bg-brand px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-hover"
          >
            View catalog products
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand/20 bg-panel p-5">
          <p className="text-sm text-mute">Status</p>
          <p className="mt-1 capitalize text-ink">{catalog.status}</p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-panel p-5">
          <p className="text-sm text-mute">
            {kind === "api" ? "API" : kind === "excel" ? "File source" : "Website"}
          </p>
          <p className="mt-1 truncate text-ink">
            {kind === "api"
              ? catalog.connection?.platform || catalog.url || "Generic API"
              : catalog.url || "Excel upload on ingest"}
          </p>
        </div>
        <div className="rounded-2xl border border-brand/20 bg-panel p-5">
          <p className="text-sm text-mute">Brands</p>
          <p className="mt-1 text-ink">
            {(catalog.brands || []).join(", ") || "—"}
          </p>
        </div>
      </div>

      {canManage ? (
      <form
        onSubmit={onIngest}
        className="rounded-2xl border border-brand/20 bg-panel p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-ink">Ingest</h2>
        <p className="mt-2 text-sm text-mute">
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

        {imported != null && !saving ? (
          <Link
            to={`/dashboard/products?source=${catalog._id}`}
            className="mt-4 inline-flex rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            View products
          </Link>
        ) : null}

        {kind === "excel" || kind === "csv" ? (
          <label className="mt-6 block text-sm text-ink">
            File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              required
              className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:text-white`}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file ? (
              <span className="mt-2 block text-xs text-mute">{file.name}</span>
            ) : null}
          </label>
        ) : null}

        {kind === "api" ? (
          <p className="mt-6 text-sm text-mute">
            {isBigCommerce
              ? `Fetch from the BigCommerce adapter (store ${catalog.connection?.storeHash || "hash missing"}).`
              : `GET ${catalog.url || "the saved API URL"} with the stored token. The response should be a JSON product list.`}
          </p>
        ) : null}

        {kind === "website" ? (
          <p className="mt-6 text-sm text-mute">
            Search {catalog.url || "the competitor website"} for SKUs already in
            your company catalog. If a store prefix does not match (for example
            UP-12345), it retries with the part number (12345). The whole
            competitor site is not scraped.
          </p>
        ) : null}

        {kind === "excel" ? (
          <p className="mt-2 text-sm text-mute">
            {catalog.type === "manufacturer"
              ? "Upload the manufacturer Excel sheet. First row should be column headers."
              : "Upload the company catalog Excel file. First row should be column headers."}
          </p>
        ) : null}

        {!kind ? (
          <p className="mt-6 text-sm text-mute">
            Edit this source and choose a connection before ingesting.
          </p>
        ) : null}

        {saving ? (
          <ProcessingBar
            label={
              kind === "website"
                ? "Searching competitor site. This can take several minutes."
                : kind === "api"
                  ? "Fetching products. Keep this page open."
                  : "Uploading and importing products..."
            }
          />
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              !kind ||
              saving ||
              ((kind === "excel" || kind === "csv") && !file) ||
              (kind === "website" && !catalog.url) ||
              (kind === "api" && !isBigCommerce && !catalog.url)
            }
            className="rounded-md bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving
              ? kind === "website"
                ? "Searching competitor..."
                : kind === "api"
                  ? "Fetching API..."
                  : "Uploading..."
              : kind === "excel" || kind === "csv"
                ? "Upload and ingest"
                : kind === "website"
                  ? "Search company SKUs"
                  : kind === "api"
                    ? "Fetch products"
                    : "Run ingest"}
          </button>
          <Link
            to="/dashboard/catalogs"
            className="rounded-md px-4 py-2.5 text-sm text-brand hover:text-brand-hover"
          >
            Back to catalogs
          </Link>
        </div>
      </form>
      ) : (
        <p className="rounded-2xl border border-brand/20 bg-panel p-6 text-sm text-mute">
          Only an owner, admin, or manager can ingest this source.
        </p>
      )}
    </div>
  );
};

export default CatalogDetail;
