import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const fieldClass =
  "rounded-md border border-white/10 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand";

const money = (value) =>
  typeof value === "number" ? value.toFixed(2) : "—";

const dash = (value) =>
  value && String(value).trim() !== "" ? String(value) : "—";

const Compare = () => {
  const { role } = useSelector((state) => state.auth);
  const canManage =
    role === "owner" || role === "admin" || role === "manager";
  const [against, setAgainst] = useState("competitor");
  const [rows, setRows] = useState([]);
  const [percent, setPercent] = useState("5");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/api/v1/matches/compare", {
        params: { against },
        withCredentials: true,
      });
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load compare");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPreview(null);
    setMessage(null);
    load();
  }, [against]);

  const previewByProduct = useMemo(() => {
    const map = new Map();
    for (const item of preview?.updates || []) {
      map.set(item.ourProductId, item.nextPrice);
    }
    return map;
  }, [preview]);

  const runPrices = async (apply) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await axios.post(
        "/api/v1/matches/compare/prices",
        { percent: Number(percent), apply },
        { withCredentials: true }
      );
      setPreview(response.data);
      setMessage(response.data.message);
      if (apply) await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update prices");
    } finally {
      setSaving(false);
    }
  };

  const onPreview = (event) => {
    event.preventDefault();
    runPrices(false);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm uppercase tracking-[0.18em] text-brand">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold text-ink">Compare</h1>
          <p className="mt-2 max-w-xl text-mute">
            Accepted matches in one row: company fields first, competitor fills
            gaps. Price rule writes your catalog only.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/dashboard/matches"
            className="rounded-md border border-white/10 px-4 py-2.5 text-center font-medium text-ink hover:border-white/25"
          >
            Back to matches
          </Link>
          <Link
            to="/dashboard/export"
            className="rounded-md bg-brand px-4 py-2.5 text-center font-medium text-white hover:bg-brand-hover"
          >
            Export file
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="text-sm text-ink">
          Source
          <select
            className={`${fieldClass} mt-2 block`}
            value={against}
            onChange={(event) => setAgainst(event.target.value)}
          >
            <option value="competitor">Vs competitor catalog</option>
            <option value="manufacturer">Vs manufacturer Excel</option>
          </select>
        </label>
        {canManage && against === "competitor" ? (
          <form
            onSubmit={onPreview}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="text-sm text-ink">
              Price below competitor
              <span className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="0.1"
                  className={`${fieldClass} w-24`}
                  value={percent}
                  onChange={(event) => {
                    setPercent(event.target.value);
                    setPreview(null);
                  }}
                  required
                />
                <span className="text-mute">%</span>
              </span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-brand/40 px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand-hover/10 disabled:opacity-50"
            >
              {saving ? "Working..." : "Preview prices"}
            </button>
            <button
              type="button"
              disabled={saving || !preview}
              onClick={() => runPrices(true)}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              Apply to company catalog
            </button>
          </form>
        ) : null}
      </div>

      {canManage && against === "competitor" ? (
        <p className="mb-4 text-xs text-mute">
          5% on a $100 competitor price sets your SKU to $95. Preview first.
          SKUs with two accepted competitors or no competitor price are skipped.
        </p>
      ) : null}

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {message ? (
        <p className="mb-4 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {message}
          {preview ? (
            <span className="ml-1 text-mute">
              ({preview.updates?.length || 0} to update,{" "}
              {preview.skipped?.length || 0} skipped)
            </span>
          ) : null}
        </p>
      ) : null}

      <p className="mb-4 text-sm text-mute">
        {rows.length.toLocaleString()} combined products
      </p>

      <div className="overflow-x-auto rounded-2xl border border-brand/20 bg-panel shadow-sm">
        {loading ? (
          <p className="px-4 py-6 text-sm text-mute">Loading compare...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mute">
            No accepted matches yet. Accept pairs in Review, then open Compare.
          </p>
        ) : (
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-b border-white/10 text-mute">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Our SKU</th>
                <th className="px-4 py-3 font-medium">Their SKU</th>
                <th className="px-4 py-3 font-medium">Our price</th>
                <th className="px-4 py-3 font-medium">Their price</th>
                <th className="px-4 py-3 font-medium">Gap</th>
                {preview ? (
                  <th className="px-4 py-3 font-medium">New price</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const next = previewByProduct.get(row.ourProductId);
                const gapClass =
                  row.gap == null
                    ? "text-ink"
                    : row.gap > 0
                      ? "text-red-300"
                      : row.gap < 0
                        ? "text-emerald-400"
                        : "text-ink";
                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 py-3 text-ink">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-mute">
                        {dash(row.brand)}
                        {row.mpn ? ` · ${row.mpn}` : ""}
                      </p>
                      {row.theirUrl ? (
                        <a
                          href={row.theirUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand hover:text-brand-hover"
                        >
                          Competitor page
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink">{dash(row.sku)}</td>
                    <td className="px-4 py-3 text-ink">{dash(row.theirSku)}</td>
                    <td className="px-4 py-3 text-ink">{money(row.ourPrice)}</td>
                    <td className="px-4 py-3 text-ink">
                      {money(row.theirPrice)}
                    </td>
                    <td className={`px-4 py-3 ${gapClass}`}>
                      {row.gap == null
                        ? "—"
                        : `${row.gap > 0 ? "+" : ""}${money(row.gap)}`}
                    </td>
                    {preview ? (
                      <td className="px-4 py-3 text-ink">
                        {typeof next === "number" ? money(next) : "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-xs text-mute">
                      {dash(row.ourAvailability)} / {dash(row.theirAvailability)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Compare;
